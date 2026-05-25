(() => {
  const HOST_ID = "tb-column-viewer-host";
  const FAB_ID = "tb-column-viewer-fab";
  const STAGE_ORDER = ["Corners", "XCross", "Snowball", "Fullhouse"];
  const DATE_HEADING_SELECTOR = 'h2[aria-label]';

  let autoPlayTimer = null;
  let currentStageIndex = 0;
  let selectedDrawIndex = 0;
  let draws = [];
  let isCollapsed = true;
  let panelShadow = null;

  function numberToColumn(num) {
    if (num >= 1 && num <= 15) return "B";
    if (num >= 16 && num <= 30) return "I";
    if (num >= 31 && num <= 45) return "N";
    if (num >= 46 && num <= 60) return "G";
    if (num >= 61 && num <= 75) return "O";
    return null;
  }

  function normalizeStageLabel(raw) {
    const s = (raw || "").replace(/\s+/g, "").toLowerCase();
    if (s === "corners") return "Corners";
    if (s === "xcross" || s === "xgame") return "XCross";
    if (s === "snowball") return "Snowball";
    if (s === "fullhouse") return "Fullhouse";
    return null;
  }

  function extractNumbersFromNode(root) {
    return [...root.querySelectorAll(".bg-game-telly")]
      .map(el => parseInt(el.textContent.trim(), 10))
      .filter(n => Number.isFinite(n) && n >= 1 && n <= 75);
  }

  function isDateHeading(h2) {
    const text = (h2.textContent || "").trim();
    const aria = (h2.getAttribute("aria-label") || "").trim();
    return /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i.test(text) ||
           /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(aria);
  }

  function collectDrawHeadings() {
    return [...document.querySelectorAll(DATE_HEADING_SELECTOR)].filter(isDateHeading);
  }

  function getBlockNodesForHeading(heading, allHeadings) {
    const nodes = [];
    let node = heading.nextElementSibling;
    const stopAt = new Set(allHeadings);

    while (node && !stopAt.has(node)) {
      nodes.push(node);
      node = node.nextElementSibling;
    }

    return nodes;
  }

  function extractStageDataFromNodes(nodes) {
    const stageMap = {
      Corners: [],
      XCross: [],
      Snowball: [],
      Fullhouse: []
    };

    for (const node of nodes) {
      const sections = node.matches?.("section")
        ? [node]
        : [...(node.querySelectorAll?.("section") || [])];

      for (const section of sections) {
        const heading = section.querySelector("h2[aria-label], h2");
        if (!heading) continue;

        const label = normalizeStageLabel(
          heading.getAttribute("aria-label") || heading.textContent || ""
        );

        if (!label) continue;

        const nums = extractNumbersFromNode(section);
        if (nums.length) stageMap[label] = nums;
      }
    }

    return stageMap;
  }

  function parseDraws() {
    const headings = collectDrawHeadings();

    return headings.map((heading, index) => {
      const label = (heading.textContent || "").trim();
      const aria = (heading.getAttribute("aria-label") || "").trim();
      const nodes = getBlockNodesForHeading(heading, headings);
      const stages = extractStageDataFromNodes(nodes);

      return { index, label, aria, heading, stages };
    }).filter(draw =>
      STAGE_ORDER.some(stage => draw.stages[stage] && draw.stages[stage].length)
    );
  }

  function cumulativeNumbersWithStage(stageIndex, data) {
    const seen = new Map();

    for (let i = 0; i <= stageIndex; i++) {
      const stage = STAGE_ORDER[i];
      for (const n of data[stage] || []) {
        if (!seen.has(n)) seen.set(n, stage);
      }
    }

    return [...seen.entries()].map(([number, stage]) => ({ number, stage }));
  }

  function groupedByColumn(items) {
    const grouped = { B: [], I: [], N: [], G: [], O: [] };

    for (const item of items) {
      const col = numberToColumn(item.number);
      if (col) grouped[col].push(item);
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.number - b.number);
    }

    return grouped;
  }

  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearTimeout(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  function getSelectedDraw() {
    return draws[selectedDrawIndex] || null;
  }

  function getPanelRoot() {
    return panelShadow;
  }

  function getHost() {
    return document.getElementById(HOST_ID);
  }

  function getFab() {
    return document.getElementById(FAB_ID);
  }

  function updateCollapsedState() {
    const host = getHost();
    const fab = getFab();
    const panel = getPanelRoot()?.querySelector(".tbv-card");

    if (host) {
      host.style.display = isCollapsed ? "none" : "block";
    }

    if (panel) {
      panel.classList.toggle("tbv-hidden", isCollapsed);
    }

    if (fab) {
      fab.setAttribute(
        "aria-label",
        isCollapsed ? "Open Telly Bingo viewer" : "Close Telly Bingo viewer"
      );
      fab.textContent = "TB";
    }
  }

  function ensureFab() {
    let fab = getFab();
    if (fab) return fab;

    fab = document.createElement("button");
    fab.id = FAB_ID;
    fab.type = "button";
    fab.textContent = "TB";
    fab.setAttribute("aria-label", "Open Telly Bingo viewer");

    Object.assign(fab.style, {
      position: "fixed",
      right: "14px",
      bottom: "14px",
      zIndex: "2147483647",
      width: "52px",
      height: "52px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      borderRadius: "999px",
      background: "#0f766e",
      color: "#ffffff",
      fontSize: "16px",
      fontWeight: "700",
      lineHeight: "1",
      boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
      cursor: "pointer",
      padding: "0",
      margin: "0"
    });

    fab.addEventListener("click", () => {
      isCollapsed = !isCollapsed;
      updateCollapsedState();
    });

    document.body.appendChild(fab);
    return fab;
  }

  function ensureHost() {
    let host = getHost();
    if (host && panelShadow) return host;

    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.position = "static";
    host.style.zIndex = "2147483646";
    document.body.appendChild(host);

    panelShadow = host.attachShadow({ mode: "open" });
    panelShadow.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; }

        .tbv-card {
          position: fixed;
          right: 14px;
          bottom: 76px;
          width: 360px;
          max-width: calc(100vw - 20px);
          max-height: calc(100vh - 100px);
          overflow-y: auto;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.18);
          padding: 12px;
          font-family: Arial, sans-serif;
          color: #1f2937;
          z-index: 2147483646;
        }

        .tbv-hidden { display: none; }

        .tbv-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }

        h2 {
          margin: 0;
          font-size: 18px;
          line-height: 1.2;
        }

        .tbv-subtitle {
          margin: 4px 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        .tbv-picker-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 10px;
        }

        .tbv-picker-label {
          font-size: 13px;
          font-weight: 600;
        }

        .tbv-draw-picker {
          width: 100%;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #111827;
          padding: 8px 10px;
          border-radius: 8px;
          font: inherit;
        }

        .tbv-controls {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }

        button {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #111827;
          padding: 7px 10px;
          border-radius: 8px;
          cursor: pointer;
          font: inherit;
        }

        button:hover {
          background: #eef2f7;
        }

        .tbv-stagebar {
          margin-bottom: 8px;
          font-size: 14px;
        }

        .tbv-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 8px 0 12px;
        }

        .tbv-key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          border-radius: 999px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          border: none;
          opacity: 0.8;
        }

        .tbv-key.is-active {
          opacity: 1;
          box-shadow: 0 0 0 2px rgba(17,24,39,0.25);
        }

        .tbv-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }

        .tbv-col {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          min-height: 220px;
          overflow: hidden;
        }

        .tbv-col-head {
          background: #0f766e;
          color: #ffffff;
          text-align: center;
          font-weight: 700;
          padding: 8px 4px;
        }

        .tbv-col-body {
          padding: 8px 6px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tbv-ball,
        .tbv-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 14px;
        }

        .tbv-ball {
          color: #ffffff;
          border: 1px solid rgba(0,0,0,0.08);
        }

        .tbv-empty {
          background: #e5e7eb;
          color: #6b7280;
        }

        .tbv-stage-corners { background: #2563eb; }
        .tbv-stage-xcross { background: #7c3aed; }
        .tbv-stage-snowball { background: #ea580c; }
        .tbv-stage-fullhouse { background: #16a34a; }

        @media (max-width: 700px) {
          .tbv-card {
            right: 10px;
            bottom: 74px;
            width: calc(100vw - 20px);
            max-width: calc(100vw - 20px);
            max-height: calc(100vh - 90px);
            padding: 10px;
          }

          .tbv-grid { gap: 6px; }
          .tbv-col { min-height: 150px; }

          .tbv-ball,
          .tbv-empty {
            min-height: 24px;
            font-size: 12px;
          }
        }

        @media (max-height: 850px) {
          .tbv-card { max-height: calc(100vh - 86px); }
          .tbv-col { min-height: 150px; }

          .tbv-ball,
          .tbv-empty {
            min-height: 24px;
            font-size: 12px;
          }
        }
      </style>

      <div class="tbv-card tbv-hidden">
        <div class="tbv-header">
          <div>
            <h2>Telly Bingo Viewer</h2>
            <p class="tbv-subtitle">Grouped into B I N G O columns</p>
          </div>
          <button type="button" class="tbv-refresh">Refresh</button>
        </div>

        <div class="tbv-picker-row">
          <label class="tbv-picker-label" for="tbv-draw-picker">Draw date</label>
          <select id="tbv-draw-picker" class="tbv-draw-picker"></select>
        </div>

        <div class="tbv-controls">
          <button type="button" class="tbv-prev-stage">◀</button>
          <button type="button" class="tbv-play">Play</button>
          <button type="button" class="tbv-pause">Pause</button>
          <button type="button" class="tbv-next-stage">▶</button>
        </div>

        <div class="tbv-stagebar">
          <span class="tbv-stage-label">Stage:</span>
          <strong class="tbv-stage-name">Corners</strong>
        </div>

        <div class="tbv-legend">
          <button type="button" class="tbv-key tbv-stage-corners" data-stage-index="0">Corners</button>
          <button type="button" class="tbv-key tbv-stage-xcross" data-stage-index="1">XCross</button>
          <button type="button" class="tbv-key tbv-stage-snowball" data-stage-index="2">Snowball</button>
          <button type="button" class="tbv-key tbv-stage-fullhouse" data-stage-index="3">Fullhouse</button>
        </div>

        <div class="tbv-grid">
          ${["B", "I", "N", "G", "O"].map(letter => `
            <div class="tbv-col" data-col="${letter}">
              <div class="tbv-col-head">${letter}</div>
              <div class="tbv-col-body"></div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    panelShadow.querySelector(".tbv-refresh").addEventListener("click", refreshViewer);
    panelShadow.querySelector(".tbv-prev-stage").addEventListener("click", () => stepStage(-1));
    panelShadow.querySelector(".tbv-next-stage").addEventListener("click", () => stepStage(1));
    panelShadow.querySelector(".tbv-play").addEventListener("click", autoPlay);
    panelShadow.querySelector(".tbv-pause").addEventListener("click", stopAutoPlay);

    panelShadow.querySelector(".tbv-draw-picker").addEventListener("change", (e) => {
      stopAutoPlay();
      selectedDrawIndex = Number(e.target.value) || 0;
      currentStageIndex = 0;
      renderCurrent();
    });

    panelShadow.querySelectorAll(".tbv-key[data-stage-index]").forEach(btn => {
      btn.addEventListener("click", () => {
        stopAutoPlay();
        currentStageIndex = Number(btn.dataset.stageIndex) || 0;
        renderCurrent();
      });
    });

    return host;
  }

  function ensureUi() {
    ensureFab();
    ensureHost();
    updateCollapsedState();
  }

  function populateDrawPicker() {
    ensureUi();
    const panel = getPanelRoot();
    const select = panel.querySelector(".tbv-draw-picker");
    const previousValue = select.value;

    select.innerHTML = draws.map((draw, idx) => `
      <option value="${idx}">${draw.label}</option>
    `).join("");

    if (!draws.length) return;

    const preferred = draws[selectedDrawIndex] ? String(selectedDrawIndex) : "0";
    select.value = select.querySelector(`option[value="${preferred}"]`)
      ? preferred
      : (previousValue || "0");

    selectedDrawIndex = Number(select.value) || 0;
  }

  function renderStage(stageIndex, draw) {
    ensureUi();
    const panel = getPanelRoot();

    const safeIndex = Math.max(0, Math.min(stageIndex, STAGE_ORDER.length - 1));
    currentStageIndex = safeIndex;

    panel.querySelector(".tbv-stage-name").textContent = STAGE_ORDER[safeIndex];

    panel.querySelectorAll(".tbv-key[data-stage-index]").forEach(btn => {
      btn.classList.toggle("is-active", Number(btn.dataset.stageIndex) === safeIndex);
    });

    const grouped = groupedByColumn(cumulativeNumbersWithStage(safeIndex, draw.stages));

    for (const [col, items] of Object.entries(grouped)) {
      const body = panel.querySelector(`.tbv-col[data-col="${col}"] .tbv-col-body`);
      body.innerHTML = items.length
        ? items.map(({ number, stage }) =>
            `<span class="tbv-ball tbv-stage-${stage.toLowerCase()}">${number}</span>`
          ).join("")
        : `<span class="tbv-empty">—</span>`;
    }
  }

  function renderCurrent() {
    const draw = getSelectedDraw();
    if (!draw) return;
    renderStage(currentStageIndex, draw);
  }

  function stepStage(delta) {
    stopAutoPlay();
    currentStageIndex = Math.max(0, Math.min(currentStageIndex + delta, STAGE_ORDER.length - 1));
    renderCurrent();
  }

  function autoPlay() {
    const draw = getSelectedDraw();
    if (!draw) return;

    stopAutoPlay();
    currentStageIndex = 0;
    renderCurrent();

    const advance = () => {
      if (currentStageIndex >= STAGE_ORDER.length - 1) return;
      currentStageIndex += 1;
      renderCurrent();
      autoPlayTimer = setTimeout(advance, 2500);
    };

    autoPlayTimer = setTimeout(advance, 2500);
  }

  function refreshViewer() {
    const previousLabel = getSelectedDraw()?.label || null;
    draws = parseDraws();
    ensureUi();
    populateDrawPicker();

    if (previousLabel) {
      const foundIndex = draws.findIndex(d => d.label === previousLabel);
      if (foundIndex >= 0) {
        selectedDrawIndex = foundIndex;
        getPanelRoot().querySelector(".tbv-draw-picker").value = String(foundIndex);
      }
    }

    currentStageIndex = 0;
    renderCurrent();
  }

  function init() {
    draws = parseDraws();
    if (!draws.length) return;

    ensureUi();
    populateDrawPicker();
    renderCurrent();

    const observer = new MutationObserver(() => {
      const fresh = parseDraws();
      if (!fresh.length) return;

      const changed = JSON.stringify(
        fresh.map(d => ({ label: d.label, stages: d.stages }))
      ) !== JSON.stringify(
        draws.map(d => ({ label: d.label, stages: d.stages }))
      );

      if (changed) {
        const currentLabel = getSelectedDraw()?.label || null;
        draws = fresh;
        populateDrawPicker();

        if (currentLabel) {
          const idx = draws.findIndex(d => d.label === currentLabel);
          if (idx >= 0) {
            selectedDrawIndex = idx;
            getPanelRoot().querySelector(".tbv-draw-picker").value = String(idx);
          }
        }

        renderCurrent();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  init();
})();