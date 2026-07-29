const defaultEngineEl = document.getElementById('defaultEngine');
const themeSettingEl = document.getElementById('themeSetting');
const settingsStatusEl = document.getElementById('settingsStatus');
const linksListEl = document.getElementById('linksList');
const enginesListEl = document.getElementById('enginesList');
const addLinkBtn = document.getElementById('addLinkBtn');
const resetLinksBtn = document.getElementById('resetLinksBtn');
const importBookmarksBtn = document.getElementById('importBookmarksBtn');
const importBookmarksFileEl = document.getElementById('importBookmarksFile');
const bookmarkPreviewSectionEl = document.getElementById('bookmarkPreviewSection');
const bookmarkPreviewSummaryEl = document.getElementById('bookmarkPreviewSummary');
const bookmarkPreviewListEl = document.getElementById('bookmarkPreviewList');
const bookmarkSelectAllBtn = document.getElementById('bookmarkSelectAllBtn');
const bookmarkSelectNoneBtn = document.getElementById('bookmarkSelectNoneBtn');
const bookmarkSelectNewBtn = document.getElementById('bookmarkSelectNewBtn');
const bookmarkClearPreviewBtn = document.getElementById('bookmarkClearPreviewBtn');
const bookmarkImportSelectedBtn = document.getElementById('bookmarkImportSelectedBtn');
const bookmarkSelectAllBottomBtn = document.getElementById('bookmarkSelectAllBottomBtn');
const bookmarkSelectNoneBottomBtn = document.getElementById('bookmarkSelectNoneBottomBtn');
const bookmarkSelectNewBottomBtn = document.getElementById('bookmarkSelectNewBottomBtn');
const bookmarkImportSelectedBottomBtn = document.getElementById('bookmarkImportSelectedBottomBtn');
const addEngineBtn = document.getElementById('addEngineBtn');
const resetEnginesBtn = document.getElementById('resetEnginesBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileEl = document.getElementById('importFile');
const exportNotesBtn = document.getElementById('exportNotesBtn');
const importNotesReplaceBtn = document.getElementById('importNotesReplaceBtn');
const importNotesAppendBtn = document.getElementById('importNotesAppendBtn');
const importNotesFileEl = document.getElementById('importNotesFile');
const notesSummaryEl = document.getElementById('notesSummary');
const linkNameEl = document.getElementById('linkName');
const linkUrlEl = document.getElementById('linkUrl');
const engineNameEl = document.getElementById('engineName');
const engineTemplateEl = document.getElementById('engineTemplate');
const copyLocalBlankUrlBtn = document.getElementById('copyLocalBlankUrlBtn');
const localBlankHelpEl = document.getElementById('localBlankHelp');
const summaryLinksCountEl = document.getElementById('summaryLinksCount');
const summaryEnginesCountEl = document.getElementById('summaryEnginesCount');
const summaryNotesCountEl = document.getElementById('summaryNotesCount');
const quickLinksFilterEl = document.getElementById('quickLinksFilter');
const quickLinksFilterRowEl = document.getElementById('quickLinksFilterRow');
const bookmarkPreviewFilterEl = document.getElementById('bookmarkPreviewFilter');

let settings;
let stopThemeWatcher = () => {};
let pendingNotesImportMode = 'replace';
let draggedLinkIndex = null;
let bookmarkPreviewItems = [];
let quickLinksFilterText = '';
let bookmarkPreviewFilterText = '';

function setStatus(message, tone = 'neutral') {
  settingsStatusEl.textContent = message;
  settingsStatusEl.classList.remove('ok', 'error');
  if (tone === 'ok') settingsStatusEl.classList.add('ok');
  if (tone === 'error') settingsStatusEl.classList.add('error');
}

function syncThemeUi() {
  themeSettingEl.value = normalizeTheme(settings?.theme);
}

function applyCurrentTheme() {
  applyTheme(settings?.theme);
  syncThemeUi();
  stopThemeWatcher();
  stopThemeWatcher = watchSystemTheme(settings?.theme, () => applyTheme(settings?.theme));
}

function updateSummaryCards() {
  summaryLinksCountEl.textContent = String(Array.isArray(settings?.quickLinks) ? settings.quickLinks.length : 0);
  summaryEnginesCountEl.textContent = String(Array.isArray(settings?.customEngines) ? settings.customEngines.length : 0);
  summaryNotesCountEl.textContent = String(Array.isArray(settings?.notes) ? settings.notes.length : 0);
}

function renderNotesSummary() {
  const count = Array.isArray(settings?.notes) ? settings.notes.length : 0;
  if (!count) {
    notesSummaryEl.textContent = 'No notes saved yet.';
    return;
  }
  const latest = settings.notes[0];
  const latestLabel = latest?.title || latest?.sourceTitle || 'Untitled note';
  notesSummaryEl.textContent = `${count} note${count === 1 ? '' : 's'} saved. Latest: ${latestLabel}`;
}

function renderDefaultEngineDropdown(allEngines, selectedId) {
  defaultEngineEl.textContent = '';
  Object.entries(allEngines).forEach(([id, engine]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = engine.name;
    if (id === selectedId) option.selected = true;
    defaultEngineEl.appendChild(option);
  });
}

function createActionButton(label, datasetKey, datasetValue, disabled = false, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset[datasetKey] = datasetValue;
  button.disabled = disabled;
  if (className) button.className = className;
  return button;
}

function createEmptyCard(message) {
  const empty = document.createElement('div');
  empty.className = 'empty-card';
  const text = document.createElement('div');
  text.className = 'item-detail';
  text.textContent = message;
  empty.appendChild(text);
  return empty;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseAction(value) {
  const [type, rawIndex] = value.split(':');
  return { type, index: Number(rawIndex) };
}

function clearLinkInputs() {
  linkNameEl.value = '';
  linkUrlEl.value = '';
}

function clearEngineInputs() {
  engineNameEl.value = '';
  engineTemplateEl.value = '';
}

async function ensureValidEngineSelection() {
  const allEngines = getAllEngines(settings.customEngines);
  if (!allEngines[settings.engine]) {
    settings.engine = STORAGE_DEFAULTS.engine;
    await storageSet({ engine: settings.engine });
  }
}

async function persistSettings(message, tone = 'ok') {
  await ensureValidEngineSelection();
  await storageSet({
    engine: settings.engine,
    customEngines: sanitizeCustomEngines(settings.customEngines),
    quickLinks: sanitizeQuickLinks(settings.quickLinks),
    theme: normalizeTheme(settings.theme),
    notes: sanitizeNotes(settings.notes)
  });
  settings = await readSettings();
  await ensureValidEngineSelection();
  renderAll();
  setStatus(message, tone);
}

function buildItemSummary(titleText, detailText, badgeText = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'item-summary';

  const title = document.createElement('div');
  title.className = 'item-title';
  title.textContent = titleText;

  const detail = document.createElement('div');
  detail.className = 'item-detail';
  detail.textContent = detailText;

  wrapper.appendChild(title);
  wrapper.appendChild(detail);

  if (badgeText) {
    const badge = document.createElement('div');
    badge.className = 'item-badge';
    badge.textContent = badgeText;
    wrapper.appendChild(badge);
  }

  return wrapper;
}

function createQuickLinkEditCard(link, index) {
  const card = document.createElement('div');
  card.className = 'edit-card';

  const grid = document.createElement('div');
  grid.className = 'edit-grid two';

  const nameWrap = document.createElement('div');
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Name';
  nameLabel.htmlFor = `edit-link-name-${index}`;
  const nameInput = document.createElement('input');
  nameInput.id = `edit-link-name-${index}`;
  nameInput.value = link.name;
  nameInput.dataset.editLinkName = String(index);
  nameWrap.appendChild(nameLabel);
  nameWrap.appendChild(nameInput);

  const urlWrap = document.createElement('div');
  const urlLabel = document.createElement('label');
  urlLabel.textContent = 'URL';
  urlLabel.htmlFor = `edit-link-url-${index}`;
  const urlInput = document.createElement('input');
  urlInput.id = `edit-link-url-${index}`;
  urlInput.value = link.url;
  urlInput.dataset.editLinkUrl = String(index);
  urlWrap.appendChild(urlLabel);
  urlWrap.appendChild(urlInput);

  grid.appendChild(nameWrap);
  grid.appendChild(urlWrap);
  card.appendChild(grid);

  const actions = document.createElement('div');
  actions.className = 'item-actions';
  actions.appendChild(createActionButton('Save', 'saveLinkEdit', String(index), false, 'primary'));
  actions.appendChild(createActionButton('Cancel', 'cancelLinkEdit', String(index)));
  card.appendChild(actions);

  return card;
}

function createEngineEditCard(engine, index) {
  const card = document.createElement('div');
  card.className = 'edit-card';

  const grid = document.createElement('div');
  grid.className = 'edit-grid two';

  const nameWrap = document.createElement('div');
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Engine name';
  nameLabel.htmlFor = `edit-engine-name-${index}`;
  const nameInput = document.createElement('input');
  nameInput.id = `edit-engine-name-${index}`;
  nameInput.value = engine.name;
  nameInput.dataset.editEngineName = String(index);
  nameWrap.appendChild(nameLabel);
  nameWrap.appendChild(nameInput);

  const urlWrap = document.createElement('div');
  const urlLabel = document.createElement('label');
  urlLabel.textContent = 'Search URL template';
  urlLabel.htmlFor = `edit-engine-url-${index}`;
  const urlInput = document.createElement('input');
  urlInput.id = `edit-engine-url-${index}`;
  urlInput.value = engine.searchUrl;
  urlInput.dataset.editEngineUrl = String(index);
  urlWrap.appendChild(urlLabel);
  urlWrap.appendChild(urlInput);

  grid.appendChild(nameWrap);
  grid.appendChild(urlWrap);
  card.appendChild(grid);

  const actions = document.createElement('div');
  actions.className = 'item-actions';
  actions.appendChild(createActionButton('Save', 'saveEngineEdit', String(index), false, 'primary'));
  actions.appendChild(createActionButton('Cancel', 'cancelEngineEdit', String(index)));
  card.appendChild(actions);

  return card;
}

function createQuickLinkItem(link, index) {
  const item = document.createElement('div');
  item.className = 'item';
  item.draggable = typeof window.matchMedia === 'function'
    ? !window.matchMedia('(pointer: coarse)').matches
    : true;
  item.dataset.linkIndex = String(index);

  const top = document.createElement('div');
  top.className = 'item-top';
  top.appendChild(buildItemSummary(link.name, link.url));

  const actions = document.createElement('div');
  actions.className = 'item-actions';
  actions.appendChild(createActionButton('Drag', 'dragLink', String(index), false, 'drag-handle'));
  actions.appendChild(createActionButton('Edit', 'editLink', String(index)));
  actions.appendChild(createActionButton('Up', 'moveUp', `link:${index}`, index === 0));
  actions.appendChild(createActionButton('Down', 'moveDown', `link:${index}`, index === settings.quickLinks.length - 1));
  actions.appendChild(createActionButton('Remove', 'remove', `link:${index}`, false, 'danger'));

  top.appendChild(actions);
  item.appendChild(top);
  item.appendChild(createQuickLinkEditCard(link, index));

  item.addEventListener('dragstart', (event) => {
    draggedLinkIndex = index;
    item.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  });

  item.addEventListener('dragend', () => {
    draggedLinkIndex = null;
    item.classList.remove('dragging');
    item.classList.remove('drag-over');
  });

  item.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (draggedLinkIndex === null || draggedLinkIndex === index) return;
    item.classList.add('drag-over');
  });

  item.addEventListener('dragleave', () => {
    item.classList.remove('drag-over');
  });

  item.addEventListener('drop', async (event) => {
    event.preventDefault();
    item.classList.remove('drag-over');
    const from = draggedLinkIndex;
    const to = index;
    if (from === null || from === to) return;
    settings.quickLinks = moveItem(settings.quickLinks, from, to);
    await persistSettings('Reordered quick links.');
  });

  return item;
}

