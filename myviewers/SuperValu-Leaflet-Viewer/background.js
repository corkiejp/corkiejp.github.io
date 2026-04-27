const ext = globalThis.browser || globalThis.chrome;

// --- Desktop notification helpers (Chromium only) ---

const NOTIFICATION_PREFIX = "svlv-new-leaflet-";
const CHECK_ALARM_NAME = "svlv-check-leaflet";

function htmlHasLeafletPdfMeta(html) {
  return /<meta[^>]+property=["']og:image["'][^>]+content=["'][^"']+\.pdf(?:\?[^"']*)?["']/i.test(
    html
  );
}

function detectMiniLeafletFromHtml(id, url, html) {
  // Only consider suffix forms like 606b, 607b, etc.
  const m = url.match(/\/offers\/leaflet\/(\d+)([a-z])\b/i);
  if (!m) return null;

  const baseId = Number(m[1]);
  const suffix = m[0].split("/").pop(); // "606b"

  if (!Number.isFinite(baseId)) return null;

  if (!htmlHasLeafletPdfMeta(html)) return null;

  return {
    baseId,
    suffix,
    url,
    firstSeenAt: Date.now()
    // pdfUrl can be resolved later by content.js via getPdfUrlFromMeta()
  };
}

function notifyNewLeaflet(info) {
  if (!ext.notifications) return;

  const id = `${NOTIFICATION_PREFIX}${info.id}-${Date.now()}`;

  ext.notifications.create(id, {
    type: "basic",
    iconUrl: "icons/svlv-128.png",
    title: "New SuperValu leaflet",
    message: `Leaflet ${info.id} first seen ${new Date(info.firstSeenAt).toLocaleDateString()}`,
    priority: 0
  });
}

ext.notifications?.onClicked.addListener(async (notificationId) => {
  if (!notificationId.startsWith(NOTIFICATION_PREFIX)) return;

  let targetUrl = "https://supervalu.ie/";
  try {
    const { lastLeaflet } = await ext.storage.local.get(["lastLeaflet"]);
    if (lastLeaflet && typeof lastLeaflet.url === "string") {
      targetUrl = lastLeaflet.url;
    }
  } catch {}

  chrome.tabs.query({}, (tabs) => {
    const existing = tabs.find(
      (t) =>
        t.url &&
        (t.url === targetUrl ||
          t.url.startsWith("https://supervalu.ie/") ||
          t.url.startsWith("https://shop.supervalu.ie/"))
    );

    if (existing) {
      chrome.tabs.update(existing.id, { active: true, url: targetUrl });
      chrome.windows.update(existing.windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: targetUrl });
    }
  });

  ext.notifications.clear(notificationId);
});

function htmlHasLeafletPdfMeta(html) {
  return /<meta[^>]+property=["']og:image["'][^>]+content=["'][^"']+\.pdf(?:\?[^"']*)?["']/i.test(
    html
  );
}

