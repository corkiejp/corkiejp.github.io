const AT_LINKS_KEY = 'atLinks';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const prefix = '/ATProtocolHandler/';

  if (url.pathname.startsWith(prefix)) {
    const tail = url.pathname.slice(prefix.length);
    if (tail.startsWith('at://')) {
      event.respondWith(handleAtUri(tail));
      return;
    }
  }
});

async function handleAtUri(atUri) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AT URI Handler</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f5f7fb;
      --surface: #ffffff;
      --surface-2: #eef3f8;
      --text: #1f2937;
      --muted: #5f6b7a;
      --border: #d7dee7;
      --primary: #0b57d0;
      --primary-2: #e8f0fe;
      --danger: #b42318;
      --danger-bg: #fff5f5;
      --danger-border: #e5a3a1;
      --warning: #8a6116;
      --warning-bg: #fff8e6;
      --shadow: 0 8px 24px rgba(16, 24, 40, 0.08);
      --radius: 12px;
      --overlay: rgba(15, 23, 42, 0.55);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827;
        --surface: #1f2937;
        --surface-2: #111827;
        --text: #f3f4f6;
        --muted: #c0c7d1;
        --border: #374151;
        --primary: #7db1ff;
        --primary-2: #163252;
        --danger: #ffb3b3;
        --danger-bg: #3a2222;
        --danger-border: #aa4d4d;
        --warning: #ffd98a;
        --warning-bg: #3b3020;
        --shadow: none;
        --overlay: rgba(0, 0, 0, 0.72);
      }
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }

    .wrap {
      max-width: 860px;
      margin: 0 auto;
      padding: 1rem;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 1rem;
      margin-bottom: 1rem;
    }

    h1, h2, h3 { margin: 0 0 .75rem; }
    h1 { font-size: 1.6rem; }
    h2 { font-size: 1.1rem; }
    h3 { font-size: 1rem; }
    p { margin: .5rem 0; }

    .uri-box {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: .85rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      word-break: break-all;
      font-size: .95rem;
    }

    .starter-links,
    .custom-links,
    .preset-group-list {
      display: grid;
      gap: .75rem;
    }

    .starter-link,
    .saved-link-card,
    .preset-group {
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
    }

    .starter-link a,
    .saved-link-title {
      color: var(--primary);
      text-decoration: none;
      font-weight: 700;
    }

    .starter-link a:hover,
    .saved-link-title:hover {
      text-decoration: underline;
    }

    .starter-link {
      padding: .9rem 1rem;
    }

    .saved-link-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: .95rem 1rem;
    }

    .saved-link-main {
      flex: 1;
      min-width: 0;
    }

    .saved-link-title {
      display: inline-block;
      margin-bottom: .35rem;
      word-break: break-word;
    }

    .saved-link-meta {
      display: flex;
      flex-wrap: wrap;
      gap: .45rem;
      align-items: center;
    }

    .saved-link-mode {
      display: inline-block;
      padding: .2rem .55rem;
      border-radius: 999px;
      background: var(--primary-2);
      color: var(--primary);
      font-size: .82rem;
      font-weight: 700;
    }

    .saved-link-base {
      font-size: .82rem;
      color: var(--muted);
      background: var(--surface-2);
      padding: .2rem .45rem;
      border-radius: 6px;
      word-break: break-all;
    }

    .row {
      display: grid;
      gap: .75rem;
    }

    input, select, button {
      font: inherit;
    }

    input, select {
      width: 100%;
      padding: .8rem .9rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
    }

    button {
      border: 1px solid transparent;
      border-radius: 10px;
      padding: .75rem 1rem;
      cursor: pointer;
    }

    .primary-btn {
      background: var(--primary);
      color: white;
    }

    .secondary-btn {
      background: var(--warning-bg);
      color: var(--warning);
      border-color: var(--border);
    }

    .remove-link-btn {
      flex: 0 0 auto;
      width: auto;
      background: var(--danger-bg);
      color: var(--danger);
      border-color: var(--danger-border);
      font-weight: 700;
      padding: .6rem .9rem;
    }

    .form-help {
      color: var(--muted);
      font-size: .92rem;
    }

    .form-error {
      color: var(--danger);
      font-weight: 700;
      min-height: 1.2rem;
    }

    .empty {
      padding: 1rem;
      border: 1px dashed var(--border);
      border-radius: 10px;
      color: var(--muted);
      background: var(--surface-2);
    }

    .actions {
      display: flex;
      gap: .75rem;
      flex-wrap: wrap;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: var(--overlay);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 9999;
    }

    .modal-backdrop.open { display: flex; }

    .modal {
      width: min(760px, 100%);
      max-height: 90vh;
      overflow: auto;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: var(--shadow);
      padding: 1rem;
    }

    .modal-header,
    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .modal-footer { margin-top: 1rem; margin-bottom: 0; }

    .close-modal-btn {
      width: auto;
      background: var(--surface-2);
      color: var(--text);
      border-color: var(--border);
    }

    .preset-group {
      padding: .85rem;
    }

    .preset-item {
      display: flex;
      align-items: flex-start;
      gap: .75rem;
      padding: .5rem 0;
      border-top: 1px solid var(--border);
    }

    .preset-item:first-of-type { border-top: 0; }

    .preset-item input[type="checkbox"] {
      width: 1.1rem;
      height: 1.1rem;
      margin-top: .2rem;
      flex: 0 0 auto;
    }

    .preset-label {
      display: grid;
      gap: .2rem;
    }

    .preset-label strong { color: var(--text); }

    .preset-label span {
      color: var(--muted);
      font-size: .9rem;
      word-break: break-word;
    }

    @media (max-width: 700px) {
      .saved-link-card {
        flex-direction: column;
        align-items: stretch;
      }

      .remove-link-btn, .primary-btn, .secondary-btn, .close-modal-btn {
        width: 100%;
      }
    }
  </style>
