**Title:**
AT Protocol Handler — now works on Firefox Mobile too!

**Post body:**

Hey all! With all the recent AT Protocol buzz, I dug up my 9-month-old extension and got it working on **Firefox for Android**

**What it does:**
Click "Copy AT URL" → instant popup with utility links. Basically browser-style "Share to" but faster.

**New bonus:**
Made a service worker webpage that catches AT URIs and lets you save favorite utilities. Add presets or build your own, then use `?rd=1/2/3` for one-click redirects.

[Try it here](https://corkiejp.github.io/ATProtocolHandler/)

**Example:**
[AT post → Mackuba's Skythread](https://corkiejp.github.io/ATProtocolHandler/at://did:plc:qxlh6bohvep3taqhmtpipx4b/app.bsky.feed.post/3mitjvplmge24?rd=1)
*(First visit might need refresh, then it flies)*

**Privacy:** Static GitHub pages, no server = no tracking. Just clipboard perms to grab AT URLs.

[Android PWA example](https://corkiejp.github.io/ttospwa/index.html?uri=at%3A%2F%2Fdid%3Aplc%3Aqxlh6bohvep3taqhmtpipx4b%2Fapp.bsky.feed.post%2F3mitjvplmge24)

**Live now:**

- [Chromium browsers (Chrome/Edge/Opera/Quetta/etc)](https://chromewebstore.google.com/detail/at-protocol-handler/foippfcmhngnjdlfhgaifppajnhlmafk)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/at-protocol-handler/)

**Source:** [GitHub](https://github.com/corkiejp/corkiejp.github.io/tree/well-known/ATProtocolHandler)

**Real talk:** I'm no dev — this was AI-assisted (shoutout [Perplexity](https://www.perplexity.ai/)) static HTML experiments. Works surprisingly well though!

**Mobile folks:** PWA share targets + extension covers most bases. No more copy-paste hell.

***


