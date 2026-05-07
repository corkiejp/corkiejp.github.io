const SLOW_PAGE_RULES = [
  {
    id: 1001,
    description: 'Block Twitter widgets on entertainment.ie',
    condition: {
      initiatorDomains: ['entertainment.ie', 'www.entertainment.ie'],
      requestDomains: ['platform.twitter.com'],
      resourceTypes: ['script']
    }
  },
  {
    id: 1002,
    description: 'Block InMobi CMP on entertainment.ie',
    condition: {
      initiatorDomains: ['entertainment.ie', 'www.entertainment.ie'],
      requestDomains: ['cmp.inmobi.com'],
      resourceTypes: ['script']
    }
  },
  {
  "id": 1101,
  "description": "Block GTM on irishtimes.com",
  "condition": {
    "initiatorDomains": ["irishtimes.com", "www.irishtimes.com"],
    "requestDomains": ["www.googletagmanager.com"]
   
  }
},
{
  "id": 1102,
  "description": "Block Permutive on irishtimes.com",
  "condition": {
    "initiatorDomains": ["irishtimes.com", "www.irishtimes.com"],
    "requestDomains": ["permutive.app"],
  }
},
{
  "id": 1103,
  "description": "Block Webpush SDK on irishtimes.com",
  "condition": {
    "initiatorDomains": ["irishtimes.com", "www.irishtimes.com"],
    "requestDomains": ["prod.webpu.sh"]
  }
},
{
  "id": 1104,
  "description": "Block InMobi CMP on irishtimes.com",
  "condition": {
    "initiatorDomains": ["irishtimes.com", "www.irishtimes.com"],
    "requestDomains": ["cmp.inmobi.com"]
  }
},
{
  id: 1105,
  description: 'Block PoWa boot script on irishtimes.com',
  condition: {
    initiatorDomains: ['irishtimes.com', 'www.irishtimes.com'],
    urlFilter: 'powaBoot.js',
    resourceTypes: ['script']
  }
}
];

async function applyDnrSlowPageRules(enabled) {
  if (!chrome.declarativeNetRequest) return;

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
}

// top-level
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
