(function () {
  console.log('[pdsls-editor] loaded on', location.href);
  const POST_TEXT_LIMIT = 300; // UTF-8 bytes

  function byteLength(str) {
    return new TextEncoder().encode(str).length;
  }
  
  function validateRecord(updated) {
    const textBytes = byteLength(updated.text || '');
    const errors = [];

    if (textBytes > POST_TEXT_LIMIT) {
      errors.push(`Text too long: ${textBytes} / ${POST_TEXT_LIMIT} bytes`);
    }

    // Basic structure checks
    if (!updated.$type || updated.$type !== 'app.bsky.feed.post') {
      errors.push('Missing or invalid $type');
    }
    if (typeof updated.text !== 'string') {
      errors.push('Missing or invalid text field');
    }
    if (!Array.isArray(updated.facets)) {
      errors.push('facets must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  function shouldUpdateCreatedAt(isoString) {
    if (!isoString) return true; // if missing, always set
    const original = new Date(isoString).getTime();
    const now = Date.now();
    const hoursOld = (now - original) / (1000 * 60 * 60);
    return hoursOld > 24;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function parseMarkdownLinks(text) {
    const links = [];
    const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      links.push({
        full: m[0],
        label: m[1],
        url: m[2],
        index: m.index
      });
    }
    return links;
  }

  function findSubstring(str, sub, fromIndex = 0) {
    const idx = str.indexOf(sub, fromIndex);
    return idx;
  }

  function recomputeFacets(text, existingFacets = []) {
    // Preserve all existing facets
    const facets = JSON.parse(JSON.stringify(existingFacets));

    // Convert Markdown links to plain text + link facets
    const mdLinks = parseMarkdownLinks(text);
    let workingText = text;
    let newFacets = [];

    if (mdLinks.length > 0) {
      // Convert Markdown to plain text
      let newText = text;
      mdLinks
        .slice()
        .sort((a, b) => b.index - a.index)
        .forEach(link => {
          const before = newText.slice(0, link.index);
          const after = newText.slice(link.index + link.full.length);
          newText = before + link.label + after;
        });

      workingText = newText;

      // Create link facets for each Markdown link
      let offset = 0;
      mdLinks.forEach(link => {
        const labelPos = findSubstring(workingText, link.label, offset);
        if (labelPos === -1) return;
        const start = labelPos;
        const end = start + link.label.length;

        newFacets.push({
          $type: 'app.bsky.richtext.facet',
          index: {
            byteStart: byteLength(workingText.slice(0, start)),
            byteEnd: byteLength(workingText.slice(0, end))
          },
          features: [{
            $type: 'app.bsky.richtext.facet#link',
            uri: link.url
          }]
        });

        offset = end;
      });
    }

    // Mentions
    const mentionRe = /@([a-zA-Z0-9.-]+)/g;
    let m;
    while ((m = mentionRe.exec(workingText)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      newFacets.push({
        $type: 'app.bsky.richtext.facet',
        index: {
          byteStart: byteLength(workingText.slice(0, start)),
          byteEnd: byteLength(workingText.slice(0, end))
        },
        features: [{
          $type: 'app.bsky.richtext.facet#mention',
          did: 'did:plc:placeholder'
        }]
      });
    }

    // Tags
    const tagRe = /#([a-zA-Z0-9_]+)/g;
    let t;
    while ((t = tagRe.exec(workingText)) !== null) {
      const start = t.index;
      const end = start + t[0].length;
      newFacets.push({
        $type: 'app.bsky.richtext.facet',
        index: {
          byteStart: byteLength(workingText.slice(0, start)),
          byteEnd: byteLength(workingText.slice(0, end))
        },
        features: [{
          $type: 'app.bsky.richtext.facet#tag',
          tag: t[1]
        }]
      });
    }

    // Plain links (only if not already covered by Markdown)
    const urlRe = /\bhttps?:\/\/[^\s"'<>]+/g;
    let u;
    while ((u = urlRe.exec(workingText)) !== null) {
      const start = u.index;
      const end = start + u[0].length;

      // Avoid duplicating facets for URLs already added from Markdown
      const alreadyExists = newFacets.some(f =>
        f.features?.[0]?.$type === 'app.bsky.richtext.facet#link' &&
        f.features[0].uri === u[0]
      );
      if (alreadyExists) continue;

      newFacets.push({
        $type: 'app.bsky.richtext.facet',
        index: {
          byteStart: byteLength(workingText.slice(0, start)),
          byteEnd: byteLength(workingText.slice(0, end))
        },
        features: [{
          $type: 'app.bsky.richtext.facet#link',
          uri: u[0]
        }]
      });
    }

    const allFacets = [...facets, ...newFacets];
    return { facets: allFacets, text: workingText, added: newFacets.length };
  }

  // ---------- Context menu hook ----------

//  function log(...args) {
//    console.log('[pdsls-editor menu]', ...args);
//  }

  function findCopyButton() {
    const allButtons = Array.from(document.querySelectorAll('button'));

    // Exact match
    let copyBtn = allButtons.find(btn => btn.textContent.trim() === 'Copy record');
    if (copyBtn) return copyBtn;

    // Fallback: contains
    copyBtn = allButtons.find(btn => btn.textContent.includes('Copy record'));
    if (copyBtn) return copyBtn;

    // Fallback: "Copy" + "record"
    copyBtn = allButtons.find(btn => {
      const text = btn.textContent || '';
      return text.includes('Copy') && text.includes('record');
    });
    return copyBtn || null;
  }

  function getMenuContainer(copyBtn) {
    // The menu is the vertical stack containing Copy/Hide/Record links.
    // Use the closest wrapper that has multiple menu-like items.
    const parent = copyBtn.parentElement;
    if (!parent) return null;

    // Heuristic: parent should contain at least 2–3 buttons/links with similar styling
    const buttonsAndLinks = Array.from(parent.querySelectorAll('button, a'));
    if (buttonsAndLinks.length >= 2) {
      return parent;
    }

    // If not, try one level up
    const grand = parent.parentElement;
    if (grand) {
      const more = Array.from(grand.querySelectorAll('button, a'));
      if (more.length >= 2) {
        return grand;
      }
    }

    return parent; // fallback
  }

  function ensureEditButton() {
    const copyBtn = findCopyButton();
    if (!copyBtn) {
      // log('no Copy record button found yet');
      return;
    }

    const menu = getMenuContainer(copyBtn);
    if (!menu) {
    //  log('no menu container found');
      return;
    }

    if (menu.querySelector('#atproto-edit-record-btn')) {
      // log('Edit button already present');
      return;
    }

    const editBtn = copyBtn.cloneNode(true);
    editBtn.id = 'atproto-edit-record-btn';

    const label = editBtn.querySelector('span:last-child');
    if (label) label.textContent = 'Edit record';

    editBtn.addEventListener('click', async () => {
  //    log('Edit record clicked');
      const record = await getCurrentRecord();
      if (!record) {
        alert('Could not read current record JSON');
        return;
      }
      openEditorPanel(record);
    });

    // Insert right after "Copy record"
    copyBtn.parentElement.appendChild(editBtn);
 //   log('Edit record button added');
  }

  function tryHookMenu() {
    ensureEditButton();
  }

  // Initial attempts
  tryHookMenu();
  setTimeout(tryHookMenu, 300);
  setTimeout(tryHookMenu, 800);
  setTimeout(tryHookMenu, 1500);
  setTimeout(tryHookMenu, 3000);

  const observer = new MutationObserver(() => {
    tryHookMenu();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

//  log('menu hook initialized');

  // ---------- Record fetching ----------

  async function getCurrentRecord() {
    const recordLink = Array.from(document.querySelectorAll('a'))
      .find(a => a.textContent.includes('Record on PDS'));
    if (!recordLink) return null;

    const url = new URL(recordLink.href);
    const repo = url.searchParams.get('repo');
    const collection = url.searchParams.get('collection');
    const rkey = url.searchParams.get('rkey');
    if (!repo || !collection || !rkey) return null;

    const pdsUrl = `https://pds.wsocial.network/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(repo)}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(rkey)}`;
    const res = await fetch(pdsUrl);
    if (!res.ok) return null;
    const data = await res.json();
    return data.value || null;
  }

  // ---------- Editor panel ----------

  function isDarkMode() {
    return (
      document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  function themeColors() {
    const dark = isDarkMode();
    return {
      bg: dark ? '#111827' : '#ffffff',
      fg: dark ? '#e5e7eb' : '#111827',
      border: dark ? '#374151' : '#e5e7eb',
      inputBg: dark ? '#0b1220' : '#ffffff',
      muted: dark ? '#9ca3af' : '#6b7280',
      shadow: 'rgba(0,0,0,0.5)',
      btnBg: dark ? '#1f2937' : '#f3f4f6',
      btnFg: dark ? '#e5e7eb' : '#111827',
      btnBorder: dark ? '#374151' : '#d1d5db'
    };
  }

  function openEditorPanel(record) {
    const existing = document.getElementById('atproto-record-editor-panel');
    if (existing) existing.remove();

    const colors = themeColors();

    const panel = document.createElement('div');
    panel.id = 'atproto-record-editor-panel';
    panel.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 520px;
      max-height: 70vh;
      z-index: 999999;
      background: ${colors.bg};
      color: ${colors.fg};
      border: 1px solid ${colors.border};
      border-radius: 10px;
      font: 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px ${colors.shadow};
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      border-bottom: 1px solid ${colors.border};
      font-weight: 600;
    `;
    header.textContent = 'Edit AT Protocol record';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: ${colors.fg};
      font-size: 16px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
    `;
    closeBtn.addEventListener('click', () => panel.remove());
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      min-height: 0;
      flex: 1;
      overflow: auto;
    `;

    const textLabel = document.createElement('div');
    textLabel.textContent = 'Post text (edit freely):';
    textLabel.style.fontSize = '12px';

    const textArea = document.createElement('textarea');
    textArea.value = record.text || '';
    textArea.style.cssText = `
      width: 100%;
      min-height: 120px;
      resize: vertical;
      background: ${colors.inputBg};
      color: ${colors.fg};
      border: 1px solid ${colors.border};
      border-radius: 6px;
      padding: 8px;
      font: 13px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      white-space: pre;
      overflow: auto;
      outline: 1px solid transparent;
    `;
    textArea.onfocus = () => {
      textArea.style.outlineColor = isDarkMode() ? '#4b5563' : '#d1d5db';
    };
    textArea.onblur = () => {
      textArea.style.outlineColor = 'transparent';
    };

    const counter = document.createElement('div');
    counter.style.cssText = `
      font-size: 11px;
      color: ${colors.muted};
      text-align: right;
    `;

    function updateCounter() {
      const bytes = byteLength(textArea.value);
      counter.textContent = `${bytes} / ${POST_TEXT_LIMIT} bytes`;

      if (bytes > POST_TEXT_LIMIT) {
        counter.style.color = '#f87171';
        counter.style.fontWeight = '600';
      } else if (bytes > POST_TEXT_LIMIT - 20) {
        counter.style.color = '#fbbf24';
        counter.style.fontWeight = '500';
      } else {
        counter.style.color = colors.muted;
        counter.style.fontWeight = '400';
      }
    }

    const outputLabel = document.createElement('div');
    outputLabel.textContent = 'Updated record JSON (copy/paste into pdsls.dev):';
    outputLabel.style.fontSize = '12px';

    const outputArea = document.createElement('textarea');
    outputArea.readOnly = true;
    outputArea.style.cssText = `
      width: 100%;
      min-height: 220px;
      resize: vertical;
      background: ${colors.inputBg};
      color: ${colors.fg};
      border: 1px solid ${colors.border};
      border-radius: 6px;
      padding: 8px;
      font: 12px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      white-space: pre;
      overflow: auto;
      outline: 1px solid transparent;
    `;
    outputArea.onfocus = () => {
      outputArea.style.outlineColor = isDarkMode() ? '#4b5563' : '#d1d5db';
    };
    outputArea.onblur = () => {
      outputArea.style.outlineColor = 'transparent';
    };

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    `;

    const status = document.createElement('div');
    status.style.cssText = `
      font-size: 11px;
      color: ${colors.muted};
      margin-top: 4px;
      text-align: right;
    `;

    // Handle createdAt: update if older than 24h
    const needsNewTimestamp = shouldUpdateCreatedAt(record.createdAt);
    let lastCreatedAt = needsNewTimestamp ? nowIso() : record.createdAt;

    let lastComputedFacets = record.facets || [];
    let lastAddedCount = 0;
    let lastValidation = null;

    const recomputeBtn = document.createElement('button');
    recomputeBtn.textContent = 'Recompute facets';
    recomputeBtn.style.cssText = `
      appearance: none;
      border: 1px solid ${colors.btnBorder};
      background: ${colors.btnBg};
      color: ${colors.btnFg};
      border-radius: 6px;
      padding: 5px 10px;
      cursor: pointer;
      font: inherit;
    `;

    recomputeBtn.addEventListener('click', () => {
      const newTextRaw = textArea.value;

      const result = recomputeFacets(newTextRaw, lastComputedFacets);

      const updated = JSON.parse(JSON.stringify(record));
      updated.text = result.text;
      updated.facets = result.facets;
      updated.createdAt = lastCreatedAt;

      lastComputedFacets = result.facets;
      lastAddedCount = result.added;

      // Validate
      lastValidation = validateRecord(updated);

      const tsNote = needsNewTimestamp ? 'Timestamp updated (>24h old). ' : '';
      const facetNote = result.added ? `Added ${result.added} facet(s). ` : '';

      if (lastValidation.valid) {
        status.textContent = tsNote + facetNote + 'Record is valid.';
        status.style.color = '#22c55e'; // green
      } else {
        status.textContent = tsNote + facetNote + lastValidation.errors.join('; ');
        status.style.color = '#f87171'; // red
      }

      outputArea.value = JSON.stringify(updated, null, 2);
    });

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy JSON';
    copyBtn.style.cssText = `
      appearance: none;
      border: 1px solid ${colors.btnBorder};
      background: ${colors.btnBg};
      color: ${colors.btnFg};
      border-radius: 6px;
      padding: 5px 10px;
      cursor: pointer;
      font: inherit;
    `;

    copyBtn.addEventListener('click', async () => {
      if (lastValidation && !lastValidation.valid) {
        if (!confirm('Record has validation errors. Copy anyway?')) {
          return;
        }
      }

      const json = outputArea.value;
      try {
        await navigator.clipboard.writeText(json);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy JSON';
        }, 1200);
      } catch (e) {
        outputArea.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy JSON';
        }, 1200);
      }
    });

    buttonRow.append(recomputeBtn, copyBtn);

    function updateOutput() {
      updateCounter();
      const updated = JSON.parse(JSON.stringify(record));
      updated.text = textArea.value;
      updated.facets = lastComputedFacets;
      updated.createdAt = lastCreatedAt;

      lastValidation = validateRecord(updated);

      if (lastValidation.valid) {
        status.textContent = 'Record is valid.';
        status.style.color = '#22c55e';
      } else {
        status.textContent = lastValidation.errors.join('; ');
        status.style.color = '#f87171';
      }

      outputArea.value = JSON.stringify(updated, null, 2);
    }

    textArea.addEventListener('input', updateOutput);

    // Initial render
    updateOutput();

    body.append(textLabel, textArea, counter, outputLabel, outputArea, buttonRow, status);
    panel.append(header, body);
    document.body.appendChild(panel);
  }

  // ---------- Init ----------

  // No additional observer here; menu hooking is already set up above.
})();