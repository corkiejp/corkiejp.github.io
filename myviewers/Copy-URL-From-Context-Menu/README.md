As of Chrome 150, Chrome added a new "tab" context for chrome.contextMenus, which lets extensions place custom items directly in the native tab strip right-click menu.

That means a Chrome extension can now add a menu item there for something like “Copy tab URL,” at least in Chrome versions that support the new "tab" context. When that item is clicked, Chrome passes the right-clicked tab and its URL to the extension via contextMenus.onClicked, and the pageUrl field is populated from the tab’s last committed URL.

Needs chrome canary or version 150 of chrome. Fallback for prior version, right click anywhere on a tab page.