function createEngineItem(engine, index) {
  const item = document.createElement('div');
  item.className = 'item';
  item.dataset.engineIndex = String(index);

  const top = document.createElement('div');
  top.className = 'item-top';
  top.appendChild(buildItemSummary(engine.name, engine.searchUrl, 'Custom'));

  const actions = document.createElement('div');
  actions.className = 'item-actions';
  actions.appendChild(createActionButton('Edit', 'editEngine', String(index)));
  actions.appendChild(createActionButton('Up', 'moveUp', `engine:${index}`, index === 0));
  actions.appendChild(createActionButton('Down', 'moveDown', `engine:${index}`, index === settings.customEngines.length - 1));
  actions.appendChild(createActionButton('Remove', 'remove', `engine:${index}`, false, 'danger'));

  top.appendChild(actions);
  item.appendChild(top);
  item.appendChild(createEngineEditCard(engine, index));
  return item;
}

function getFilteredQuickLinksOrder() {
  const items = settings.quickLinks || [];
  if (!quickLinksFilterText || items.length <= 10) {
    return items.map((link, index) => ({ link, index, match: true }));
  }
  const q = quickLinksFilterText.toLowerCase();
  const matches = [];
  const nonMatches = [];
  items.forEach((link, index) => {
    const text = (link.name + '\n' + link.url).toLowerCase();
    const match = text.includes(q);
    (match ? matches : nonMatches).push({ link, index, match });
  });
  return matches.concat(nonMatches);
}

