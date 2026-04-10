const ext = globalThis.browser || globalThis.chrome;

ext.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  try {
    await ext.tabs.sendMessage(tab.id, { type: "TOGGLE_LEAFLET_VIEWER" });
  } catch (err) {
    console.error("Failed to send toggle message:", err);
  }
});

ext.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "toggle-viewer") return;
  if (!tab?.id) return;

  try {
    await ext.tabs.sendMessage(tab.id, { type: "TOGGLE_LEAFLET_VIEWER" });
  } catch (err) {
    console.error("Failed to send command message:", err);
  }
});