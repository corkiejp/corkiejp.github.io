function fmt(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeHost(input) {
  try {
    return new URL(input).hostname.replace(/^www\./, '');
  } catch {
    return String(input || '').trim().toLowerCase().replace(/^www\./, '');
  }
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { ok: true });
    });
  });
}

async function getActiveTabHost() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || !tab.url) return '';
    return normalizeHost(tab.url);
  } catch {
    return '';
  }
}

function setActiveMode(mode) {
  byId('mode-block')?.classList.toggle('active', mode === 'block');
  byId('mode-log')?.classList.toggle('active', mode === 'log');
  byId('mode-allow')?.classList.toggle('active', mode === 'allow');
}




function getProviderIdFromLog(log) {
  if (log?.policyProviderId) return String(log.policyProviderId).trim().toLowerCase();
  if (Array.isArray(log?.providers) && log.providers.length && log.providers[0]?.id) {
    return String(log.providers[0].id).trim().toLowerCase();
  }
  return '';
}

function getProviderNameFromLog(log) {
  if (Array.isArray(log?.providers) && log.providers.length && log.providers[0]?.name) {
    return log.providers[0].name;
  }
  const providerId = getProviderIdFromLog(log);
  return providerId || '';
}

function getPrimaryProviderFromLog(log) {
  if (Array.isArray(log?.providers) && log.providers.length) {
    return log.providers[0];
  }
  return null;
}

function renderRecentScripts(log) {
  if (!Array.isArray(log?.recentScripts) || !log.recentScripts.length) return '';
  const items = log.recentScripts.slice(0, 3).map((s) => {
    const label = s.isThirdParty ? 'third-party' : 'same-site';
    return `<li>${escapeHtml(s.host || s.url || '')} <span class="tiny">(${label}, ${Math.round((s.ageMs || 0) / 1000)}s ago)</span></li>`;
  }).join('');
  return `<div class="tiny">Recent scripts</div><ul class="tiny">${items}</ul>`;
}

function getSitePolicySummary(host, settings) {
  const policy = settings.sitePolicies?.[host];
  if (!policy) return 'No saved site rule';
  const families = Array.isArray(policy.families) && policy.families.length
    ? ` (${policy.families.join(', ')})`
    : '';
  return `Saved site rule: ${policy.mode}${families}`;
}

function getProviderPolicyMode(host, providerId, settings) {
  return settings.providerPolicies?.[host]?.[providerId]?.mode || '';
}

function providerButtonsMarkup(host, log, settings) {
  if (log.type !== 'fingerprint') return '';

  const providerId = getProviderIdFromLog(log);
  if (!providerId || !host) return '';

  const provider = getPrimaryProviderFromLog(log);
  const providerName = getProviderNameFromLog(log);
  const currentMode = getProviderPolicyMode(host, providerId, settings);
  const actionMode = String(provider?.actionMode || '').trim().toLowerCase();
  const providerNote = String(provider?.uiNote || provider?.note || '').trim();
  const observeOnly = actionMode === 'observe-only';

  return `
    <div class="tiny">Provider rule for ${escapeHtml(providerName || providerId)} on ${escapeHtml(host)}</div>
    ${providerNote ? `<div class="tiny muted">${escapeHtml(providerNote)}</div>` : ''}
    <div class="pill-row">
      ${observeOnly ? '' : `
        <button class="provider-action ${currentMode === 'allow' ? 'active' : ''}" data-action="provider-save" data-host="${escapeHtml(host)}" data-provider="${escapeHtml(providerId)}" data-mode="allow">Allow</button>
      `}
      <button class="provider-action ${currentMode === 'observe' ? 'active' : ''}" data-action="provider-save" data-host="${escapeHtml(host)}" data-provider="${escapeHtml(providerId)}" data-mode="observe">Observe</button>
      ${observeOnly ? '' : `
        <button class="provider-action ${currentMode === 'block' ? 'active' : ''}" data-action="provider-save" data-host="${escapeHtml(host)}" data-provider="${escapeHtml(providerId)}" data-mode="block">Block</button>
      `}
      <button class="provider-action danger" data-action="provider-clear" data-host="${escapeHtml(host)}" data-provider="${escapeHtml(providerId)}">Clear</button>
    </div>
  `;
}

