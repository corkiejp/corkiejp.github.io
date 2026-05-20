# Boards.ie Cleaner V2

Boards.ie Cleaner V2 is a browser extension for improving the Boards.ie browsing experience with interface cleanup, theme tools, post/page enhancements, and member-focused features. It is designed for users who want a cleaner, more customisable Boards.ie experience without changing the site globally outside Boards.ie itself.

## Features

- Clean up parts of the Boards.ie interface.
- Apply forum-specific themes using built-in presets or your own custom CSS.
- Store theme settings per forum key.
- Enable member-focused features from the Members Area, including ad removal, banner cleaning, and CMP handling where available.
- Use extra helper tools such as overlay handling, profile toggles, quote tools, and related Boards.ie quality-of-life features.
- Export and import saved forum theme settings.

## Theme engine overview

The theme engine lets you apply a different look to individual forums on Boards.ie. Each forum can have:

- no theme
- a built-in preset
- custom CSS
- a preset plus custom CSS layered on top

Themes are stored by forum key, so a forum can keep its own independent style without affecting other forums.

## Browser support

This project includes separate manifests for Chrome and Firefox builds.

- Chrome build uses `chrome-manifest.json`
- Firefox build uses `firefox-manifest.json`

The active packaged file is written to `manifest.json` during the build process.

## Project structure

```text
.
├── background.js
├── content.js
├── manifest.json
├── chrome-manifest.json
├── firefox-manifest.json
├── options.html
├── options.js
├── members.html
├── members.js
├── assets/
├── themes/
│   ├── theme-engine.js
│   ├── theme-engine-2.js
│   ├── presets/
│   └── templates/
└── dist/
```

## Installation for development

### Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the extension folder

### Firefox

1. Open `about:debugging`
2. Choose **This Firefox**
3. Click **Load Temporary Add-on**
4. Select the built `manifest.json` or packaged file as needed

## Build notes

The build script creates Chrome and Firefox packages from the correct source manifest and restores the Chrome manifest afterwards for local development.

Example:

```powershell
.\build-boardscleaner.ps1 -Target both
```

Supported targets:

- `chrome`
- `firefox`
- `both`

The script builds output into the `dist` folder.

## Packaging notes

For store uploads, only runtime files should be included in the final package. Developer-only files such as PowerShell build scripts, scratch files, and theme templates can be excluded from release archives.

## Options page

The options page includes:

- global theme enable/disable
- built-in preset toggle
- per-forum theme editor
- content script enable/disable toggle
- backup/export and restore/import tools
- Members Area access

## Forum keys

Boards.ie Cleaner uses the forum slug as the forum key. For example:

- `https://www.boards.ie/categories/after-hours` → `after-hours`
- `https://www.boards.ie/categories/soccer` → `soccer`

That key is used to save and load forum-specific theme settings.

## Presets and custom CSS

Built-in presets can be assigned to specific forums, and custom CSS can be layered on top. If both are used, the custom CSS loads after the preset and overrides it where selectors overlap.

## Backup and restore

Theme settings can be exported to JSON and later imported back into the extension. Imported theme data is merged with existing saved forum themes rather than replacing everything outright.

## Permissions

The extension is scoped to `https://www.boards.ie/*` and currently uses the `storage` permission for settings and configuration.

## Status

Current version in the attached manifests: `2.0.6`.

## Notes

This repository contains source files used for development and packaging. Some helper/template files may exist in the repo for development convenience but are not required in store-ready builds.
