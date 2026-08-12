# AT Protocol Handler ~ Extension to open at did urls
## NEW: - Support for wsocial.eu

[AT Protocol Handler - Chrome Webstore](https://chromewebstore.google.com/detail/at-protocol-handler/foippfcmhngnjdlfhgaifppajnhlmafk) ~ Waiting for review.

[AT Protocol Handler - FireFox ADDon](https://addons.mozilla.org/en-US/firefox/addon/at-protocol-handler/) ~ Live

The [webpage](https://corkiejp.github.io/ATProtocolHandler/index.html), has a input field to test primary function of it

## Manual Install

[Chrome zip](https://corkiejp.github.io/ATProtocolHandler/ATProtocolHandler-chrome.zip)

[Firefox xpi](https://corkiejp.github.io/ATProtocolHandler/ATProtocolHandler.xpi)

[WIP Builds](./wip)

## Overview

**AT Protocol Handler** is a handy browser extension that helps you open and share [at://] URLs (DID URIs) across the growing ecosystem of Bluesky, Deer Social, and other AT Protocol-compatible apps.

### Features

- **Instantly lists sites that accept at://did:plc... URLs**
Paste your at:// URI and get a curated list of compatible web apps and viewers.
- **Address Bar Quick Action**
Type `at` in the address bar, hit space or tab, and paste your at:// URL to activate the extension. ~ Chrome Only omnibox feature.
Firefox: click the extension icon to open the instructions popup, then follow the link to the handler page where you can paste your at:// URL.
- **One-Click Copy and Share**
On supported sites (Bluesky, Deer Social, Klearsky), click the “Copy at:// URI” button or use keyboard shortcuts to quickly open or share posts and feeds.
- **Keyboard Shortcuts for Power Users**
    - **Alt+C** – Instantly open the current post or feed in an external viewer (works on Bluesky, Deer Social, and Klearsky).
    - **Alt+L** – Open the current post in a mobile-friendly “List of Sites to Open” view.
- **Session Snooze**
Optionally hide the popup for the current session with a single click.
- **Mobile and Desktop Friendly**
Designed for seamless use on both desktop and mobile browsers.
On Android, supported by alternative browsers such as Quetta.
For Firefox on Android, now available and tested with nightly before submitting to the store.

## Latest Improvements

In Bluesky, Deer and Klearsky. It works differently on Klearsky due to how the site is scripted, there is a popup that opens automatically when You look at any post.
If this is annoying choose to turn it on/off in browser extension settings by choosing to activate/deactivate on extension click only.


## Instructions


### How to get the at did (or at uri) urls from Bluesky?

You need to enable 'Developer Mode' in bluesky website. (Can also be done on mobile app.)

See this [Bluesky Thread](https://bsky.app/profile/did:plc:qxlh6bohvep3taqhmtpipx4b/post/3lqvaakn4u25g)

Or

[This Video post of mine on bluesky.](https://bsky.app/profile/corkiejp.github.io/post/3ltc6lbdots27)

If on mobile you don't need access to the Chrome Extension you can just share the link to my main PWA.
Other websites/utilise also provided away to copy the urls.
Resolves to the below sites in image at present.
Use: - 'at' as the keyword to put in the browser url, press space/tab to activate and then paste url!

![atphandler](./assets/atphandler-cws.png)

[Live example output with 'aturl' parameter passed to it](https://corkiejp.github.io/ATProtocolHandler/list.html?aturl=at://did:plc:vovinwhtulbsx4mwfw26r5ni/app.bsky.feed.post/3lssubf2d6b2c)



**Manual Install:** 

See zips/xpi at top of page!

To install take the six files in this folder background.js, content.js, list.html, inst.html, list.js and manifest.json. Then place them in a folder on your computer, and load unpack with 'chrome://extensions/'.
You can also manage your own set of links by making similar additions to list.js. Downside you would need to manually update the extension.

Or alternatively download the .src file, un zip it to a folder, then unpack it.

If people want it, I can also provide the .xpi file for Firefox manual install

If I find more utilise that accept an at url as a parameter, I may add more links.

If you know of others please share? 
