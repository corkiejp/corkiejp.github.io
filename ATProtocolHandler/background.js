const api = typeof browser !== 'undefined' ? browser : chrome;

console.log('background.js loaded, omnibox listener attaching...');

function openAtList(aturl) {
  const url = encodeURIComponent(aturl);
  const target = api.runtime.getURL(`list.html?aturl=${url}`);
  console.log('Opening AT list:', target);
  api.tabs.create({ url: target });
}

function openDefaultList() {
  const target = api.runtime.getURL('list.html');
  console.log('Opening default list:', target);
  api.tabs.create({ url: target });
}

if (api.omnibox) {
  api.omnibox.onInputEntered.addListener((text) => {
    console.log('omnibox input entered:', text);
    const trimmed = (text || '').trim();

    if (!trimmed) {
      openDefaultList();
      return;
    }

    // If it starts with at://, open list.html?aturl=...
    if (trimmed.startsWith('at://')) {
      openAtList(trimmed);
      return;
    }

    // If it looks like a full URL (http/https or at:// embedded), also pass as aturl
    if (/^https?:\/\//i.test(trimmed) || trimmed.includes('at://')) {
      openAtList(trimmed);
      return;
    }

    // Fallback: open default list
    openDefaultList();
  });

  api.omnibox.onInputChanged.addListener((text, suggest) => {
    const trimmed = (text || '').trim();
    const suggestions = [];

    if (!trimmed) {
      suggestions.push({
        content: '',
        description: 'Open AT list (type an AT URI or URL after "at")'
      });
    } else if (trimmed.startsWith('at://') || trimmed.includes('at://') || /^https?:\/\//i.test(trimmed)) {
      suggestions.push({
        content: trimmed,
        description: `Open list for: ${trimmed}`
      });
    } else {
      suggestions.push({
        content: trimmed,
        description: `Open list (input: ${trimmed})`
      });
    }

    try {
      suggest(suggestions);
    } catch (e) {
      console.warn('omnibox suggest failed:', e);
    }
  });
} else {
  console.warn('omnibox not available in this browser');
}