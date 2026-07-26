const defaultEngineEl = document.getElementById('defaultEngine');
const themeSettingEl = document.getElementById('themeSetting');
const settingsStatusEl = document.getElementById('settingsStatus');
const linksListEl = document.getElementById('linksList');
const enginesListEl = document.getElementById('enginesList');
const addLinkBtn = document.getElementById('addLinkBtn');
const resetLinksBtn = document.getElementById('resetLinksBtn');
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

let settings;
let stopThemeWatcher = () => {};
let pendingNotesImportMode = 'replace';

function setStatus(message) {
  settingsStatusEl.textContent = message;
}

function syncThemeUi() {
  if (themeSettingEl) {
    themeSettingEl.value = normalizeTheme(settings?.theme);
  }
}

function applyCurrentTheme() {
  const effective = applyTheme(settings?.theme);
  syncThemeUi();
  stopThemeWatcher();
  stopThemeWatcher = watchSystemTheme(settings?.theme, () => applyTheme(settings?.theme));
  return effective;
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
  defaultEngineEl.innerHTML = '';

  Object.entries(allEngines).forEach(([id, engine]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = engine.name;

    if (id === selectedId) {
      option.selected = true;
    }

    defaultEngineEl.appendChild(option);
  });
}

function createActionButton(label, datasetKey, datasetValue, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset[datasetKey] = datasetValue;
  button.disabled = disabled;
  return button;
}

function createActionButtons(type, index, length) {
  const actions = document.createElement('div');
  actions.className = 'item-actions';

  actions.appendChild(createActionButton('Up', 'moveUp', `${type}:${index}`, index === 0));
  actions.appendChild(createActionButton('Down', 'moveDown', `${type}:${index}`, index === length - 1));
  actions.appendChild(createActionButton('Remove', 'remove', `${type}:${index}`));

  return actions;
}

function createItemShell(titleText, detailText, actions) {
  const item = document.createElement('div');
  item.className = 'item';

  const top = document.createElement('div');
  top.className = 'item-top';

  const meta = document.createElement('div');

  const title = document.createElement('strong');
  title.textContent = titleText;

  const detail = document.createElement('div');
  detail.className = 'muted';
  detail.textContent = detailText;

  meta.appendChild(title);
  meta.appendChild(detail);
  top.appendChild(meta);
  top.appendChild(actions);
  item.appendChild(top);

  return item;
}

function renderLinks() {
  linksListEl.innerHTML = '';

  settings.quickLinks.forEach((link, index) => {
    const actions = createActionButtons('link', index, settings.quickLinks.length);
    const item = createItemShell(link.name, link.url, actions);
    linksListEl.appendChild(item);
  });
}

function renderEngines() {
  enginesListEl.innerHTML = '';

  if (!settings.customEngines.length) {
    const empty = document.createElement('div');
    empty.className = 'item';

    const message = document.createElement('div');
    message.className = 'muted';
    message.textContent = 'No custom engines added yet.';

    empty.appendChild(message);
    enginesListEl.appendChild(empty);
    return;
  }

  settings.customEngines.forEach((engine, index) => {
    const actions = createActionButtons('engine', index, settings.customEngines.length);
    const item = createItemShell(engine.name, engine.searchUrl, actions);
    enginesListEl.appendChild(item);
  });
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

async function persistAndRender(message) {
  await storageSet({
    engine: settings.engine,
    customEngines: settings.customEngines,
    quickLinks: settings.quickLinks,
    theme: normalizeTheme(settings.theme),
    notes: sanitizeNotes(settings.notes)
  });

  const allEngines = getAllEngines(settings.customEngines);
  if (!allEngines[settings.engine]) {
    settings.engine = STORAGE_DEFAULTS.engine;
    await storageSet({ engine: settings.engine });
  }

  renderDefaultEngineDropdown(allEngines, settings.engine);
  renderLinks();
  renderEngines();
  renderNotesSummary();
  applyCurrentTheme();
  setStatus(message);
}

defaultEngineEl.addEventListener('change', async () => {
  const allEngines = getAllEngines(settings.customEngines);
  settings.engine = allEngines[defaultEngineEl.value] ? defaultEngineEl.value : STORAGE_DEFAULTS.engine;
  await storageSet({ engine: settings.engine });
  setStatus('Saved default engine: ' + allEngines[settings.engine].name);
});

if (themeSettingEl) {
  themeSettingEl.addEventListener('change', async () => {
    settings.theme = normalizeTheme(themeSettingEl.value);
    applyCurrentTheme();
    await storageSet({ theme: settings.theme });
    setStatus('Saved theme: ' + settings.theme + '.');
  });
}

addLinkBtn.addEventListener('click', async () => {
  const name = linkNameEl.value.trim();
  const url = linkUrlEl.value.trim();

  if (!name || !isValidUrl(url)) {
    setStatus('Enter a link name and a valid full URL.');
    return;
  }

  settings.quickLinks.push({ name, url });
  linkNameEl.value = '';
  linkUrlEl.value = '';
  await persistAndRender('Added quick link: ' + name);
});

resetLinksBtn.addEventListener('click', async () => {
  settings.quickLinks = [...DEFAULT_QUICK_LINKS];
  await persistAndRender('Restored default quick links.');
});

addEngineBtn.addEventListener('click', async () => {
  const name = engineNameEl.value.trim();
  const searchUrl = engineTemplateEl.value.trim();

  if (!name || !isValidTemplate(searchUrl)) {
    setStatus('Enter an engine name and a valid template URL containing %s.');
    return;
  }

  const id = createEngineId(name);
  const duplicateIndex = settings.customEngines.findIndex((item) => item.id === id);
  const payload = { id, name, searchUrl };

  if (duplicateIndex >= 0) {
    settings.customEngines[duplicateIndex] = payload;
    await persistAndRender('Updated custom engine: ' + name);
  } else {
    settings.customEngines.push(payload);
    await persistAndRender('Added custom engine: ' + name);
  }

  engineNameEl.value = '';
  engineTemplateEl.value = '';
});

resetEnginesBtn.addEventListener('click', async () => {
  settings.customEngines = [];

  if (!DEFAULT_BUILTIN_ENGINES[settings.engine]) {
    settings.engine = STORAGE_DEFAULTS.engine;
  }

  await persistAndRender('Removed all custom engines.');
});

function handleReorderAction(type, index, direction) {
  if (type === 'link') {
    settings.quickLinks = moveItem(settings.quickLinks, index, index + direction);
    return persistAndRender('Reordered quick links.');
  }

  if (type === 'engine') {
    settings.customEngines = moveItem(settings.customEngines, index, index + direction);
    return persistAndRender('Reordered custom engines.');
  }
}

function handleRemoveAction(type, index) {
  if (type === 'link') {
    const removed = settings.quickLinks.splice(index, 1)[0];
    return persistAndRender('Removed quick link: ' + removed.name);
  }

  if (type === 'engine') {
    const removed = settings.customEngines.splice(index, 1)[0];
    if (settings.engine === removed.id) {
      settings.engine = STORAGE_DEFAULTS.engine;
    }

    return persistAndRender('Removed custom engine: ' + removed.name);
  }
}

function parseAction(value) {
  const [type, rawIndex] = value.split(':');
  return { type, index: Number(rawIndex) };
}

document.addEventListener('click', async (event) => {
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
  }
});

