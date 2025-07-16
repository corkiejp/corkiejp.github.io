# AT Protocol Handler ~ Extension to open at did urls
## Now available on Chrome Webstore/FireFox ADDon.

[AT Protocol Handler - Chrome Webstore](https://chromewebstore.google.com/detail/at-protocol-handler/foippfcmhngnjdlfhgaifppajnhlmafk)

[AT Protocol Handler - FireFox ADDon](https://addons.mozilla.org/en-US/firefox/addon/at-protocol-handler/) 
^^ ~ Waiting on the review process! May have jumped the gun on updating this readme, it can take weeks to review?

When I update the [webpage](https://corkiejp.github.io/ATProtocolHandler/index.html), there should be a input field to test primary function of it

## Overview

**AT Protocol Handler** is a handy browser extension that helps you open and share [at://] URLs (DID URIs) across the growing ecosystem of Bluesky, Deer Social, and other AT Protocol-compatible apps.

### Features

- **Instantly lists sites that accept at://did:plc... URLs**
Paste your at:// URI and get a curated list of compatible web apps and viewers.
- **Address Bar Quick Action**
Type `at` in the address bar, hit space or tab, and paste your at:// URL to activate the extension. ~ Chrome Only omnibox feature.
Firefox click on the extension and paste url, or alternatively use keyboard shortcut:- Ctrl+Shift+Y
- **One-Click Copy and Share**
On supported sites (Bluesky, Deer Social, Klearsky), click the “Copy at:// URI” button or use keyboard shortcuts to quickly open or share posts and feeds.
- **Keyboard Shortcuts for Power Users**
    - **Alt+C** – Instantly open the current post or feed in an external viewer (works on Bluesky, Deer Social, and Klearsky).
    - **Alt+L** – Open the current post in a mobile-friendly “List of Sites to Open” view.
- **Session Snooze**
Optionally hide the popup for the current session with a single click.
- **Mobile and Desktop Friendly**
Designed for seamless use on both desktop and mobile browsers.
On Android, supported by alternative browsers such as Quetta (not Chrome itself).
For Firefox on Android, didn't want to test it with debbuging my phone contected to laptop, so not available, unless someone wants to tesr for me?

## Latest Improvements

Still waiting on chromestore review for an ealier submitted update. But in the manual instal method I now have enabled coping/activating AT URL links popup,
in Bluesky, Deer and Klearsky. It works differently on Klearsky due to how the site is scripted, there is a popup that opens automatically when You look at any post.
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

This is a quick temporary readme!

**Manual Install:** To install take the six files in this folder background.js, content.js, list.html, inst.html, list.js and manifest.json. Then place them in a folder on your computer, and load unpack with 'chrome://extensions/'.
You can also manage your own set of links by making similar additions to list.js. Downside you would need to manually update the extension.

Or alternatively download the .src file, un zip it to a folder, then unpack it.

If people want it, I can also provide the .xpi file for Firefox manual install

**Proof of concept** and possibly a work in progress, If I find more utilise that accept an at url as a parameter, I may add more links.

If you know of others please share? ~~Manual install only at present, waiting on chrome webstore to approve my extension.~~
