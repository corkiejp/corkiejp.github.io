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
})();