function applyQuickLinksFilterVisibility() {
  const row = quickLinksFilterRowEl;
  if (!row) return;
  const count = (settings.quickLinks || []).length;
  if (count > 10) {
    row.classList.remove('hidden');
  } else {
    row.classList.add('hidden');
  }
}

function renderLinks() {
  linksListEl.textContent = '';
  const items = settings.quickLinks || [];
  if (!items.length) {
    linksListEl.appendChild(createEmptyCard('No quick links saved.'));
    applyQuickLinksFilterVisibility();
    return;
  }
  const ordered = getFilteredQuickLinksOrder();
  ordered.forEach(({ link, index, match }) => {
    const item = createQuickLinkItem(link, index);
    if (!match && quickLinksFilterText && items.length > 10) {
      item.classList.add('item--filtered-out');
      item.dataset.filterDisabled = 'true';
    }
    linksListEl.appendChild(item);
  });
  applyQuickLinksFilterVisibility();
}

function renderEngines() {
  enginesListEl.textContent = '';
  if (!settings.customEngines.length) {
    enginesListEl.appendChild(createEmptyCard('No custom engines added yet.'));
    return;
  }
  settings.customEngines.forEach((engine, index) => {
    enginesListEl.appendChild(createEngineItem(engine, index));
  });
}

