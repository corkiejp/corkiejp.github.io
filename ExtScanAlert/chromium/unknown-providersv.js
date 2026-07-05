function $(id) {
  return document.getElementById(id);
}

function setStatus(message, type) {
  const el = $('status');
  if (!el) return;
  el.textContent = message || '';
  el.className = 'status' + (type ? ' ' + type : '');
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

async function loadUnknownProviders() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'getUnknownProviders' }, (res) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        setStatus('Failed to load candidates: ' + chrome.runtime.lastError.message, 'error');
        resolve({});
        return;
      }
      if (!res || !res.ok) {
        setStatus('Failed to load candidates.', 'error');
        resolve({});
        return;
      }
      resolve(res.unknownProviders || {});
    });
  });
}

function buildStatsHtml(entry) {
  const siteCount = entry.siteCount || 0;
  const events = entry.eventCount || 0;
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

  return `
    <strong>Host:</strong> ${entry.host}<br>
    <strong>Seen on:</strong> ${siteCount} site(s) (${sitesSummary})<br>
    <strong>Events:</strong> ${events}<br>
    <strong>Last seen:</strong> ${lastSeen}<br>
    <strong>Classification:</strong> ${lastClass}
  `;
}

function populateSelect(unknown) {
  const select = $('candidate-select');
  const textarea = $('candidate-json');
  const statsEl = $('candidate-stats');
  if (!select || !textarea || !statsEl) return;

  const entries = Object.values(unknown);
  select.innerHTML = '';

  if (!entries.length) {
    select.disabled = true;
    textarea.value = 'No candidate providers yet.';
    statsEl.textContent = '';
    setStatus('No candidate providers yet.', 'ok');
    return;
  }

  select.disabled = false;
  select._entries = entries;

  entries
    .sort((a, b) => b.eventCount - a.eventCount)
    .forEach((entry, index) => {
      const opt = document.createElement('option');
      opt.value = entry.host;
      opt.textContent = `${entry.host} (${entry.eventCount} events, ${entry.siteCount} sites)`;
      if (index === 0) opt.selected = true;
      select.appendChild(opt);
    });

  const first = entries[0];
  textarea.value = buildProviderJsonSnippet(first);
  statsEl.innerHTML = buildStatsHtml(first);
  setStatus('Loaded candidate providers.', 'ok');
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

async function init() {
  try {
    await applyThemeFromState();

    const unknown = await loadUnknownProviders();
    populateSelect(unknown);

    const select = $('candidate-select');
    const textarea = $('candidate-json');
    const statsEl = $('candidate-stats');
    const copyBtn = $('copy-json');

    if (select && textarea && statsEl) {
      select.addEventListener('change', () => {
        const host = select.value;
        const entries = select._entries || [];
        const entry = entries.find((e) => e.host === host);
        if (!entry) return;
        textarea.value = buildProviderJsonSnippet(entry);
        statsEl.innerHTML = buildStatsHtml(entry);
        setStatus(`Updated snippet for ${host}.`, 'ok');
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
          () => setStatus('Provider JSON copied to clipboard.', 'ok'),
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
      'Failed to initialize candidates view: ' + (err.message || err),
      'error'
    );
  }
}

init();