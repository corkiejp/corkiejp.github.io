// Ensure SLOW_PAGE_RULES is available
let SLOW_PAGE_RULES = [];

async function loadSlowPageRules() {
  try {
    const url = chrome.runtime.getURL('slow-rules.json');
    const res = await fetch(url);
    SLOW_PAGE_RULES = await res.json();
  } catch (err) {
    console.error('Failed to load slow-page rules', err);
    SLOW_PAGE_RULES = [];
  }
}



function getSlowPageHosts() {
  const hosts = new Set();
  for (const rule of SLOW_PAGE_RULES) {
    const cond = rule.condition || {};
    const inits = cond.initiatorDomains || [];
    for (const d of inits) {
      hosts.add(d);
    }
  }
  return Array.from(hosts);
}

async function applyDnrSlowPageRules(enabled) {
  if (!chrome.declarativeNetRequest) return;
  
  if (!SLOW_PAGE_RULES.length) {
  await loadSlowPageRules();
}

  const ruleIds = SLOW_PAGE_RULES.map(r => r.id);

  const addRules = enabled
    ? SLOW_PAGE_RULES.map(r => ({
        id: r.id,
        priority: 1,
        action: { type: 'block' },
        condition: r.condition
      }))
    : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules,
    removeRuleIds: ruleIds
  });

  const hosts = getSlowPageHosts();
  if (hosts.length) {
    await appendLog({
      type: 'slowPageRules',
      message: enabled
        ? `Slow‑page protection enabled for: ${hosts.join(', ')}`
        : 'Slow‑page protection disabled',
      time: Date.now()
    });
  }
}



const MAX_LOGS = 100;
const DEFAULT_SETTINGS = {
  mode: 'block',
  notificationsEnabled: false,
  notifiedHosts: {},
  perHostCounts: {},
  logs: [],
  status: { initialized: false, lastInit: null, installs: 0 },
  slowPageProtection: false
};

async function getState() {
  return chrome.storage.local.get(DEFAULT_SETTINGS);
}

async function savePartial(data) {
  return chrome.storage.local.set(data);
}

async function setBadge(count) {
  await chrome.action.setBadgeBackgroundColor({ color: '#b91c1c' });
  await chrome.action.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : '' });
}

async function updateBadgeForTab(tabId, pageUrl) {
  try {
    const state = await getState();
    const host = safeHost(pageUrl);
    const count = host ? (state.perHostCounts[host] || 0) : 0;
    await setBadge(count);
  } catch {}
}

function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

async function maybeNotify(host, count) {
  const state = await getState();
  if (!state.notificationsEnabled || !host) return;
  if (state.notifiedHosts[host]) return;

  await chrome.notifications.create(`probe-${host}`,
    {
      type: 'basic',
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sMZkU4AAAAASUVORK5CYII=',
      title: 'ExtScanAlert',
      message: `Blocked suspicious extension-probe activity on ${host}${count ? ` (${count})` : ''}.`,
      priority: 0
    }
  );

  const notifiedHosts = { ...state.notifiedHosts, [host]: true };
  await savePartial({ notifiedHosts });
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

async function resetHostNotice(host) {
  const state = await getState();
  if (!host) return;
  const notifiedHosts = { ...state.notifiedHosts };
  delete notifiedHosts[host];
  await savePartial({ notifiedHosts });
}

chrome.runtime.onInstalled.addListener(async () => {
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

chrome.runtime.onStartup?.addListener(async () => {
  const state = await getState();
  await savePartial({
    status: {
      initialized: true,
      lastInit: Date.now(),
      installs: state.status?.installs || 1
    }
  });
  await applyDnrSlowPageRules(!!state.slowPageProtection);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await updateBadgeForTab(tabId, tab.url);
  } catch {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    await updateBadgeForTab(tabId, tab.url || changeInfo.url || '');
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'heartbeat') {
      await appendLog({ type: 'heartbeat', message: `Content script active on ${msg.page}`, page: msg.page, time: Date.now() });
      await updateBadgeForTab(sender.tab?.id, msg.page);
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'getSettings') {
      const state = await getState();
      sendResponse({
        mode: state.mode,
        notificationsEnabled: state.notificationsEnabled,
		slowPageProtection: !!state.slowPageProtection,
        perHostCounts: state.perHostCounts,
        logs: state.logs,
        status: state.status
      });
      return;
    }
	
	if (msg?.type === 'setSlowPageProtection') {
  const enabled = !!msg.enabled;
  await savePartial({ slowPageProtection: enabled });
  await applyDnrSlowPageRules(enabled);
  sendResponse({ ok: true });
  return;
}

    if (msg?.type === 'setMode') {
      await savePartial({ mode: msg.mode });
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'setNotifications') {
      await savePartial({ notificationsEnabled: !!msg.enabled });
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'clearLogs') {
      await savePartial({ logs: [], perHostCounts: {}, notifiedHosts: {} });
      await setBadge(0);
      sendResponse({ ok: true });
      return;
    }

    if (msg?.source === 'anti-extension-probe' && msg.kind === 'candidate') {
      const state = await getState();
      const host = safeHost(msg.page);
      let action = 'allow';
      if (state.mode === 'block') action = 'block';
      if (state.mode === 'log') action = 'allow';
      if (state.mode === 'allow') action = 'allow';

      const entry = {
        type: 'probe',
        action,
        method: msg.method,
        url: msg.url,
        page: msg.page,
        host,
        time: Date.now()
      };
      await appendLog(entry);

      if (action === 'block' && host) {
        const count = await incrementHost(host);
        await maybeNotify(host, count);
      }

      await updateBadgeForTab(sender.tab?.id, msg.page);
      sendResponse({ action });
      return;
    }

    if (msg?.type === 'resetHostNotice') {
      await resetHostNotice(msg.host);
      sendResponse({ ok: true });
      return;
    }
  })();
  return true;
});
