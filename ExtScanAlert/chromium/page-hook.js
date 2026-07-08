  // At top of page-hook.js
window.__extScanAlertDangerousCopyBlock =
  document.documentElement.getAttribute('data-extscanalert-copy-block') === 'true';

// Optionally still listen for dynamic updates (if you later re-send config)
window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || msg.source !== 'extscanalert-config') return;
  if (msg.kind === 'dangerous-copy-config') {
    window.__extScanAlertDangerousCopyBlock = !!msg.blockMode;
  }
});

(() => {
  if (!location || !/^https?:\/\//.test(location.href)) return;

  const suspiciousSchemes = ['chrome-extension://'];
  let seq = 0;
  const SOURCE = 'extscanalert';

  function now() {
    return Date.now();
  }

  function isSuspicious(value) {
    return typeof value === 'string' && suspiciousSchemes.some((prefix) => value.startsWith(prefix));
  }
  

  
  // NEW: basic matcher for dangerous-looking commands
function looksLikeDangerousCommand(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();

  // Too short to be interesting
  if (trimmed.length < 10) return false;

  const lower = trimmed.toLowerCase();

  // Simple heuristics — you can expand these over time
const patterns = [
  // Windows / PowerShell
  'powershell -command',
  'powershell -nop',
  'powershell.exe',
  'invoke-webrequest',
  'iex(',
  'reg add ',
  'reg delete ',
  'schtasks /create',
  'wmic process call',
  'cmd.exe /c',
  'start-process powershell',
  'certutil -urlcache',
  'bitsadmin /transfer',

  // Cross-platform / *nix-ish
  'curl ',
  'wget ',
  'bash -c',
  'sh -c',
  '| bash',
  '| sh',

  // Explicit high‑risk *nix commands
  'sudo rm -rf /',
  'sudo rm -rf --no-preserve-root /',
  'sudo curl ',
  'sudo wget ',
  'sudo bash -c',
  'sudo sh -c'
];

  return patterns.some((p) => lower.includes(p));
}





window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || msg.source !== 'extscanalert-config') return;
  if (msg.kind === 'dangerous-copy-config') {
    window.__extScanAlertDangerousCopyBlock = !!msg.blockMode;
  }
});



  function postObserve(kind, subtype, details = {}) {
    window.postMessage({
      source: SOURCE,
      kind,
      subtype,
      page: location.href,
      time: now(),
      stack: new Error().stack || '',
      ...details
    }, '*');
  }

  function askExtension(url, method) {
    return new Promise((resolve) => {
      const requestId = `req-${Date.now()}-${++seq}`;

      const onMessage = (event) => {
        if (event.source !== window || !event.data || event.data.source !== `${SOURCE}-response`) return;
        if (event.data.requestId !== requestId) return;
        window.removeEventListener('message', onMessage);
        resolve(event.data.action || 'allow');
      };

      window.addEventListener('message', onMessage);

      window.postMessage({
        source: SOURCE,
        kind: 'extension-probe',
        requestId,
        url,
        subtype: method,
        page: location.href
      }, '*');

      setTimeout(() => {
        window.removeEventListener('message', onMessage);
        resolve('allow');
      }, 1500);
    });
  }

  function wrapFetch() {
    const orig = window.fetch;
    if (typeof orig !== 'function') return;

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
  }

  function wrapXHR() {
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
      this.__extScanPending = isSuspicious(url) ? askExtension(url, 'xhr') : null;
      return open.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = async function() {
      if (this.__extScanPending) {
        const action = await this.__extScanPending;
        if (action === 'block') {
          throw new DOMException('Blocked possible extension probe', 'SecurityError');
        }
      }

      return send.apply(this, arguments);
    };
  }

  function wrapBeacon() {
    if (typeof navigator.sendBeacon !== 'function') return;
    const orig = navigator.sendBeacon.bind(navigator);

    navigator.sendBeacon = function(url, data) {
      if (!isSuspicious(url)) return orig(url, data);

      askExtension(url, 'beacon').then((action) => {
        if (action !== 'block') orig(url, data);
      });

      return true;
    };
  }

  function wrapCanvasElement() {
    const canvasProto = HTMLCanvasElement?.prototype;
    if (!canvasProto) return;

    const wrapMethod = (name) => {
      const orig = canvasProto[name];
      if (typeof orig !== 'function') return;

      canvasProto[name] = function(...args) {
        postObserve('fingerprint-api', `canvas.${name}`, {
          target: 'HTMLCanvasElement',
          meta: {
            width: this.width,
            height: this.height
          }
        });
        return orig.apply(this, args);
      };
    };

    wrapMethod('toDataURL');
    wrapMethod('toBlob');

    const origGetContext = canvasProto.getContext;
    if (typeof origGetContext === 'function') {
      canvasProto.getContext = function(type, ...rest) {
        if (type === '2d' || type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          postObserve('fingerprint-api', 'canvas.getContext', {
            target: 'HTMLCanvasElement',
            meta: { contextType: type }
          });
        }
        return origGetContext.call(this, type, ...rest);
      };
    }
  }

  function wrapCanvasContext2D() {
    const proto = CanvasRenderingContext2D?.prototype;
    if (!proto) return;

    const orig = proto.getImageData;
    if (typeof orig !== 'function') return;

    proto.getImageData = function(...args) {
      postObserve('fingerprint-api', 'canvas.getImageData', {
        target: 'CanvasRenderingContext2D',
        meta: {
          args: args.slice(0, 4)
        }
      });
      return orig.apply(this, args);
    };
  }

  function wrapOffscreenCanvas() {
    const proto = window.OffscreenCanvas?.prototype;
    if (!proto) return;

    const origGetContext = proto.getContext;
    if (typeof origGetContext === 'function') {
      proto.getContext = function(type, ...rest) {
        if (type === '2d' || type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          postObserve('fingerprint-api', 'offscreen.getContext', {
            target: 'OffscreenCanvas',
            meta: { contextType: type }
          });
        }
        return origGetContext.call(this, type, ...rest);
      };
    }

    const origConvertToBlob = proto.convertToBlob;
    if (typeof origConvertToBlob === 'function') {
      proto.convertToBlob = function(...args) {
        postObserve('fingerprint-api', 'offscreen.convertToBlob', {
          target: 'OffscreenCanvas',
          meta: {}
        });
        return origConvertToBlob.apply(this, args);
      };
    }
  }

  function wrapWebGL() {
    const wrapProto = (proto, label) => {
      if (!proto) return;
      const orig = proto.getParameter;
      if (typeof orig !== 'function') return;

      proto.getParameter = function(param) {
        if (
          param === 37445 ||
          param === 37446 ||
          param === this.VENDOR ||
          param === this.RENDERER ||
          param === this.VERSION ||
          param === this.SHADING_LANGUAGE_VERSION
        ) {
          postObserve('fingerprint-api', 'webgl.getParameter', {
            target: label,
            meta: { param }
          });
        }

        return orig.apply(this, arguments);
      };
    };

    wrapProto(window.WebGLRenderingContext?.prototype, 'WebGLRenderingContext');
    wrapProto(window.WebGL2RenderingContext?.prototype, 'WebGL2RenderingContext');
  }

  function wrapSetter(Ctor, prop, label) {
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
  }
  
