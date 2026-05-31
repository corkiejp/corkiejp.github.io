let legacyNavPopupDocHandlersBound = false;
let legacyNavPopupRetryTimer = null;
let legacyNavPopupRetryCount = 0;

const MAX_RETRIES = 40;
const RETRY_DELAY_MS = 500;

function getThemeHeaderHost() {
  return document.getElementById('themeHeader');
}

function getThemeHeaderShadowRoot() {
  const host = getThemeHeaderHost();
  return host && host.shadowRoot ? host.shadowRoot : null;
}

function getLegacyNavArea() {
  const root = getThemeHeaderShadowRoot();
  return root ? root.querySelector('.nav-area') : null;
}

function getTitleBarContainer() {
  return document.querySelector('.css-14h4976-TitleBar-classes-bar');
}

function clearRetryTimer() {
  if (legacyNavPopupRetryTimer) {
    clearTimeout(legacyNavPopupRetryTimer);
    legacyNavPopupRetryTimer = null;
  }
}

function scheduleInitRetry(deps) {
  if (legacyNavPopupRetryTimer) return;
  if (legacyNavPopupRetryCount >= MAX_RETRIES) {
    console.warn('[BoardsCleaner][legacy-nav-popup] giving up after max retries');
    return;
  }

  legacyNavPopupRetryTimer = window.setTimeout(() => {
    legacyNavPopupRetryTimer = null;
    legacyNavPopupRetryCount += 1;
    initLegacyNavPopupFeature(deps);
  }, RETRY_DELAY_MS);
}

function findLegacyNavItem(target) {
  const root = getThemeHeaderShadowRoot();
  if (!root) return null;

  if (target.startsWith('selector:')) {
    return root.querySelector(target.slice(9));
  }

  if (target.startsWith('data:')) {
    const wanted = target.slice(5);
    return (
      Array.from(root.querySelectorAll('.nav-link')).find(
        (el) => (el.dataset.selector || '') === wanted
      ) || null
    );
  }

  if (target.startsWith('text:')) {
    const wanted = target.slice(5).trim().toLowerCase();
    return (
      Array.from(root.querySelectorAll('.nav-link')).find(
        (el) => (el.textContent || '').trim().toLowerCase() === wanted
      ) || null
    );
  }

  return null;
}

function clickLegacyNavItem(target) {
  const el = findLegacyNavItem(target);

  if (!el) {
    console.warn('[BoardsCleaner][legacy-nav-popup] nav item not found:', target);
    return false;
  }

  el.click();
  return true;
}

function isLegacyNavHidden() {
  const navArea = getLegacyNavArea();
  if (!navArea) return false;
  return navArea.dataset.bcHiddenApplied === '1';
}

function updateLegacyNavPreferenceUi(hiddenByDefault) {
  const checkbox = document.getElementById('bc-nav-popup-default-hidden');
  if (checkbox) {
    checkbox.checked = !!hiddenByDefault;
  }

  const labelText = document.getElementById('bc-nav-popup-default-hidden-label');
  if (labelText) {
    labelText.textContent = hiddenByDefault
      ? 'Original nav hidden by default'
      : 'Original nav shown by default';
  }
}

function setLegacyNavHidden(hidden) {
  const navArea = getLegacyNavArea();
  if (!navArea) return false;

  if (hidden) {
    if (!navArea.dataset.bcHiddenApplied) {
      navArea.dataset.bcPrevVisibility = navArea.style.visibility || '';
      navArea.dataset.bcPrevPointerEvents = navArea.style.pointerEvents || '';
      navArea.dataset.bcPrevHeight = navArea.style.height || '';
      navArea.dataset.bcPrevOverflow = navArea.style.overflow || '';
      navArea.dataset.bcPrevOpacity = navArea.style.opacity || '';
      navArea.dataset.bcHiddenApplied = '1';
    }

    navArea.style.visibility = 'hidden';
    navArea.style.pointerEvents = 'none';
    navArea.style.height = '0';
    navArea.style.overflow = 'hidden';
    navArea.style.opacity = '0';
  } else {
    navArea.style.visibility = navArea.dataset.bcPrevVisibility || '';
    navArea.style.pointerEvents = navArea.dataset.bcPrevPointerEvents || '';
    navArea.style.height = navArea.dataset.bcPrevHeight || '';
    navArea.style.overflow = navArea.dataset.bcPrevOverflow || '';
    navArea.style.opacity = navArea.dataset.bcPrevOpacity || '';

    delete navArea.dataset.bcPrevVisibility;
    delete navArea.dataset.bcPrevPointerEvents;
    delete navArea.dataset.bcPrevHeight;
    delete navArea.dataset.bcPrevOverflow;
    delete navArea.dataset.bcPrevOpacity;
    delete navArea.dataset.bcHiddenApplied;
  }

  return true;
}

