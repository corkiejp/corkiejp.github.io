function $(id) {
  return document.getElementById(id);
}

function setStatus(message, type) {
  const el = $('known-status');
  if (!el) return;
  el.textContent = message || '';
  el.className = 'status' + (type ? ' ' + type : '');
}

function applyThemeFromState() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ theme: 'dark' }, (state) => {
      const theme = state.theme === 'light' ? 'light' : 'dark';
      document.body.classList.toggle('theme-dark', theme === 'dark');
      document.body.classList.toggle('theme-light', theme === 'light');
      resolve();
    });
  });
}

function buildKnownProviderJsonSkeleton(entry) {
  const id = (entry.providerId || entry.host).replace(/[^a-z0-9.-]/gi, '').toLowerCase();
  const domains = [entry.host];
  return JSON.stringify(
    {
      id,
      name: `Known provider (${entry.providerId || entry.host})`,
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



async function loadInterestingKnownProviders() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'getInterestingKnownProviders' },
      (res) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          setStatus(
            'Failed to load known providers: ' + chrome.runtime.lastError.message,
            'error'
          );
          resolve({});
          return;
        }
        if (!res || !res.ok) {
          setStatus('Failed to load known providers.', 'error');
          resolve({});
          return;
        }
        resolve(res.interestingKnownProviders || {});
      }
    );
  });
}

function normalizeProviderId(input) {
  return String(input || '').trim().toLowerCase();
}

async function loadProvidersList() {
  return new Promise((resolve) => {
    chrome.runtime.getURL('providers.json'); // URL exists
    fetch(chrome.runtime.getURL('providers.json'))
      .then((res) => res.json())
      .then((data) => resolve(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to load providers.json', err);
        resolve([]);
      });
  });
}

function buildKnownStatsHtml(entry, providers) {
  const providerId = entry.providerId || 'unknown';
  const siteCount = entry.siteCount || 0;
  const eventCount = entry.eventCount || 0;
  const lastSeen = entry.lastSeen
    ? new Date(entry.lastSeen).toLocaleString()
    : 'unknown';
  const lastClass = entry.lastClassification || 'unclassified';

  const sites = Array.isArray(entry.sites) ? entry.sites : [];
  const sitesSummary = sites.length
    ? (sites.length <= 3
        ? sites.join(', ')
        : `${sites.slice(0, 3).join(', ')} +${sites.length - 3} more`)
    : 'unknown';

  const list = Array.isArray(providers) ? providers : [];
  const providerMatch = list.find(
    (p) => normalizeProviderId(p.id) === normalizeProviderId(providerId)
  );
  const providerName = providerMatch?.name || 'not in providers.json';

  return `
    <strong>Host:</strong> ${entry.host}<br>
    <strong>Provider:</strong> ${providerId} (${providerName})<br>
    <strong>Sites:</strong> ${siteCount} (${sitesSummary})<br>
    <strong>Events:</strong> ${eventCount}<br>
    <strong>Last seen:</strong> ${lastSeen}<br>
    <strong>Classification:</strong> ${lastClass}
  `;
}

function populateKnownSelect(known, providers) {
  const select = $('known-select');
  const textarea = $('known-json');
  const statsEl = $('known-stats');
  if (!select || !textarea || !statsEl) return;

  const entries = Object.values(known);
  select.innerHTML = '';

  if (!entries.length) {
    select.disabled = true;
    textarea.value = 'No high-usage known providers yet.';
    statsEl.textContent = '';
    setStatus('No high-usage known providers yet.', 'ok');
    return;
  }

  select.disabled = false;
  select._entries = entries;

  entries
    .sort((a, b) => b.siteCount - a.siteCount || b.eventCount - a.eventCount)
    .forEach((entry, index) => {
      const opt = document.createElement('option');
      opt.value = entry.host;
      const providerLabel = entry.providerId ? ` (${entry.providerId})` : '';
      opt.textContent = `${entry.host}${providerLabel} (${entry.eventCount} events, ${entry.siteCount} sites)`;
      if (index === 0) opt.selected = true;
      select.appendChild(opt);
    });

  const first = entries[0];
  const match = Array.isArray(providers)
    ? providers.find(
        (p) =>
          normalizeProviderId(p.id) === normalizeProviderId(first.providerId)
      )
    : undefined;

  if (match) {
    textarea.value = providerRecordToJson(match);
    setStatus('Existing provider definition loaded from providers.json.', 'ok');
  } else {
    textarea.value = buildKnownProviderJsonSkeleton(first);
    setStatus(
      'No provider record found; skeleton shown for reference.',
      'warn'
    );
  }

  statsEl.innerHTML = buildKnownStatsHtml(first, providers);
}


function providerRecordToJson(provider) {
  if (!provider) return '';
  // Pick the main fields from providers.json; adjust as needed.
  const {
    id,
    name,
    family,
    category,
    patterns,
    domains,
    scoreBoost
  } = provider;

  return JSON.stringify(
    {
      id,
      name,
      family,
      category,
      patterns: Array.isArray(patterns) ? patterns : [],
      domains: Array.isArray(domains) ? domains : [],
      scoreBoost
    },
    null,
    2
  );
}



async function init() {
  try {
    await applyThemeFromState();

    const [known, providers] = await Promise.all([
      loadInterestingKnownProviders(),
      loadProvidersList()
    ]);

    populateKnownSelect(known, providers);

    const select = $('known-select');
    const textarea = $('known-json');
    const statsEl = $('known-stats');
    const copyBtn = $('copy-known-json');

if (select && textarea && statsEl) {
  select.addEventListener('change', () => {
    const host = select.value;
    const entries = select._entries || [];
    const entry = entries.find((e) => e.host === host);
    if (!entry) return;

    const match = Array.isArray(providers)
      ? providers.find(
          (p) =>
            normalizeProviderId(p.id) === normalizeProviderId(entry.providerId)
        )
      : undefined;

    if (match) {
      textarea.value = providerRecordToJson(match);
      setStatus(
        `Existing provider definition loaded for ${entry.providerId}.`,
        'ok'
      );
    } else {
      textarea.value = buildKnownProviderJsonSkeleton(entry);
      setStatus(
        `No provider record found for ${entry.providerId}; skeleton shown.`,
        'warn'
      );
    }

    statsEl.innerHTML = buildKnownStatsHtml(first, providers);
  });
}

if (copyBtn && textarea) {
  copyBtn.addEventListener('click', () => {
    const text = textarea.value || '';
    if (!text.trim()) {
      setStatus('Nothing to copy.', 'error');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => setStatus('Current JSON view copied to clipboard.', 'ok'),
      (err) => {
        console.error(err);
        setStatus(
          'Clipboard copy failed; select and copy manually.',
          'error'
        );
      }
    );
  });
}
  } catch (err) {
    console.error(err);
    setStatus(
      'Failed to initialize known providers view: ' + (err.message || err),
      'error'
    );
  }
}

init();