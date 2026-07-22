# Local Search New Tab

Local Search New Tab is a cross‑browser extension that keeps your new tab page fully local and only talks to search engines when you actually submit a query.

It grew out of a simple annoyance: most “default” search engines ping home on every new tab, even when you just want a blank page and will decide what to search later.

[Source code](https://github.com/corkiejp/corkiejp.github.io/tree/well-known/myviewers/localsearch/local-search-newtab-plus-reorder)

**Manual install**: -  [Chromium .zip](https://corkiejp.github.io/myviewers/localsearch/local-search-newtab-plus-reorder%20(2).zip) or [Firefox .xpi](https://corkiejp.github.io/myviewers/localsearch/LS-Firefox.zip.xpi) 

**Stores**:-  [Chrome Webstore](https://chromewebstore.google.com/detail/local-search-new-tab-plus/phaiahobckjnphelhkmldgmgneelcgbm) ~ Still waitinng on AMO review,

---

## What it does

- Replaces the browser’s new tab page (where supported) with a bundled local page.
- Lets you pick and customize search engines, using `%s` as the query placeholder.
- Provides quick links and reordering for your most-used sites.
- Only sends a network request when you press Enter on a search.
- Offers a **LocalBlank** fallback search engine for browsers that don’t allow new-tab overrides.

Supported (and tested) environments:

- Chrome desktop
- Comet desktop
- Firefox Developer Edition (desktop)
- Firefox Nightly/Beta (Android)
- Quetta (Android)

---

## Why LocalBlank exists

On some browsers (notably **Firefox for Android** and **Comet**), the system new tab page can’t be overridden by extensions. To work around that, the extension uses a dummy search engine you can configure in the browser:

- Name: `LocalBlank`
- URL: `https://127.0.0.1/?q=%s`

When you use `LocalBlank` as the browser’s search engine:

1. The browser navigates to `https://127.0.0.1/?q=your+query`.
2. The extension intercepts that navigation and redirects it into its own local page.
3. Your query appears prefilled in the extension’s search box, and no real search provider is contacted until you choose one and submit.

If you already run services on `127.0.0.1` on that device, you may want to adapt the dummy URL to avoid conflicts and adjust the extension settings accordingly.

---

## Features

- **Local new tab page**  
  - Bundled HTML/JS/CSS, no remote content.
  - No search engine ping until you submit a query.

- **Custom search engines**  
  - Add engines using a `%s` placeholder in the URL template.
  - Useful for “no AI” templates, privacy‑friendly engines, or site‑restricted search.

- **Quick links**  
  - Configure a grid of links shown on the new tab page.
  - Reorder links with Up/Down controls.
  - Export/import to carry them across devices and profiles.

- **Import / export**  
  - Export settings (engines + quick links) to JSON.
  - Import JSON into another browser or profile to keep setups in sync.

- **LocalBlank fallback**  
  - Works where new‑tab overrides don’t (Firefox mobile, Comet).
  - Malformed URLs or half‑typed text won’t immediately hit a search engine; they land in your local page instead.

---

## Setting up the LocalBlank search engine

### 1. Use the built‑in helper in the options page

From the extension icon, open **Settings** / **Options**:

- Look for the **“LocalBlank search engine”** section.
- Click **Copy URL** to copy `https://127.0.0.1/?q=%s` to the clipboard.
- Follow the browser‑specific steps shown in the help text below the button.

This avoids typos in the dummy search URL.

### 2. Chrome / Comet

1. Open `chrome://settings/searchEngines` (or **Settings → Search engine → Manage search engines and site search**).
2. Under **Site search** (or **Search engines**), click **Add**.
3. Fill in:
   - Name: `LocalBlank`
   - Shortcut (optional): `lb`
   - URL: `https://127.0.0.1/?q=%s`
4. Save, then set **LocalBlank** as the default search engine if you want all address‑bar searches to go through the extension.

### 3. Firefox desktop

1. Open `about:preferences#search`.
2. In **Search Shortcuts** / **Search engines**, click **Add** (or the relevant UI to add a custom engine).
3. Use:
   - Name: `LocalBlank`
   - URL: `https://127.0.0.1/?q=%s`
4. Make sure the extension is installed and enabled so it can handle the dummy URL.

### 4. Firefox mobile (Nightly / Beta)

Firefox for Android does not always respect new‑tab overrides, but it will still use your configured search engine. After adding `LocalBlank` as above (using desktop or mobile):

- Set **LocalBlank** as the default search engine.
- When you search from the address bar, the extension will capture `https://127.0.0.1/?q=%s` and open its local page with the query prefilled.

---

## Using the extension

- Open a new tab (in browsers that support overrides) **or** search via `LocalBlank` in the address bar.
- Choose a search engine from the dropdown on the local page.
- Type your query and press Enter.
- Use the browser’s Back button to send the same query to a different engine without retyping.

In the options page you can:

- Change the default engine.
- Add or remove custom engines.
- Reorder quick links and engines.
- Export/import your configuration as JSON.

---

## Firefox signing note

For manual `.xpi` installs (especially on Developer Edition and Nightly), you may need to allow unsigned extensions:

- Visit `about:config`.
- Set `xpinstall.signatures.required` to `false`.

On stable Firefox builds, you’ll typically need to use a signed build (e.g. via AMO or unlisted signing) instead of flipping this flag.

---

## Caveats

- If you have services running on `127.0.0.1`, you may want to choose a different dummy host/URL and update both the search engine template and extension configuration accordingly.
- The extension does **not** programmatically add or change search engines; browsers intentionally require user action for that. The options page is there to make the manual step as error‑free as possible.