async function saveHideLegacyNavPreference(getBcSettings) {
  if (!chrome?.storage?.sync || typeof getBcSettings !== 'function') {
    return;
  }

  const checkbox = document.getElementById('bc-nav-popup-default-hidden');
  if (!checkbox) return;

  const settings = await getBcSettings();
  const updatedSettings = {
    ...settings,
    hideLegacyNavByDefault: !!checkbox.checked
  };

  await new Promise((resolve) => {
    chrome.storage.sync.set(
      {
        bc_membersSettings: updatedSettings
      },
      resolve
    );
  });

  updateLegacyNavPreferenceUi(updatedSettings.hideLegacyNavByDefault);
  setLegacyNavHidden(updatedSettings.hideLegacyNavByDefault);
}

function closeLegacyNavPopup() {
  const panel = document.getElementById('bc-nav-popup-panel');
  const toggle = document.getElementById('bc-nav-popup-toggle');

  if (panel) panel.hidden = true;
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function toggleLegacyNavPopup() {
  const panel = document.getElementById('bc-nav-popup-panel');
  const toggle = document.getElementById('bc-nav-popup-toggle');
  if (!panel || !toggle) return;

  const willOpen = panel.hidden;
  panel.hidden = !panel.hidden;
  toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
}

function injectLegacyNavPopupStyles() {
  if (document.getElementById('bc-nav-popup-style')) return;

  const style = document.createElement('style');
  style.id = 'bc-nav-popup-style';
  style.textContent = `
#bc-nav-popup-wrap {
  position: relative;
  z-index: 2147483647;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 8px;
}

#bc-nav-popup-toggle {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 8px;
  background: rgba(255,255,255,0.10);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

#bc-nav-popup-toggle:hover {
  background: rgba(255,255,255,0.18);
}

#bc-nav-popup-panel[hidden] {
  display: none !important;
}

#bc-nav-popup-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 240px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(20,20,20,0.97);
  box-shadow: 0 10px 24px rgba(0,0,0,0.35);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bc-nav-popup-item {
  padding: 9px 10px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  background: #3c5587;
  color: #fff;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  line-height: 1.2;
}

.bc-nav-popup-item:hover {
  background: #4e6ca8;
}

#bc-nav-popup-sep {
  height: 1px;
  margin: 4px 0;
  background: rgba(255,255,255,0.12);
}

#bc-nav-popup-pref {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  color: #fff;
  cursor: pointer;
  user-select: none;
}

#bc-nav-popup-pref input[type="checkbox"] {
  margin: 0;
  inline-size: 16px;
  block-size: 16px;
  accent-color: #4e6ca8;
  cursor: pointer;
}

#bc-nav-popup-default-hidden-label {
  font-size: 13px;
  line-height: 1.3;
}
`;
  document.head.appendChild(style);
}

function bindLegacyNavPopupDocumentHandlers() {
  if (legacyNavPopupDocHandlersBound) return;
  legacyNavPopupDocHandlersBound = true;

  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('bc-nav-popup-wrap');
    if (!wrap) return;

    if (!wrap.contains(e.target)) {
      closeLegacyNavPopup();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLegacyNavPopup();
    }
  });
}