function getIsoWeekday(date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function getIsoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getWeekKey(date = new Date()) {
  return `${date.getFullYear()}-${getIsoWeekNumber(date)}`;
}

function getNextMondayAtHour(from, hour) {
  const d = new Date(from);
  const weekday = getIsoWeekday(d);
  const daysUntilMonday = weekday === 1 ? 7 : 8 - weekday;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function getNextWeekdayAtHour(from, targetIsoWeekday, hour) {
  const d = new Date(from);
  const weekday = getIsoWeekday(d);
  let delta = targetIsoWeekday - weekday;
  if (delta <= 0) delta += 7;
  d.setDate(d.getDate() + delta);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function minutesUntil(target, from = new Date()) {
  return Math.max(60, (target.getTime() - from.getTime()) / 60000);
}

function isBiweeklyActiveWeek(now, anchorWeekKey) {
  if (!anchorWeekKey) return true;

  const currentWeek = getIsoWeekNumber(now);
  const anchorWeek = Number(String(anchorWeekKey).split("-")[1]);

  if (!Number.isFinite(anchorWeek)) return true;

  return Math.abs(currentWeek - anchorWeek) % 2 === 0;
}

async function resetLeafletState({ keepSettings = true } = {}) {
  await ext.alarms.clear(CHECK_ALARM_NAME);

  const keysToRemove = ["lastLeaflet", "lastWeeklyCheck"];

  if (!keepSettings) {
    keysToRemove.push("autoCheckLeaflets", "leafletCadence", "cadenceAnchorWeek");
  }

  await ext.storage.local.remove(keysToRemove);

  try {
    await ext.action.setBadgeText({ text: "" });
  } catch {}

  await configureLeafletAlarm();
}

async function getNextDelayMinutes() {
  const now = new Date();
  const weekday = getIsoWeekday(now);

  const {
    lastWeeklyCheck,
    leafletCadence = "weekly",
    cadenceAnchorWeek
  } = await ext.storage.local.get([
    "lastWeeklyCheck",
    "leafletCadence",
    "cadenceAnchorWeek"
  ]);

  const weekKey = getWeekKey(now);

  const leafletSeenThisWeek =
    lastWeeklyCheck &&
    lastWeeklyCheck.weekKey === weekKey &&
    lastWeeklyCheck.hasLeaflet === true;

  if (leafletSeenThisWeek) {
    return minutesUntil(getNextMondayAtHour(now, 9), now);
  }

  if (leafletCadence === "biweekly" && !isBiweeklyActiveWeek(now, cadenceAnchorWeek)) {
    return minutesUntil(getNextMondayAtHour(now, 9), now);
  }

  if (weekday >= 5) {
    return minutesUntil(getNextMondayAtHour(now, 9), now);
  }

  if (weekday === 1) {
    return minutesUntil(getNextWeekdayAtHour(now, 2, 9), now);
  }

  if (weekday === 2) return 4 * 60;
  if (weekday === 3 || weekday === 4) return 60;

  return 4 * 60;
}

async function configureLeafletAlarm() {
  const { autoCheckLeaflets } = await ext.storage.local.get(["autoCheckLeaflets"]);

  await ext.alarms.clear(CHECK_ALARM_NAME);

  if (!autoCheckLeaflets) return;

  const delayMinutes = await getNextDelayMinutes();
  await ext.alarms.create(CHECK_ALARM_NAME, {
    delayInMinutes: Math.max(1, delayMinutes)
  });
}

async function performLeafletCheck() {
  const { lastLeaflet } = await ext.storage.local.get(["lastLeaflet"]);
  const baseId = lastLeaflet && typeof lastLeaflet.id === "number" ? lastLeaflet.id : null;
  if (!baseId) {
    return;
  }

  const candidateIds = [baseId, baseId + 1, baseId + 2];
  let foundId = null;
  let foundUrl = null;
  let miniHint = null;

  function htmlHasLeafletPdfMeta(html) {
    return /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i.test(html);
  }

  function extractPdfUrlFromHtml(html) {
    const m = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i
    );
    return m ? m[1] : null;
  }

  for (const id of candidateIds) {
    const fullUrl = `https://supervalu.ie/offers/leaflet/${id}`;
    const shortUrl = `https://supervalu.ie/offers/leaflet/${id}b`;

    try {
      const fullRes = await fetch(fullUrl, { method: "GET", credentials: "include" });
      if (fullRes.ok) {
        const fullHtml = await fullRes.text();
        if (htmlHasLeafletPdfMeta(fullHtml) && id > baseId) {
          foundId = id;
          foundUrl = fullUrl;
        }
      }
    } catch {}

    try {
      const shortRes = await fetch(shortUrl, { method: "GET", credentials: "include" });
      if (shortRes.ok) {
        const shortHtml = await shortRes.text();
        if (htmlHasLeafletPdfMeta(shortHtml)) {
          const pdfUrl = extractPdfUrlFromHtml(shortHtml);
          miniHint = {
            baseId: id,
            suffix: `${id}b`,
            url: shortUrl,
            pdfUrl: pdfUrl ? new URL(pdfUrl, "https://supervalu.ie").href : null,
            firstSeenAt: Date.now()
          };
        }
      }
    } catch {}

    if (foundId != null) break;
  }

  const now = Date.now();
  const current = new Date();
  const weekKey = `${current.getFullYear()}-${getIsoWeekNumber(current)}`;

  const toStore = {
    lastWeeklyCheck: { weekKey, hasLeaflet: foundId != null, updatedAt: now }
  };

  if (foundId != null) {
    const newInfo = {
      id: foundId,
      firstSeenAt: now,
      url: foundUrl
    };

    toStore.lastLeaflet = newInfo;

    notifyNewLeaflet(newInfo);

    try {
      await ext.action.setBadgeText({ text: "NEW" });
      await ext.action.setBadgeBackgroundColor({ color: "#2ecc71" });
    } catch {}
  }

  if (miniHint) {
    toStore.miniLeafletHint = miniHint;
  }

  await ext.storage.local.set(toStore);
}



ext.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== CHECK_ALARM_NAME) return;

  await performLeafletCheck();
  await configureLeafletAlarm();
});

ext.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === "SVLV_RECONFIGURE_ALARMS") {
    configureLeafletAlarm();
  }

  if (message.type === "SVLV_RESET_STATE") {
    resetLeafletState({ keepSettings: message.keepSettings !== false });
  }

  if (message.type === "SVLV_TEST_NOTIFICATION") {
    const now = Date.now();
    notifyNewLeaflet({
      id: "TEST",
      firstSeenAt: now,
      url: "https://supervalu.ie/"
    });
  }
});

// --- Viewer toggle wiring (icon + keyboard shortcut) ---

ext.action?.onClicked.addListener((tab) => {
  if (!tab || !tab.id) return;
  ext.tabs.sendMessage(tab.id, { type: "SVLV_TOGGLE_VIEWER" });
});

ext.commands?.onCommand.addListener((command) => {
  if (command !== "toggle-viewer") return;
  ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) return;
    ext.tabs.sendMessage(tab.id, { type: "SVLV_TOGGLE_VIEWER" });
  });
});

ext.runtime.onInstalled.addListener(() => {
  configureLeafletAlarm();
});

if (ext.runtime.onStartup) {
  ext.runtime.onStartup.addListener(() => {
    configureLeafletAlarm();
  });
}