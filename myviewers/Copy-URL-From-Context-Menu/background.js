const MENU_ID_TAB = "copy-tab-url";
const MENU_ID_PAGE = "copy-page-url";
const OFFSCREEN_PATH = "offscreen.html";

chrome.runtime.onInstalled.addListener(async () => {
  await rebuildMenus();
});

chrome.runtime.onStartup?.addListener(async () => {
  await rebuildMenus();
});

async function rebuildMenus() {
  await chrome.contextMenus.removeAll();

  const supportsTabContext =
    !!chrome.contextMenus.ContextType &&
    "TAB" in chrome.contextMenus.ContextType;

  if (supportsTabContext) {
    chrome.contextMenus.create({
      id: MENU_ID_TAB,
      title: "Copy tab URL",
      contexts: ["tab"]
    });
  }

  chrome.contextMenus.create({
    id: MENU_ID_PAGE,
    title: "Copy page URL",
    contexts: ["page"]
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID_TAB && info.menuItemId !== MENU_ID_PAGE) {
    return;
  }

  const url = getBestUrl(info, tab);

  if (!url) {
    await showNotification("Copy URL", "No URL was available for this item.");
    return;
  }

  try {
    const copied = await tryInjectedCopy(url, tab);

    if (!copied) {
      await copyViaOffscreen(url);
    }

    await showNotification("Copy URL", shortMessage(url));
  } catch (err) {
    console.error("Copy failed:", err);
    await showNotification("Copy URL", `Copy failed: ${String(err).slice(0, 120)}`);
  }
});

function getBestUrl(info, tab) {
  if (typeof info.pageUrl === "string" && info.pageUrl) return info.pageUrl;
  if (tab && typeof tab.url === "string" && tab.url) return tab.url;
  return null;
}

async function tryInjectedCopy(text, tab) {
  if (!tab?.id || isRestrictedUrl(tab.url)) {
    return false;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: async (value) => {
        try {
          await navigator.clipboard.writeText(value);
          return { ok: true };
        } catch (err) {
          return { ok: false, error: String(err) };
        }
      },
      args: [text]
    });

    return Boolean(results?.[0]?.result?.ok);
  } catch (err) {
    console.warn("Injected copy failed:", err);
    return false;
  }
}

function isRestrictedUrl(url = "") {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:")
  );
}

let creatingOffscreen = null;

async function ensureFreshOffscreenDocument(path) {
  try {
    await chrome.offscreen.closeDocument();
  } catch {}

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: path,
    reasons: ["CLIPBOARD"],
    justification: "Need DOM clipboard access to copy a URL."
  });

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

async function copyViaOffscreen(text) {
  await ensureFreshOffscreenDocument(OFFSCREEN_PATH);

  const response = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "copy-text",
    text
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Offscreen copy failed");
  }
}

async function showNotification(title, message) {
  return chrome.notifications.create(`copy-url-${Date.now()}`, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
    title,
    message
  });
}

function shortMessage(url) {
  const max = 90;
  const trimmed = url.length > max ? url.slice(0, max - 1) + "…" : url;
  return `Copied: ${trimmed}`;
}