function buildLegacyNavPopup(showPopup, getBcSettings) {
  const wrap = document.createElement('div');
  wrap.id = 'bc-nav-popup-wrap';

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'bc-nav-popup-toggle';
  toggleBtn.type = 'button';
  toggleBtn.textContent = '≡';
  toggleBtn.title = 'Open Boards legacy nav launcher';
  toggleBtn.setAttribute('aria-label', 'Open Boards legacy nav launcher');
  toggleBtn.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('div');
  panel.id = 'bc-nav-popup-panel';
  panel.hidden = true;

  const items = [
    { label: 'Talk to...', target: 'data:#menu_talkto' },
    { label: 'Topics', target: 'data:#menu_topics' },
    { label: 'Regional', target: 'data:#menu_regional' },
    { label: 'Followed Forums', target: 'data:#menu_followed' }
  ];

  items.forEach(({ label, target }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bc-nav-popup-item';
    btn.textContent = label;
    btn.dataset.target = target;
    panel.appendChild(btn);
  });

  const sep = document.createElement('div');
  sep.id = 'bc-nav-popup-sep';
  panel.appendChild(sep);

  const pref = document.createElement('label');
  pref.id = 'bc-nav-popup-pref';

  const prefCheckbox = document.createElement('input');
  prefCheckbox.type = 'checkbox';
  prefCheckbox.id = 'bc-nav-popup-default-hidden';

  const prefLabel = document.createElement('span');
  prefLabel.id = 'bc-nav-popup-default-hidden-label';
  prefLabel.textContent = 'Original nav hidden by default';

  pref.appendChild(prefCheckbox);
  pref.appendChild(prefLabel);
  panel.appendChild(pref);

  wrap.appendChild(toggleBtn);
  wrap.appendChild(panel);

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLegacyNavPopup();
  });

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('.bc-nav-popup-item');
    if (!btn) return;

    const ok = clickLegacyNavItem(btn.dataset.target);
    if (!ok && typeof showPopup === 'function') {
      showPopup(`Legacy nav item not found: ${btn.textContent}`, 3500);
    }

    closeLegacyNavPopup();
  });

  prefCheckbox.addEventListener('change', async (e) => {
    e.stopPropagation();
    await saveHideLegacyNavPreference(getBcSettings);
  });

  pref.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  return wrap;
}

function ensureLegacyNavPopupInserted(showPopup, getBcSettings) {
  const bar = getTitleBarContainer();
  if (!bar) return false;

  let wrap = document.getElementById('bc-nav-popup-wrap');

  if (wrap && !bar.contains(wrap)) {
    wrap.remove();
    wrap = null;
  }

  if (!wrap) {
    wrap = buildLegacyNavPopup(showPopup, getBcSettings);

    const meBox = bar.querySelector('.compactMeBox') || bar.lastElementChild || null;
    if (meBox && meBox.parentNode) {
      meBox.parentNode.insertBefore(wrap, meBox);
    } else {
      bar.appendChild(wrap);
    }
  }

  return true;
}

export async function initLegacyNavPopupFeature({
  showPopup,
  getBcSettings
} = {}) {
  injectLegacyNavPopupStyles();
  bindLegacyNavPopupDocumentHandlers();

  const navArea = getLegacyNavArea();
  const bar = getTitleBarContainer();

  if (!navArea || !bar) {
    scheduleInitRetry({ showPopup, getBcSettings });
    return false;
  }

  clearRetryTimer();
  legacyNavPopupRetryCount = 0;

  ensureLegacyNavPopupInserted(showPopup, getBcSettings);

  const settings = typeof getBcSettings === 'function'
    ? await getBcSettings()
    : {};

  const hiddenByDefault = !!settings?.hideLegacyNavByDefault;

  updateLegacyNavPreferenceUi(hiddenByDefault);
  setLegacyNavHidden(hiddenByDefault);

  return true;
}

export function refreshLegacyNavPopupFeature(deps = {}) {
  return initLegacyNavPopupFeature(deps);
}