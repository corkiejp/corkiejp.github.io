# SuperValu Leaflet Viewer

A browser extension project for viewing SuperValu leaflet page images in a cleaner overlay, with page-by-page navigation, jump-to-page support, direct image access, and PDF download, for both Chrome and Firefox.

## Features

- Overlay viewer for leaflet page images
- Next and previous page image navigation
- Jump directly to a detected page number
- Copy current image URL
- Open current image in a new tab
- Download current image
- Download full leaflet PDF when available
- Move to previous and next leaflet editions
- Instructions page built into the extension
- Chrome version working, Firefox version in progress

## Folder purpose

This project lives under `viewers/supervalu-viewer/` as part of a broader `viewers/` area for hosting and organizing similar viewer-style tools in the future.

## Browser support

### Chrome

The Chrome build is fully working and packaged via `manifest.chrome.json`.

### Firefox

The Firefox build is also working, using `manifest.firefox.json` and the same shared source files.

## Project files

- `manifest.chrome.json` - Chrome manifest
- `manifest.firefox.json` - Firefox manifest
- `background.js` - shared background script
- `content.js` - shared content script
- `inst.html` / `inst.css` - instructions page
- `build-chrome.ps1` - creates Chrome ZIP package
- `build-firefox.ps1` - creates Firefox XPI package
- /dist - [Currernt working builds .zip & .xpi](dist)

## Build notes

See `README-build.txt` for PowerShell execution-policy notes and packaging commands.

## Packaging

Typical build outputs:

- Chrome: `.zip`
- Firefox: `.xpi`

/dist - [Currernt working builds .zip & .xpi](dist)


## Status

This started as a practical tool to make SuperValu leaflet pages easier to browse than the site’s built-in zoom workflow.

The current Chrome build supports:

- image cycling
- page jump
- leaflet switching
- PDF download
- instruction page access
- auto-open on leaflet pages

## Notes

This project is experimental and may require updates if the SuperValu leaflet page structure changes.
