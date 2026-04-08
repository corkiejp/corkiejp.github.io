(() => {
  const suspiciousSchemes = ['chrome-extension://', 'moz-extension://'];
  let seq = 0;

  const isSuspicious = (value) =>
    typeof value === 'string' && suspiciousSchemes.some(prefix => value.startsWith(prefix));

  function askExtension(url, method) {
    return new Promise((resolve) => {
      const requestId = `req-${Date.now()}-${++seq}`;
      const onMessage = (event) => {
        if (event.source !== window || !event.data || event.data.source !== 'anti-extension-probe-response') return;
        if (event.data.requestId !== requestId) return;
        window.removeEventListener('message', onMessage);
        resolve(event.data.action || 'allow');
      };
      window.addEventListener('message', onMessage);
      window.postMessage({
        source: 'anti-extension-probe',
        kind: 'candidate',
        requestId,
        url,
        method,
        page: location.href
      }, '*');
      setTimeout(() => {
        window.removeEventListener('message', onMessage);
        resolve('allow');
      }, 1500);
    });
  }

  const wrapFetch = () => {
    const orig = window.fetch;
    if (!orig) return;
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input?.url;
      if (isSuspicious(url)) {
        const action = await askExtension(url, 'fetch');
        if (action === 'block') {
          return Promise.reject(new DOMException('Blocked possible extension probe', 'SecurityError'));
        }
      }
      return orig.apply(this, arguments);
    };
  };

  const wrapXHR = () => {
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      this.__extScanPending = isSuspicious(url) ? askExtension(url, 'xhr') : null;
      this.__extScanUrl = url;
      return open.apply(this, arguments);
    };

    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = async function() {
      if (this.__extScanPending) {
        const action = await this.__extScanPending;
        if (action === 'block') {
          throw new DOMException('Blocked possible extension probe', 'SecurityError');
        }
      }
      return send.apply(this, arguments);
    };
  };

  const wrapBeacon = () => {
    if (!navigator.sendBeacon) return;
    const orig = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function(url, data) {
      if (!isSuspicious(url)) return orig(url, data);
      askExtension(url, 'beacon').then((action) => {
        if (action !== 'block') orig(url, data);
      });
      return true;
    };
  };

  const wrapSetter = (Ctor, prop, label) => {
    const desc = Object.getOwnPropertyDescriptor(Ctor?.prototype, prop);
    if (!desc?.set) return;
    Object.defineProperty(Ctor.prototype, prop, {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set(value) {
        if (!isSuspicious(value)) return desc.set.call(this, value);
        askExtension(value, label).then((action) => {
          if (action !== 'block') desc.set.call(this, value);
        });
        return value;
      }
    });
  };

  wrapFetch();
  wrapXHR();
  wrapBeacon();
  wrapSetter(HTMLImageElement, 'src', 'img.src');
  wrapSetter(HTMLScriptElement, 'src', 'script.src');
  wrapSetter(HTMLIFrameElement, 'src', 'iframe.src');
  wrapSetter(HTMLLinkElement, 'href', 'link.href');
})();
