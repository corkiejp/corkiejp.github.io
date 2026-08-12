const DEFAULT_SETTINGS = {
  wsocialHideBsky: false,
  wsocialHideEurosky: false,
  wsocialShortenHandles: true,
  wsocialShowCopyButtons: true,
  bskyHideWsocial: false,
  bskyHideEurosky: false,
  bskyShowCopyButtons: true,
  deerHideWsocial: false,
  deerHideEurosky: false,
  deerShowCopyButtons: true,
  wsocialHideWsocial: false,        // probably unused / stays off
  bskyHideBsky: false,
  deerHideBsky: false,
};

const $ = id => document.getElementById(id);
const statusEl = $('status');

function getStorageArea() {
  return (typeof browser !== 'undefined' && browser.storage && browser.storage.local)
    ? browser.storage.local
    : chrome.storage.local;
}

function storageGet(keys) {
  return new Promise(resolve => {
    const area = getStorageArea();
    area.get(keys, result => resolve(result || {}));
  });
}

function storageSet(items) {
  return new Promise(resolve => {
    const area = getStorageArea();
    area.set(items, () => resolve());
  });
}

function setStatus(text, kind = 'success') {
  if (!statusEl) return;

  statusEl.textContent = text;
  statusEl.hidden = false;
  statusEl.dataset.kind = kind;
  statusEl.style.display = 'block';
  statusEl.style.borderColor = kind === 'error'
    ? 'var(--danger-border, #e5a3a1)'
    : 'var(--success-border, #b7e4c7)';
  statusEl.style.background = kind === 'error'
    ? 'var(--danger-bg, #fff5f5)'
    : 'var(--success-bg, #ecfdf3)';
  statusEl.style.color = kind === 'error'
    ? 'var(--danger, #b42318)'
    : 'var(--success, #146c2e)';
}

function readUiSettings() {
  return {
    wsocialHideBsky: $('wsocialHideBsky').checked,
    wsocialHideEurosky: $('wsocialHideEurosky').checked,
    wsocialHideWsocial: $('wsocialHideWsocial').checked,

    wsocialShortenHandles: $('wsocialShortenHandles').checked,
    wsocialShowCopyButtons: $('wsocialShowCopyButtons').checked,

    bskyHideWsocial: $('bskyHideWsocial').checked,
    bskyHideEurosky: $('bskyHideEurosky').checked,
    bskyHideBsky: $('bskyHideBsky').checked,
    bskyShowCopyButtons: $('bskyShowCopyButtons').checked,

    deerHideWsocial: $('deerHideWsocial').checked,
    deerHideEurosky: $('deerHideEurosky').checked,
    deerHideBsky: $('deerHideBsky').checked,
    deerShowCopyButtons: $('deerShowCopyButtons').checked
  };
}

function applyUiSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  Object.entries(merged).forEach(([key, value]) => {
    const el = $(key);
    if (el) el.checked = !!value;
  });
}

async function loadSettings() {
  const stored = await storageGet(Object.keys(DEFAULT_SETTINGS));
  applyUiSettings(stored);
}

async function saveSettings() {
  const button = $('saveBtn');
  const settings = readUiSettings();

  button.disabled = true;
  button.textContent = 'Saving…';

  try {
    await storageSet(settings);
    setStatus('Settings saved successfully. Reload the client page if needed.');
  } catch (error) {
    console.error('Could not save AT Protocol Handler settings:', error);
    setStatus('Could not save settings.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Save settings';
  }
}

async function resetSettings() {
  const button = $('resetBtn');

  button.disabled = true;

  try {
    applyUiSettings(DEFAULT_SETTINGS);
    await storageSet(DEFAULT_SETTINGS);
    setStatus('Settings reset to defaults.');
  } catch (error) {
    console.error('Could not reset AT Protocol Handler settings:', error);
    setStatus('Could not reset settings.', 'error');
  } finally {
    button.disabled = false;
  }
}

function wire() {
  $('saveBtn').addEventListener('click', saveSettings);
  $('resetBtn').addEventListener('click', resetSettings);

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      saveSettings();
    }
  });
}

wire();
loadSettings().catch(err => {
  console.error(err);
  setStatus('Could not load settings.', 'error');
});