function closeAllEditing(listEl) {
  listEl.querySelectorAll('.item.is-editing').forEach((item) => {
    item.classList.remove('is-editing');
  });
}

function openEditItem(listEl, indexAttr, index) {
  closeAllEditing(listEl);
  const item = listEl.querySelector(`[${indexAttr}="${index}"]`);
  if (item) item.classList.add('is-editing');
}

function getExistingQuickLinkKeySet() {
  return new Set((settings.quickLinks || []).map((item) => `${item.name}\n${item.url}`));
}

function updateBookmarkPreviewSummary() {
  if (!bookmarkPreviewItems.length) {
    bookmarkPreviewSummaryEl.textContent = 'No file loaded.';
    return;
  }

  const total = bookmarkPreviewItems.length;
  const selected = bookmarkPreviewItems.filter((item) => item.selected).length;
  const duplicates = bookmarkPreviewItems.filter((item) => item.duplicate).length;
  bookmarkPreviewSummaryEl.textContent =
    `${selected} selected of ${total}. ${duplicates} already exist in quick links.`;
}

function renderBookmarkPreview() {
  if (!bookmarkPreviewItems.length) {
    bookmarkPreviewSectionEl.classList.add('hidden');
    bookmarkPreviewListEl.textContent = '';
    updateBookmarkPreviewSummary();
    return;
  }

  bookmarkPreviewSectionEl.classList.remove('hidden');
  bookmarkPreviewListEl.textContent = '';

  const q = bookmarkPreviewFilterText.toLowerCase();
  bookmarkPreviewItems.forEach((item, index) => {
    if (q) {
      const text = (item.name + '\n' + item.url + '\n' + (item.folderPath || '')).toLowerCase();
      if (!text.includes(q)) {
        return;
      }
    }

    const card = document.createElement('label');
    card.className = 'preview-card';
    if (item.duplicate) card.classList.add('is-duplicate');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.selected && !item.duplicate;
    checkbox.disabled = !!item.duplicate;
    checkbox.dataset.previewIndex = String(index);

    const body = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'preview-title';
    title.textContent = item.name;

    const detail = document.createElement('div');
    detail.className = 'item-detail';
    detail.textContent = item.url;

    const tags = document.createElement('div');
    tags.className = 'preview-tags';
    if (item.folderPath) {
      const folderTag = document.createElement('div');
      folderTag.className = 'preview-tag';
      folderTag.textContent = item.folderPath;
      tags.appendChild(folderTag);
    }
    if (item.duplicate) {
      const duplicateTag = document.createElement('div');
      duplicateTag.className = 'preview-tag';
      duplicateTag.textContent = 'Already in quick links';
      tags.appendChild(duplicateTag);
    }

    body.appendChild(title);
    body.appendChild(detail);
    if (tags.childNodes.length) body.appendChild(tags);

    card.appendChild(checkbox);
    card.appendChild(body);
    bookmarkPreviewListEl.appendChild(card);
  });

  updateBookmarkPreviewSummary();
}