function wrapCopyProtection() {
  document.addEventListener(
    'copy',
    (event) => {
      try {
        const selection = window.getSelection();
        const text = selection ? selection.toString() : '';

        if (!looksLikeDangerousCommand(text)) return;

        // Always notify background for logging + notification
        postObserve('dangerous-copy', 'command', {
          target: 'clipboard',
          meta: {
            preview: text.slice(0, 160),
            length: text.length
          }
        });

        // Block locally when advanced mode is enabled
        if (window.__extScanAlertDangerousCopyBlock) {
          event.preventDefault();
        }
      } catch (err) {
        console.warn('[ExtScanAlert] copy handler error', err);
      }
    },
    true
  );
}

function wrapClipboardAPI() {
  if (!navigator.clipboard) return;

  // Intercept writeText
  const origWriteText = navigator.clipboard.writeText;
  if (typeof origWriteText === 'function') {
    navigator.clipboard.writeText = async function(text) {
      if (looksLikeDangerousCommand(text)) {
        postObserve('dangerous-copy', 'command', {
          target: 'clipboard',
          meta: {
            preview: text.slice(0, 160),
            length: text.length
          }
        });

        if (window.__extScanAlertDangerousCopyBlock) {
          throw new DOMException('Clipboard write blocked by ExtScanAlert', 'SecurityError');
        }
      }
      return origWriteText.apply(this, arguments);
    };
  }

  // Intercept write (ClipboardItem[])
  const origWrite = navigator.clipboard.write;
  if (typeof origWrite === 'function') {
    navigator.clipboard.write = async function(data) {
      try {
        let hasDangerous = false;
        let text = '';
        for (const item of data) {
          if (item.types.includes('text/plain')) {
            const blob = await item.getType('text/plain');
            text = await blob.text();
            if (looksLikeDangerousCommand(text)) {
              hasDangerous = true;
              break;
            }
          }
        }

        if (hasDangerous) {
          postObserve('dangerous-copy', 'command', {
            target: 'clipboard',
            meta: {
              preview: text.slice(0, 160),
              length: text.length
            }
          });

          if (window.__extScanAlertDangerousCopyBlock) {
            throw new DOMException('Clipboard write blocked by ExtScanAlert', 'SecurityError');
          }
        }
      } catch (e) {
        console.warn('[ExtScanAlert] failed to check clipboard write', e);
      }

      return origWrite.apply(this, arguments);
    };
  }
}