function renderEntry(log, settings) {
  const host = normalizeHost(log.host || log.page || '');
  const providerName = getProviderNameFromLog(log);
  const chips = [];

  if (log.type) chips.push(`<span class="policy-chip">${escapeHtml(log.type)}</span>`);
  if (log.action) chips.push(`<span class="policy-chip">${escapeHtml(log.action)}</span>`);
  if (log.policyScope) chips.push(`<span class="policy-chip">scope: ${escapeHtml(log.policyScope)}</span>`);
  if (providerName) chips.push(`<span class="policy-chip">${escapeHtml(providerName)}</span>`);

  let body = '';

  if (log.type === 'fingerprint') {
    body += `<div class="muted">${escapeHtml(log.classification || 'Fingerprint activity')}</div>`;
    if (log.summary) {
      body += `<div class="tiny">${escapeHtml(log.summary)}</div>`;
    }
    if (typeof log.score === 'number') {
      body += `<div class="tiny">Score: ${escapeHtml(log.score)}</div>`;
    }
    body += renderRecentScripts(log);
    body += providerButtonsMarkup(host, log, settings);
  } else if (log.type === 'probe') {
    body += `<div class="muted">${escapeHtml(log.subtype || log.method || 'Extension probe')}</div>`;
    if (log.url) {
      body += `<pre>${escapeHtml(log.url)}</pre>`;
    }
  } else {
    body += `<div class="muted">${escapeHtml(log.message || log.summary || log.type || 'Activity')}</div>`;
  }

  return `
    <div class="entry">
      <div class="entry-head">
        <div>
          <div class="entry-title">${escapeHtml(host || 'Unknown host')}</div>
          <div class="tiny">${escapeHtml(fmt(log.time))}</div>
        </div>
      </div>
      <div>${chips.join('')}</div>
      ${body}
    </div>
  `;
}

function bindProviderActionButtons(refresh) {
  document.querySelectorAll('[data-action="provider-save"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const host = button.dataset.host || '';
      const providerId = button.dataset.provider || '';
      const mode = button.dataset.mode || 'observe';
	  
	  const activity = byId('activity');
const card = button.closest('.entry');
const index = Array.from(activity?.querySelectorAll('.entry') || []).indexOf(card);
const settings = await sendMessage({ type: 'getSettings' });
const logs = Array.isArray(settings.logs) ? settings.logs.slice(0, 20) : [];
const log = index >= 0 ? logs[index] : null;
const provider = getPrimaryProviderFromLog(log);
const observeOnly = String(provider?.actionMode || '').trim().toLowerCase() === 'observe-only';

if (observeOnly && mode !== 'observe') {
  return;
}

      button.disabled = true;
      await sendMessage({
        type: 'saveProviderPolicy',
        host,
        providerId,
        mode
      });
      await refresh();
    });
  });

  document.querySelectorAll('[data-action="provider-clear"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const host = button.dataset.host || '';
      const providerId = button.dataset.provider || '';

      button.disabled = true;
      await sendMessage({
        type: 'deleteProviderPolicy',
        host,
        providerId
      });
      await refresh();
    });
  });
}

async function renderPopup() {
  const activeHost = await getActiveTabHost();
  const settings = await sendMessage({ type: 'getSettings' });

  const theme = settings.theme || 'dark';
  document.body.classList.toggle('theme-dark', theme === 'dark');
  document.body.classList.toggle('theme-light', theme === 'light');

  const themeCheckbox = byId('theme-toggle-checkbox');
  if (themeCheckbox) {
    // Set checkbox state once per render
    themeCheckbox.checked = theme === 'dark';
  }

  setActiveMode(settings.mode || 'block');

  byId('notify-toggle').checked = !!settings.notificationsEnabled;
  byId('slowpage-toggle').checked = !!settings.slowPageProtection;
  byId('fingerprint-toggle').checked = !!settings.fingerprintProtectionEnabled;
  
    const dangerousWarn = byId('dangerous-copy-enabled');
  const dangerousBlock = byId('dangerous-copy-block');

  if (dangerousWarn) dangerousWarn.checked = !!settings?.dangerousCopyEnabled;
  if (dangerousBlock) dangerousBlock.checked = !!settings?.dangerousCopyBlockMode;

  byId('status-line').textContent = settings.status?.initialized
    ? `Running • installs: ${settings.status.installs || 0}`
    : 'Running';

  byId('current-site-host').textContent = activeHost || 'No active tab';
  byId('current-site-policy').textContent = activeHost
    ? getSitePolicySummary(activeHost, settings)
    : 'No saved site rule';

  const activity = byId('activity');
  const logs = Array.isArray(settings.logs) ? settings.logs.slice(0, 20) : [];

  if (!logs.length) {
    activity.innerHTML = '<div class="empty">No recent activity yet.</div>';
  } else {
    activity.innerHTML = logs.map((log) => renderEntry(log, settings)).join('');
  }

  bindProviderActionButtons(renderPopup);

  const sitePolicy = activeHost ? settings.sitePolicies?.[activeHost] : null;
  byId('site-allow').classList.toggle('active', sitePolicy?.mode === 'allow');
  byId('site-observe').classList.toggle('active', sitePolicy?.mode === 'observe');
  byId('site-block').classList.toggle('active', sitePolicy?.mode === 'block');
  
 
}

