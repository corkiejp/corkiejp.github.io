chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
});