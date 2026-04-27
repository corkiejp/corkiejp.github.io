// background.js

function handleToggleClick(tab) {
  if (!tab || !tab.id) return;

  // Only act on entertainment.ie TV pages
  if (!tab.url || !tab.url.startsWith("https://entertainment.ie/tv/")) {
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "TV_VIEWER_TOGGLE" });
}

// Chrome MV3: chrome.action
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(handleToggleClick);
}

// Firefox MV2 (and older Chrome): chrome.browserAction
if (chrome.browserAction && chrome.browserAction.onClicked) {
  chrome.browserAction.onClicked.addListener(handleToggleClick);
}

// Keyboard command handler (shared)
chrome.commands?.onCommand.addListener((command) => {
  if (command !== "toggle-viewer") return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "TV_VIEWER_TOGGLE" });
  });
});