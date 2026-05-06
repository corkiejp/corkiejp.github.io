const enabledEl = document.getElementById('enabled');
const usePresetsEl = document.getElementById('usePresets');
const forumKeyEl = document.getElementById('forumKey');
const forumEnabledEl = document.getElementById('forumEnabled');
const presetIdEl = document.getElementById('presetId');
const customCssEl = document.getElementById('customCss');
const statusEl = document.getElementById('status');
const backupStatusEl = document.getElementById('backupStatus');

const cse = document.getElementById('contentScriptEnabled');

const STORAGE_KEYS = {
  themeSettings: 'themeSettings',
  forumThemeAssignments: 'forumThemeAssignments',
  customCssByForum: 'customCssByForum',
  contentScriptEnabled: 'contentScriptEnabled',
  themeEngine2Enabled: 'themeEngine2Enabled'
};

const BUILTIN_PRESETS = {
  'after-hours': 'afterhours-dark',
  'current-affairs': 'current-affairs-imho',
  'forestry': 'forest'
};



function showStatus(msg) {
  statusEl.textContent = msg;
  setTimeout(() => {
    if (statusEl.textContent === msg) statusEl.textContent = '';
  }, 2200);
}

function showBackupStatus(msg, isError = false) {
  backupStatusEl.textContent = msg;
  backupStatusEl.style.color = isError ? '#c00' : '#0a6';
  setTimeout(() => {
    if (backupStatusEl.textContent === msg) backupStatusEl.textContent = '';
  }, 3000);
}

function normalizeForumKey(key) {
  return (key || '').trim().toLowerCase();
}

function getForumKeyFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return normalizeForumKey(params.get('forum') || '');
}

async function preloadForumFromQuery() {
  const forumKey = getForumKeyFromQuery();
  if (!forumKey) return;

  forumKeyEl.value = forumKey;
  await loadForumConfig();
}

function getDefaultThemeSettings() {
  return {
    enabled: true,
    usePresets: true
  };
}

async function getAllSettings() {
  const syncData = await chrome.storage.sync.get([
    STORAGE_KEYS.themeSettings,
    STORAGE_KEYS.forumThemeAssignments,
    STORAGE_KEYS.contentScriptEnabled,
    STORAGE_KEYS.themeEngine2Enabled
  ]);

  const localData = await chrome.storage.local.get([
    STORAGE_KEYS.customCssByForum
  ]);

  return {
    themeSettings: syncData[STORAGE_KEYS.themeSettings] || getDefaultThemeSettings(),
    forumThemeAssignments: syncData[STORAGE_KEYS.forumThemeAssignments] || {},
    contentScriptEnabled: syncData[STORAGE_KEYS.contentScriptEnabled] !== false,
    themeEngine2Enabled: syncData[STORAGE_KEYS.themeEngine2Enabled] === true,
    customCssByForum: localData[STORAGE_KEYS.customCssByForum] || {}
  };
}

async function saveGlobalSettings() {
  await chrome.storage.sync.set({
    [STORAGE_KEYS.themeSettings]: {
      enabled: enabledEl.checked,
      usePresets: usePresetsEl.checked
    },
    [STORAGE_KEYS.contentScriptEnabled]: cse.checked,
    [STORAGE_KEYS.themeEngine2Enabled]: true
  });
}

async function loadGlobals() {
  const settings = await getAllSettings();

  enabledEl.checked = settings.themeSettings.enabled !== false;
  usePresetsEl.checked = settings.themeSettings.usePresets !== false;
  cse.checked = settings.contentScriptEnabled !== false;
}

function getSuggestedPresetForForum(key) {
  return BUILTIN_PRESETS[key] || '';
}

document.querySelectorAll('button[data-preset]').forEach(btn => {
  btn.addEventListener('click', () => {
    forumKeyEl.value = btn.dataset.forum || '';
    presetIdEl.value = btn.dataset.preset || '';
    forumEnabledEl.checked = true;
    showStatus(`Loaded preset: ${btn.dataset.preset} — click Save forum config to apply.`);
  });
});

async function loadForumConfig() {
  const key = normalizeForumKey(forumKeyEl.value);
  if (!key) {
    showStatus('Enter a forum key first.');
    return;
  }

  const settings = await getAllSettings();
  const assignedPreset = settings.forumThemeAssignments[key] || '';
  const customCss = settings.customCssByForum[key] || '';

  forumEnabledEl.checked = assignedPreset !== '__disabled__';
  presetIdEl.value = assignedPreset && assignedPreset !== '__disabled__'
    ? assignedPreset
    : getSuggestedPresetForForum(key);
  customCssEl.value = customCss;

  showStatus(`Loaded config for ${key}`);
}