function clearBookmarkPreview() {
  bookmarkPreviewItems = [];
  bookmarkPreviewFilterText = '';
  if (bookmarkPreviewFilterEl) bookmarkPreviewFilterEl.value = '';
  renderBookmarkPreview();
}

function setPreviewSelection(mode) {
  if (!bookmarkPreviewItems.length) return;

  if (mode === 'all') {
    bookmarkPreviewItems = bookmarkPreviewItems.map((item) => ({ ...item, selected: !item.duplicate }));
  } else if (mode === 'none') {
    bookmarkPreviewItems = bookmarkPreviewItems.map((item) => ({ ...item, selected: false }));
  } else if (mode === 'new') {
    bookmarkPreviewItems = bookmarkPreviewItems.map((item) => ({ ...item, selected: !item.duplicate }));
  }

  renderBookmarkPreview();
}

function parseBookmarksHtml(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const anchors = [...doc.querySelectorAll('a[href]')];
  const items = [];
  const seen = new Set();

  anchors.forEach((anchor) => {
    const url = (anchor.getAttribute('href') || '').trim();
    const name = (anchor.textContent || '').trim() || 'Untitled';
    if (!isValidUrl(url)) return;

    const folderNames = [];
    let cursor = anchor.parentElement;
    while (cursor) {
      if (cursor.tagName === 'DL') {
        const heading = cursor.previousElementSibling;
        if (heading && /^H[1-6]$/.test(heading.tagName)) {
          folderNames.unshift((heading.textContent || '').trim());
        }
      }
      cursor = cursor.parentElement;
    }

    const folderPath = folderNames.filter(Boolean).join(' / ');
    const key = `${name}\n${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ name, url, folderPath });
  });

  return items;
}

async function handleImportBookmarksFile() {
  const file = importBookmarksFileEl.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const imported = parseBookmarksHtml(text);
    if (!imported.length) {
      clearBookmarkPreview();
      setStatus('No valid bookmarks were found in that HTML file.', 'error');
      return;
    }

    const existing = getExistingQuickLinkKeySet();
    bookmarkPreviewItems = imported.map((item) => {
      const duplicate = existing.has(`${item.name}\n${item.url}`);
      return {
        ...item,
        duplicate,
        selected: !duplicate
      };
    });

    bookmarkPreviewFilterText = '';
    if (bookmarkPreviewFilterEl) bookmarkPreviewFilterEl.value = '';
    renderBookmarkPreview();
    setStatus(
      `Loaded ${bookmarkPreviewItems.length} bookmark candidate` +
      (bookmarkPreviewItems.length === 1 ? '' : 's') +
      ' for review.',
      'ok'
    );
  } catch (error) {
    console.error('Bookmark HTML preview failed', error);
    clearBookmarkPreview();
    setStatus('Could not read bookmarks HTML file.', 'error');
  } finally {
    importBookmarksFileEl.value = '';
  }
}

async function importSelectedBookmarks() {
  const selected = bookmarkPreviewItems.filter((item) => item.selected && !item.duplicate);
  if (!selected.length) {
    setStatus('Select at least one bookmark before importing.', 'error');
    return;
  }

  const merged = [...settings.quickLinks];
  const seen = new Set(merged.map((item) => `${item.name}\n${item.url}`));
  let added = 0;

  selected.forEach((item) => {
    const key = `${item.name}\n${item.url}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({ name: item.name, url: item.url });
    added += 1;
  });

  if (!added) {
    setStatus('Selected bookmarks were already present as quick links.', 'error');
    return;
  }

  settings.quickLinks = merged;
  clearBookmarkPreview();
  quickLinksFilterText = '';
  if (quickLinksFilterEl) quickLinksFilterEl.value = '';
  await persistSettings(
    `Imported ${added} bookmark link` + (added === 1 ? '' : 's') + ' into quick links.',
    'ok'
  );
}

function detectBrowserFamily() {
  const ua = navigator.userAgent || '';
  if (ua.includes('Firefox/')) return 'firefox';
  if (ua.includes('Chrome/') || ua.includes('Chromium/') || ua.includes('Edg/')) return 'chromium';
  return 'other';
}

