# Warning

**Extensions are a security and privacy risk in them selves use at your own discretion!**
This repository is meant for discussion, local testing, and forum follow-up. It is **not** a polished security product, and it is **not** intended for Chrome Web Store or AMO publication.[^3][^4]

# ExtScanAlert

ExtScanAlert is a small proof-of-concept extension project for **Chromium** and **Firefox** that explores a specific privacy question: can a browser extension notice or interfere with websites that try to probe for installed browser extensions.[^1][^2]

## Chromium Browsers

Added DNR rules option for some slow loading pages due to privacy tools.

## Repository layout

```text
ExtScanAlert/
├─ README.md
├─ index.html
├─ chromium/
│  ├─ manifest.json
│  ├─ background.js
│  ├─ content.js
│  ├─ page-hook.js
│  ├─ popup.html
│  └─ popup.js
├─ firefox/
│  ├─ manifest.json
│  ├─ background.js
│  ├─ content.js
│  ├─ page-hook.js
│  ├─ popup.html
│  └─ popup.js
├─ ExtScanAlert-v2-chromium.zip
└─ ExtScanAlert-v2-firefox.xpi
```
## Version 2

Use the v2 packages for current testing; the earlier build used blocking prompts and may freeze some tabs on mobile browsers. See changelog.

## What the proof of concept does

Both builds share the same general idea:

- Inject a hook early at `document_start` so extension-controlled code can watch for suspicious requests to `chrome-extension://` or `moz-extension://` URLs before page code finishes running.[^2][^5]
- Log lifecycle events, heartbeats, and suspected probe attempts into extension storage so activity can be reviewed from the popup.[^6][^7]
- Present a simple popup showing that the extension is running, plus a recent activity log and a clear-log action.[^8][^9]

The Firefox build also adds request-level blocking through `webRequest` where available, because Firefox supports blocking responses through the WebExtensions request API with the right permissions.[^10][^2]

## Browser-specific notes

### Chromium

The Chromium version uses Manifest V3 concepts such as an extension action popup and a background service worker model. It is best treated as a proof-of-concept logger and page-hook interceptor rather than a complete blocker, because Chromium has limitations around extension request visibility and modern extension blocking models.[^11][^3][^6][^8]

### Firefox

The Firefox version uses the WebExtensions model with `browser_action`, `browser.storage.local`, and `webRequestBlocking` permissions. It is packaged here both as source and as an `.xpi` for local testing, but that does not imply store publication or AMO signing.[^7][^9][^12][^13]

## What it does not do

This project does **not** guarantee complete protection against extension fingerprinting or extension enumeration. Websites may probe through multiple DOM paths, timing behavior, or browser-specific mechanisms that this proof of concept does not wrap or log.[^1][^2][^3]

The popup’s **Clear log** action only clears this extension’s own storage entries and resets its badge count. It does **not** clear website `localStorage`, cookies, IndexedDB, or browser cache.[^14][^15][^6][^7]

## Why this is not store-published

This repository is intentionally kept as a local or GitHub-shared proof of concept rather than a public store listing. A public listing can make an extension easier to catalogue by ID, metadata, and listing information, while successful probing of exposed extension resources can still happen even without a store page.[^4][^3]

## Testing

For Chromium-family browsers, BrowserLeaks provides a public Chrome extension detection test page:

- [https://browserleaks.com/chrome](https://browserleaks.com/chrome)[^1]

That page is built around the Chrome extension model and `chrome-extension://` probing, so results in Firefox will differ because Firefox uses `moz-extension://` URLs and a different extension platform surface.[^2][^1]

If the popup only shows heartbeats and no probe entries, that does not necessarily mean the extension failed. Other tools such as DNS filters, Windscribe, Portmaster, or browser privacy settings may block the relevant scripts or requests before the proof of concept sees them.[^1]

## Inspecting extension storage

In Chromium, extension storage is separate from page Local Storage. To inspect it, open the extension’s service worker or extension page DevTools, then use **Application → Extension Storage**, or query it from the extension context console. In ordinary page DevTools, **Application → Local Storage** shows the website’s storage, not the extension’s.[^15][^14]

## Packaging

This repository includes a packaged Firefox `.xpi` and a packaged Chromium `.zip` alongside the source folders for convenience in local testing and sharing. The source folders remain the primary reference, because they are easier to inspect and modify.[^13]

### PowerShell packaging examples

From inside the `ExtScanAlert` folder:

#### Chromium ZIP

```powershell
Compress-Archive -Path .\chromium\* -DestinationPath .\ExtScanAlert-chromium.zip -Force
```


#### Firefox XPI

An `.xpi` is just a ZIP archive with a different extension, so in PowerShell:

```powershell
Compress-Archive -Path .\firefox\* -DestinationPath .\ExtScanAlert-firefox.zip -Force
Rename-Item .\ExtScanAlert-firefox.zip ExtScanAlert-firefox.xpi -Force
```


## Installation

### Chromium

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `chromium` folder.

### Firefox

1. Open `about:debugging`.
2. Choose **This Firefox**.
3. Click **Load Temporary Add-on**.
4. Select `firefox/manifest.json`, or test the packaged `.xpi` if your setup accepts it.[^13]

ExtScanAlert-firefox.xpi is included as a packaged development build. In standard Firefox release builds, unsigned add-ons usually need to be loaded temporarily through about:debugging rather than installed normally. It can work on Android Nightly (with about:config flag change), desktop release says not verified


## Warning

This is experimental code for testing and discussion. Review the source before loading it, and do not assume that “no detections logged” means “no probing occurred.”[^2][^1]

## Changelog

### v2

- Replaced modal `confirm()` prompts with a non-blocking mode system: **Block all**, **Log only**, and **Allow all**.
- Added badge counts so blocked activity is visible without opening the popup.
- Added optional “notify once per host” behavior for blocked events.
- Improved mobile usability; earlier prompt-heavy behavior could lock up tabs in some Chromium-based mobile browsers because modal dialogs block interaction.


### Earlier build

- Used per-event `confirm()` prompts from the page hook.
- Worked as a proof of concept, but repeated prompts could make a tab difficult to use, especially on mobile browsers.


## Known issues

- This is still a **proof of concept**, not a complete anti-fingerprinting solution; some detection paths may not be logged or blocked.
- BrowserLeaks’ Chrome extension test is useful for Chromium-family testing, but Firefox behavior differs because Firefox uses `moz-extension://` rather than `chrome-extension://`
- Firefox unsigned builds are most reliable through **temporary loading** during testing; normal installation on desktop Firefox release may show verification/signing errors.
- The popup log is currently the main source of detail about what was blocked or observed; badge counts are only a quick indicator.

<div align="center">⁂</div>

[^1]: https://browserleaks.com/chrome

[^2]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest

[^3]: https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources

[^4]: https://www.ghacks.net/2026/04/04/linkedin-uses-hidden-javascript-to-scan-for-over-6000-chrome-extensions-on-visitors-browsers/

[^5]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts

[^6]: https://developer.chrome.com/docs/extensions/reference/api/storage

[^7]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/local

[^8]: https://developer.chrome.com/docs/extensions/reference/api/action

[^9]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_action

[^10]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/BlockingResponse

[^11]: https://developer.chrome.com/blog/mv3-actions

[^12]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions

[^13]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Examples

[^14]: https://developer.chrome.com/docs/devtools/storage/localstorage

[^15]: https://developer.chrome.com/docs/devtools/storage/extensionstorage

