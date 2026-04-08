function fmt(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch (e) {
    return String(ts);
  }
}

async function load() {
  const state = await browser.runtime.sendMessage({ type: "getState" });

  const init = document.getElementById("init");
  const count = document.getElementById("count");
  const logsEl = document.getElementById("logs");

  init.textContent = state?.status?.lastInit
    ? `Last init: ${fmt(state.status.lastInit)}`
    : "Initialized, but no timestamp yet";

  const logs = state?.logs || [];
  count.textContent = logs.length
    ? `Events logged: ${logs.length}`
    : "No detections yet";

  logsEl.innerHTML = "";

  if (!logs.length) {
    const li = document.createElement("li");
    li.textContent = "Extension ran, but has not detected anything yet.";
    logsEl.appendChild(li);
    return;
  }

  for (const log of logs) {
    const li = document.createElement("li");

    if (log.type === "probe") {
      li.innerHTML = `<div><strong>Probe</strong> ${log.allowed ? "allowed" : "blocked"} via ${log.method || "unknown"}</div>
                      <div class="muted">${fmt(log.time)}</div>
                      <div><code>${log.url || ""}</code></div>`;
    } else if (log.type === "network-block") {
      li.innerHTML = `<div><strong>Network block</strong></div>
                      <div class="muted">${fmt(log.time)}</div>
                      <div><code>${log.url || ""}</code></div>`;
    } else {
      li.innerHTML = `<div><strong>${log.type}</strong>: ${log.message || ""}</div>
                      <div class="muted">${fmt(log.time)}</div>`;
    }

    logsEl.appendChild(li);
  }
}

document.getElementById("clear").addEventListener("click", async () => {
  await browser.runtime.sendMessage({ type: "clearLogs" });
  load();
});

load();