function updateLocalBlankHelp() {
  const family = detectBrowserFamily();
  if (family === 'chromium') {
    localBlankHelpEl.textContent =
      'Chrome/Comet: paste this into Settings → Search engine → Manage search engines and site search.';
    return;
  }
  if (family === 'firefox') {
    localBlankHelpEl.textContent =
      'Firefox: paste this into about:preferences#search under Search shortcuts or custom engines.';
    return;
  }
  localBlankHelpEl.textContent = 'Use this in your browser’s search engine settings.';
}

async function handleCopyLocalBlankUrl() {
  const urlField = document.getElementById('localBlankUrl');
  if (!urlField) return;
  const value = urlField.value.trim();
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    localBlankHelpEl.textContent =
      'Copied. Paste this into your browser’s custom search engine URL field.';
  } catch (error) {
    console.error('Clipboard copy failed', error);
    localBlankHelpEl.textContent = 'Copy failed. Select and copy the URL manually.';
  }
}

async function handleAddLink() {
  const name = linkNameEl.value.trim();
  const url = linkUrlEl.value.trim();
  if (!name || !isValidUrl(url)) {
    setStatus('Enter a link name and a valid full URL.', 'error');
    return;
  }
  settings.quickLinks.push({ name, url });
  clearLinkInputs();
  await persistSettings('Added quick link: ' + name);
}

async function handleResetLinks() {
  settings.quickLinks = [...DEFAULT_QUICK_LINKS];
  clearBookmarkPreview();
  quickLinksFilterText = '';
  if (quickLinksFilterEl) quickLinksFilterEl.value = '';
  await persistSettings('Restored default quick links.');
}

async function handleAddEngine() {
  const name = engineNameEl.value.trim();
  const searchUrl = engineTemplateEl.value.trim();
  if (!name || !isValidTemplate(searchUrl)) {
    setStatus('Enter an engine name and a valid template URL containing %s.', 'error');
    return;
  }

  const id = createEngineId(name);
  const duplicateIndex = settings.customEngines.findIndex((item) => item.id === id);
  const payload = { id, name, searchUrl };

  if (duplicateIndex >= 0) {
    settings.customEngines[duplicateIndex] = payload;
    clearEngineInputs();
    await persistSettings('Updated custom engine: ' + name);
    return;
  }

  settings.customEngines.push(payload);
  clearEngineInputs();
  await persistSettings('Added custom engine: ' + name);
}

async function handleResetEngines() {
  settings.customEngines = [];
  if (!DEFAULT_BUILTIN_ENGINES[settings.engine]) settings.engine = STORAGE_DEFAULTS.engine;
  await persistSettings('Removed all custom engines.');
}

async function handleReorderAction(type, index, direction) {
  if (type === 'link') {
    settings.quickLinks = moveItem(settings.quickLinks, index, index + direction);
    await persistSettings('Reordered quick links.');
    return;
  }
  if (type === 'engine') {
    settings.customEngines = moveItem(settings.customEngines, index, index + direction);
    await persistSettings('Reordered custom engines.');
  }
}

async function handleRemoveAction(type, index) {
  if (type === 'link') {
    const removed = settings.quickLinks.splice(index, 1)[0];
    await persistSettings('Removed quick link: ' + removed.name);
    return;
  }
  if (type === 'engine') {
    const removed = settings.customEngines.splice(index, 1)[0];
    if (settings.engine === removed.id) settings.engine = STORAGE_DEFAULTS.engine;
    await persistSettings('Removed custom engine: ' + removed.name);
  }
}

async function saveInlineLink(index) {
  const nameInput = document.querySelector(`[data-edit-link-name="${index}"]`);
  const urlInput = document.querySelector(`[data-edit-link-url="${index}"]`);
  if (!nameInput || !urlInput) return;

  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  if (!name || !isValidUrl(url)) {
    setStatus('Inline quick link edit needs a name and valid full URL.', 'error');
    return;
  }

  settings.quickLinks[index] = { name, url };
  await persistSettings('Updated quick link: ' + name);
}