async function saveForumConfig() {
  const key = normalizeForumKey(forumKeyEl.value);
  if (!key) {
    showStatus('Enter a forum key first.');
    return;
  }

  const settings = await getAllSettings();
  const forumThemeAssignments = { ...settings.forumThemeAssignments };
  const customCssByForum = { ...settings.customCssByForum };

  if (forumEnabledEl.checked) {
    forumThemeAssignments[key] = presetIdEl.value.trim();
  } else {
    forumThemeAssignments[key] = '__disabled__';
  }

  customCssByForum[key] = customCssEl.value || '';

  await saveGlobalSettings();

  await chrome.storage.sync.set({
    [STORAGE_KEYS.forumThemeAssignments]: forumThemeAssignments
  });

  await chrome.storage.local.set({
    [STORAGE_KEYS.customCssByForum]: customCssByForum
  });

  showStatus(`Saved config for ${key}`);
  refreshStyledForumsList();
}

async function deleteForumConfig() {
  const key = normalizeForumKey(forumKeyEl.value);
  if (!key) {
    showStatus('Enter a forum key first.');
    return;
  }

  const settings = await getAllSettings();
  const forumThemeAssignments = { ...settings.forumThemeAssignments };
  const customCssByForum = { ...settings.customCssByForum };

  delete forumThemeAssignments[key];
  delete customCssByForum[key];

  await chrome.storage.sync.set({
    [STORAGE_KEYS.forumThemeAssignments]: forumThemeAssignments
  });

  await chrome.storage.local.set({
    [STORAGE_KEYS.customCssByForum]: customCssByForum
  });

  forumEnabledEl.checked = true;
  presetIdEl.value = getSuggestedPresetForForum(key);
  customCssEl.value = '';

  showStatus(`Deleted config for ${key}`);
  refreshStyledForumsList();
}

function insertSampleCss() {
  const key = normalizeForumKey(forumKeyEl.value) || 'after-hours';
  const forumClassName = `boards-theme-forum-${key}`;

  customCssEl.value = `html.${forumClassName} .postbit-header {
  background: linear-gradient(180deg, #5a3824 0%, #3b2418 100%) !important;
  color: #f4e9db !important;
}

html.${forumClassName} .postbit-header a {
  color: #f4e9db !important;
}`;
  showStatus('Inserted sample CSS');
}

