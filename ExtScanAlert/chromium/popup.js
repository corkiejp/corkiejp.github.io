function fmt(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return String(ts); }
}

function byId(id) { return document.getElementById(id); }

function setActiveMode(mode) {
  byId('mode-block').classList.toggle('active', mode === 'block');
  byId('mode-log').classList.toggle('active', mode === 'log');
  byId('mode-allow').classList.toggle('active', mode === 'allow');
}

function renderLogs(logs) {
  const logsEl = byId('logs');
  logsEl.innerHTML = '';
  if (!logs.length) {
    const li = document.createElement('li');
    li.textContent = 'Extension ran, but has not detected anything yet.';
    logsEl.appendChild(li);
    return;
  }
  for (const log of logs) {
    const li = document.createElement('li');
    if (log.type === 'probe') {
      li.innerHTML = `<div><strong>${log.action === 'block' ? 'Blocked' : 'Observed'}</strong> via ${log.method || 'unknown'}</div>
                      <div class="muted">${log.host || ''} · ${fmt(log.time)}</div>
                      <div><code>${log.url || ''}</code></div>`;
    } else {
      li.innerHTML = `<div><strong>${log.type}</strong>: ${log.message || ''}</div>
                      <div class="muted">${fmt(log.time)}</div>`;
    }
    logsEl.appendChild(li);
  }
}

function summarize(perHostCounts) {
  const entries = Object.entries(perHostCounts || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return 'No blocked hosts yet';
  const [host, count] = entries[0];
  const total = entries.reduce((n, [, c]) => n + c, 0);
  return `Blocked ${total} suspicious request(s); top host: ${host} (${count})`;
}

async function load() {
  const state = await chrome.runtime.sendMessage({ type: 'getSettings' });
  byId('init').textContent = state?.status?.lastInit ? `Last init: ${fmt(state.status.lastInit)}` : 'Initialized, but no timestamp yet';
  byId('summary').textContent = summarize(state?.perHostCounts || {});
  byId('notifications').checked = !!state?.notificationsEnabled;
  setActiveMode(state?.mode || 'block');
  renderLogs(state?.logs || []);
}

byId('mode-block').addEventListener('click', async () => { await chrome.runtime.sendMessage({ type: 'setMode', mode: 'block' }); load(); });
byId('mode-log').addEventListener('click', async () => { await chrome.runtime.sendMessage({ type: 'setMode', mode: 'log' }); load(); });
byId('mode-allow').addEventListener('click', async () => { await chrome.runtime.sendMessage({ type: 'setMode', mode: 'allow' }); load(); });
byId('notifications').addEventListener('change', async (e) => { await chrome.runtime.sendMessage({ type: 'setNotifications', enabled: e.target.checked }); load(); });
byId('clear').addEventListener('click', async () => { await chrome.runtime.sendMessage({ type: 'clearLogs' }); load(); });

load();