async function saveInlineEngine(index) {
  const nameInput = document.querySelector(`[data-edit-engine-name="${index}"]`);
  const urlInput = document.querySelector(`[data-edit-engine-url="${index}"]`);
  if (!nameInput || !urlInput) return;

  const name = nameInput.value.trim();
  const searchUrl = urlInput.value.trim();
  if (!name || !isValidTemplate(searchUrl)) {
    setStatus('Inline engine edit needs a name and valid template URL with %s.', 'error');
    return;
  }

  const current = settings.customEngines[index];
  const nextId = createEngineId(name);
  const duplicate = settings.customEngines.find(
    (item, itemIndex) => itemIndex !== index && item.id === nextId
  );
  if (duplicate) {
    setStatus('Another custom engine already uses that name/id.', 'error');
    return;
  }

  settings.customEngines[index] = { id: nextId, name, searchUrl };
  if (settings.engine === current.id) settings.engine = nextId;
  await persistSettings('Updated custom engine: ' + name);
}

async function handleImportSettingsFile() {
  const file = importFileEl.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    settings = sanitizeImportedSettings(parsed);
    clearBookmarkPreview();
    quickLinksFilterText = '';
    if (quickLinksFilterEl) quickLinksFilterEl.value = '';
    await persistSettings('Imported settings from ' + file.name);
  } catch (error) {
    console.error('Import failed', error);
    setStatus('Could not import JSON settings file.', 'error');
  } finally {
    importFileEl.value = '';
  }
}

async function handleImportNotesFile() {
  const file = importNotesFileEl.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const incomingNotes = sanitizeNotes(parsed?.notes);
    settings.notes =
      pendingNotesImportMode === 'append'
        ? mergeNotes(settings.notes, incomingNotes)
        : incomingNotes;

    await persistSettings(
      pendingNotesImportMode === 'append'
        ? 'Appended notes from ' + file.name
        : 'Replaced notes from ' + file.name
    );
  } catch (error) {
    console.error('Notes import failed', error);
    setStatus('Could not import notes JSON file.', 'error');
  } finally {
    importNotesFileEl.value = '';
  }
}

function renderAll() {
  const allEngines = getAllEngines(settings.customEngines);
  if (!allEngines[settings.engine]) settings.engine = STORAGE_DEFAULTS.engine;
  renderDefaultEngineDropdown(allEngines, settings.engine);
  renderLinks();
  renderEngines();
  renderNotesSummary();
  updateSummaryCards();
  applyCurrentTheme();
  renderBookmarkPreview();
}

