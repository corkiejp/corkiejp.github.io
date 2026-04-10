SuperValu Leaflet Viewer
========================

What this extension does
------------------------
This Chrome extension adds a simple overlay viewer for SuperValu/pdf2web leaflet pages.

Instead of relying on the website's awkward zoom behaviour, it:
- detects leaflet page images on the current page
- collects their image URLs
- lets you step through them one by one
- shows the direct image URL
- lets you jump to a page number
- lets you copy, open, or download the current image

Main files
----------
manifest.json
- Extension config file for Chrome Manifest V3.

background.js
- Handles toolbar button clicks and keyboard shortcut commands.

content.js
- Runs on matching SuperValu pages.
- Finds leaflet images in the DOM.
- Builds the overlay viewer.
- Handles next/previous navigation, page jump, copy URL, open, and download.

How to install
--------------
1. Put the files in a folder, for example:
   SuperValu-Leaflet-Viewer

2. Open Chrome and go to:
   chrome://extensions

3. Turn on:
   Developer mode

4. Click:
   Load unpacked

5. Select the folder that contains manifest.json.

6. Open a matching SuperValu leaflet page.

7. Click the extension icon, or use the keyboard shortcut, to open the viewer.

Default shortcut
----------------
Ctrl+Shift+Y
On Mac:
Command+Shift+Y

- P = download/open the full PDF from the page meta tag

If Chrome says the shortcut is already in use, or you want to change it, go to:
chrome://extensions/shortcuts

How to use the viewer
---------------------
When the overlay is open:

- Left Arrow = previous image
- Right Arrow = next image
- G = focus the jump-to-page box
- Enter in the jump box = go to that page
- C = copy current image URL
- O = open current image in a new tab
- D = download/open current image
- R = rescan the page for images
- [ = previous leaflet
- ] = next leaflet
- P = download/open the full PDF from the page meta tag
- Esc = close the viewer

Buttons in the viewer
---------------------
Go
- Jumps to the page number in the jump box.

Rescan
- Rechecks the page in case the site has changed the DOM or loaded more images.

Copy URL
- Copies the current image URL to the clipboard.

Open
- Opens the current image URL in a new tab.

Download
- Tries to open/download the current image.

Download PDF
- Opens or downloads the full leaflet PDF linked in the page meta tag.

Close
- Closes the overlay.

How it works
------------
The extension injects a content script on matching SuperValu pages.

It looks for leaflet-style images, especially ones that:
- have pdf2web in the image path
- use alt text like "Page 4"
- appear near elements with data-page attributes

It then builds its own image list and shows a full-screen overlay viewer on top of the page.

Because the website can change images dynamically, the extension also rescans when the DOM changes.

Notes
-----
- This is designed around SuperValu/pdf2web-style leaflet pages.
- Some pages may use slightly different markup, so selectors may need tweaking.
- If page numbers do not line up perfectly, use Rescan first.
- If the site changes structure in future, content.js may need updates.

Troubleshooting
---------------
Viewer opens but shows "No leaflet images found"
- Make sure you are on a matching leaflet page.
- Click Rescan.
- Check whether the page is loading images lazily.

Shortcut does not work
- Go to chrome://extensions/shortcuts and assign a new one.

Extension does not load
- Make sure manifest.json is present in the selected folder.
- Check Chrome's Errors button on the extension card for syntax mistakes.

Possible next improvements
--------------------------
- thumbnail strip
- page list sidebar
- auto-download all detected images
- support for more leaflet sites using similar pdf2web markup