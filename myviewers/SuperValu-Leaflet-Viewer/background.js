const ext = globalThis.browser || globalThis.chrome;

const CHECK_ALARM_NAME = "svlv-check-leaflet";

// Helper: get current ISO weekday (1 = Mon, 7 = Sun)
function getIsoWeekday(date = new Date()) {
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  return day === 0 ? 7 : day;
}

// Helper: compute minutes until next check based on your rules
async function getNextDelayMinutes() {
  const now = new Date();
  const weekday = getIsoWeekday(now); // 1–7
  const hour = now.getHours();

  const { lastLeaflet, lastWeeklyCheck } = await ext.storage.local.get([
    "lastLeaflet",
    "lastWeeklyCheck"
  ]);

  // Derive "week key" like "2026-15" so we know if a leaflet has been seen this week.
  const year = now.getFullYear();
  const weekKey = `${year}-${getIsoWeekNumber(now)}`;

  const leafletSeenThisWeek =
    lastWeeklyCheck && lastWeeklyCheck.weekKey === weekKey && lastWeeklyCheck.hasLeaflet === true;

  // If leaflet already found this week, schedule next check for next Monday 09:00.
  if (leafletSeenThisWeek) {
    const nextMonday = getNextMondayAtHour(now, 9);
    const diffMs = nextMonday.getTime() - now.getTime();
    return Math.max(60, diffMs / 60000); // at least 60 minutes
  }

  // No leaflet found yet this week: apply your rules.
  // Fri (5), Sat (6), Sun (7) -> no checks until next Monday 09:00.
  if (weekday >= 5 || weekday === 7) {
    const nextMonday = getNextMondayAtHour(now, 9);
    const diffMs = nextMonday.getTime() - now.getTime();
    return Math.max(60, diffMs / 60000);
  }

  // Monday (1) -> wait until Tuesday 09:00 (first check).
  if (weekday === 1) {
    const nextTuesday = getNextWeekdayAtHour(now, 2, 9); // 2 = Tue
    const diffMs = nextTuesday.getTime() - now.getTime();
    return Math.max(60, diffMs / 60000);
  }

  // Tuesday (2): every 4 hours.
  if (weekday === 2) {
    return 4 * 60;
  }

  // Wednesday (3) and Thursday (4): hourly.
  if (weekday === 3 || weekday === 4) {
    return 60;
  }

  // Fallback: check in 4 hours.
  return 4 * 60;
}

// Compute next Monday at given hour.
function getNextMondayAtHour(from, hour) {
  const d = new Date(from);
  const weekday = getIsoWeekday(d);
  const daysUntilMonday = weekday === 1 ? 7 : (8 - weekday);
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Compute next given weekday at hour (1 = Mon..7 = Sun).
function getNextWeekdayAtHour(from, targetIsoWeekday, hour) {
  const d = new Date(from);
  const weekday = getIsoWeekday(d);
  let delta = targetIsoWeekday - weekday;
  if (delta <= 0) delta += 7;
  d.setDate(d.getDate() + delta);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Approximate ISO week number for weekKey (good enough for this use case).
function getIsoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Create or update the alarm based on current time and settings.
async function configureLeafletAlarm() {
  const { autoCheckLeaflets } = await ext.storage.local.get(["autoCheckLeaflets"]);
  // Clear any existing alarm first.
  await ext.alarms.clear(CHECK_ALARM_NAME);

  if (!autoCheckLeaflets) {
    return;
  }

  const delayMinutes = await getNextDelayMinutes();
  await ext.alarms.create(CHECK_ALARM_NAME, {
    delayInMinutes: Math.max(1, delayMinutes) // API min is ~0.5; use >=1. [web:457][web:468]
  });
}

// Perform the actual check: see if a new leaflet ID exists.
async function performLeafletCheck() {
  const { lastLeaflet } = await ext.storage.local.get(["lastLeaflet"]);
  const baseId = lastLeaflet && typeof lastLeaflet.id === "number" ? lastLeaflet.id : null;
  if (!baseId) {
    // Nothing known yet; nothing to check.
    return;
  }

  // Try next couple of IDs; stop when one hits.
  const candidateIds = [baseId + 1, baseId + 2];
  let foundId = null;
  let foundUrl = null;

  for (const id of candidateIds) {
    const url = `https://supervalu.ie/offers/leaflet/${id}`;
    try {
      const res = await fetch(url, { method: "GET", credentials: "include" });
      if (!res.ok) continue;
      const html = await res.text();
      if (/pdf2web|offers-leaflet|Page\s+\d+/i.test(html)) {
        foundId = id;
        foundUrl = url;
        break;
      }
    } catch {
      // ignore network errors
    }
  }

  const now = Date.now();
  const current = new Date();
  const weekKey = `${current.getFullYear()}-${getIsoWeekNumber(current)}`;

  if (foundId != null) {
    const newInfo = {
      id: foundId,
      firstSeenAt: now,
      url: foundUrl
    };

    await ext.storage.local.set({
      lastLeaflet: newInfo,
      lastWeeklyCheck: { weekKey, hasLeaflet: true, updatedAt: now }
    });

    // Optional: set badge to hint something changed; content.js will show flash on next visit.
    try {
      await ext.action.setBadgeText({ text: "NEW" });
      await ext.action.setBadgeBackgroundColor({ color: "#2ecc71" });
    } catch {
      // ignore in browsers that lack badge APIs
    }
  } else {
    // No leaflet yet this week, but record that we checked.
    await ext.storage.local.set({
      lastWeeklyCheck: { weekKey, hasLeaflet: false, updatedAt: now }
    });
  }
}

// Alarm handler
ext.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== CHECK_ALARM_NAME) return;

  await performLeafletCheck();
  await configureLeafletAlarm();
});

// Respond to toggle from options/help page or elsewhere.
ext.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message && message.type === "SVLV_RECONFIGURE_ALARMS") {
    configureLeafletAlarm();
  }
});

// Initial configuration on install/startup.
ext.runtime.onInstalled.addListener(() => {
  configureLeafletAlarm();
});

if (ext.runtime.onStartup) {
  ext.runtime.onStartup.addListener(() => {
    configureLeafletAlarm();
  });
}