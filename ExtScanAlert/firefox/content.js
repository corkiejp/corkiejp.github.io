(() => {
  browser.runtime.sendMessage({
    type: "heartbeat",
    page: location.href
  });

  const s = document.createElement("script");
  s.src = browser.runtime.getURL("page-hook.js");
  s.onload = () => s.remove();
  (document.documentElement || document.head || document.body).appendChild(s);

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== "anti-extension-probe") return;
    browser.runtime.sendMessage(event.data);
  });
})();