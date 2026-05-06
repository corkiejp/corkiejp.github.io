chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;

  console.log('[BoardsCleaner background] storage changed', changes);

  if (changes.bc_memberActive || changes.bc_membersSettings) {
    syncMemberRules().catch(console.error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
if (message.action === 'bc-open-options') {
  const baseUrl = chrome.runtime.getURL('options.html');
  const url = message.forumKey
    ? `${baseUrl}?forum=${encodeURIComponent(message.forumKey)}`
    : baseUrl;

  chrome.tabs.create({ url });
}
});

const TWITTER_WIDGET_RULE_ID = 101;
const INMOBI_CMP_RULE_ID = 102;

function getTwitterWidgetBlockRule() {
  return {
    id: TWITTER_WIDGET_RULE_ID,
    priority: 1,
    action: { type: "block" },
    condition: {
      initiatorDomains: ["boards.ie", "www.boards.ie"],
      requestDomains: ["platform.twitter.com"],
      resourceTypes: ["script"],
      urlFilter: "widgets.js"
    }
  };
}

function getInmobiCmpBlockRule() {
  return {
    id: INMOBI_CMP_RULE_ID,
    priority: 1,
    action: { type: "block" },
    condition: {
      initiatorDomains: ["boards.ie", "www.boards.ie"],
      requestDomains: ["cmp.inmobi.com"],
      resourceTypes: ["script"],
      urlFilter: "choice"
    }
  };
}

async function syncMemberRules() {
  const data = await chrome.storage.sync.get(['bc_memberActive', 'bc_membersSettings']);
  const isMember = !!data.bc_memberActive;
  const settings = data.bc_membersSettings || {};
  const addRules = [];

  console.log('[BoardsCleaner background] syncMemberRules input', {
    isMember,
    settings
  });

  if (isMember && settings.blockTwitterWidgets === true) {
    addRules.push(getTwitterWidgetBlockRule());
  }

  if (isMember && settings.blockInmobiCmp === true) {
    addRules.push(getInmobiCmpBlockRule());
  }

  console.log('[BoardsCleaner background] syncMemberRules addRules', addRules);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [TWITTER_WIDGET_RULE_ID, INMOBI_CMP_RULE_ID],
    addRules
  });

  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  console.log('[BoardsCleaner background] current dynamic rules', currentRules);
}

chrome.runtime.onInstalled.addListener(() => {
  syncMemberRules().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  syncMemberRules().catch(console.error);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;

  if (changes.bc_member_active || changes.bc_settings) {
    syncMemberRules().catch(console.error);
  }
});