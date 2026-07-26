const api = typeof browser !== 'undefined' ? browser : chrome;

let lastNormalWebTab = null;

function isHttpUrl(url) {
  return typeof url === 'string' && /^https?:/i.test(url);
}

function updateLastNormalWebTabFromTab(tab) {
  if (!tab || !isHttpUrl(tab.url)) {
    return;
  }

  lastNormalWebTab = {
    id: typeof tab.id === 'number' ? tab.id : null,
    windowId: typeof tab.windowId === 'number' ? tab.windowId : null,
    url: tab.url,
    title: typeof tab.title === 'string' ? tab.title : ''
  };
}

async function refreshLastNormalWebTabFromActive() {
  if (!api.tabs?.query) return null;

  try {
    const tabs = await api.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = Array.isArray(tabs) ? tabs[0] : null;
    if (tab) {
      updateLastNormalWebTabFromTab(tab);
    }
    return lastNormalWebTab;
  } catch (error) {
    console.error('Could not refresh active tab cache', error);
    return lastNormalWebTab;
  }
}

async function getLikelySourceTab() {
  if (lastNormalWebTab?.url && isHttpUrl(lastNormalWebTab.url)) {
    return {
      url: lastNormalWebTab.url,
      title: lastNormalWebTab.title || ''
    };
  }

  const refreshed = await refreshLastNormalWebTabFromActive();
  if (refreshed?.url && isHttpUrl(refreshed.url)) {
    return {
      url: refreshed.url,
      title: refreshed.title || ''
    };
  }

  return null;
}

function createSelectionMenus() {
  try {
    api.contextMenus.removeAll(() => {
      api.contextMenus.create({
        id: 'search-local-search-new-tab',
        title: 'Search in Local Search New Tab for "%s"',
        contexts: ['selection']
      });

      api.contextMenus.create({
        id: 'save-selection-to-notes',
        title: 'Save selection to notes',
        contexts: ['selection']
      });
    });
  } catch (error) {
    console.error('Context menu create failed', error);
  }
}

async function getStoredNotes() {
  const result = await api.storage.sync.get({ notes: [] });
  return Array.isArray(result.notes) ? result.notes : [];
}

async function storeNoteFromSelection(info, tab) {
  const text = (info.selectionText || '').trim();
  if (!text) return;

  const sourceUrl = typeof info.pageUrl === 'string' ? info.pageUrl : '';
  const sourceTitle = typeof tab?.title === 'string' ? tab.title : '';

  const existing = await getStoredNotes();
  const now = new Date().toISOString();

  const note = {
    id: 'note-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    title: text.slice(0, 80),
    text,
    sourceTitle,
    sourceUrl,
    capturedText: text,
    originType: 'selection',
    createdAt: now,
    updatedAt: now
  };

  const notes = [note, ...existing];
  await api.storage.sync.set({ notes });
}

if (api.tabs?.onActivated) {
  api.tabs.onActivated.addListener(async (activeInfo) => {
    if (!api.tabs?.get) return;

    try {
      const tab = await api.tabs.get(activeInfo.tabId);
      updateLastNormalWebTabFromTab(tab);
    } catch (error) {
      console.error('Could not update cache from activated tab', error);
    }
  });
}

if (api.tabs?.onUpdated) {
  api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab?.active) return;

    if (changeInfo.url || changeInfo.status === 'complete' || typeof tab.url === 'string') {
      updateLastNormalWebTabFromTab(tab);
    }
  });
}

if (api.runtime?.onMessage) {
  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'get-likely-source-tab') {
      return false;
    }

    getLikelySourceTab()
      .then((tab) => sendResponse(tab || null))
      .catch((error) => {
        console.error('Could not respond with likely source tab', error);
        sendResponse(null);
      });

    return true;
  });
}

if (api.runtime?.onInstalled) {
  api.runtime.onInstalled.addListener(() => {
    createSelectionMenus();
    refreshLastNormalWebTabFromActive();

    if (api.declarativeNetRequest) {
      const redirectUrl = api.runtime.getURL('redirect.html');
      const rule = {
        id: 1,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            regexSubstitution: `${redirectUrl}?q=\\1`
          }
        },
        condition: {
          regexFilter: '^https://127\\.0\\.0\\.1/\\?q=([^&]+).*$',
          resourceTypes: ['main_frame']
        }
      };

      api.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1],
        addRules: [rule]
      }).then(() => {
        console.log('Successfully registered dynamic redirect rule.');
      }).catch((err) => {
        console.error('Failed to register dynamic redirect rule:', err);
      });
    }
  });
}

if (api.runtime?.onStartup) {
  api.runtime.onStartup.addListener(() => {
    createSelectionMenus();
    refreshLastNormalWebTabFromActive();
  });
}

if (api.contextMenus?.onClicked) {
  api.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'search-local-search-new-tab') {
      const text = (info.selectionText || '').trim();
      if (!text) return;

      const target = new URL(api.runtime.getURL('newtab.html'));
      target.searchParams.set('prefill', text);

      if (typeof info.pageUrl === 'string' && isHttpUrl(info.pageUrl)) {
        target.searchParams.set('sourceUrl', info.pageUrl);
      }

      if (typeof tab?.title === 'string' && tab.title.trim()) {
        target.searchParams.set('sourceTitle', tab.title.trim());
      }

      if (api.tabs?.create) {
        api.tabs.create({ url: target.toString() });
      }
      return;
    }

    if (info.menuItemId === 'save-selection-to-notes') {
      try {
        await storeNoteFromSelection(info, tab);
      } catch (error) {
        console.error('Could not save note from selection', error);
      }
    }
  });
}