function bindEvents() {
  defaultEngineEl.addEventListener('change', async () => {
    const allEngines = getAllEngines(settings.customEngines);
    settings.engine = allEngines[defaultEngineEl.value]
      ? defaultEngineEl.value
      : STORAGE_DEFAULTS.engine;
    await storageSet({ engine: settings.engine });
    renderAll();
    setStatus('Saved default engine: ' + allEngines[settings.engine].name, 'ok');
  });

  themeSettingEl.addEventListener('change', async () => {
    settings.theme = normalizeTheme(themeSettingEl.value);
    applyCurrentTheme();
    await storageSet({ theme: settings.theme });
    setStatus('Saved theme: ' + settings.theme + '.', 'ok');
  });

  addLinkBtn.addEventListener('click', handleAddLink);
  resetLinksBtn.addEventListener('click', handleResetLinks);
  importBookmarksBtn.addEventListener('click', () => importBookmarksFileEl.click());
  importBookmarksFileEl.addEventListener('change', handleImportBookmarksFile);
  bookmarkSelectAllBtn.addEventListener('click', () => setPreviewSelection('all'));
  bookmarkSelectNoneBtn.addEventListener('click', () => setPreviewSelection('none'));
  bookmarkSelectNewBtn.addEventListener('click', () => setPreviewSelection('new'));
  bookmarkClearPreviewBtn.addEventListener('click', () => {
    clearBookmarkPreview();
    setStatus('Cleared bookmark import preview.', 'ok');
  });
  bookmarkImportSelectedBtn.addEventListener('click', importSelectedBookmarks);

  if (bookmarkSelectAllBottomBtn) {
    bookmarkSelectAllBottomBtn.addEventListener('click', () => setPreviewSelection('all'));
  }
  if (bookmarkSelectNoneBottomBtn) {
    bookmarkSelectNoneBottomBtn.addEventListener('click', () => setPreviewSelection('none'));
  }
  if (bookmarkSelectNewBottomBtn) {
    bookmarkSelectNewBottomBtn.addEventListener('click', () => setPreviewSelection('new'));
  }
  if (bookmarkImportSelectedBottomBtn) {
    bookmarkImportSelectedBottomBtn.addEventListener('click', importSelectedBookmarks);
  }

  addEngineBtn.addEventListener('click', handleAddEngine);
  resetEnginesBtn.addEventListener('click', handleResetEngines);

  exportBtn.addEventListener('click', () => {
    downloadJson('local-search-newtab-plus-settings.json', buildSettingsExportPayload(settings));
    setStatus('Exported settings to JSON.', 'ok');
  });

  importBtn.addEventListener('click', () => importFileEl.click());
  importFileEl.addEventListener('change', handleImportSettingsFile);

  exportNotesBtn.addEventListener('click', () => {
    downloadJson('local-search-newtab-plus-notes.json', buildNotesExportPayload(settings.notes));
    setStatus('Exported notes to JSON.', 'ok');
  });

  importNotesReplaceBtn.addEventListener('click', () => {
    pendingNotesImportMode = 'replace';
    importNotesFileEl.click();
  });

  importNotesAppendBtn.addEventListener('click', () => {
    pendingNotesImportMode = 'append';
    importNotesFileEl.click();
  });

  importNotesFileEl.addEventListener('change', handleImportNotesFile);

  if (copyLocalBlankUrlBtn) {
    copyLocalBlankUrlBtn.addEventListener('click', handleCopyLocalBlankUrl);
  }

  if (quickLinksFilterEl) {
    quickLinksFilterEl.addEventListener('input', () => {
      quickLinksFilterText = quickLinksFilterEl.value.trim();
      renderLinks();
    });
  }

  if (bookmarkPreviewFilterEl) {
    bookmarkPreviewFilterEl.addEventListener('input', () => {
      bookmarkPreviewFilterText = bookmarkPreviewFilterEl.value.trim();
      renderBookmarkPreview();
    });
  }

  bookmarkPreviewListEl.addEventListener('change', (event) => {
    const checkbox = event.target.closest('[data-preview-index]');
    if (!checkbox) return;
    const index = Number(checkbox.dataset.previewIndex);
    if (!bookmarkPreviewItems[index]) return;
    bookmarkPreviewItems[index].selected = checkbox.checked && !bookmarkPreviewItems[index].duplicate;
    updateBookmarkPreviewSummary();
  });

  document.addEventListener('click', async (event) => {
    const filteredHost = event.target.closest('[data-filter-disabled="true"]');
    if (filteredHost) {
      return;
    }

    const up = event.target.closest('[data-move-up]');
    if (up) {
      const { type, index } = parseAction(up.dataset.moveUp);
      await handleReorderAction(type, index, -1);
      return;
    }

    const down = event.target.closest('[data-move-down]');
    if (down) {
      const { type, index } = parseAction(down.dataset.moveDown);
      await handleReorderAction(type, index, 1);
      return;
    }

    const remove = event.target.closest('[data-remove]');
    if (remove) {
      const { type, index } = parseAction(remove.dataset.remove);
      await handleRemoveAction(type, index);
      return;
    }

    const editLink = event.target.closest('[data-edit-link]');
    if (editLink) {
      openEditItem(linksListEl, 'data-link-index', editLink.dataset.editLink);
      return;
    }

    const cancelLinkEdit = event.target.closest('[data-cancel-link-edit]');
    if (cancelLinkEdit) {
      closeAllEditing(linksListEl);
      return;
    }

    const saveLinkEdit = event.target.closest('[data-save-link-edit]');
    if (saveLinkEdit) {
      await saveInlineLink(Number(saveLinkEdit.dataset.saveLinkEdit));
      return;
    }

    const editEngine = event.target.closest('[data-edit-engine]');
    if (editEngine) {
      openEditItem(enginesListEl, 'data-engine-index', editEngine.dataset.editEngine);
      return;
    }

    const cancelEngineEdit = event.target.closest('[data-cancel-engine-edit]');
    if (cancelEngineEdit) {
      closeAllEditing(enginesListEl);
      return;
    }

    const saveEngineEdit = event.target.closest('[data-save-engine-edit]');
    if (saveEngineEdit) {
      await saveInlineEngine(Number(saveEngineEdit.dataset.saveEngineEdit));
    }
  });
}

async function init() {
  setStatus('Loading settings…');
  settings = await readSettings();
  await ensureValidEngineSelection();
  renderAll();
  updateLocalBlankHelp();
  bindEvents();
  setStatus('Settings loaded.', 'ok');
}

init().catch((error) => {
  console.error('Options init failed', error);
  setStatus('Could not load settings.', 'error');
});