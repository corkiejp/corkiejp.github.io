// ============================================================
// Boards.ie Cleaner — members.js
// ============================================================

const ACTIVATION_HASH = '381bcb983324d4b1443e7e7a7e43212eaf043fac348056a3c93436fc6fad5858'; 

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Element refs ---
const statusEl       = document.getElementById('activation-status');
const featuresEl     = document.getElementById('member-features');
const activateBtn    = document.getElementById('activate-btn');
const deactivateBtn  = document.getElementById('deactivate-btn');
const codeInput      = document.getElementById('activation-code');

const toggleIds = ['remove-banners', 'cmp-dismiss'];
const numberIds = [];

document.getElementById('toggle-code-visibility').addEventListener('click', function() {
  const input = document.getElementById('activation-code');
  if (input.type === 'password') {
    input.type = 'text';
    this.textContent = 'Hide';
  } else {
    input.type = 'password';
    this.textContent = 'Show';
  }
});

// --- Unlock / lock UI ---
function unlockFeatures() {
  featuresEl.classList.remove('locked');
  featuresEl.removeAttribute('aria-hidden');
  statusEl.textContent = 'Member features unlocked.';
  statusEl.className = 'status-msg success';
}

function lockFeatures() {
  featuresEl.classList.add('locked');
  featuresEl.setAttribute('aria-hidden', 'true');
  statusEl.textContent = '';
}

// --- Load settings into UI ---
function applySettingsToUI(settings) {
  if (!settings) return;

  if (settings.removeAds !== undefined)
    document.getElementById('remove-ads').checked = settings.removeAds;

  if (settings.removeBanners !== undefined)
    document.getElementById('remove-banners').checked = settings.removeBanners;

  if (settings.cmpDismiss !== undefined)
    document.getElementById('cmp-dismiss').checked = settings.cmpDismiss;

  if (settings.overlayDelay !== undefined)
    document.getElementById('overlay-delay').value = settings.overlayDelay;
}

// --- Read settings from UI ---
function readSettingsFromUI() {
return {
    removeAds:     document.getElementById('remove-ads').checked,
    removeBanners: document.getElementById('remove-banners').checked,
    cmpDismiss:    document.getElementById('cmp-dismiss').checked
  };
}

// --- Save settings ---
function saveSettings() {
  const settings = readSettingsFromUI();
  chrome.storage.sync.set({ memberSettings: settings });
}

// --- On load: check existing activation ---
chrome.storage.sync.get(
  { memberActivated: false, memberSettings: {} },
  (data) => {
    if (data.memberActivated) {
      unlockFeatures();
      applySettingsToUI(data.memberSettings);
    }
  }
);

// --- Activate ---
activateBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();
  if (!code) {
    statusEl.textContent = 'Please enter a code.';
    statusEl.className = 'status-msg error';
    return;
  }

  const hash = await sha256(code);
  if (hash === ACTIVATION_HASH) {
    await chrome.storage.sync.set({ memberActivated: true });
    unlockFeatures();
    codeInput.value = '';
  } else {
    statusEl.textContent = 'Invalid activation code.';
    statusEl.className = 'status-msg error';
  }
});

// Allow Enter key on code input
codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') activateBtn.click();
});

// --- Deactivate ---
deactivateBtn.addEventListener('click', async () => {
  if (!confirm('Deactivate membership and lock member features?')) return;
  await chrome.storage.sync.set({ memberActivated: false, memberSettings: {} });
  lockFeatures();
  statusEl.textContent = 'Deactivated.';
  statusEl.className = 'status-msg';
});

// --- Save on any change ---
toggleIds.forEach(id => {
  document.getElementById(id).addEventListener('change', saveSettings);
});

numberIds.forEach(id => {
  document.getElementById(id).addEventListener('change', saveSettings);
});