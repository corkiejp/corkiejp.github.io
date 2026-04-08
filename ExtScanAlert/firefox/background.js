const MAX_LOGS = 100;
const DEFAULT_SETTINGS = {
  mode: 'block',
  notificationsEnabled: false,
  notifiedHosts: {},
  perHostCounts: {},
  logs: [],
  status: { initialized: false, lastInit: null, installs: 0 }
};

async function getState() {
  return browser.storage.local.get(DEFAULT_SETTINGS);
}

async function savePartial(data) {
  return browser.storage.local.set(data);
}

async function setBadge(count) {
  await browser.browserAction.setBadgeBackgroundColor({ color: '#b91c1c' });
  await browser.browserAction.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : '' });
}

function safeHost(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

async function updateBadgeForHost(host) {
  const state = await getState();
  const count = host ? (state.perHostCounts[host] || 0) : 0;
  await setBadge(count);
}

async function appendLog(entry) {
  const state = await getState();
  const logs = [entry, ...state.logs].slice(0, MAX_LOGS);
  await savePartial({ logs });
}

async function incrementHost(host) {
  const state = await getState();
  const perHostCounts = { ...state.perHostCounts, [host]: (state.perHostCounts[host] || 0) + 1 };
  await savePartial({ perHostCounts });
  return perHostCounts[host];
}

async function maybeNotify(host, count) {
  const state = await getState();
  if (!state.notificationsEnabled || !host) return;
  if (state.notifiedHosts[host]) return;

  await browser.notifications.create(`probe-${host}`, {
    type: 'basic',
    title: 'ExtScanAlert',
    message: `Blocked suspicious extension-probe activity on ${host}${count ? ` (${count})` : ''}.`
  });

  const notifiedHosts = { ...state.notifiedHosts, [host]: true };
  await savePartial({ notifiedHosts });
}

browser.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  await savePartial({
    status: {
      initialized: true,
      lastInit: Date.now(),
      installs: (state.status?.installs || 0) + 1
    }
  });
  await appendLog({ type: 'lifecycle', message: 'Extension installed/updated', time: Date.now() });
});

browser.runtime.onStartup.addListener(async () => {
  const state = await getState();
  await savePartial({
    status: {
      initialized: true,
      lastInit: Date.now(),
      installs: state.status?.installs || 1
    }
  });
});

browser.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await browser.tabs.get(tabId);
    await updateBadgeForHost(safeHost(tab.url));
  } catch {}
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    await updateBadgeForHost(safeHost(tab.url || changeInfo.url || ''));
  }
});

browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg?.type === 'heartbeat') {
    await appendLog({ type: 'heartbeat', message: `Content script active on ${msg.page}`, page: msg.page, time: Date.now() });
    await updateBadgeForHost(safeHost(msg.page));
    return { ok: true };
  }

  if (msg?.type === 'getSettings') {
    const state = await getState();
    return {
      mode: state.mode,
      notificationsEnabled: state.notificationsEnabled,
      perHostCounts: state.perHostCounts,
      logs: state.logs,
      status: state.status
    };
  }

  if (msg?.type === 'setMode') {
    await savePartial({ mode: msg.mode });
    return { ok: true };
  }

  if (msg?.type === 'setNotifications') {
    await savePartial({ notificationsEnabled: !!msg.enabled });
    return { ok: true };
  }

  if (msg?.type === 'clearLogs') {
    await savePartial({ logs: [], perHostCounts: {}, notifiedHosts: {} });
    await setBadge(0);
    return { ok: true };
  }

  if (msg?.source === 'anti-extension-probe' && msg.kind === 'candidate') {
    const state = await getState();
    const host = safeHost(msg.page);
    let action = 'allow';
    if (state.mode === 'block') action = 'block';
    if (state.mode === 'log') action = 'allow';
    if (state.mode === 'allow') action = 'allow';

    await appendLog({
      type: 'probe',
      action,
      method: msg.method,
      url: msg.url,
      page: msg.page,
      host,
      time: Date.now()
    });

    if (action === 'block' && host) {
      const count = await incrementHost(host);
      await maybeNotify(host, count);
    }

    await updateBadgeForHost(host);
    return { action };
  }

  return undefined;
});

browser.webRequest.onBeforeRequest.addListener(
  () => ({}),
  { urls: ['<all_urls>'] },
  ['blocking']
);