exportBtn.addEventListener('click', async () => {
  downloadJson('local-search-newtab-plus-settings.json', buildSettingsExportPayload(settings));
  setStatus('Exported settings to JSON.');
});

importBtn.addEventListener('click', () => importFileEl.click());

importFileEl.addEventListener('change', async () => {
  const file = importFileEl.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    settings = sanitizeImportedSettings(parsed);
    await persistAndRender('Imported settings from ' + file.name);
  } catch (error) {
    console.error('Import failed', error);
    setStatus('Could not import JSON settings file.');
  } finally {
    importFileEl.value = '';
  }
});

exportNotesBtn.addEventListener('click', () => {
  downloadJson('local-search-newtab-plus-notes.json', buildNotesExportPayload(settings.notes));
  setStatus('Exported notes to JSON.');
});

importNotesReplaceBtn.addEventListener('click', () => {
  pendingNotesImportMode = 'replace';
  importNotesFileEl.click();
});

importNotesAppendBtn.addEventListener('click', () => {
  pendingNotesImportMode = 'append';
  importNotesFileEl.click();
});

importNotesFileEl.addEventListener('change', async () => {
  const file = importNotesFileEl.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const incomingNotes = sanitizeNotes(parsed?.notes);

    settings.notes = pendingNotesImportMode === 'append'
      ? mergeNotes(settings.notes, incomingNotes)
      : incomingNotes;

    await persistAndRender(
      pendingNotesImportMode === 'append'
        ? 'Appended notes from ' + file.name
        : 'Replaced notes from ' + file.name
    );
  } catch (error) {
    console.error('Notes import failed', error);
    setStatus('Could not import notes JSON file.');
  } finally {
    importNotesFileEl.value = '';
  }
});

function detectBrowserFamily() {
  const ua = navigator.userAgent || '';

  if (ua.includes('Firefox/')) {
    return 'firefox';
  }

  if (ua.includes('Chrome/') || ua.includes('Chromium/') || ua.includes('Edg/')) {
    return 'chromium';
  }

  return 'other';
}

if (copyLocalBlankUrlBtn && localBlankHelpEl) {
  copyLocalBlankUrlBtn.addEventListener('click', async () => {
    const urlField = document.getElementById('localBlankUrl');
    if (!urlField) return;

    const value = urlField.value.trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      localBlankHelpEl.textContent = 'Copied. Paste this into your browser’s custom search engine URL field.';
    } catch (error) {
      console.error('Clipboard copy failed', error);
      localBlankHelpEl.textContent = 'Copy failed. Select and copy the URL manually.';
    }
  });

  const family = detectBrowserFamily();
  if (family === 'chromium') {
    localBlankHelpEl.textContent = 'Chrome/Comet: paste this into Settings → Search engine → Manage search engines and site search.';
  } else if (family === 'firefox') {
    localBlankHelpEl.textContent = 'Firefox: paste this into about:preferences#search under Search shortcuts or custom engines.';
  } else {
    localBlankHelpEl.textContent = 'Use this in your browser’s search engine settings.';
  }
}

async function init() {
  settings = await readSettings();
  applyCurrentTheme();

  const allEngines = getAllEngines(settings.customEngines);

  if (!allEngines[settings.engine]) {
    settings.engine = STORAGE_DEFAULTS.engine;
    await storageSet({ engine: settings.engine });
  }

  renderDefaultEngineDropdown(allEngines, settings.engine);
  renderLinks();
  renderEngines();
  renderNotesSummary();
  syncThemeUi();
  setStatus('Settings loaded.');
}

init().catch((error) => {
  console.error('Options init failed', error);
  setStatus('Could not load settings.');
});