// assets/js/features/overlay-manager.js

(() => {
  try {
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

    const LOADER_ID = 'custom-loader';
    const STYLE_ID = 'bc-overlay-styles';
    const STORAGE_KEYS = {
      memberCode: 'bc_memberCode',
      memberActive: 'bc_memberActive',
      settings: 'bc_membersSettings'
    };

    const DEFAULT_BC_SETTINGS = {
      globalColourShift: true,
      overlayDelay: isMobile ? 9 : 3,
      overlayMessage: isMobile
        ? 'Boards.ie Cleaner | Loading...'
        : 'Boards.ie Cleaner | Created by corkie! | Thanks for supporting the site | Loading...',
      cmpBlock: false,
      removeAds: false,
      removeAlerts: false,
      cookieDisagree: false,
      blockTwitterWidgets: false,
      blockInmobiCmp: false
    };

    let overlayDelayMs = DEFAULT_BC_SETTINGS.overlayDelay * 1000;
    let overlayMessage = DEFAULT_BC_SETTINGS.overlayMessage;
    let lastChangeTime = performance.now();
    let overlayActive = false;
    let rafId = 0;
    let hardTimeoutId = 0;
    let stabilityObserver = null;

    function normaliseBcSettings(settings) {
      return {
        ...DEFAULT_BC_SETTINGS,
        ...(settings || {})
      };
    }

    function loadBcSettingsDirect() {
      return new Promise(resolve => {
        if (!chrome?.storage?.sync) {
          resolve(normaliseBcSettings(null));
          return;
        }

        chrome.storage.sync.get(
          [STORAGE_KEYS.memberCode, STORAGE_KEYS.memberActive, STORAGE_KEYS.settings],
          result => {
            const safeResult = result || {};
            resolve(normaliseBcSettings(safeResult[STORAGE_KEYS.settings]));
          }
        );
      });
    }

    function ensureOverlayStyles() {
      if (document.getElementById(STYLE_ID)) return;

      const icon128loader = chrome.runtime.getURL('assets/boardsedited128.png');

      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
body.overlay-hide {
  position: relative !important;
  overflow: hidden !important;
}

body.overlay-hide > *:not(#${LOADER_ID}):not(script):not(style) {
  opacity: 0 !important;
}

#${LOADER_ID} {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: var(--t-link, #3c5587);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #fff;
  font-size: 20px;
  line-height: 1.4;
  text-align: center;
  padding: 24px;
  background-image: url("${icon128loader}");
  background-repeat: no-repeat;
  background-position: center 48px;
  background-size: 256px auto;
  box-sizing: border-box;
}

#${LOADER_ID} * {
  visibility: visible !important;
}

#custom-loader-message {
  margin-top: 120px;
  max-width: 90vw;
  white-space: normal;
  word-break: break-word;
}
`;
      (document.head || document.documentElement).appendChild(style);
    }

    function ensureLoader() {
      if (!document.body) return null;

      let loader = document.getElementById(LOADER_ID);
      if (!loader) {
        loader = document.createElement('div');
        loader.id = LOADER_ID;

        const msg = document.createElement('div');
        msg.id = 'custom-loader-message';
        loader.appendChild(msg);

        document.body.appendChild(loader);
      }

      const msgEl = loader.querySelector('#custom-loader-message');
      if (msgEl) {
        msgEl.textContent = overlayMessage;
      }

      return loader;
    }

    function clearOverlayTimers() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }

      if (hardTimeoutId) {
        clearTimeout(hardTimeoutId);
        hardTimeoutId = 0;
      }
    }

    function stopObserver() {
      if (stabilityObserver) {
        stabilityObserver.disconnect();
        stabilityObserver = null;
      }
    }

    function removeOverlay() {
      overlayActive = false;
      clearOverlayTimers();
      stopObserver();

      document.body?.classList.remove('overlay-hide');

      const loader = document.getElementById(LOADER_ID);
      if (loader) loader.remove();
    }

    function checkIfStable() {
      if (!overlayActive) return;

      const now = performance.now();

      if (now - lastChangeTime >= overlayDelayMs) {
        removeOverlay();
        return;
      }

      rafId = requestAnimationFrame(checkIfStable);
    }

    function startObserver() {
      if (!document.documentElement) return;

      stopObserver();

      stabilityObserver = new MutationObserver(() => {
        if (!overlayActive) return;
        lastChangeTime = performance.now();
      });

      stabilityObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }

    function applyOverlayConfig(message, delayMs) {
      overlayMessage = message || overlayMessage;
      overlayDelayMs = typeof delayMs === 'number' && delayMs >= 0
        ? delayMs
        : overlayDelayMs;

      if (!document.body) {
        document.addEventListener('DOMContentLoaded', () => {
          applyOverlayConfig(message, delayMs);
        }, { once: true });
        return;
      }

      clearOverlayTimers();
      stopObserver();

      if (overlayDelayMs === 0) {
        removeOverlay();
        return;
      }

      ensureOverlayStyles();
      ensureLoader();

      overlayActive = true;
      document.body.classList.add('overlay-hide');
      lastChangeTime = performance.now();
      startObserver();

      hardTimeoutId = window.setTimeout(() => {
        removeOverlay();
      }, Math.max(2500, overlayDelayMs + 2500));

      rafId = requestAnimationFrame(checkIfStable);
    }

    async function hydrateOverlaySettings() {
      try {
        const settings = await loadBcSettingsDirect();
        const delaySeconds =
          typeof settings.overlayDelay === 'number' && !Number.isNaN(settings.overlayDelay)
            ? settings.overlayDelay
            : DEFAULT_BC_SETTINGS.overlayDelay;

        const message =
          settings.overlayMessage && settings.overlayMessage.trim()
            ? settings.overlayMessage
            : DEFAULT_BC_SETTINGS.overlayMessage;

        applyOverlayConfig(message, delaySeconds * 1000);
      } catch (err) {
        console.error('[BoardsCleaner][overlay] direct settings load failed', err);
      }
    }

async function startOverlay() {
  let settingsResolved = false;

  const fallbackTimer = window.setTimeout(() => {
    if (settingsResolved) return;
    applyOverlayConfig(
      DEFAULT_BC_SETTINGS.overlayMessage,
      DEFAULT_BC_SETTINGS.overlayDelay * 1000
    );
  }, 120);

  try {
    const settings = await loadBcSettingsDirect();
    settingsResolved = true;
    clearTimeout(fallbackTimer);

    const delaySeconds =
      typeof settings.overlayDelay === 'number' && !Number.isNaN(settings.overlayDelay)
        ? settings.overlayDelay
        : DEFAULT_BC_SETTINGS.overlayDelay;

    const message =
      settings.overlayMessage && settings.overlayMessage.trim()
        ? settings.overlayMessage
        : DEFAULT_BC_SETTINGS.overlayMessage;

    if (delaySeconds <= 0) {
      removeOverlay();
      return;
    }

    applyOverlayConfig(message, delaySeconds * 1000);
  } catch (err) {
    settingsResolved = true;
    clearTimeout(fallbackTimer);
    console.error('[BoardsCleaner][overlay] direct settings load failed', err);

    applyOverlayConfig(
      DEFAULT_BC_SETTINGS.overlayMessage,
      DEFAULT_BC_SETTINGS.overlayDelay * 1000
    );
  }
}

    startOverlay();

    window.BCOverlay = {
      applyOverlayConfig,
      removeOverlay,
      markActivity() {
        lastChangeTime = performance.now();
      }
    };
  } catch (err) {
    console.warn('[BoardsCleaner][overlay] init failed', err);
  }
})();