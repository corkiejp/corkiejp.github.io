# Entertainment.ie TV Slide Viewer Prototype

A small browser extension prototype for browsing Entertainment.ie TV listings in a cleaner, multi-column slide viewer.

## What it does

On supported Entertainment.ie TV pages, the extension injects an overlay viewer that lets you:

- Toggle the viewer from the toolbar button or keyboard shortcut
- Display selected TV channels in side-by-side scrollable columns
- Browse programme cards by channel and time range
- Use live page data when available, with fallback channel/schedule data for testing

## Current behaviour

- The extension is designed to run only on `https://entertainment.ie/tv/*`
- If triggered on a non-TV page, it intentionally does nothing
- The viewer prefers scraped page/channel data first, then falls back to detected `/tv/{slug}` links, and finally to a built-in fallback channel list
- Schedule data can temporarily show demo/fallback entries until live schedule fetches complete

## Browser support

This project currently uses two manifests:

- **Chrome / Chromium build:** Manifest V3
- **Firefox build:** Manifest V2 (with Gecko-specific settings for temporary/add-on packaging)

Because of that, the active `manifest.json` in the working folder must match the browser you are loading it into.

## Development notes

The project uses manifest switching for local development and packaging:

- `chrome-manifest.json` for Chrome/Chromium
- `firefox-manifest.json` for Firefox
- `manifest.json` as the active manifest copied in by PowerShell scripts

If the Firefox manifest is left active in a Chrome dev folder, Chrome may disable the unpacked extension because it expects Manifest V3.

## Build workflow

Typical local workflow:

1. Switch the active manifest for the target browser
2. Load the extension as unpacked in Chrome or temporarily in Firefox
3. Build a `.zip` for Chrome or `.xpi` for Firefox using the PowerShell script
4. Restore the Chrome manifest afterward if the same folder is used for Chrome development

## Files

Typical core files include:

- `manifest.json` - active manifest used by the current target browser
- `chrome-manifest.json` - Chrome/Chromium manifest
- `firefox-manifest.json` - Firefox manifest
- `background.js` - background/service worker event handling
- `content.js` - DOM scraping, overlay logic, schedule handling
- `viewer.css` - viewer styling
- `*.ps1` - manifest switching and build scripts

## Status

This is still a prototype and is being actively tested across desktop Chrome, Firefox Developer Edition, and Firefox Nightly on Android. Some behaviour on mobile/Nightly may differ depending on page markup, cached state, or whether live schedule selectors match the current site layout.

## Install notes

### Chrome / Chromium

- Make sure the Chrome Manifest V3 version is the active `manifest.json`
- Load the extension as an unpacked extension from the project folder

### Firefox

- Make sure the Firefox manifest is the active `manifest.json`
- Load temporarily via `about:debugging` or install the generated `.xpi`
- After install, the toolbar icon may need to be pinned from the extensions menu

## Shortcut

Use the keyboard shortcut configured in the active manifest. If a shortcut conflicts with the browser, choose an alternate one in the manifest or extension shortcut settings.

## Purpose

This project exists as a practical prototype for experimenting with cleaner TV-listings browsing, DOM scraping, channel parsing, and a custom overlay UI on top of Entertainment.ie TV pages.
