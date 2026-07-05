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

async function applyTheme() {
  const res = await sendMessage({ type: 'getSettings' });
  if (res && res.theme) {
    document.body.classList.toggle('theme-dark', res.theme === 'dark');
    document.body.classList.toggle('theme-light', res.theme === 'light');
  } else {
    // Default to dark if nothing is set
    document.body.classList.add('theme-dark');
  }
}

async function loadState() {
  const res = await sendMessage({ type: 'getSettings' });
  return {
    sitePolicies: res?.sitePolicies || {}
  };
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

async function renderSiteRules() {
  const list = $('site-rules-list');
  list.innerHTML = '';

  const { sitePolicies } = await loadState();

  const entries = Object.entries(sitePolicies)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (!entries.length) {
    list.textContent = 'No site rules yet.';
    return;
  }

  for (const [host, policy] of entries) {
    const card = document.createElement('div');
    card.className = 'card';

    const hostEl = document.createElement('div');
    hostEl.className = 'host';
    hostEl.textContent = host;

    const metaEl = document.createElement('div');
    metaEl.className = 'meta';
    metaEl.textContent = (policy.families || ['anti-bot / fraud']).join(', ');

    const modeEl = document.createElement('div');
    const select = modeSelect(policy.mode || 'observe', async (e) => {
      await sendMessage({
        type: 'saveSitePolicy',
        host,
        mode: e.target.value,
        families: policy.families || ['anti-bot / fraud']
      });
      setStatus(`Updated site rule for ${host}.`);
    });
    modeEl.appendChild(select);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      await sendMessage({ type: 'deleteSitePolicy', host });
      await renderSiteRules();
      setStatus(`Deleted site rule for ${host}.`);
    });

    card.append(hostEl, metaEl, modeEl, delBtn);
    list.appendChild(card);
  }
}

// Async entry point: apply theme, then render
(async () => {
  try {
    await applyTheme();
    await renderSiteRules();
  } catch (err) {
    console.error(err);
    setStatus(`Failed to load site rules: ${err.message || err}`);
  }
})();