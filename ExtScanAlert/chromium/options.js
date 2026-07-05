async function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function $(id) {
  return document.getElementById(id);
}

function normalizeHost(input) {
  try {
    return new URL(input).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return String(input || '').trim().toLowerCase().replace(/^www\./, '');
  }
}

function normalizeProviderId(input) {
  return String(input || '')
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setStatus(message, type = '') {
  const el = $('status');
  el.textContent = message || '';
  el.className = `status${type ? ` ${type}` : ''}`;
}

function abbreviateUrl(url, maxLen = 80) {
  const value = String(url || '');
  if (!value) return '';
  if (value.length <= maxLen) return value;

  const start = value.slice(0, Math.floor(maxLen / 2));
  const end = value.slice(-Math.floor(maxLen / 2) + 3); // +3 for ellipsis
  return `${start}…${end}`;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let STATE = {
  sitePolicies: {},
  providerPolicies: {},
  providers: [],
  fingerprintProtectionEnabled: false
};

function getFilterText() {
  return $('filter-text').value.trim().toLowerCase();
}

function getProviderMap() {
  return new Map(STATE.providers.map((p) => [normalizeProviderId(p.id), p]));
}

function resolveProviderFromInput(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const directId = normalizeProviderId(raw);
  const providerMap = getProviderMap();
  if (providerMap.has(directId)) return providerMap.get(directId);

  const lowered = raw.toLowerCase();
  return (
    STATE.providers.find(
      (p) =>
        normalizeProviderId(p.id) === lowered ||
        String(p.name || '').toLowerCase() === lowered ||
        `${p.id} — ${p.name}`.toLowerCase() === lowered
    ) || null
  );
}

async function loadProviders() {
  try {
    const url = chrome.runtime.getURL('providers.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    STATE.providers = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Failed to load providers.json', err);
    STATE.providers = [];
    setStatus(`Failed to load providers.json: ${err.message || err}`, 'error');
  }

  const list = $('provider-list');
  list.innerHTML = '';
  for (const provider of STATE.providers) {
    const opt = document.createElement('option');
    opt.value = provider.id;
    opt.label = provider.name ? `${provider.id} — ${provider.name}` : provider.id;
    list.appendChild(opt);
  }
}

async function loadState() {
  const res = await sendMessage({ type: 'getSettings' });
  // Theme patch: apply theme if present in getSettings response
  if (res && res.theme) {
    document.body.classList.toggle('theme-dark', res.theme === 'dark');
    document.body.classList.toggle('theme-light', res.theme === 'light');
  }

  STATE.sitePolicies = res?.sitePolicies || {};
  STATE.providerPolicies = res?.providerPolicies || {};
  STATE.fingerprintProtectionEnabled = !!res?.fingerprintProtectionEnabled;
}

function syncProviderModeOptions() {
  const select = $('provider-mode');
  const provider = resolveProviderFromInput($('provider-search').value);
  const actionMode = String(provider?.actionMode || '').trim().toLowerCase();
  const observeOnly = actionMode === 'observe-only';
  const current = select.value || 'block';

  select.innerHTML = '';

  const allowedModes = observeOnly ? ['observe'] : ['block', 'observe', 'allow'];
  for (const mode of allowedModes) {
    const opt = document.createElement('option');
    opt.value = mode;
    opt.textContent = mode;
    if ((observeOnly ? 'observe' : current) === mode) opt.selected = true;
    select.appendChild(opt);
  }

  select.title = observeOnly && provider?.uiNote ? provider.uiNote : '';
}

function renderProviderMeta() {
  const provider = resolveProviderFromInput($('provider-search').value);
  const meta = $('provider-meta');

  if (!provider) {
    meta.textContent = 'Pick a provider to see its family and domains.';
    syncProviderModeOptions();
    return;
  }

  const domains = Array.isArray(provider.domains) && provider.domains.length
    ? provider.domains.join(', ')
    : 'no domains listed';

  meta.textContent = `${provider.name || provider.id} · ${
    provider.family || 'unknown family'
  } · ${provider.category || 'uncategorized'} · domains: ${domains}`;
  syncProviderModeOptions();
}

function modeSelect(currentMode, onChange) {
  const select = document.createElement('select');
  ['block', 'observe', 'allow'].forEach((mode) => {
    const opt = document.createElement('option');
    opt.value = mode;
    opt.textContent = mode;
    if ((currentMode || 'observe') === mode) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', onChange);
  return select;
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

function matchesFilter(parts) {
  const filter = getFilterText();
  if (!filter) return true;
  return parts.some((part) => String(part || '').toLowerCase().includes(filter));
}

function renderSiteRules() {
  const tbody = $('site-rules-body');
  const empty = $('site-rules-empty');
  tbody.innerHTML = '';

  const entries = Object.entries(STATE.sitePolicies)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .filter(([host, policy]) =>
      matchesFilter([host, policy.mode, ...(policy.families || [])])
    );

  empty.hidden = entries.length !== 0;

  for (const [host, policy] of entries) {
    const tr = document.createElement('tr');

    const tdHost = document.createElement('td');
    tdHost.innerHTML = `<span class="mono">${escapeHtml(host)}</span>`;

    const tdMode = document.createElement('td');
    tdMode.appendChild(
      modeSelect(policy.mode || 'observe', async (e) => {
        await sendMessage({
          type: 'saveSitePolicy',
          host,
          mode: e.target.value,
          families: policy.families || ['anti-bot / fraud']
        });
        await refresh();
        setStatus(`Updated site rule for ${host}.`, 'ok');
      })
    );

    const tdFamilies = document.createElement('td');
    tdFamilies.textContent = (policy.families || ['anti-bot / fraud']).join(', ');

    const tdActions = document.createElement('td');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'danger';
    del.textContent = 'Delete';
    del.addEventListener('click', async () => {
      await sendMessage({ type: 'deleteSitePolicy', host });
      await refresh();
      setStatus(`Deleted site rule for ${host}.`, 'ok');
    });
    tdActions.appendChild(del);

    tr.append(tdHost, tdMode, tdFamilies, tdActions);
    tbody.appendChild(tr);
  }
}

function flattenProviderPolicies() {
  const rows = [];
  const providerMap = getProviderMap();

  for (const [host, hostPolicies] of Object.entries(STATE.providerPolicies || {})) {
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

  return rows.sort(
    (a, b) => a.host.localeCompare(b.host) || a.providerId.localeCompare(b.providerId)
  );
}

function renderProviderRules() {
  const tbody = $('provider-rules-body');
  const empty = $('provider-rules-empty');
  tbody.innerHTML = '';

  const rows = flattenProviderPolicies().filter((row) =>
    matchesFilter([
      row.host,
      row.providerId,
      row.providerName,
      row.family,
      row.category,
      row.mode
    ])
  );

  empty.hidden = rows.length !== 0;

  for (const row of rows) {
    const tr = document.createElement('tr');

    const tdHost = document.createElement('td');
    tdHost.innerHTML = `<span class="mono">${escapeHtml(row.host)}</span>`;

    const tdProvider = document.createElement('td');
    tdProvider.innerHTML = `
      <div><span class="mono">${escapeHtml(row.providerId)}</span></div>
      <div class="small muted">${escapeHtml(row.providerName)}</div>
    `;

    const tdMeta = document.createElement('td');
    tdMeta.innerHTML = `
      <div>${escapeHtml(row.family || 'unknown family')}</div>
      <div class="small muted">${escapeHtml(row.category || 'uncategorized')}</div>
    `;

    const tdMode = document.createElement('td');
    const provider =
      getProviderMap().get(normalizeProviderId(row.providerId)) || null;
    tdMode.appendChild(
      providerModeSelect(row.mode || 'observe', provider, async (e) => {
        await sendMessage({
          type: 'saveProviderPolicy',
          host: row.host,
          providerId: row.providerId,
          mode: e.target.value
        });
        await refresh();
        setStatus(`Updated provider rule for ${row.host} / ${row.providerId}.`, 'ok');
      })
    );

    const tdActions = document.createElement('td');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'danger';
    del.textContent = 'Delete';
    del.addEventListener('click', async () => {
      await sendMessage({
        type: 'deleteProviderPolicy',
        host: row.host,
        providerId: row.providerId
      });
      await refresh();
      setStatus(
        `Deleted provider rule for ${row.host} / ${row.providerId}.`,
        'ok'
      );
    });
    tdActions.appendChild(del);

    tr.append(tdHost, tdProvider, tdMeta, tdMode, tdActions);
    tbody.appendChild(tr);
  }
}

async function loadUnknownProviders() {
  const res = await sendMessage({ type: 'getUnknownProviders' });
  if (!res?.ok) return {};
  return res.unknownProviders || {};
}

function buildProviderJsonSnippet(entry) {
  const id = entry.host.replace(/[^a-z0-9.-]/gi, '').toLowerCase();
  const domains = [entry.host];
  return JSON.stringify(
    {
      id,
      name: `Unknown provider (${entry.host})`,
      family: 'unknown',
      category: 'unknown',
      patterns: [entry.host],
      domains,
      scoreBoost: 1
    },
    null,
    2
  );
}

function renderUnknownProviders(unknown) {
  console.log('renderUnknownProviders got', unknown);
  const tbody = $('unknown-providers-body');
  const empty = $('unknown-providers-empty');
  console.log('renderUnknownProviders tbody', tbody, 'empty', empty);
  if (!tbody || !empty) return;

  const entries = Object.values(unknown);
  console.log('renderUnknownProviders entries', entries);

  tbody.innerHTML = '';
  empty.hidden = entries.length > 0;

  entries
    .sort((a, b) => b.eventCount - a.eventCount)
    .forEach((entry) => {
      const tr = document.createElement('tr');

      // NEW: mark rows for noise domains
      if (entry.isNoise) {
        tr.classList.add('noise-row');
      }

      const tdHost = document.createElement('td');
      tdHost.textContent = entry.host;

      const tdSites = document.createElement('td');
      tdSites.textContent = String(entry.siteCount || 0);

      const tdEvents = document.createElement('td');
      tdEvents.textContent = String(entry.eventCount || 0);

      const tdLastSeen = document.createElement('td');
      tdLastSeen.textContent = entry.lastSeen
        ? new Date(entry.lastSeen).toLocaleString()
        : '';

const tdUrl = document.createElement('td');
const fullUrl = entry.sampleUrl || '';
tdUrl.textContent = abbreviateUrl(fullUrl, 80);
tdUrl.title = fullUrl; // hover shows full URL on desktop

      const tdActions = document.createElement('td');
      const ignoreBtn = document.createElement('button');
      ignoreBtn.type = 'button';
      // NEW: different label for noise
      ignoreBtn.textContent = entry.isNoise
  ? 'Ignore known ad/analytics platform'
  : 'Ignore';
      ignoreBtn.addEventListener('click', async () => {
        await sendMessage({ type: 'clearUnknownProvider', host: entry.host });
        const updated = await loadUnknownProviders();
        renderUnknownProviders(updated);
      });

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'primary';
      addBtn.textContent = 'Copy provider JSON';
      addBtn.addEventListener('click', () => {
        const snippet = buildProviderJsonSnippet(entry);
        navigator.clipboard.writeText(snippet).catch(() => {
          alert(snippet);
        });
        // NEW: status message varies for noise vs non-noise
        setStatus(
          entry.isNoise
            ? `Template copied (noise domain ${entry.host}).`
            : `Provider JSON copied for ${entry.host}.`
        );
      });

      tdActions.append(ignoreBtn, addBtn);
      tr.append(tdHost, tdSites, tdEvents, tdLastSeen, tdUrl, tdActions);
      tbody.appendChild(tr);
    });
}

async function refreshUnknownProviders() {
  const unknown = await loadUnknownProviders();
  renderUnknownProviders(unknown);
}

async function loadInterestingKnownProviders() {
  const res = await sendMessage({ type: 'getInterestingKnownProviders' });
  if (!res?.ok) return {};
  return res.interestingKnownProviders || {};
}

function renderInterestingKnownProviders(known) {
  console.log('renderInterestingKnownProviders got', known);
  const tbody = $('known-providers-body');
  const empty = $('known-providers-empty');
  console.log('renderInterestingKnownProviders tbody', tbody, 'empty', empty);
  if (!tbody || !empty) return;

  const entries = Object.values(known);
  console.log('renderInterestingKnownProviders entries', entries);

  tbody.innerHTML = '';
  empty.hidden = entries.length > 0;

  entries
    .sort((a, b) => b.siteCount - a.siteCount || b.eventCount - a.eventCount)
    .forEach((entry) => {
      const tr = document.createElement('tr');

      const tdHost = document.createElement('td');
      tdHost.textContent = entry.host;

      const tdProvider = document.createElement('td');
      tdProvider.textContent = entry.providerId || '';

      const tdSites = document.createElement('td');
      tdSites.textContent = String(entry.siteCount || 0);

      const tdEvents = document.createElement('td');
      tdEvents.textContent = String(entry.eventCount || 0);

      const tdLastSeen = document.createElement('td');
      tdLastSeen.textContent = entry.lastSeen
        ? new Date(entry.lastSeen).toLocaleString()
        : '';

      const tdUrl = document.createElement('td');
      tdUrl.textContent = entry.sampleUrl || '';
	  
	  

      tr.append(tdHost, tdProvider, tdSites, tdEvents, tdLastSeen, tdUrl);
      tbody.appendChild(tr);
    });
}

async function refreshInterestingKnownProviders() {
  const known = await loadInterestingKnownProviders();
  renderInterestingKnownProviders(known);
}


async function refresh() {
  await loadState();
  renderCapabilityStatus(STATE);
  renderSiteRules();
  renderProviderRules();
  renderProviderMeta();
}

async function saveSiteRule() {
  const host = normalizeHost($('site-host').value);
  const mode = $('site-mode').value;

  if (!host) {
    setStatus('Enter a valid host for the site rule.', 'error');
    return;
  }

  const res = await sendMessage({
    type: 'saveSitePolicy',
    host,
    mode,
    families: ['anti-bot / fraud']
  });

  if (!res?.ok) {
    setStatus(
      `Failed to save site rule: ${res?.error || 'unknown error'}`,
      'error'
    );
    return;
  }

  $('site-host').value = '';
  $('site-mode').value = 'block';
  await refresh();
  setStatus(`Saved site rule for ${host}.`, 'ok');
}

async function saveProviderRule() {
  const host = normalizeHost($('provider-host').value);
  const provider = resolveProviderFromInput($('provider-search').value);
  const mode = $('provider-mode').value;

  if (!host) {
    setStatus('Enter a valid host for the provider rule.', 'error');
    return;
  }

  if (!provider) {
    setStatus('Choose a provider from providers.json.', 'error');
    return;
  }

  const res = await sendMessage({
    type: 'saveProviderPolicy',
    host,
    providerId: provider.id,
    mode
  });

  if (!res?.ok) {
    setStatus(
      `Failed to save provider rule: ${res?.error || 'unknown error'}`,
      'error'
    );
    return;
  }

  $('provider-host').value = '';
  $('provider-search').value = '';
  syncProviderModeOptions();
  await refresh();
  setStatus(`Saved provider rule for ${host} / ${provider.id}.`, 'ok');
}

async function exportRules() {
  const res = await sendMessage({ type: 'exportSitePolicies' });
  if (!res?.ok) {
    setStatus(`Export failed: ${res?.error || 'unknown error'}`, 'error');
    return;
  }
  downloadJson('extscanalert-site-policies.json', res.data);
  setStatus('Exported site rules.', 'ok');
}

async function exportProviderRules() {
  const res = await sendMessage({ type: 'exportProviderPolicies' });
  if (!res?.ok) {
    setStatus(
      `Provider export failed: ${res?.error || 'unknown error'}`,
      'error'
    );
    return;
  }
  downloadJson('extscanalert-provider-policies.json', res.data);
  setStatus('Exported provider rules.', 'ok');
}

async function importProviderRules(replace) {
  const file = $('import-file').files?.[0];
  if (!file) {
    setStatus('Choose a JSON file to import.', 'error');
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const res = await sendMessage({
      type: 'importProviderPolicies',
      data,
      replace
    });

    if (!res?.ok) {
      setStatus(
        `Provider import failed: ${res?.error || 'unknown error'}`,
        'error'
      );
      return;
    }

    $('import-file').value = '';
    await refresh();
    setStatus(
      `Imported ${res.count || 0} provider rules${
        typeof res.hosts === 'number' ? ` across ${res.hosts} hosts` : ''
      }.`,
      'ok'
    );
  } catch (err) {
    setStatus(`Provider import failed: ${err.message || err}`, 'error');
  }
}

async function importRules(replace) {
  const file = $('import-file').files?.[0];
  if (!file) {
    setStatus('Choose a JSON file to import.', 'error');
    return;
  }

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const res = await sendMessage({
      type: 'importSitePolicies',
      data,
      replace
    });

    if (!res?.ok) {
      setStatus(
        `Import failed: ${res?.error || 'unknown error'}`,
        'error'
      );
      return;
    }

    $('import-file').value = '';
    await refresh();
    setStatus(`Imported ${res.count || 0} site rules.`, 'ok');
  } catch (err) {
    setStatus(`Import failed: ${err.message || err}`, 'error');
  }
}

function bindEvents() {
  $('save-site-rule').addEventListener('click', saveSiteRule);
  $('save-provider-rule').addEventListener('click', saveProviderRule);
  $('export-rules').addEventListener('click', exportRules);
  $('import-merge').addEventListener('click', () => importRules(false));
  $('import-replace').addEventListener('click', () => importRules(true));

  $('provider-search').addEventListener('input', () => {
    renderProviderMeta();
    syncProviderModeOptions();
  });

  $('filter-text').addEventListener('input', () => {
    renderSiteRules();
    renderProviderRules();
  });

  $('export-provider-rules')?.addEventListener('click', exportProviderRules);
  $('import-provider-merge')?.addEventListener('click', () =>
    importProviderRules(false)
  );
  $('import-provider-replace')?.addEventListener('click', () =>
    importProviderRules(true)
  );

  // Fingerprint logs export patch
  $('options-export-fingerprint-logs')?.addEventListener('click', async () => {
    const res = await sendMessage({ type: 'exportFingerprintLogs' });
    if (!res?.ok) {
      setStatus(
        `Failed to export fingerprint logs: ${
          res?.error || 'unknown error'
        }`,
        'error'
      );
      return;
    }

    const exported = res.data || { logs: [] };
    downloadJson(
      `extscanalert-fingerprint-logs-${Date.now()}.json`,
      exported
    );
    setStatus('Exported fingerprint logs.', 'ok');
  });
}

function renderCapabilityStatus(settings = {}) {
  const dnrEl = document.getElementById('dnr-status');
  const fpEl = document.getElementById('fp-status');
  const noteEl = document.getElementById('rules-note');

  const hasDnr = !!chrome.declarativeNetRequest;
  const fpEnabled = !!settings.fingerprintProtectionEnabled;

  dnrEl.textContent = `DNR available: ${hasDnr ? 'yes' : 'no'}`;
  dnrEl.title = hasDnr
    ? 'This browser supports dynamic network rules.'
    : 'This browser does not expose dynamic network rules.';

  fpEl.textContent = `Fingerprint protection active: ${
    fpEnabled ? 'yes' : 'no'
  }`;
  fpEl.title = fpEnabled
    ? 'Known provider-script blocking rules can be installed.'
    : 'Known provider-script blocking rules are currently not installed.';

  if (!hasDnr) {
    noteEl.textContent =
      'Rules can still be saved and shown, but DNR-backed provider blocking is unavailable in this environment.';
  } else if (!fpEnabled) {
    noteEl.textContent =
      'Fingerprint allow/block/observe rules still affect policy/logging, but provider-script network blocking is currently off because fingerprint protection is disabled.';
  } else {
    noteEl.textContent =
      'Fingerprint protection is enabled, so matching provider rules can affect active DNR-backed blocking behavior.';
  }
}

function openVerticalPage(path) {
  const url = chrome.runtime.getURL(path);
  // In an options page, this usually opens a new tab with the vertical view
  chrome.tabs.create({ url });
}

function setupVerticalButtons() {
  const siteBtn = $('open-site-rules-vertical');
  if (siteBtn) {
    siteBtn.addEventListener('click', () => {
      openVerticalPage('site-rulesv.html');
    });
  }

  const providerBtn = $('open-provider-rules-vertical');
  if (providerBtn) {
    providerBtn.addEventListener('click', () => {
      openVerticalPage('provider-rulesv.html');
    });
  }

  const unknownBtn = $('open-unknown-providers-vertical');
  if (unknownBtn) {
    unknownBtn.addEventListener('click', () =>
      openVerticalPage('unknown-providersv.html')
    );
  }
  
    const knownBtn = $('open-known-providers-vertical');
  if (knownBtn) {
    knownBtn.addEventListener('click', () =>
      openVerticalPage('known-providersv.html')
    );
  }
    const clearUnknownBtn = $('clear-unknown-providers');
  if (clearUnknownBtn) {
    clearUnknownBtn.addEventListener('click', async () => {
      const ok = confirm(
        'Clear all potential providers discovered so far? This does not affect logs or known providers.'
      );
      if (!ok) return;
      const res = await sendMessage({ type: 'clearAllUnknownProviders' });
      if (res?.ok) {
        setStatus('Potential providers cleared.', 'ok');
        const updated = await loadUnknownProviders();
        renderUnknownProviders(updated);
      } else {
        setStatus('Failed to clear potential providers.', 'error');
      }
    });
  }
}

// Init: keep your working flow, add theme checkbox wiring
(async function init() {
  bindEvents();
  await loadProviders();
  syncProviderModeOptions();
  await refresh();
  setupVerticalButtons();
  
      await refreshUnknownProviders();
    await refreshInterestingKnownProviders();

  const themeCheckbox = $('options-theme-toggle');
  if (themeCheckbox) {
    const isDark = document.body.classList.contains('theme-dark');
    themeCheckbox.checked = isDark;

    themeCheckbox.addEventListener('change', async (e) => {
      const useDark = e.target.checked;
      const theme = useDark ? 'dark' : 'light';

      document.body.classList.toggle('theme-dark', useDark);
      document.body.classList.toggle('theme-light', !useDark);

      await sendMessage({ type: 'setTheme', theme });
    });
  }
})();