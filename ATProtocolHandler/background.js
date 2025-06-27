chrome.omnibox.onInputEntered.addListener((text) => {
  if (text.startsWith("at://")) {
    const url = encodeURIComponent(text);
    chrome.tabs.create({
      url: `list.html?aturl=${url}`
    });
  } else {
    chrome.tabs.create({
      url: "list.html"
    });
  }
});
