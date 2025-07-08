# AT Protocol Handler ~ Chrome extension to open at did urls
## Now available on Chrome Webstore.

**NOTE: -** Extension now works on Bluesky, Dear and Klearsky for getting to at urls? See Below.

[AT Protocol Handler - Chrome Webstore](https://chromewebstore.google.com/detail/at-protocol-handler/foippfcmhngnjdlfhgaifppajnhlmafk)

## How to get the at did (or at uri) urls from Bluesky?

You need to enable 'Developer Mode' in bluesky website. (Can also be done on mobile app.)

See this [Bluesky Thread](https://bsky.app/profile/did:plc:qxlh6bohvep3taqhmtpipx4b/post/3lqvaakn4u25g)

If on mobile you don't need access to the Chrome Extension you can just share the link to my main PWA.
Other websites/utilise also provided away to copy the urls.

## Latest Improvements

Still waiting on chromestore review for an ealier submitted update. But in the manual instal method I now have enabled coping/activating AT URL links popup,
in Bluesky, Deer and Klearsky. It works differently on Klearsky due to how the site is scripted, there is a popup that opens automatically when You look at any post.
If this is annoying choose to turn it on/off in browser extension settings by choosing to activate/deactivate on extension click only.

Additional keyboard shortcut for Post and Feeds on Bluesky and Deer. Press '**alt+C**' to open my ATProtoViewer when looking at a post/feeds.

## Instructions


POC/WIP ~~Manual extension install only at present~~.
Resolves to the below sites in image at present.
Use: - 'at' as the keyword to put in the browser url, press space/tab to activate and then paste url!

![atphandler](./assets/atphandler-cws.png)

[Live example output with 'aturl' parameter passed to it](https://corkiejp.github.io/ATProtocolHandler/list.html?aturl=at://did:plc:vovinwhtulbsx4mwfw26r5ni/app.bsky.feed.post/3lssubf2d6b2c)

This is a quick temporary readme!

**Manual Install:** To install take the six files in this folder background.js, content.js, list.html, inst.html, list.js and manifest.json. Then place them in a folder on your computer, and load unpack with 'chrome://extensions/'.
You can also manage your own set of links by making similar additions to list.js. Downside you would need to manually update the extension.

Or alternatively download the .src file, un zip it to a folder, then unpack it.

**Proof of concept** and possibly a work in progress, If I find more utilise that accept an at url as a parameter, I may add more links.

If you know of others please share? ~~Manual install only at present, waiting on chrome webstore to approve my extension.~~