</head>
<body data-aturi="${escapeHtml(atUri)}">
  <div class="wrap">
    <div class="card">
      <h1>AT URI Handler</h1>
      <p>Open this AT URI in your preferred tools.</p>
      <div class="uri-box">${escapeHtml(atUri)}</div>
    </div>

    <div class="card">
      <h2>Starter links</h2>
      <div class="starter-links">
        <div class="starter-link">
          <a href="https://corkiejp.github.io/ATProtoViewer/?uri=${encodeURIComponent(atUri)}" target="_blank" rel="noopener noreferrer">ATProtoViewer</a>
        </div>
        <div class="starter-link">
          <a href="https://atproto.at/viewer?uri=${encodeURIComponent(atUri)}" target="_blank" rel="noopener noreferrer">atproto.at</a>
        </div>
        <div class="starter-link">
          <a href="https://blue.mackuba.eu/skythread/?q=${encodeURIComponent(atUri)}" target="_blank" rel="noopener noreferrer">Skythread (Mackuba)</a>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Add custom link</h2>
      <form id="addLink">
        <div class="row">
          <input id="name" placeholder="Site name, e.g. ATP Tools" required>
          <input id="base" placeholder="https://example.com/?uri=  or  https://example.com/" required>
          <select id="mode">
            <option value="auto">Encoded append, for ?uri= or ?q= links</option>
            <option value="raw">Raw append, for path-style links</option>
            <option value="template">Template, use {atUri}, {rawAtUri}, {did}, {collection}, {rkey}</option>
          </select>
          <div id="formHelp" class="form-help">Use Encoded append for query-style links, Raw append for path-style links, or Template for advanced patterns.</div>
          <div id="formError" class="form-error"></div>
          <button class="primary-btn" type="submit">Add link</button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="actions" style="justify-content:space-between;align-items:center;">
        <h2 style="margin:0;">Your custom links</h2>
        <button id="openPresetModal" class="secondary-btn" type="button">Add preset links</button>
      </div>
      <div id="customLinks" class="custom-links" style="margin-top:1rem;"></div>
      <div class="actions" style="margin-top:1rem;">
        <button id="flushLinks" class="secondary-btn" type="button">Clear all custom links</button>
      </div>
    </div>
  </div>

  <div id="presetModalBackdrop" class="modal-backdrop" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="presetModalTitle">
      <div class="modal-header">
        <div>
          <h2 id="presetModalTitle">Add preset links</h2>
          <p>Select one or more presets to add to your saved custom links.</p>
        </div>
        <button id="closePresetModal" class="close-modal-btn" type="button">Close</button>
      </div>

      <div id="presetGroups" class="preset-group-list"></div>

      <div class="modal-footer">
        <button id="addSelectedPresets" class="primary-btn" type="button">Add selected presets</button>
      </div>
    </div>
  </div>

  <script>
    const AT_LINKS_KEY = 'atLinks';
    const atUri = document.body.dataset.aturi;

    const presetGroups = [
      {
        title: 'Post tools',
        items: [
          {
            name: 'ATP Tools',
            base: 'https://atp.tools/',
            mode: 'raw',
            note: 'Path-style AT URI tool'
          },
          {
            name: 'ATProtoViewer',
            base: 'https://corkiejp.github.io/ATProtoViewer/?uri=',
            mode: 'auto',
            note: 'Your viewer using ?uri='
          },
          {
            name: 'atproto.at',
            base: 'https://atproto.at/viewer?uri=',
            mode: 'auto',
            note: 'atproto.at viewer query param'
          },
          {
            name: 'Skythread (Mackuba)',
            base: 'https://blue.mackuba.eu/skythread/?q=',
            mode: 'auto',
            note: 'Thread viewer'
          },
          {
            name: 'Skyview Social',
            base: 'https://skyview.social/?url=',
            mode: 'auto',
            note: 'Alternative post view'
          },
          {
            name: 'pdsls.dev',
            base: 'https://pdsls.dev/',
            mode: 'raw',
            note: 'Direct path-style record view'
          }
        ]
      },
      {
        title: 'AppViews',
        items: [
          {
            name: 'Bluesky',
            base: 'https://bsky.app/profile/{did}/post/{rkey}',
            mode: 'template',
            note: 'Profile/post path'
          },
          {
            name: 'Deer Social',
            base: 'https://deer.social/profile/{did}/post/{rkey}',
            mode: 'template',
            note: 'Alternative appview'
          },
          {
            name: 'Azsky',
            base: 'https://azsky.app/profile/{did}/post/{rkey}',
            mode: 'template',
            note: 'Appview preset'
          },
          {
            name: 'Klearsky',
            base: 'https://klearsky.pages.dev/#/post?uri={rawAtUri}',
            mode: 'template',
            note: 'Hash route with raw AT URI'
          }
        ]
      },
      {
        title: 'Profile lookups',
        items: [
          {
            name: 'Cred.blue',
            base: 'https://cred.blue/{did}',
            mode: 'template',
            note: 'Profile reputation / stats'
          },
          {
            name: 'Bluefacts',
            base: 'https://bluefacts.app/profile/{did}',
            mode: 'template',
            note: 'Profile details'
          },
          {
            name: 'Toolify.blue',
            base: 'https://toolify.blue/profile/{did}',
            mode: 'template',
            note: 'Profile tool page'
          },
          {
            name: 'Skykit.blue',
            base: 'https://skykit.blue/{did}',
            mode: 'template',
            note: 'Profile lookup'
          }
        ]
      }
    ];

    function parseAtUri(atUri) {
      const m = atUri.match(/^at:\\/\\/([^/]+)\\/([^/]+)\\/([^/]+)$/);
      return {
        repo: m ? m[1] : '',
        collection: m ? m[2] : '',
        rkey: m ? m[3] : ''
      };
    }

    function sanitizeHttpUrl(value) {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:') return null;
        return url.toString();
      } catch {
        return null;
      }
    }

    function buildUserLink(link, atUri) {
      const encodedAtUri = encodeURIComponent(atUri);
      const parts = parseAtUri(atUri);

      if (link.mode === 'template') {
        return link.base
          .replaceAll('{atUri}', encodedAtUri)
          .replaceAll('{rawAtUri}', atUri)
          .replaceAll('{did}', parts.repo)
          .replaceAll('{collection}', parts.collection)
          .replaceAll('{rkey}', parts.rkey);
      }

      if (link.mode === 'raw') {
        return link.base + atUri;
      }

      return link.base + encodedAtUri;
    }

    function getLinks() {
      try {
        return JSON.parse(localStorage.getItem(AT_LINKS_KEY) || '[]');
      } catch {
        return [];
      }
    }

    function saveLinks(links) {
      localStorage.setItem(AT_LINKS_KEY, JSON.stringify(links));
    }

    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[ch]));
    }

    function modeLabel(mode) {
      if (mode === 'raw') return 'Raw append';
      if (mode === 'template') return 'Template';
      return 'Encoded append';
    }

    function linkExists(links, candidate) {
      return links.some(link => link.name === candidate.name && link.base === candidate.base && link.mode === candidate.mode);
    }

    function loadLinks() {
      const links = getLinks();
      const container = document.getElementById('customLinks');

      if (!links.length) {
        container.innerHTML = '<div class="empty">No custom links yet. Add one above or use Add preset links.</div>';
        return;
      }

      container.innerHTML = links.map((link, i) => {
        const href = buildUserLink(link, atUri);
        return \`
          <div class="saved-link-card">
            <div class="saved-link-main">
              <a href="\${escapeHtml(href)}" class="saved-link-title" target="_blank" rel="noopener noreferrer">\${escapeHtml(link.name)}</a>
              <div class="saved-link-meta">
                <span class="saved-link-mode">\${escapeHtml(modeLabel(link.mode))}</span>
                <code class="saved-link-base">\${escapeHtml(link.base)}</code>
              </div>
            </div>
            <button class="remove-link-btn" type="button" onclick="removeLink(\${i})" aria-label="Remove \${escapeHtml(link.name)}">Remove</button>
          </div>
        \`;
      }).join('');
    }

    function renderPresetModal() {
      const links = getLinks();
      const root = document.getElementById('presetGroups');

      root.innerHTML = presetGroups.map((group, groupIndex) => {
        const items = group.items.map((item, itemIndex) => {
          const alreadyAdded = linkExists(links, item);
          return \`
            <label class="preset-item">
              <input type="checkbox" data-group="\${groupIndex}" data-item="\${itemIndex}" \${alreadyAdded ? 'disabled' : ''}>
              <div class="preset-label">
                <strong>\${escapeHtml(item.name)}\${alreadyAdded ? ' (already added)' : ''}</strong>
                <span>\${escapeHtml(item.note)}</span>
                <span><code>\${escapeHtml(item.base)}</code></span>
              </div>
            </label>
          \`;
        }).join('');

        return \`
          <div class="preset-group">
            <h3>\${escapeHtml(group.title)}</h3>
            \${items}
          </div>
        \`;
      }).join('');
    }

    function openPresetModal() {
      renderPresetModal();
      const modal = document.getElementById('presetModalBackdrop');
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }

    function closePresetModal() {
      const modal = document.getElementById('presetModalBackdrop');
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }

    window.removeLink = function(index) {
      const links = getLinks();
      const item = links[index];
      if (!item) return;

      const ok = confirm(\`Remove saved link "\${item.name}"?\`);
      if (!ok) return;

      links.splice(index, 1);
      saveLinks(links);
      loadLinks();
    };

    document.getElementById('addLink').addEventListener('submit', e => {
      e.preventDefault();

      const nameEl = document.getElementById('name');
      const baseEl = document.getElementById('base');
      const modeEl = document.getElementById('mode');
      const errorEl = document.getElementById('formError');

      const name = nameEl.value.trim();
      const base = baseEl.value.trim();
      const mode = modeEl.value;

      errorEl.textContent = '';

      if (!name) {
        errorEl.textContent = 'Please enter a site name.';
        return;
      }

      if (!base) {
        errorEl.textContent = 'Please enter a base URL or template.';
        return;
      }

      let safeBase = base;

      if (mode !== 'template') {
        safeBase = sanitizeHttpUrl(base);
        if (!safeBase) {
          errorEl.textContent = 'Please enter a valid https:// URL.';
          return;
        }
      } else {
        const firstUrlPart = base.split('{')[0];
        const checked = sanitizeHttpUrl(firstUrlPart || base);
        if (!checked) {
          errorEl.textContent = 'Template must begin with a valid https:// URL.';
          return;
        }
      }

      const links = getLinks();
      links.push({ name, base: safeBase, mode });
      saveLinks(links);

      nameEl.value = '';
      baseEl.value = '';
      modeEl.value = 'auto';
      loadLinks();
    });

    document.getElementById('flushLinks').addEventListener('click', () => {
      const links = getLinks();
      if (!links.length) return;

      const ok = confirm('Clear all saved custom links? This cannot be undone.');
      if (!ok) return;

      localStorage.removeItem(AT_LINKS_KEY);
      loadLinks();
    });

    document.getElementById('openPresetModal').addEventListener('click', openPresetModal);
    document.getElementById('closePresetModal').addEventListener('click', closePresetModal);

    document.getElementById('presetModalBackdrop').addEventListener('click', event => {
      if (event.target.id === 'presetModalBackdrop') {
        closePresetModal();
      }
    });

    document.getElementById('addSelectedPresets').addEventListener('click', () => {
      const boxes = Array.from(document.querySelectorAll('#presetGroups input[type="checkbox"]:checked'));
      if (!boxes.length) {
        alert('Select at least one preset first.');
        return;
      }

      const links = getLinks();
      for (const box of boxes) {
        const group = presetGroups[Number(box.dataset.group)];
        const item = group.items[Number(box.dataset.item)];
        if (!linkExists(links, item)) {
          links.push(item);
        }
      }

      saveLinks(links);
      loadLinks();
      closePresetModal();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closePresetModal();
      }
    });

    loadLinks();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}