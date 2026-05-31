// assets/js/core/storage.js
const DEFAULT_BC_SETTINGS = {
  globalColourShift: true,
  extensionCssEnabled: true,
  overlayDelay: 3,
  overlayMessage: /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
    ? 'Boards.ie Cleaner Loading...'
    : 'Boards.ie Cleaner Created by corkie! Hope your enjoying a cleaner experience? | Loading...',
  cmpBlock: false,
  removeAds: false,
  removeAlerts: false,
  cookieDisagree: false,
  blockTwitterWidgets: false,
  blockInmobiCmp: false,
  shortcutsEnabled: true,
  pageShortcutsEnabled: false
};

const STORAGE_KEYS = {
  memberCode: 'bc_memberCode',
  memberActive: 'bc_memberActive',
  settings: 'bc_membersSettings',
  styledForums: 'bc_styledForums'
};

function normaliseBcSettings(settings) {
  return {
    ...DEFAULT_BC_SETTINGS,
    ...(settings || {})
  };
}

async function loadMemberState() {
  return new Promise(resolve => {
    if (!chrome.storage || !chrome.storage.sync) {
      resolve({});
      return;
    }

    chrome.storage.sync.get(
      [STORAGE_KEYS.memberCode, STORAGE_KEYS.memberActive, STORAGE_KEYS.settings],
      result => resolve(result || {})
    );
  });
}

async function saveMemberState(code, active, settings) {
  if (!chrome.storage || !chrome.storage.sync) {
    return;
  }

  return new Promise(resolve => {
    chrome.storage.sync.set(
      {
        [STORAGE_KEYS.memberCode]: code,
        [STORAGE_KEYS.memberActive]: active,
        [STORAGE_KEYS.settings]: normaliseBcSettings(settings)
      },
      () => resolve()
    );
  });
}

async function getBcSettings() {
  const state = await loadMemberState();
  const safeState = state || {};
  return normaliseBcSettings(safeState[STORAGE_KEYS.settings]);
}

function toStyledForumItem(forumKey, value) {
  const safeValue = value || {};

  return {
    forumKey: String(forumKey || safeValue.forumKey || safeValue.slug || safeValue.forumSlug || '').trim(),
    themeId: typeof safeValue.themeId === 'string'
      ? safeValue.themeId
      : (typeof safeValue.theme === 'string' ? safeValue.theme : ''),
    hasCustomCss: !!safeValue.customCss && String(safeValue.customCss).trim().length > 0
  };
}

async function getStyledForumsList() {
  if (!chrome.storage) {
    return [];
  }

  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['forumThemeAssignments']),
    chrome.storage.local.get(['customCssByForum'])
  ]);

  const forumAssignments = syncData?.forumThemeAssignments || {};
  const customCssByForum = localData?.customCssByForum || {};

  const forumKeys = new Set([
    ...Object.keys(forumAssignments),
    ...Object.keys(customCssByForum)
  ]);

  const items = Array.from(forumKeys).map((forumKey) => {
    const themeId = typeof forumAssignments[forumKey] === 'string'
      ? forumAssignments[forumKey]
      : '';

    const customCss = customCssByForum[forumKey];
    const hasCustomCss =
      typeof customCss === 'string' && customCss.trim().length > 0;

    return {
      forumKey,
      themeId,
      hasCustomCss
    };
  });

  items.sort((a, b) => a.forumKey.localeCompare(b.forumKey));
  return items;
}

export {
  DEFAULT_BC_SETTINGS,
  STORAGE_KEYS,
  normaliseBcSettings,
  loadMemberState,
  saveMemberState,
  getBcSettings,
  getStyledForumsList
};