function wrapNavigatorHardware() {
  try {
    const nav = navigator;

    // Read-only properties — log once when accessed
    const logHardware = () => {
      window.postMessage({
        source: SOURCE,
        kind: 'fingerprint-api',
        subtype: 'navigator.hardware',
        page: location.href,
        time: now(),
        stack: new Error().stack || '',
        meta: {
          hardwareConcurrency: nav.hardwareConcurrency,
          deviceMemory: nav.deviceMemory,
          maxTouchPoints: nav.maxTouchPoints
        }
      }, '*');
    };

    // Hook a common access path: Object.keys(navigator), etc. is too broad;
    // instead, log the first time code reads any of these fields.
    let logged = false;
    const props = ['hardwareConcurrency', 'deviceMemory', 'maxTouchPoints'];

    props.forEach((prop) => {
      const desc = Object.getOwnPropertyDescriptor(nav, prop);
      if (!desc || !desc.get) return;
      Object.defineProperty(nav, prop, {
        configurable: true,
        enumerable: desc.enumerable,
        get() {
          if (!logged) {
            logged = true;
            logHardware();
          }
          return desc.get.call(nav);
        }
      });
    });
  } catch (e) {
    console.warn('[ExtScanAlert] navigator hardware hook failed', e);
  }
}

function wrapWebStorage() {
  try {
    const origLocalSet = localStorage?.setItem;
    if (typeof origLocalSet === 'function') {
      localStorage.setItem = function(key, value) {
        window.postMessage({
          source: SOURCE,
          kind: 'fingerprint-api',
          subtype: 'storage.localStorage.setItem',
          page: location.href,
          time: now(),
          stack: new Error().stack || '',
          meta: { key }
        }, '*');
        return origLocalSet.apply(this, arguments);
      };
    }

    const origSessionSet = sessionStorage?.setItem;
    if (typeof origSessionSet === 'function') {
      sessionStorage.setItem = function(key, value) {
        window.postMessage({
          source: SOURCE,
          kind: 'fingerprint-api',
          subtype: 'storage.sessionStorage.setItem',
          page: location.href,
          time: now(),
          stack: new Error().stack || '',
          meta: { key }
        }, '*');
        return origSessionSet.apply(this, arguments);
      };
    }
  } catch (e) {
    console.warn('[ExtScanAlert] storage hook failed', e);
  }
}

function wrapGeolocation() {
  try {
    const geo = navigator.geolocation;
    if (!geo) return;

    const origGetCurrentPosition = geo.getCurrentPosition;
    if (typeof origGetCurrentPosition === 'function') {
      geo.getCurrentPosition = function(success, error, options) {
        window.postMessage({
          source: SOURCE,
          kind: 'fingerprint-api',
          subtype: 'geolocation.getCurrentPosition',
          page: location.href,
          time: now(),
          stack: new Error().stack || '',
          meta: {}
        }, '*');
        return origGetCurrentPosition.call(this, success, error, options);
      };
    }
  } catch (e) {
    console.warn('[ExtScanAlert] geolocation hook failed', e);
  }
}



  wrapFetch();
  wrapXHR();
  wrapBeacon();
  wrapSetter(HTMLImageElement, 'src', 'img.src');
  wrapSetter(HTMLScriptElement, 'src', 'script.src');
  wrapSetter(HTMLIFrameElement, 'src', 'iframe.src');
  wrapSetter(HTMLLinkElement, 'href', 'link.href');
  wrapCanvasElement();
  wrapCanvasContext2D();
  wrapOffscreenCanvas();
  wrapWebGL();
  wrapCopyProtection();
  wrapClipboardAPI();
  wrapNavigatorHardware();
  wrapWebStorage();
  wrapGeolocation();
})();