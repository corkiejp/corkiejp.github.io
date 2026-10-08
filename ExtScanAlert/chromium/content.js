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
      window.postMessage({ source: 'extscanalert-config', disabled: true }, '*');
      return;
    }

    try {
      const settings = await chrome.runtime.sendMessage({ type: 'getSettings' });
      const blockMode = !!settings?.dangerousCopyBlockMode;
      const blockedDomains = new Set();

      if (settings?.providerPolicies) {
        for (const [host, policies] of Object.entries(settings.providerPolicies)) {
          for (const [_, rule] of Object.entries(policies || {})) {
            if (rule?.mode === 'block') {
              blockedDomains.add(host.toLowerCase());
            }
          }
        }
      }

      if (settings?.sitePolicies) {
        for (const [host, policy] of Object.entries(settings.sitePolicies)) {
          if (policy?.mode === 'block') {
            blockedDomains.add(host.toLowerCase());
          }
        }
      }

      window.postMessage({
        source: 'extscanalert-config',
        blockMode: blockMode,
        disabled: false,
        blockedDomains: Array.from(blockedDomains)
      }, '*');

    } catch (err) {
      console.warn('ExtScanAlert: failed to read settings for copy block', err);
    }

    window.addEventListener('message', async (event) => {
      const msg = event.data;
      if (event.source !== window || !msg || msg.source !== 'extscanalert') return;

      if (msg.kind === 'dangerous-copy') {
        try {
          await chrome.runtime.sendMessage({
            type: 'dangerous-copy',
            page: msg.page,
            preview: msg.meta?.preview || '',
            length: msg.meta?.length || 0,
            clickFixHints: msg.clickFixHints || [],
            clickFixHintScore: msg.clickFixHintScore || 0
          });
        } catch (err) {
          console.warn('ExtScanAlert: failed to send dangerous-copy message', err);
        }
        return;
      }

      try {
        const response = await chrome.runtime.sendMessage(msg);
        if (msg.requestId) {
          window.postMessage({
            source: 'extscanalert-response',
            requestId: msg.requestId,
            action: response?.action || 'allow'
          }, '*');
        }
      } catch {
        if (msg.requestId) {
          window.postMessage({
            source: 'extscanalert-response',
            requestId: msg.requestId,
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