async function saveSitePolicy(mode) {
  const host = await getActiveTabHost();
  if (!host) return;
  byId('site-action-status').textContent = 'Saving...';
  await sendMessage({
    type: 'setSitePolicy',
    host,
    mode,
    families: ['anti-bot / fraud']
  });
  byId('site-action-status').textContent = `Saved ${mode} for ${host}`;
  await renderPopup();
}

async function clearSitePolicy() {
  const host = await getActiveTabHost();
  if (!host) return;
  byId('site-action-status').textContent = 'Clearing...';
  await sendMessage({
    type: 'clearSitePolicy',
    host
  });
  byId('site-action-status').textContent = `Cleared rule for ${host}`;
  await renderPopup();
}


document.addEventListener('DOMContentLoaded', async () => {
	
  byId('mode-block').addEventListener('click', async () => {
    await sendMessage({ type: 'setMode', mode: 'block' });
    await renderPopup();
  });

  byId('mode-log').addEventListener('click', async () => {
    await sendMessage({ type: 'setMode', mode: 'log' });
    await renderPopup();
  });
  
  byId('mode-block').addEventListener('click', async () => {
    await sendMessage({ type: 'setMode', mode: 'block' });
    await renderPopup();
  });

  byId('mode-log').addEventListener('click', async () => {
    await sendMessage({ type: 'setMode', mode: 'log' });
    await renderPopup();
  });

  byId('mode-allow').addEventListener('click', async () => {
    await sendMessage({ type: 'setMode', mode: 'allow' });
    await renderPopup();
  });

  byId('notify-toggle').addEventListener('change', async (e) => {
    await sendMessage({ type: 'setNotifications', enabled: e.target.checked });
    await renderPopup();
  });

  byId('slowpage-toggle').addEventListener('change', async (e) => {
    await sendMessage({ type: 'setSlowPageProtection', enabled: e.target.checked });
    await renderPopup();
  });

  byId('fingerprint-toggle').addEventListener('change', async (e) => {
    await sendMessage({ type: 'setFingerprintProtection', enabled: e.target.checked });
    await renderPopup();
  });

  byId('clear-log').addEventListener('click', async () => {
    await sendMessage({ type: 'clearLogs' });
    await renderPopup();
  });

  byId('site-allow').addEventListener('click', async () => {
    await saveSitePolicy('allow');
  });

  byId('site-observe').addEventListener('click', async () => {
    await saveSitePolicy('observe');
  });

  byId('site-block').addEventListener('click', async () => {
    await saveSitePolicy('block');
  });

  byId('site-clear').addEventListener('click', async () => {
    await clearSitePolicy();
  });
  
  byId('export-fingerprint-logs')?.addEventListener('click', async () => {
  const res = await sendMessage({ type: 'exportFingerprintLogs' });
  console.log('exportFingerprintLogs response', res);
  if (!res?.ok) {
    alert('Failed to export fingerprint logs');
    return;
  }

  const exported = res.data || { logs: [] };

  const blob = new Blob([JSON.stringify(exported, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `extscanalert-fingerprint-logs-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

  const themeCheckbox = byId('theme-toggle-checkbox');
  if (themeCheckbox) {
    themeCheckbox.addEventListener('change', async (e) => {
      const useDark = e.target.checked;
      const newTheme = useDark ? 'dark' : 'light';

      document.body.classList.toggle('theme-dark', useDark);
      document.body.classList.toggle('theme-light', !useDark);

      await sendMessage({ type: 'setTheme', theme: newTheme });
    });
  }
  
    const dangerousWarn = byId('dangerous-copy-enabled');
  const dangerousBlock = byId('dangerous-copy-block');

  if (dangerousWarn) {
    dangerousWarn.addEventListener('change', async (e) => {
      await sendMessage({
        type: 'setDangerousCopyEnabled',
        enabled: e.target.checked
      });
      await renderPopup();
    });
  }

  if (dangerousBlock) {
    dangerousBlock.addEventListener('change', async (e) => {
      await sendMessage({
        type: 'setDangerousCopyBlockMode',
        enabled: e.target.checked
      });
      await renderPopup();
    });
  }

  await renderPopup();
});