async function exportThemes() {
  const syncData = await chrome.storage.sync.get([
    STORAGE_KEYS.themeSettings,
    STORAGE_KEYS.forumThemeAssignments,
    STORAGE_KEYS.contentScriptEnabled,
    STORAGE_KEYS.themeEngine2Enabled
  ]);

  const localData = await chrome.storage.local.get([
    STORAGE_KEYS.customCssByForum
  ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    extensionVersion: chrome.runtime.getManifest().version,
    themeSettings: syncData[STORAGE_KEYS.themeSettings] || getDefaultThemeSettings(),
    forumThemeAssignments: syncData[STORAGE_KEYS.forumThemeAssignments] || {},
    customCssByForum: localData[STORAGE_KEYS.customCssByForum] || {},
    contentScriptEnabled: syncData[STORAGE_KEYS.contentScriptEnabled] !== false,
    themeEngine2Enabled: syncData[STORAGE_KEYS.themeEngine2Enabled] === true
  };

  const blob = new Blob(
    [JSON.stringify(exportPayload, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `boardscleaner-themes-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  const forumCount = Object.keys(exportPayload.forumThemeAssignments).length;
  showBackupStatus(
    `Exported ${forumCount} forum theme${forumCount !== 1 ? 's' : ''}`
  );
}

async function importThemes(file) {
  if (!file) return;

  const text = await file.text();
  let payload;

  try {
    payload = JSON.parse(text);
  } catch {
    showBackupStatus('Invalid file — could not parse JSON.', true);
    return;
  }

  if (
    typeof payload !== 'object' ||
    (
      !payload.themeSettings &&
      !payload.forumThemeAssignments &&
      !payload.customCssByForum
    )
  ) {
    showBackupStatus('Invalid file — missing theme data.', true);
    return;
  }

  const syncWrite = {};
  const localWrite = {};

  if (payload.themeSettings) {
    syncWrite[STORAGE_KEYS.themeSettings] = payload.themeSettings;
  }

  if (typeof payload.contentScriptEnabled === 'boolean') {
    syncWrite[STORAGE_KEYS.contentScriptEnabled] = payload.contentScriptEnabled;
  }

  if (typeof payload.themeEngine2Enabled === 'boolean') {
    syncWrite[STORAGE_KEYS.themeEngine2Enabled] = payload.themeEngine2Enabled;
  } else {
    syncWrite[STORAGE_KEYS.themeEngine2Enabled] = true;
  }

  if (payload.forumThemeAssignments) {
    const existingSync = await chrome.storage.sync.get(STORAGE_KEYS.forumThemeAssignments);
    syncWrite[STORAGE_KEYS.forumThemeAssignments] = {
      ...(existingSync[STORAGE_KEYS.forumThemeAssignments] || {}),
      ...payload.forumThemeAssignments
    };
  }

  if (payload.customCssByForum) {
    const existingLocal = await chrome.storage.local.get(STORAGE_KEYS.customCssByForum);
    localWrite[STORAGE_KEYS.customCssByForum] = {
      ...(existingLocal[STORAGE_KEYS.customCssByForum] || {}),
      ...payload.customCssByForum
    };
  }

  if (Object.keys(syncWrite).length) {
    await chrome.storage.sync.set(syncWrite);
  }

  if (Object.keys(localWrite).length) {
    await chrome.storage.local.set(localWrite);
  }

  const forumCount = Object.keys(
    syncWrite[STORAGE_KEYS.forumThemeAssignments] || payload.forumThemeAssignments || {}
  ).length;

  showBackupStatus(
    `Imported ${forumCount} forum theme${forumCount !== 1 ? 's' : ''} successfully`
  );

  await loadGlobals();
}

const styledForumsListEl = document.getElementById('styledForumsList');
const clearAllForumsBtn = document.getElementById('clearAllForumsBtn');

async function refreshStyledForumsList() {
  if (!styledForumsListEl) return;

  const settings = await getAllSettings();
  const assignments = settings.forumThemeAssignments || {};
  const customCssByForum = settings.customCssByForum || {};

  const keys = Array.from(
    new Set([
      ...Object.keys(assignments),
      ...Object.keys(customCssByForum)
    ])
  ).sort();

  styledForumsListEl.innerHTML = '';

  if (!keys.length) {
    const li = document.createElement('li');
    li.textContent = 'No forums have saved themes yet.';
    styledForumsListEl.appendChild(li);
    return;
  }

for (const key of keys) {
	
  const li = document.createElement('li');
  const presetId = assignments[key];
  const hasCustom = Boolean(
    customCssByForum[key] && customCssByForum[key].trim()
  );
  const parts = [];

  if (presetId && presetId !== '__disabled__') {
    parts.push(`preset: ${presetId}`);
  } else if (presetId === '__disabled__') {
    parts.push('preset: disabled');
  } else {
    parts.push('preset: none');
  }

  if (hasCustom) {
    parts.push('custom CSS');
  }
  
  li.className = 'styled-forum-row';
  li.style.display = 'flex';
  li.style.alignItems = 'center';
  li.style.justifyContent = 'space-between';
  li.style.gap = '10px';

  const loadBtn = document.createElement('button');
  loadBtn.type = 'button';
  loadBtn.textContent = `${key} — ${parts.join(', ')}`;
  loadBtn.style.flex = '1';
  loadBtn.style.textAlign = 'left';
  loadBtn.style.cursor = 'pointer';

  loadBtn.addEventListener('click', () => {
    forumKeyEl.value = key;
    loadForumConfig();
  });

  const openLink = document.createElement('a');
  openLink.className = 'forum-open-link';
  openLink.href = `https://www.boards.ie/categories/${encodeURIComponent(key)}`;
  openLink.target = '_blank';
  openLink.rel = 'noopener noreferrer';
  openLink.textContent = 'Open';
  openLink.style.whiteSpace = 'nowrap';

  li.appendChild(loadBtn);
  li.appendChild(openLink);
  styledForumsListEl.appendChild(li);
}
}

async function clearAllForums() {
  if (!confirm('Clear all forum presets and custom CSS?')) return;

  await chrome.storage.sync.set({
    [STORAGE_KEYS.forumThemeAssignments]: {}
  });
  await chrome.storage.local.set({
    [STORAGE_KEYS.customCssByForum]: {}
  });

  if (forumKeyEl) forumKeyEl.value = '';
  if (presetIdEl) presetIdEl.value = '';
  if (customCssEl) customCssEl.value = '';
  if (forumEnabledEl) forumEnabledEl.checked = true;

  showStatus('Cleared all forum themes');
  refreshStyledForumsList();
}

document.getElementById('membersAreaBtn').addEventListener('click', () => {
  window.location.href = 'members.html';
});

document.getElementById('exportBtn').addEventListener('click', exportThemes);

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) importThemes(file);
  e.target.value = '';
});

if (clearAllForumsBtn) {
  clearAllForumsBtn.addEventListener('click', clearAllForums);
}


enabledEl.addEventListener('change', saveGlobalSettings);
usePresetsEl.addEventListener('change', saveGlobalSettings);
cse.addEventListener('change', saveGlobalSettings);

document.getElementById('loadBtn').addEventListener('click', loadForumConfig);
document.getElementById('saveBtn').addEventListener('click', saveForumConfig);
document.getElementById('deleteBtn').addEventListener('click', deleteForumConfig);
document.getElementById('sampleBtn').addEventListener('click', insertSampleCss);

async function initOptionsPage() {
  await loadGlobals();
  await refreshStyledForumsList();
  await preloadForumFromQuery();
}

initOptionsPage();