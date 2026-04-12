(() => {
const ext = globalThis.browser || globalThis.chrome;
const hasStorage = !!(ext && ext.storage && ext.storage.local);
if (!hasStorage) return;
  const chk = document.getElementById("svlv-auto-check");
  if (!chk || !ext?.storage?.local) return;

  ext.storage.local.get(["autoCheckLeaflets"]).then((res) => {
    chk.checked = !!res.autoCheckLeaflets;
  }).catch(() => {});

  chk.addEventListener("change", async () => {
    try {
      await ext.storage.local.set({ autoCheckLeaflets: chk.checked });
      await ext.runtime.sendMessage({ type: "SVLV_RECONFIGURE_ALARMS" });
    } catch (e) {
      console.error("Failed to update auto-check setting", e);
    }
  });
})();
document.addEventListener("DOMContentLoaded", () => {
  const testBtn = document.getElementById("svlv-test-notification");
  if (!testBtn || !chrome.runtime?.sendMessage) return;

  testBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "SVLV_TEST_NOTIFICATION" });
  });
});