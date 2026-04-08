(() => {
  chrome.runtime.sendMessage({ type: 'heartbeat', page: location.href });

  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('page-hook.js');
  s.onload = () => s.remove();
  (document.documentElement || document.head || document.body).appendChild(s);

  window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'anti-extension-probe') return;
    try {
      const response = await chrome.runtime.sendMessage(event.data);
      if (event.data.requestId) {
        window.postMessage({ source: 'anti-extension-probe-response', requestId: event.data.requestId, action: response?.action || 'allow' }, '*');
      }
    } catch {
      if (event.data.requestId) {
        window.postMessage({ source: 'anti-extension-probe-response', requestId: event.data.requestId, action: 'allow' }, '*');
      }
    }
  });
})();
