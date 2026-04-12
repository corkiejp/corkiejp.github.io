(() => {
  if (window.__svLeafletViewerLoaded) return;
  window.__svLeafletViewerLoaded = true;

  const ext = globalThis.browser || globalThis.chrome;
  const hasStorage = !!(ext && ext.storage && ext.storage.local);

  const state = {
    pages: [],
    index: 0,
    open: false,
    observer: null,
    rescanTimer: null,
    leafletNavBusy: false,
    autoOpenOnLoad: /\/offers\/leaflet\/\d+\b/i.test(location.pathname),
	autoOpenedOnce: false,
    jumpDirty: false,
    lastLeafletInfo: null
  };

  function toAbs(url) {
    try {
      return new URL(url, location.origin).href;
    } catch {
      return null;
    }
  }

  function getPdfUrlFromMeta() {
    const meta = document.querySelector('meta[property="og:image"][content$=".pdf"]');
    const url = meta?.getAttribute("content");
    return url ? new URL(url, location.origin).href : null;
  }

  function getCurrentLeafletId() {
    const m = location.pathname.match(/\/offers\/leaflet\/(\d+)\b/i);
    return m ? Number(m[1]) : null;
  }

  function openInstructions() {
    const url = ext.runtime.getURL("inst.html");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function leafletExists(id) {
    const url = `https://supervalu.ie/offers/leaflet/${id}`;
    try {
      const res = await fetch(url, { method: "GET", credentials: "include" });
      if (!res.ok) return false;
      const html = await res.text();
      return /pdf2web|og:image|offers-leaflet|Page\s+\d+/i.test(html);
    } catch {
      return false;
    }
  }

  async function goToPreviousLeaflet() {
    if (state.leafletNavBusy) return;
    const currentId = getCurrentLeafletId();
    if (!currentId) {
      flash("Current leaflet ID not found");
      return;
    }
    const prevId = currentId - 1;
    if (prevId < 1) {
      flash("No previous leaflet");
      return;
    }
    state.leafletNavBusy = true;
    setLeafletNavButtonsDisabled(true);
    flash(`Checking leaflet ${prevId}...`);
    try {
      const ok = await leafletExists(prevId);
      if (!ok) {
        flash(`Leaflet ${prevId} not available`);
        return;
      }
      location.href = `https://supervalu.ie/offers/leaflet/${prevId}`;
    } finally {
      state.leafletNavBusy = false;
      setLeafletNavButtonsDisabled(false);
    }
  }

  async function goToNextLeaflet() {
    if (state.leafletNavBusy) return;
    const currentId = getCurrentLeafletId();
    if (!currentId) {
      flash("Current leaflet ID not found");
      return;
    }
    const nextId = currentId + 1;
    state.leafletNavBusy = true;
    setLeafletNavButtonsDisabled(true);
    flash(`Checking leaflet ${nextId}...`);
    try {
      const ok = await leafletExists(nextId);
      if (!ok) {
        flash(`Leaflet ${nextId} not available`);
        return;
      }
      location.href = `https://supervalu.ie/offers/leaflet/${nextId}`;
    } finally {
      state.leafletNavBusy = false;
      setLeafletNavButtonsDisabled(false);
    }
  }

  function getPageNumberFromAlt(alt = "") {
    const m = alt.match(/Page\s+(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  function getNearestDataPage(el) {
    const holder = el.closest("[data-page]") || el.parentElement?.closest?.("[data-page]");
    if (!holder) return null;
    const raw = holder.getAttribute("data-page");
    const num = Number(raw);
    return Number.isFinite(num) ? num + 1 : null;
  }

  function getPageNumberFromHrefHotspot(el) {
    const hotspot = el.closest?.("a[data-page]") || el.parentElement?.querySelector?.("a[data-page]");
    if (!hotspot) return null;
    const raw = hotspot.getAttribute("data-page");
    const num = Number(raw);
    return Number.isFinite(num) ? num + 1 : null;
  }

  function getPageNumberFromUrl(url = "") {
    const m =
      url.match(/page[^\d]?(\d+)/i) ||
      url.match(/pg[^\d]?(\d+)/i) ||
      url.match(/[_-](\d{1,3})(?:\.\w+)?$/i);
    return m ? Number(m[1]) : null;
  }

  function scoreImage(img) {
    let score = 0;
    const src = img.currentSrc || img.getAttribute("src") || "";
    const alt = img.getAttribute("alt") || "";
    if (src.includes("/pdf2web/")) score += 10;
    if (/Page\s+\d+/i.test(alt)) score += 8;
    if ((img.naturalWidth || img.width || 0) > 700) score += 2;
    if ((img.naturalHeight || img.height || 0) > 700) score += 2;
    return score;
  }

  function collectPages() {
    const map = new Map();
    const imgs = [...document.querySelectorAll("img[src], img[data-src], img[srcset]")]
      .filter((img) => {
        const src = img.currentSrc || img.getAttribute("src") || "";
        const alt = img.getAttribute("alt") || "";
        return src.includes("pdf2web") || /^Page\s+\d+/i.test(alt);
      })
      .sort((a, b) => scoreImage(b) - scoreImage(a));

    for (const img of imgs) {
      const src = img.currentSrc || img.getAttribute("src");
      const url = src ? toAbs(src) : null;
      if (!url) continue;
      const page =
        getPageNumberFromAlt(img.getAttribute("alt") || "") ??
        getNearestDataPage(img) ??
        getPageNumberFromHrefHotspot(img) ??
        getPageNumberFromUrl(url);
      const existing = map.get(url);
      if (!existing) {
        map.set(url, {
          url,
          page: page ?? Number.MAX_SAFE_INTEGER,
          alt: img.getAttribute("alt") || "",
          width: img.naturalWidth || img.width || 0,
          height: img.naturalHeight || img.height || 0
        });
      } else if (existing.page === Number.MAX_SAFE_INTEGER && page != null) {
        existing.page = page;
      }
    }

    const pages = [...map.values()].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      return a.url.localeCompare(b.url);
    });

    state.pages = pages;
    if (state.index >= state.pages.length) {
      state.index = Math.max(0, state.pages.length - 1);
    }
    render();
  }

  function current() {
    return state.pages[state.index] || null;
  }

  function next() {
    if (!state.pages.length) return;
    state.index = (state.index + 1) % state.pages.length;
    state.jumpDirty = false;
    render();
  }

  function prev() {
    if (!state.pages.length) return;
    state.index = (state.index - 1 + state.pages.length) % state.pages.length;
    state.jumpDirty = false;
    render();
  }

  function jumpToPage(pageNum) {
    if (!Number.isFinite(pageNum)) return false;
    const idx = state.pages.findIndex((p) => p.page === pageNum);
    if (idx === -1) return false;
    state.index = idx;
    state.jumpDirty = false;
    render();
    return true;
  }

  async function copyUrl() {
    const item = current();
    if (!item) return;
    try {
      await navigator.clipboard.writeText(item.url);
      flash("Copied URL");
    } catch {
      flash("Copy failed");
    }
  }

  function openUrl() {
    const item = current();
    if (!item) return;
    window.open(item.url, "_blank", "noopener,noreferrer");
  }

  function downloadUrl() {
    const item = current();
    if (!item) return;
    const a = document.createElement("a");
    a.href = item.url;
    a.download = "";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  function downloadPdf() {
    const pdfUrl = getPdfUrlFromMeta();
    if (!pdfUrl) {
      flash("PDF link not found");
      return;
    }
    const fileName = pdfUrl.split("/").pop() || "leaflet.pdf";
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  function toggle(force) {
    state.open = typeof force === "boolean" ? force : !state.open;
    overlay.hidden = !state.open;
    if (state.open) {
      collectPages();
    }
  }

  function setLeafletNavButtonsDisabled(disabled) {
    prevLeafletBtn.disabled = disabled;
    nextLeafletBtn.disabled = disabled;
  }

  function syncJumpInput(item) {
    const focused = document.activeElement === jumpInput;
    if (focused || state.jumpDirty) return;
    jumpInput.value = item && Number.isFinite(item.page) ? String(item.page) : "";
  }

  function formatDate(ts) {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit"
      });
    } catch {
      return "";
    }
  }

  function render() {
    const item = current();
    const pdfUrl = getPdfUrlFromMeta();
    const leafletId = getCurrentLeafletId();

    leafletLabel.textContent = leafletId ? `Leaflet ${leafletId}` : "Leaflet —";
    pdfBtn.disabled = !pdfUrl;
    pdfBtn.title = pdfUrl ? "Download full PDF" : "PDF link not found";

    if (state.lastLeafletInfo && typeof state.lastLeafletInfo.id === "number") {
      const d = formatDate(state.lastLeafletInfo.firstSeenAt);
      latestLabel.textContent = d
        ? `Latest leaflet ${state.lastLeafletInfo.id} (first seen ${d})`
        : `Latest leaflet ${state.lastLeafletInfo.id} (first seen locally)`;
    } else {
      latestLabel.textContent = "";
    }

    if (!item) {
      img.hidden = true;
      empty.hidden = false;
      img.removeAttribute("src");
      status.textContent = "No leaflet images found";
      pageLabel.textContent = "—";
      urlField.value = "";
      syncJumpInput(null);
      return;
    }

    empty.hidden = true;
    img.hidden = false;
    img.src = item.url;
    img.alt = item.alt || `Leaflet page ${item.page}`;
    status.textContent = `${state.index + 1} / ${state.pages.length}`;
    pageLabel.textContent = Number.isFinite(item.page) ? `Page ${item.page}` : "Unknown page";
    urlField.value = item.url;
    syncJumpInput(item);
  }

  let toastTimer;
  function flash(text) {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 1500);
  }

  async function checkLeafletVersionNotice() {
    if (!hasStorage) return;
    const leafletId = getCurrentLeafletId();
    if (!leafletId) return;

    const url = location.href;
    const now = Date.now();
    let stored;

    try {
      ({ lastLeaflet: stored } = await ext.storage.local.get(["lastLeaflet"]));
    } catch {
      stored = null;
    }

    if (!stored || typeof stored.id !== "number") {
      const info = { id: leafletId, firstSeenAt: now, url };
      state.lastLeafletInfo = info;
      await ext.storage.local.set({ lastLeaflet: info });
      render();
      return;
    }

    state.lastLeafletInfo = stored;
    render();

    if (leafletId > stored.id) {
      const info = { id: leafletId, firstSeenAt: now, url };
      state.lastLeafletInfo = info;
      await ext.storage.local.set({ lastLeaflet: info });
      flash(`New leaflet detected (was ${stored.id}, now ${leafletId}).`);
      render();
      return;
    }

    if (leafletId < stored.id && state.open) {
      showOlderLeafletBanner(stored.id, leafletId, stored.url);
    }
  }

  let olderBannerShown = false;
  function showOlderLeafletBanner(latestId, currentId, latestUrl) {
    if (olderBannerShown) return;
    olderBannerShown = true;

    const banner = document.createElement("div");
    banner.className = "svlv-new-leaflet-banner";
    banner.innerHTML = `
      <span>You’re viewing leaflet ${currentId}. A newer leaflet (${latestId}) is available.</span>
      <button type="button" data-act="open-latest">Open latest</button>
      <button type="button" data-act="dismiss-latest">Dismiss</button>
    `;
    document.body.appendChild(banner);

    banner.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === "open-latest") {
        location.href = latestUrl || `https://supervalu.ie/offers/leaflet/${latestId}`;
      } else if (act === "dismiss-latest") {
        banner.remove();
      }
    });
  }

  const overlay = document.createElement("div");
  overlay.id = "__sv_leaflet_overlay__";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="svlv-backdrop"></div>
    <div class="svlv-panel" role="dialog" aria-modal="true" aria-label="SuperValu leaflet viewer">
      <div class="svlv-toolbar">
        <strong>SuperValu Leaflet Viewer</strong>
        <span class="svlv-leaflet-label">Leaflet <span></span></span>
        <span class="svlv-page-label"></span>
        <div class="svlv-spacer"></div>
        <label class="svlv-jump-wrap">
          <span>Jump</span>
          <input class="svlv-jump" type="number" min="1" step="1" placeholder="Page" />
        </label>
        <button class="svlv-btn" data-act="go">Go</button>
        <button class="svlv-btn" data-act="rescan">Rescan</button>
        <button class="svlv-btn" data-act="copy">Copy URL</button>
        <button class="svlv-btn" data-act="open">Open</button>
        <button class="svlv-btn" data-act="download">Download</button>
        <button class="svlv-btn" data-act="download-pdf" title="Download full PDF">Download PDF</button>
        <button class="svlv-btn" data-act="info" title="Open instructions">Info</button>
        <button class="svlv-btn svlv-close" data-act="close" aria-label="Close">×</button>
      </div>
      <div class="svlv-main">
        <button class="svlv-nav" data-act="prev" aria-label="Previous page image">‹</button>
        <div class="svlv-stage">
          <div class="svlv-empty">No pdf2web images found on this page.</div>
          <img class="svlv-image" hidden alt="" />
        </div>
        <button class="svlv-nav" data-act="next" aria-label="Next page image">›</button>
      </div>
      <div class="svlv-footer">
        <div class="svlv-status">0 / 0</div>
        <input class="svlv-url" type="text" readonly />
        <div class="svlv-latest"></div>
      </div>
      <div class="svlv-toast" hidden></div>
    </div>
  `;

  const img = overlay.querySelector(".svlv-image");
  const empty = overlay.querySelector(".svlv-empty");
  const status = overlay.querySelector(".svlv-status");
  const pageLabel = overlay.querySelector(".svlv-page-label");
  const leafletLabel = overlay.querySelector(".svlv-leaflet-label span");
  const urlField = overlay.querySelector(".svlv-url");
  const latestLabel = overlay.querySelector(".svlv-latest");
  const jumpInput = overlay.querySelector(".svlv-jump");
  const toast = overlay.querySelector(".svlv-toast");
  const pdfBtn = overlay.querySelector('[data-act="download-pdf"]');
  const prevLeafletBtn = overlay.querySelector('[data-act="prev-leaflet"]');
  const nextLeafletBtn = overlay.querySelector('[data-act="next-leaflet"]');

  jumpInput.addEventListener("focus", () => {
    state.jumpDirty = false;
  });
  jumpInput.addEventListener("input", () => {
    state.jumpDirty = true;
  });
  jumpInput.addEventListener("blur", () => {
    const item = current();
    const raw = jumpInput.value.trim();
    if (!raw) {
      state.jumpDirty = false;
      syncJumpInput(item);
      return;
    }
    const pageNum = Number(raw);
    const ok = jumpToPage(pageNum);
    if (!ok) {
      flash("Page not found");
    }
    state.jumpDirty = false;
    syncJumpInput(item);
  });

  overlay.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) {
      if (e.target.classList.contains("svlv-backdrop")) {
        toggle(false);
      }
      return;
    }
    const act = btn.dataset.act;
    if (act === "close") toggle(false);
    if (act === "prev") prev();
    if (act === "next") next();
    if (act === "copy") copyUrl();
    if (act === "open") openUrl();
    if (act === "download") downloadUrl();
    if (act === "download-pdf") downloadPdf();
    if (act === "info") openInstructions();
    if (act === "rescan") collectPages();
    if (act === "prev-leaflet") goToPreviousLeaflet();
    if (act === "next-leaflet") goToNextLeaflet();
    if (act === "go") {
      const ok = jumpToPage(Number(jumpInput.value));
      if (!ok) flash("Page not found");
    }
  });

  jumpInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const ok = jumpToPage(Number(jumpInput.value));
      if (!ok) flash("Page not found");
    }
  });

  document.addEventListener(
    "keydown",
    (e) => {
      if (!state.open) return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      const editing =
        document.activeElement === jumpInput || tag === "input" || tag === "textarea";

      if (e.key === "Escape") {
        e.preventDefault();
        toggle(false);
        return;
      }
      if (editing) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        copyUrl();
      } else if (e.key.toLowerCase() === "o") {
        e.preventDefault();
        openUrl();
      } else if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        downloadUrl();
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        downloadPdf();
      } else if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        openInstructions();
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        collectPages();
      } else if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        jumpInput.focus();
        jumpInput.select();
      } else if (e.key === "[") {
        e.preventDefault();
        goToPreviousLeaflet();
      } else if (e.key === "]") {
        e.preventDefault();
        goToNextLeaflet();
      }
    },
    true
  );

  const style = document.createElement("style");
  style.textContent = `
    #__sv_leaflet_overlay__ {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      font-family: Arial, sans-serif;
    }
    #__sv_leaflet_overlay__ .svlv-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,.76);
    }
    #__sv_leaflet_overlay__ .svlv-panel {
      position: absolute;
      inset: 16px;
      display: flex;
      flex-direction: column;
      background: #111;
      color: #f4f4f4;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,.55);
    }
    #__sv_leaflet_overlay__ .svlv-toolbar,
    #__sv_leaflet_overlay__ .svlv-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: #191919;
    }
    #__sv_leaflet_overlay__ .svlv-footer {
      border-top: 1px solid rgba(255,255,255,.08);
    }
    #__sv_leaflet_overlay__ .svlv-page-label,
    #__sv_leaflet_overlay__ .svlv-leaflet-label {
      font-size: 13px;
      opacity: .85;
      padding-inline: 2px;
    }
    #__sv_leaflet_overlay__ .svlv-spacer {
      flex: 1;
    }
    #__sv_leaflet_overlay__ .svlv-jump-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    #__sv_leaflet_overlay__ .svlv-jump,
    #__sv_leaflet_overlay__ .svlv-url {
      background: #0d0d0d;
      color: #f0f0f0;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 8px;
      padding: 8px 10px;
    }
    #__sv_leaflet_overlay__ .svlv-jump {
      width: 88px;
    }
    #__sv_leaflet_overlay__ .svlv-url {
      flex: 1;
      min-width: 0;
    }
    #__sv_leaflet_overlay__ .svlv-latest {
      font-size: 12px;
      opacity: .8;
      white-space: nowrap;
    }
    #__sv_leaflet_overlay__ .svlv-main {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 56px 1fr 56px;
    }
    #__sv_leaflet_overlay__ .svlv-stage {
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      background: linear-gradient(
        45deg,
        #1b1b1b 25%,
        #151515 25%,
        #151515 50%,
        #1b1b1b 50%,
        #1b1b1b 75%,
        #151515 75%,
        #151515
      );
      background-size: 24px 24px;
    }
    #__sv_leaflet_overlay__ .svlv-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      background: #fff;
      margin: auto;
      display: block;
    }
    #__sv_leaflet_overlay__ .svlv-empty {
      padding: 24px;
      text-align: center;
      color: #ddd;
    }
    #__sv_leaflet_overlay__ .svlv-btn,
    #__sv_leaflet_overlay__ .svlv-nav {
      border: 0;
      background: rgba(255,255,255,.08);
      color: #fff;
      border-radius: 8px;
      cursor: pointer;
    }
    #__sv_leaflet_overlay__ .svlv-btn {
      padding: 8px 10px;
      font-size: 13px;
      white-space: nowrap;
    }
    #__sv_leaflet_overlay__ .svlv-btn:disabled {
      opacity: .45;
      cursor: not-allowed;
    }
    #__sv_leaflet_overlay__ .svlv-nav {
      margin: 12px;
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #__sv_leaflet_overlay__ .svlv-btn:hover:not(:disabled),
    #__sv_leaflet_overlay__ .svlv-nav:hover {
      background: rgba(255,255,255,.16);
    }
    #__sv_leaflet_overlay__ .svlv-status {
      min-width: 64px;
      font-size: 13px;
      opacity: .9;
    }
    #__sv_leaflet_overlay__ .svlv-toast {
      position: absolute;
      right: 16px;
      bottom: 56px;
      background: rgba(0,0,0,.88);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 13px;
    }
    .svlv-new-leaflet-banner {
      position: fixed;
      left: 50%;
      bottom: 12px;
      transform: translateX(-50%);
      z-index: 2147483646;
      background: rgba(0,0,0,.92);
      color: #f4f4f4;
      padding: 8px 12px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 8px;
      font: 13px/1.4 Arial, sans-serif;
      box-shadow: 0 8px 24px rgba(0,0,0,.5);
    }
    .svlv-new-leaflet-banner button {
      border: 0;
      border-radius: 999px;
      padding: 4px 10px;
      background: rgba(255,255,255,.12);
      color: #fff;
      cursor: pointer;
      font-size: 12px;
    }
    .svlv-new-leaflet-banner button:hover {
      background: rgba(255,255,255,.22);
    }
    @media (max-width: 1100px) {
      #__sv_leaflet_overlay__ .svlv-toolbar,
      #__sv_leaflet_overlay__ .svlv-footer {
        flex-wrap: wrap;
      }
    }
    @media (max-width: 860px) {
      #__sv_leaflet_overlay__ .svlv-panel {
        inset: 8px;
      }
      #__sv_leaflet_overlay__ .svlv-main {
        grid-template-columns: 44px 1fr 44px;
      }
    }
  `;
  document.documentElement.append(style, overlay);

ext.runtime.onMessage.addListener((message) => {
  if (!message || !message.type) return;

  if (
    message.type === "TOGGLE_LEAFLET_VIEWER" ||
    message.type === "SVLV_TOGGLE_VIEWER"
  ) {
    const force = typeof message.force === "boolean" ? message.force : undefined;
    toggle(force);
  }
});

collectPages();

if (state.autoOpenOnLoad && !state.autoOpenedOnce) {
  state.autoOpenedOnce = true;
  requestAnimationFrame(() => toggle(true));
}

checkLeafletVersionNotice();
})();