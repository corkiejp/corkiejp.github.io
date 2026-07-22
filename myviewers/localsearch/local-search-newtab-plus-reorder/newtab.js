const engineSelect = document.getElementById('engine');
const form = document.getElementById('searchForm');
const queryInput = document.getElementById('query');
const statusEl = document.getElementById('status');
const quickLinksEl = document.getElementById('quickLinks');
const engineListEl = document.getElementById('engineList');
const saveCurrentEngineBtn = document.getElementById('saveCurrentEngine');

let currentSettings;

function getPrefillQuery() {
  try {
    const url = new URL(window.location.href);
    return (url.searchParams.get('prefill') || url.searchParams.get('q') || '').trim();
  } catch {
    return '';
  }
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

async function init() {
  currentSettings = await readSettings();
  const allEngines = getAllEngines(currentSettings.customEngines);
  const selectedId = allEngines[currentSettings.engine] ? currentSettings.engine : STORAGE_DEFAULTS.engine;

  renderEngineOptions(allEngines, selectedId);
  renderQuickLinks(currentSettings.quickLinks);
  renderEngineList(allEngines, selectedId);

  const prefill = getPrefillQuery();
  if (prefill) {
    queryInput.value = prefill;
    queryInput.focus();
    queryInput.setSelectionRange(prefill.length, prefill.length);
    statusEl.textContent = 'Imported browser search query into the local page. Press Enter to search.';
  } else {
    statusEl.textContent = 'Default engine: ' + allEngines[selectedId].name + '. No search request is made until you submit.';
  }
}

saveCurrentEngineBtn.addEventListener('click', async () => {
  const allEngines = getAllEngines(currentSettings.customEngines);
  const selectedId = allEngines[engineSelect.value] ? engineSelect.value : STORAGE_DEFAULTS.engine;

  await storageSet({ engine: selectedId });
  currentSettings.engine = selectedId;
  renderEngineList(allEngines, selectedId);
  statusEl.textContent = 'Saved default engine: ' + allEngines[selectedId].name;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const rawQuery = queryInput.value.trim();
  if (!rawQuery) {
    queryInput.focus();
    return;
  }

  const allEngines = getAllEngines(currentSettings.customEngines);
  const selectedId = allEngines[engineSelect.value] ? engineSelect.value : STORAGE_DEFAULTS.engine;

  await storageSet({ engine: selectedId });

  const target = allEngines[selectedId].searchUrl.replace('%s', encodeURIComponent(rawQuery));
  window.location.assign(target);
});

init().catch((error) => {
  console.error('Init failed', error);
  statusEl.textContent = 'Could not load extension settings.';
});
