(() => {
  const ext = globalThis.browser || globalThis.chrome;
  const hasStorage = !!(ext && ext.storage && ext.storage.local);
  if (!hasStorage) return;

  const chk = document.getElementById("svlv-auto-check");
  const cadence = document.getElementById("svlv-cadence");
  const resetBtn = document.getElementById("svlv-reset-state");
  const testBtn = document.getElementById("svlv-test-notification");
  const status = document.getElementById("svlv-status");

  function setStatus(text) {
    if (status) status.textContent = text || "";
  }

  async function loadSettings() {
    try {
      const res = await ext.storage.local.get([
        "autoCheckLeaflets",
        "leafletCadence"
      ]);

      if (chk) chk.checked = !!res.autoCheckLeaflets;
      if (cadence) cadence.value = res.leafletCadence || "weekly";
    } catch (e) {
      console.error("Failed to load settings", e);
      setStatus("Failed to load settings.");
    }
  }

  if (chk) {
    chk.addEventListener("change", async () => {
      try {
        await ext.storage.local.set({ autoCheckLeaflets: chk.checked });
        await ext.runtime.sendMessage({ type: "SVLV_RECONFIGURE_ALARMS" });
        setStatus("Auto-check setting saved.");
      } catch (e) {
        console.error("Failed to update auto-check setting", e);
        setStatus("Failed to save auto-check setting.");
      }
    });
  }

  if (cadence) {
    cadence.addEventListener("change", async () => {
      try {
        await ext.storage.local.set({ leafletCadence: cadence.value });
        await ext.runtime.sendMessage({ type: "SVLV_RECONFIGURE_ALARMS" });
        setStatus("Cadence setting saved.");
      } catch (e) {
        console.error("Failed to update cadence setting", e);
        setStatus("Failed to save cadence setting.");
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      const ok = confirm(
        "Reset stored leaflet history? This keeps your auto-check and cadence settings."
      );
      if (!ok) return;

      try {
        await ext.runtime.sendMessage({
          type: "SVLV_RESET_STATE",
          keepSettings: true
        });
        setStatus("Stored leaflet history reset.");
      } catch (e) {
        console.error("Failed to reset stored state", e);
        setStatus("Failed to reset stored leaflet history.");
      }
    });
  }

  if (testBtn) {
    testBtn.addEventListener("click", async () => {
      try {
        await ext.runtime.sendMessage({ type: "SVLV_TEST_NOTIFICATION" });
        setStatus("Test notification sent.");
      } catch (e) {
        console.error("Failed to send test notification", e);
        setStatus("Failed to send test notification.");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", loadSettings);
  loadSettings();
})();