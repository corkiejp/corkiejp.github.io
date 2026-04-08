const MAX_LOGS = 50;

async function getState() {
  const data = await chrome.storage.local.get({
    logs: [],
    status: { initialized: false, lastInit: null, installs: 0 }
  });
  return data;
}

async function setBadge(count) {
  await chrome.action.setBadgeBackgroundColor({ color: "#b91c1c" });
  await chrome.action.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : "" });
}

async function logEvent(entry) {
  const state = await getState();
  const logs = [entry, ...state.logs].slice(0, MAX_LOGS);
  await chrome.storage.local.set({ logs });
  await setBadge(logs.length);
}

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  await chrome.storage.local.set({
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

chrome.runtime.onStartup?.addListener(async () => {
  await chrome.storage.local.set({
    status: {
      initialized: true,
      lastInit: Date.now(),
      installs: 1
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "heartbeat") {
      await logEvent({
        type: "heartbeat",
        message: `Content script active on ${msg.page}`,
        page: msg.page,
        time: Date.now()
      });
      sendResponse({ ok: true });
      return;
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
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === "getState") {
      const state = await getState();
      sendResponse(state);
      return;
    }

    if (msg?.type === "clearLogs") {
      await chrome.storage.local.set({ logs: [] });
      await setBadge(0);
      sendResponse({ ok: true });
    }
  })();
  return true;
});