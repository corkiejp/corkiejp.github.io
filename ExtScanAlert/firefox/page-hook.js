(() => {
  const suspiciousSchemes = ["moz-extension://", "chrome-extension://"];
  const sessionAllow = new Map();

  const isSuspicious = (value) =>
    typeof value === "string" &&
    suspiciousSchemes.some(prefix => value.startsWith(prefix));

  const ask = (url, type) => {
    const host = location.hostname;
    const key = `${host}|${type}|${url}`;
    if (sessionAllow.has(key)) return sessionAllow.get(key);

    const ok = window.confirm(
      `${location.hostname} is attempting a possible extension probe:\n\n${type}: ${url}\n\nAllow this attempt?`
    );

    sessionAllow.set(key, ok);

    window.postMessage({
      source: "anti-extension-probe",
      kind: "probe",
      url,
      type,
      allowed: ok,
      page: location.href,
      time: Date.now()
    }, "*");

    return ok;
  };

  const wrapFetch = () => {
    const orig = window.fetch;
    if (!orig) return;
    window.fetch = function(input, init) {
      const url = typeof input === "string" ? input : input?.url;
      if (isSuspicious(url) && !ask(url, "fetch")) {
        return Promise.reject(new DOMException("Blocked possible extension probe", "SecurityError"));
      }
      return orig.apply(this, arguments);
    };
  };

  const wrapXHR = () => {
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      if (isSuspicious(url) && !ask(url, "xhr")) {
        throw new DOMException("Blocked possible extension probe", "SecurityError");
      }
      return open.apply(this, arguments);
    };
  };

  const wrapBeacon = () => {
    if (!navigator.sendBeacon) return;
    const orig = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function(url, data) {
      if (isSuspicious(url) && !ask(url, "beacon")) return false;
      return orig(url, data);
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
        if (isSuspicious(value) && !ask(value, label)) return value;
        return desc.set.call(this, value);
      }
    });
  };

  wrapFetch();
  wrapXHR();
  wrapBeacon();
  wrapSetter(HTMLImageElement, "src", "img.src");
  wrapSetter(HTMLScriptElement, "src", "script.src");
  wrapSetter(HTMLIFrameElement, "src", "iframe.src");
  wrapSetter(HTMLLinkElement, "href", "link.href");
})();