(() => {
  function normalizeHost(input) {
    try {
      return new URL(input).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return String(input || '').trim().toLowerCase().replace(/^www\./, '');
    }
  }

  async function loadSiteWhitelistRules() {
    try {
      const url = chrome.runtime.getURL('whitelist.json');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('whitelist.json is not an array');

      return data;
    } catch (err) {
      console.warn('ExtScanAlert: failed to load whitelist.json in content.js', err);
      return [];
    }
  }

  function hostHasContentHooksBypass(host, rules = []) {
    const normalizedHost = normalizeHost(host);
    if (!normalizedHost) return false;

    return rules.some((entry) => {
      if (!entry || !entry.host || !entry.contentHooksBypass) return false;
      return normalizeHost(entry.host) === normalizedHost;
    });
  }

  async function main() {
    if (!location || !/^https?:\/\//.test(location.href)) return;

    // Heartbeat so background knows this tab is active
    chrome.runtime.sendMessage({ type: 'heartbeat', page: location.href }).catch(() => {});

    const whitelistRules = await loadSiteWhitelistRules();
    const currentHost = normalizeHost(location.hostname || location.href);

    if (hostHasContentHooksBypass(currentHost, whitelistRules)) {
      console.info(`ExtScanAlert: content hook bypass active for ${currentHost}`);
      return;
    }

    // Get settings and expose block flag synchronously via DOM attribute
    try {
      const settings = await chrome.runtime.sendMessage({ type: 'getSettings' });
      const blockMode = !!settings?.dangerousCopyBlockMode;

      document.documentElement.setAttribute(
        'data-extscanalert-copy-block',
        blockMode ? 'true' : 'false'
      );

      // Optional: if you still want dynamic config messages, you can keep this:
      // window.postMessage(
      //   {
      //     source: 'extscanalert-config',
      //     kind: 'dangerous-copy-config',
      //     blockMode
      //   },
      //   '*'
      // );
    } catch (err) {
      console.warn('ExtScanAlert: failed to read settings for copy block', err);
    }

    // Inject page-hook.js into the main world
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('page-hook.js');
    s.onload = () => s.remove();
    (document.documentElement || document.head || document.body).appendChild(s);

    // Relay messages from page-hook.js to background.js
    window.addEventListener('message', async (event) => {
      const msg = event.data;
      if (event.source !== window || !msg || msg.source !== 'extscanalert') return;

      // Dangerous-copy relay (sent by page-hook via postObserve)
      if (msg.kind === 'dangerous-copy') {
        try {
          await chrome.runtime.sendMessage({
            type: 'dangerous-copy',
            page: msg.page,
            preview: msg.meta?.preview || '',
            length: msg.meta?.length || 0
          });
        } catch (err) {
          console.warn('ExtScanAlert: failed to send dangerous-copy message', err);
        }
        return;
      }

      // Existing behaviour: extension-probe, fingerprint-api, etc.
      try {
        const response = await chrome.runtime.sendMessage(msg);

        if (msg.requestId) {
          window.postMessage(
            {
              source: 'extscanalert-response',
              requestId: msg.requestId,
              action: response?.action || 'allow'
            },
            '*'
          );
        }
      } catch {
        if (msg.requestId) {
          window.postMessage(
            {
              source: 'extscanalert-response',
              requestId: msg.requestId,
              action: 'allow'
            },
            '*'
          );
        }
      }
    });
  }

  main().catch((err) => {
    console.error('ExtScanAlert content.js failed', err);
  });
})();