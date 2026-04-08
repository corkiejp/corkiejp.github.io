const MAX_LOGS = 50;

async function getState() {
  return browser.storage.local.get({
    logs: [],
    status: { initialized: false, lastInit: null, installs: 0 }
  });
}

async function setBadge(count) {
  await browser.browserAction.setBadgeBackgroundColor({ color: "#b91c1c" });
  await browser.browserAction.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : "" });
}

async function logEvent(entry) {
  const state = await getState();
  const logs = [entry, ...state.logs].slice(0, MAX_LOGS);
  await browser.storage.local.set({ logs });
  await setBadge(logs.length);
}

browser.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  await browser.storage.local.set({
    status: {
      initialized: true,
      lastInit: Date.now(),
      installs: (state.status?.installs || 0) + 1
    }
  });

  await logEvent({
    type: "lifecycle",
    message: "Extension installed/updated",
    time: Date.now()
  });
});

browser.runtime.onStartup.addListener(async () => {
  const state = await getState();
  await browser.storage.local.set({
    status: {
      initialized: true,
      lastInit: Date.now(),
      installs: state.status?.installs || 1
    }
  });
});

browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg?.type === "heartbeat") {
    await logEvent({
      type: "heartbeat",
      message: `Content script active on ${msg.page}`,
      page: msg.page,
      time: Date.now()
    });
    return { ok: true };
  }

  if (msg?.source === "anti-extension-probe") {
    await logEvent({
      type: "probe",
      subtype: msg.kind || "probe",
      url: msg.url,
      method: msg.type,
      allowed: msg.allowed,
      page: msg.page || sender.tab?.url,
      time: msg.time || Date.now()
    });
    return { ok: true };
  }

  if (msg?.type === "getState") {
    return getState();
  }

  if (msg?.type === "clearLogs") {
    await browser.storage.local.set({ logs: [] });
    await setBadge(0);
    return { ok: true };
  }

  return undefined;
});

function looksSuspicious(url) {
  return typeof url === "string" &&
    (url.startsWith("moz-extension://") || url.startsWith("chrome-extension://"));
}

browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (!looksSuspicious(details.url)) return {};

    await logEvent({
      type: "network-block",
      message: `Blocked suspicious request in webRequest`,
      url: details.url,
      method: details.method,
      page: details.originUrl || details.documentUrl || "",
      time: Date.now()
    });

    return { cancel: true };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);