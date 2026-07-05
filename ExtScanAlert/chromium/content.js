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

    chrome.runtime.sendMessage({ type: 'heartbeat', page: location.href }).catch(() => {});

    const whitelistRules = await loadSiteWhitelistRules();
    const currentHost = normalizeHost(location.hostname || location.href);

    if (hostHasContentHooksBypass(currentHost, whitelistRules)) {
      console.info(`ExtScanAlert: content hook bypass active for ${currentHost}`);
      return;
    }

    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('page-hook.js');
    s.onload = () => s.remove();
    (document.documentElement || document.head || document.body).appendChild(s);

    window.addEventListener('message', async (event) => {
      if (event.source !== window || !event.data || event.data.source !== 'extscanalert') return;

      try {
        const response = await chrome.runtime.sendMessage(event.data);

        if (event.data.requestId) {
          window.postMessage({
            source: 'extscanalert-response',
            requestId: event.data.requestId,
            action: response?.action || 'allow'
          }, '*');
        }
      } catch {
        if (event.data.requestId) {
          window.postMessage({
            source: 'extscanalert-response',
            requestId: event.data.requestId,
            action: 'allow'
          }, '*');
        }
      }
    });
  }

  main().catch((err) => {
    console.error('ExtScanAlert content.js failed', err);
  });
})();