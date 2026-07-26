const engineSelect = document.getElementById('engine');
const form = document.getElementById('searchForm');
const queryInput = document.getElementById('query');
const statusEl = document.getElementById('status');
const quickLinksEl = document.getElementById('quickLinks');
const engineListEl = document.getElementById('engineList');
const latestNoteEl = document.getElementById('latestNote');
const saveCurrentEngineBtn = document.getElementById('saveCurrentEngine');
const saveSearchAsNoteBtn = document.getElementById('saveSearchAsNote');

let currentSettings;
let stopThemeWatcher = () => {};

function applyCurrentTheme() {
  const effective = applyTheme(currentSettings?.theme);
  stopThemeWatcher();
  stopThemeWatcher = watchSystemTheme(currentSettings?.theme, () => applyTheme(currentSettings?.theme));
  return effective;
}

function getCurrentUrlObject() {
  try {
    return new URL(window.location.href);
  } catch {
    return null;
  }
}

function getPrefillQuery() {
  const url = getCurrentUrlObject();
  if (!url) return '';
  return (url.searchParams.get('prefill') || url.searchParams.get('q') || '').trim();
}

function getIncomingSourceUrl() {
  const url = getCurrentUrlObject();
  if (!url) return '';
  const value = (url.searchParams.get('sourceUrl') || '').trim();
  return isValidUrl(value) ? value : '';
}

function getIncomingSourceTitle() {
  const url = getCurrentUrlObject();
  if (!url) return '';
  return (url.searchParams.get('sourceTitle') || '').trim();
}

function renderEngineOptions(allEngines, selectedId) {
  engineSelect.innerHTML = '';

  Object.entries(allEngines).forEach(([id, engine]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = engine.name;

    if (id === selectedId) {
      option.selected = true;
    }

    engineSelect.appendChild(option);
  });
}

function renderQuickLinks(links) {
  quickLinksEl.innerHTML = '';

  links.forEach((link) => {
    const anchor = document.createElement('a');
    anchor.className = 'quick-link';
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';

    const title = document.createElement('span');
    title.className = 'quick-link-title';
    title.textContent = link.name;

    const url = document.createElement('span');
    url.className = 'quick-link-url';
    url.textContent = link.url;

    anchor.appendChild(title);
    anchor.appendChild(url);
    quickLinksEl.appendChild(anchor);
  });
}

function renderEngineList(allEngines, selectedId) {
  engineListEl.innerHTML = '';

  Object.entries(allEngines).forEach(([id, engine]) => {
    const item = document.createElement('div');
    item.className = 'engine-item';

    const meta = document.createElement('div');
    meta.className = 'engine-meta';

    const nameEl = document.createElement('strong');
    nameEl.textContent = engine.name;

    const urlEl = document.createElement('span');
    urlEl.textContent = engine.searchUrl;

    meta.appendChild(nameEl);
    meta.appendChild(urlEl);

    const status = document.createElement('div');
    status.textContent = id === selectedId ? 'Current default' : engine.builtin ? 'Built-in' : 'Custom';

    item.appendChild(meta);
    item.appendChild(status);
    engineListEl.appendChild(item);
  });
}

function renderLatestNote(notes) {
  latestNoteEl.innerHTML = '';

  if (!notes.length) {
    const empty = document.createElement('div');
    empty.className = 'note-preview';

    const meta = document.createElement('div');
    meta.className = 'note-meta';

    const title = document.createElement('strong');
    title.textContent = 'No notes yet';

    const body = document.createElement('span');
    body.textContent = 'Save a search from this page or capture selected text from the browser context menu.';

    meta.appendChild(title);
    meta.appendChild(body);
    empty.appendChild(meta);
    latestNoteEl.appendChild(empty);
    return;
  }

  const note = notes[0];
  const item = document.createElement('div');
  item.className = 'note-preview';

  const meta = document.createElement('div');
  meta.className = 'note-meta';

  const title = document.createElement('strong');
  title.textContent = note.title || 'Untitled note';

  const body = document.createElement('span');
  body.textContent = note.text || note.capturedText || note.sourceUrl || 'Saved note';

  meta.appendChild(title);
  meta.appendChild(body);

  if (note.sourceUrl) {
    const source = document.createElement('a');
    source.className = 'action-link';
    source.href = note.sourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = note.sourceTitle ? 'Open source: ' + note.sourceTitle : 'Open source';
    item.appendChild(meta);
    item.appendChild(source);
  } else {
    item.appendChild(meta);
  }

  latestNoteEl.appendChild(item);
}

async function init() {
  currentSettings = await readSettings();
  applyCurrentTheme();

  const allEngines = getAllEngines(currentSettings.customEngines);
  const selectedId = allEngines[currentSettings.engine] ? currentSettings.engine : STORAGE_DEFAULTS.engine;

  renderEngineOptions(allEngines, selectedId);
  renderQuickLinks(currentSettings.quickLinks);
  renderEngineList(allEngines, selectedId);
  renderLatestNote(currentSettings.notes);

  const prefill = getPrefillQuery();
  if (prefill) {
    queryInput.value = prefill;
    queryInput.focus();
    queryInput.setSelectionRange(prefill.length, prefill.length);
    statusEl.textContent = 'Imported browser search query into the local page. Press Enter to search or save it as a note.';
  } else {
    statusEl.textContent = 'Default engine: ' + allEngines[selectedId].name + '. No search request is made until you submit.';
  }

  saveCurrentEngineBtn.addEventListener('click', async () => {
    const allEngines = getAllEngines(currentSettings.customEngines);
    const selectedEngineId = allEngines[engineSelect.value] ? engineSelect.value : STORAGE_DEFAULTS.engine;

    await storageSet({ engine: selectedEngineId });
    currentSettings.engine = selectedEngineId;
    renderEngineList(allEngines, selectedEngineId);
    statusEl.textContent = 'Saved default engine: ' + allEngines[selectedEngineId].name;
  });

  saveSearchAsNoteBtn.addEventListener('click', async () => {
    const text = queryInput.value.trim();
    if (!text) {
      queryInput.focus();
      statusEl.textContent = 'Enter or import a query before saving it as a note.';
      return;
    }

    const sourceUrl = getIncomingSourceUrl();
    const sourceTitle = getIncomingSourceTitle();

    const note = await saveNote({
      title: text,
      text,
      sourceTitle,
      sourceUrl,
      capturedText: text,
      originType: sourceUrl ? 'search-capture' : 'search'
    });

    currentSettings = await readSettings();
    renderLatestNote(currentSettings.notes);
    statusEl.textContent = 'Saved note: ' + note.title;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const rawQuery = queryInput.value.trim();
    if (!rawQuery) {
      queryInput.focus();
      return;
    }

    const allEngines = getAllEngines(currentSettings.customEngines);
    const selectedEngineId = allEngines[engineSelect.value] ? engineSelect.value : STORAGE_DEFAULTS.engine;

    await storageSet({ engine: selectedEngineId });
    currentSettings.engine = selectedEngineId;

    const target = allEngines[selectedEngineId].searchUrl.replace('%s', encodeURIComponent(rawQuery));
    window.location.assign(target);
  });
}

init().catch((error) => {
  console.error('Init failed', error);
  statusEl.textContent = 'Could not load extension settings.';
});