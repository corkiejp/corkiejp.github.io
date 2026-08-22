const DEFAULT_SETTINGS = {
  showCopyButtons: true,

  hideHandles: {
    bskySocial: false,
    euroskySocial: false,
    wsocialEu: false,
    blackskyApp: false,
    northskySocial: false
  },

  shortenHandles: {
    bskySocial: false,
    euroskySocial: false,
    wsocialEu: true,
    blackskyApp: false,
    northskySocial: false
  }
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
    showCopyButtons: $('showCopyButtons').checked,

    hideHandles: {
      bskySocial: $('hide_bskySocial').checked,
      euroskySocial: $('hide_euroskySocial').checked,
      wsocialEu: $('hide_wsocialEu').checked,
      blackskyApp: $('hide_blackskyApp').checked,
      northskySocial: $('hide_northskySocial').checked
    },

    shortenHandles: {
      bskySocial: $('shorten_bskySocial').checked,
      euroskySocial: $('shorten_euroskySocial').checked,
      wsocialEu: $('shorten_wsocialEu').checked,
      blackskyApp: $('shorten_blackskyApp').checked,
      northskySocial: $('shorten_northskySocial').checked
    }
  };
}

function applyUiSettings(settings) {
  const merged = {
    showCopyButtons:
      settings?.showCopyButtons ??
      DEFAULT_SETTINGS.showCopyButtons,

    hideHandles: {
      ...DEFAULT_SETTINGS.hideHandles,
      ...(settings?.hideHandles || {})
    },

    shortenHandles: {
      ...DEFAULT_SETTINGS.shortenHandles,
      ...(settings?.shortenHandles || {})
    }
  };

  $('showCopyButtons').checked = !!merged.showCopyButtons;

  $('hide_bskySocial').checked      = !!merged.hideHandles.bskySocial;
  $('hide_euroskySocial').checked   = !!merged.hideHandles.euroskySocial;
  $('hide_wsocialEu').checked       = !!merged.hideHandles.wsocialEu;
  $('hide_blackskyApp').checked     = !!merged.hideHandles.blackskyApp;
  $('hide_northskySocial').checked  = !!merged.hideHandles.northskySocial;

  $('shorten_bskySocial').checked     = !!merged.shortenHandles.bskySocial;
  $('shorten_euroskySocial').checked  = !!merged.shortenHandles.euroskySocial;
  $('shorten_wsocialEu').checked      = !!merged.shortenHandles.wsocialEu;
  $('shorten_blackskyApp').checked    = !!merged.shortenHandles.blackskyApp;
  $('shorten_northskySocial').checked = !!merged.shortenHandles.northskySocial;
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