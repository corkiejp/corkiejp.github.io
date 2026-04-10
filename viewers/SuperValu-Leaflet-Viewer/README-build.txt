SuperValu Leaflet Viewer - Build Notes

Project layout
- manifest.chrome.json = Chrome manifest
- manifest.firefox.json = Firefox manifest
- background.js = shared background script
- content.js = shared content script
- inst.html / inst.css = shared instructions page
- build-chrome.ps1 = creates Chrome ZIP package
- build-firefox.ps1 = creates Firefox XPI package
- dist/ = packaged output

PowerShell execution policy
If PowerShell blocks local scripts with a digital signature / execution policy error, use one of these:

Option 1 - temporary for current PowerShell session only:
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

Then run:
  .\build-chrome.ps1
  .\build-firefox.ps1

Option 2 - run script directly with bypass:
  powershell -ExecutionPolicy Bypass -File .\build-chrome.ps1
  powershell -ExecutionPolicy Bypass -File .\build-firefox.ps1

Option 3 - set a user-level policy for your own account:
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

Use this only if you want a more permanent local developer setup.

Packaging output
- Chrome package: dist\supervalu-leaflet-viewer-chrome.zip
- Firefox package: dist\supervalu-leaflet-viewer-firefox.xpi

Notes
- Both build scripts exclude *.ps1 files from the packaged extension.
- Chrome build copies manifest.chrome.json to manifest.json inside a temporary build folder.
- Firefox build copies manifest.firefox.json to manifest.json inside a temporary build folder.
- Do not rely on your repo root manifest during packaging; the scripts build from the browser-specific manifest files.

Recommended workflow
1. Open PowerShell in the extension folder.
2. If needed, allow scripts for the current session:
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
3. Build Chrome package:
   .\build-chrome.ps1
4. Build Firefox package:
   .\build-firefox.ps1
5. Check the dist folder for the ZIP and XPI files.

Testing
Chrome (unpacked)
- Open chrome://extensions
- Enable Developer mode
- Load unpacked
- Use a Chrome-ready manifest.json if loading unpacked directly from a folder

Firefox (temporary install)
- Open about:debugging
- Choose This Firefox
- Click Load Temporary Add-on
- Select a Firefox-ready manifest.json for temporary testing
- Use the generated XPI for packaging / submission

Repo suggestion
SuperValu-Leaflet-Viewer/
  manifest.chrome.json
  manifest.firefox.json
  background.js
  content.js
  inst.html
  inst.css
  build-chrome.ps1
  build-firefox.ps1
  README-build.txt
  dist/
