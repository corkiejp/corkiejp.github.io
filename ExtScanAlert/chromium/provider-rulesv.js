async function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function $(id) {
  return document.getElementById(id);
}

function setStatus(message) {
  const el = $('status');
  if (el) el.textContent = message || '';
}

function normalizeProviderId(input) {
  return String(input || '').trim().toLowerCase();
}

async function applyTheme() {
  const res = await sendMessage({ type: 'getSettings' });
  if (res && res.theme) {
    document.body.classList.toggle('theme-dark', res.theme === 'dark');
    document.body.classList.toggle('theme-light', res.theme === 'light');
  } else {
    document.body.classList.add('theme-dark');
  }
}

async function loadProviders() {
  const url = chrome.runtime.getURL('providers.json');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function loadSettings() {
  const res = await sendMessage({ type: 'getSettings' });
  const providers = await loadProviders();
  return {
    providerPolicies: res?.providerPolicies || {},
    providers
  };
}

function getProviderMap(providers) {
  return new Map(
    providers.map((p) => [normalizeProviderId(p.id), p])
  );
}

function providerModeSelect(currentMode, provider, onChange) {
  const select = document.createElement('select');
  const actionMode = String(provider?.actionMode || '').trim().toLowerCase();
  const observeOnly = actionMode === 'observe-only';
  const allowedModes = observeOnly ? ['observe'] : ['block', 'observe', 'allow'];
  const effectiveMode =
    observeOnly && currentMode !== 'observe' ? 'observe' : currentMode || 'observe';

  allowedModes.forEach((mode) => {
    const opt = document.createElement('option');
    opt.value = mode;
    opt.textContent = mode;
    if (effectiveMode === mode) opt.selected = true;
    select.appendChild(opt);
  });

  if (observeOnly && provider?.uiNote) {
    select.title = provider.uiNote;
  }

  select.addEventListener('change', onChange);
  return select;
}

async function renderProviderRules() {
  const list = $('provider-rules-list');
  list.innerHTML = '';

  const { providerPolicies, providers } = await loadSettings();
  const providerMap = getProviderMap(providers);

  const rows = [];
  for (const [host, hostPolicies] of Object.entries(providerPolicies || {})) {
    if (!hostPolicies || typeof hostPolicies !== 'object') continue;
    for (const [providerId, rule] of Object.entries(hostPolicies)) {
      const provider = providerMap.get(normalizeProviderId(providerId)) || null;
      rows.push({
        host,
        providerId,
        providerName: provider?.name || providerId,
        family: provider?.family || '',
        category: provider?.category || '',
        mode: rule?.mode || 'observe'
      });
    }
  }

  rows.sort(
    (a, b) => a.host.localeCompare(b.host) || a.providerId.localeCompare(b.providerId)
  );

  if (!rows.length) {
    list.textContent = 'No provider rules yet.';
    return;
  }

  for (const row of rows) {
    const card = document.createElement('div');
    card.className = 'card';

    const hostEl = document.createElement('div');
    hostEl.className = 'host';
    hostEl.textContent = row.host;

    const providerEl = document.createElement('div');
    providerEl.className = 'provider';
    providerEl.textContent = `${row.providerId} — ${row.providerName}`;

    const metaEl = document.createElement('div');
    metaEl.className = 'meta';
    metaEl.textContent = `${row.family || 'unknown family'} · ${row.category || 'uncategorized'}`;

    const modeEl = document.createElement('div');
    const provider = providerMap.get(normalizeProviderId(row.providerId)) || null;
    const select = providerModeSelect(row.mode || 'observe', provider, async (e) => {
      await sendMessage({
        type: 'saveProviderPolicy',
        host: row.host,
        providerId: row.providerId,
        mode: e.target.value
      });
      setStatus(`Updated provider rule for ${row.host} / ${row.providerId}.`);
    });
    modeEl.appendChild(select);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      await sendMessage({
        type: 'deleteProviderPolicy',
        host: row.host,
        providerId: row.providerId
      });
      await renderProviderRules();
      setStatus(`Deleted provider rule for ${row.host} / ${row.providerId}.`);
    });

    card.append(hostEl, providerEl, metaEl, modeEl, delBtn);
    list.appendChild(card);
  }
}

// Async entry: apply theme then render
(async () => {
  try {
    await applyTheme();
    await renderProviderRules();
  } catch (err) {
    console.error(err);
    setStatus(`Failed to load provider rules: ${err.message || err}`);
  }
})();