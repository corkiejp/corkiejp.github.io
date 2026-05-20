(() => {
  const EXT_ID = "tb-column-viewer";
  const STAGE_ORDER = ["Corners", "XCross", "Snowball", "Fullhouse"];
  const DATE_HEADING_SELECTOR = 'h2[aria-label]';

  let autoPlayTimer = null;
  let currentStageIndex = 0;
  let selectedDrawIndex = 0;
  let draws = [];
  
  let isCollapsed = true;
  
  console.log("TB viewer loaded");


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
      const sections = node.matches?.("section") ? [node] : [...node.querySelectorAll?.("section") || []];

      for (const section of sections) {
        const heading = section.querySelector("h2[aria-label], h2");
        if (!heading) continue;

        const label = normalizeStageLabel(
          heading.getAttribute("aria-label") || heading.textContent || ""
        );

        if (!label) continue;

        const nums = extractNumbersFromNode(section);
        if (nums.length) {
          stageMap[label] = nums;
        }
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

      return {
        index,
        label,
        aria,
        heading,
        stages
      };
    }).filter(draw =>
      STAGE_ORDER.some(stage => draw.stages[stage] && draw.stages[stage].length)
    );
  }

function cumulativeNumbersWithStage(stageIndex, data) {
  const seen = new Map();

  for (let i = 0; i <= stageIndex; i++) {
    const stage = STAGE_ORDER[i];
    for (const n of data[stage] || []) {
      if (!seen.has(n)) {
        seen.set(n, stage);
      }
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

function ensureRoot() {
  let root = document.getElementById(EXT_ID);
  if (root) return root;

  root = document.createElement("aside");
  root.id = EXT_ID;
  root.className = "tbv-collapsed";
  root.innerHTML = `
    <button type="button" class="tbv-fab" aria-label="Toggle Telly Bingo viewer">TB</button>

    <div class="tbv-card">
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

  document.body.appendChild(root);

  const fab = root.querySelector(".tbv-fab");
  fab.addEventListener("click", () => {
    isCollapsed = !isCollapsed;
    root.classList.toggle("tbv-collapsed", isCollapsed);
    fab.setAttribute(
      "aria-label",
      isCollapsed ? "Open Telly Bingo viewer" : "Close Telly Bingo viewer"
    );
  });

  root.querySelector(".tbv-refresh").addEventListener("click", refreshViewer);
  root.querySelector(".tbv-prev-stage").addEventListener("click", () => stepStage(-1));
  root.querySelector(".tbv-next-stage").addEventListener("click", () => stepStage(1));
  root.querySelector(".tbv-play").addEventListener("click", autoPlay);
  root.querySelector(".tbv-pause").addEventListener("click", stopAutoPlay);

  root.querySelector(".tbv-draw-picker").addEventListener("change", (e) => {
    stopAutoPlay();
    selectedDrawIndex = Number(e.target.value) || 0;
    currentStageIndex = 0;
    renderCurrent();
  });

  root.querySelectorAll(".tbv-key[data-stage-index]").forEach(btn => {
    btn.addEventListener("click", () => {
      stopAutoPlay();
      currentStageIndex = Number(btn.dataset.stageIndex) || 0;
      renderCurrent();
    });
  });

  return root;
}

  function populateDrawPicker() {
    const root = ensureRoot();
    const select = root.querySelector(".tbv-draw-picker");
    const previousValue = select.value;

    select.innerHTML = draws.map((draw, idx) => `
      <option value="${idx}">${draw.label}</option>
    `).join("");

    if (draws.length === 0) return;

    const preferred = draws[selectedDrawIndex] ? String(selectedDrawIndex) : "0";
    select.value = select.querySelector(`option[value="${preferred}"]`)
      ? preferred
      : (previousValue || "0");

    selectedDrawIndex = Number(select.value) || 0;
  }

function renderStage(stageIndex, draw) {
  const root = ensureRoot();
  const safeIndex = Math.max(0, Math.min(stageIndex, STAGE_ORDER.length - 1));
  currentStageIndex = safeIndex;

  const stageName = STAGE_ORDER[safeIndex];
  root.querySelector(".tbv-stage-name").textContent = stageName;
  
  root.querySelectorAll(".tbv-key[data-stage-index]").forEach(btn => {
  const active = Number(btn.dataset.stageIndex) === safeIndex;
  btn.classList.toggle("is-active", active);
});

  const grouped = groupedByColumn(cumulativeNumbersWithStage(safeIndex, draw.stages));

  for (const [col, items] of Object.entries(grouped)) {
    const body = root.querySelector(`.tbv-col[data-col="${col}"] .tbv-col-body`);
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
    const next = Math.max(0, Math.min(currentStageIndex + delta, STAGE_ORDER.length - 1));
    currentStageIndex = next;
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
    ensureRoot();
    populateDrawPicker();

    if (previousLabel) {
      const foundIndex = draws.findIndex(d => d.label === previousLabel);
      if (foundIndex >= 0) {
        selectedDrawIndex = foundIndex;
        ensureRoot().querySelector(".tbv-draw-picker").value = String(foundIndex);
      }
    }

    currentStageIndex = 0;
    renderCurrent();
  }

  function init() {
    draws = parseDraws();
    if (!draws.length) return;

    ensureRoot();
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
            ensureRoot().querySelector(".tbv-draw-picker").value = String(idx);
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