// content.js

// 1) Prevent double-hooking when the script runs again
if (!window.__tvSlideViewerContentHooked) {
  window.__tvSlideViewerContentHooked = true;

  // This will hold our viewer instance once created
  let viewerInstance = null;
  
  // cross-browser storage helper
const extStorage = (typeof browser !== 'undefined' ? browser.storage : chrome.storage).sync;

const STORAGE_KEY = 'tvSlideViewerSelectedChannels';

  // Factory that builds the viewer module (root, state, render, etc.)
 function createViewerModule() {
    // --- state & constants ---
    let root = null;
	
	  const DEFAULT_MAX_CHANNELS = 5;
  const ALT_MAX_CHANNELS = 10;

  let maxChannels = DEFAULT_MAX_CHANNELS;
    
    const DEFAULT_TIME = 'evening-night'; // <<< why do we have a default set here?
	const USE_DEMO_SCHEDULES = false; // flip to false when testing live HTML
	
	function isMobile() {
  return window.matchMedia('(max-width: 900px)').matches;
}


/*
function focusListingFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const targetTime  = (params.get('viewerFocusTime') || '').trim();
  const targetTitle = (params.get('viewerFocusTitle') || '').trim().toLowerCase();

  if (!targetTime && !targetTitle) return;

  const normalise = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const normaliseTitleForMatch = s =>
    normalise(s).replace(/\s*\((r,?s?|s)\)\s*$/i, '').trim();

  const wantTime  = normalise(targetTime);
  const wantTitle = normaliseTitleForMatch(targetTitle);

  const lis = document.querySelectorAll('ul.info-list li.lightbox-wrapper');
  let targetLi = null;

  lis.forEach(li => {
    if (targetLi) return;

    const tEl    = li.querySelector('.text-holder h3 a.lightbox');
    const timeEl = li.querySelector('.text-holder span.time');
    if (!tEl || !timeEl) return;

    const tText    = normaliseTitleForMatch(tEl.textContent);
    const timeText = normalise(timeEl.textContent);

    const timeMatches  = wantTime  && timeText.endsWith(wantTime);
    const titleMatches = wantTitle && tText === wantTitle;

    if (timeMatches || titleMatches) {
      targetLi = li;
    }
  });

  if (!targetLi) {
    console.log('[TV Viewer] focusListingFromQuery: no match for', { targetTime, targetTitle });
    return;
  }

  // Scroll into view
  targetLi.scrollIntoView({ block: 'center', behavior: 'smooth' });

  // Click the site's own "read more" / popup trigger
  const detailsLink = targetLi.querySelector('a.btn-share.lightbox, a.lightbox');
  if (detailsLink) {
    setTimeout(() => {
      detailsLink.click();
    }, 300);
  }
}
*/

	
	// Simple in-memory cache: key = `${slug}|${date}|${timeRange}`
const scheduleCache = new Map();

function getTodayDateString() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`; // matches ?date=22-04-2026
}
	
	// Debug helper – optional but handy
function debugState(label) {
  console.log(
    `[TV Viewer] ${label}`,
    'selected size =',
    state.selected.size,
    'selected slugs =',
    Array.from(state.selected)
  );
}

    const demoSchedules = {
      'rte-one': [
        ['18:00', 'The Angelus', ['R']],
        ['18:30', 'Nationwide', []],
        ['19:00', 'News', ['S']],
        ['20:30', 'Fair City', ['S']],
        ['21:00', 'Drama Slot', []],
        ['23:35', 'Blue Lights', ['R','S']]
      ],
      'rte2': [
        ['19:30', 'Mammals', ['S']],
        ['20:00', 'Entertainment Show', []],
        ['21:30', 'The Sunday Game', ['S']],
        ['23:30', 'Faraway Downs', ['S']],
        ['00:10', 'Devil\'s Peak', ['R','S']]
      ],
      'virgin-media-one': [
        ['17:30', 'News at 5.30', ['S']],
        ['19:00', 'Magazine Show', []],
        ['21:00', 'Murder By Mushroom', []],
        ['23:10', 'The Feud', ['R']],
        ['00:10', 'Grace', ['R','S']]
      ],
      'tg4': [
        ['19:00', 'Nuacht TG4', []],
        ['20:00', 'Cúrsaí', []],
        ['21:15', 'Sean-Nós', ['R']],
        ['23:45', 'Ceol na Talún', ['R']],
        ['02:15', 'Nuacht TG4', ['R']]
      ],
      'bbc-one': [
        ['18:30', 'Regional News', []],
        ['19:00', 'Soap Hour', ['S']],
        ['20:00', 'Documentary', []],
        ['21:00', 'Crime Drama', ['S']],
        ['22:00', 'Newsnight', []]
      ],
      'bbc-two': [
        ['18:00', 'Quiz Show', []],
        ['19:00', 'Travel Series', ['S']],
        ['20:00', 'History Special', []],
        ['21:00', 'Live Music', []],
        ['22:30', 'Film', ['S']]
      ],
      'channel-4': [
        ['18:00', 'Come Dine', []],
        ['19:00', 'Property Series', []],
        ['20:00', 'Reality TV', ['S']],
        ['21:00', 'Gogglebox', ['S']],
        ['22:00', 'Late Movie', []]
      ],
      'sky-max': [
        ['18:00', 'The Simpsons', ['R']],
        ['19:00', 'Action Series', ['S']],
        ['20:00', 'Feature Film', []],
        ['22:20', 'Comedy', []],
        ['23:00', 'Panel Show', ['R']]
      ]
    };

const state = {
  open: false,
  channels: [],
  selected: new Set(),
  timeRange: DEFAULT_TIME,
  slideIndex: 0,
  activeIndex: 0   // which selected channel is active on mobile
};


function loadSelectionFromStorage() {
  extStorage.get(STORAGE_KEY, result => {
    try {
      const saved = result[STORAGE_KEY];
      if (!saved || !Array.isArray(saved)) return;

      // Restore selected set (respect maxChannels)
      state.selected = new Set(saved.slice(0, maxChannels));

      // Try to keep a sane activeIndex for mobile
      state.activeIndex = 0;
      debugState('after loadSelectionFromStorage');
      render();
    } catch (err) {
      console.warn('[TV Viewer] failed to load selection', err);
    }
  });
}

function saveSelectionToStorage() {
  const arr = [...state.selected].slice(0, maxChannels);
  extStorage.set({ [STORAGE_KEY]: arr }, () => {
    if (chrome.runtime && chrome.runtime.lastError) {
      console.warn('[TV Viewer] storage save error', chrome.runtime.lastError);
    }
  });
}

    function ensureRoot() {
      if (root) return root;
      root = document.createElement('div');
      root.id = 'tv-slide-viewer-root';
      document.documentElement.appendChild(root);
      return root;
    }

    function lockScroll() {
      document.documentElement.classList.add('tv-viewer-open');
      document.body.classList.add('tv-viewer-open');
    }

    function unlockScroll() {
      document.documentElement.classList.remove('tv-viewer-open');
      document.body.classList.remove('tv-viewer-open');
    }
	
async function fetchScheduleHTML(slug, dateStr, timeRange) {
  const url = new URL(`/tv/${slug}/?date=${dateStr}&time=${timeRange}`, window.location.origin);
  const res = await fetch(url.toString(), { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parseScheduleFromHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const items = [];

  doc.querySelectorAll('ul.info-list li.lightbox-wrapper').forEach(li => {
    const titleEl = li.querySelector('.text-holder h3 a.lightbox');
    const timeEl = li.querySelector('.text-holder span.time');
    if (!titleEl || !timeEl) return;

    const title = (titleEl.textContent || '').trim();
    const time = (timeEl.textContent || '').trim();

    const flags = [];
    li.querySelectorAll('.repeat abbr').forEach(abbr => {
      const flagText = (abbr.textContent || '').trim();
      if (flagText) flags.push(flagText);
    });

    items.push([time, title, flags]);
  });

  return items;
}

async function fetchLiveSchedule(slug, dateStr, timeRange, key) {
  try {
    const html = await fetchScheduleHTML(slug, dateStr, timeRange);
    const items = parseScheduleFromHTML(html);

    // If we got something, cache it and re-render
    if (items && items.length) {
      scheduleCache.set(key, items);
      render(); // will now pick up live data for that channel
    }
  } catch (err) {
    console.warn('[TV Viewer] live fetch failed for', slug, err);
    // On failure we keep using demo data; nothing else to do
  }
}

function ensureCurrentChannelInList() {
  const m = window.location.pathname.match(/^\/tv\/([^/]+)\/?/);
  if (!m || !m[1]) return;
  const slug = m[1];

  // Ignore aggregate pages
  if (['tonight', 'all-channels', 'whats-on-now', 'movies', 'tv'].includes(slug)) {
    return;
  }

  const nameFromTitle = (() => {
    const titleSpan = document.querySelector('.title-block .text-wrap');
    return titleSpan ? titleSpan.textContent.trim() : slug;
  })();

  // If channel already exists, just ensure it is selected
  const existing = state.channels.find(c => c.slug === slug);
  if (existing) {
    state.selected.add(slug);
    return;
  }

  // Otherwise add it to channels and select it
  state.channels.push({ slug, name: nameFromTitle });
  state.selected.add(slug);
}


function showTvPopup(meta) {
  const rootEl = ensureRoot();
  const popup = rootEl.querySelector('.tv-popup');
  if (!popup) return;

  // Prefer the slug passed from the card
  let channelSlug = meta.channelSlug || '';

  // Fallback: derive from path on channel pages if not provided
  if (!channelSlug) {
    const m = window.location.pathname.match(/^\/tv\/([^/]+)\/?/);
    if (m && m[1] && !['tonight', 'all-channels', 'whats-on-now', 'movies', 'tv'].includes(m[1])) {
      channelSlug = m[1];
    }
  }

  // Clean title for IMDb (strip "(R,S)" etc.)
  const cleanedTitle = normaliseTitleForImdb(meta.title || '');
  const imdbQuery = encodeURIComponent(cleanedTitle);
  const imdbUrl = imdbQuery
    ? `https://www.imdb.com/find/?q=${imdbQuery}`
    : '';

  // Build channel listings link if we have a channel slug
  let channelLinkHtml = '';
  if (channelSlug) {
    const dateStr   = getTodayDateString();           // e.g. "28-04-2026"
    const focusTime = extractTimeFromHtml(meta.timeHtml);
    const url = new URL(`/tv/${channelSlug}/`, window.location.origin);

    url.searchParams.set('date', dateStr);
    // Use "evening-night" or whatever makes sense for your viewer
    url.searchParams.set('time', 'evening-night');
    if (focusTime)  url.searchParams.set('viewerFocusTime', focusTime);
    if (meta.title) url.searchParams.set('viewerFocusTitle', meta.title);

    channelLinkHtml = `
      <div class="tv-popup-links" style="margin:6px 0;">
        <a href="${url.toString()}" target="_blank" rel="noopener noreferrer">
          Open full listings for this channel
        </a>
      </div>
    `;
  }

  popup.innerHTML = `
    <button type="button" class="tv-popup-close" data-tv-popup-close>×</button>

    <h3>${meta.title}</h3>

    <div class="tv-popup-meta">
      <span>${meta.date}</span>
      ${meta.genre ? ` · <span>${meta.genre}</span>` : ''}
    </div>

    <div class="tv-popup-time">
      ${meta.timeHtml || ''}
    </div>

    ${imdbUrl ? `
      <div class="tv-popup-links" style="margin:6px 0;">
        <a href="${imdbUrl}" target="_blank" rel="noopener noreferrer">
          View on IMDb (search)
        </a>
      </div>
    ` : ''}

    ${channelLinkHtml}

    ${meta.image ? `
      <img src="${meta.image}" alt="" style="max-width:100%;margin:6px 0;border-radius:4px;">
    ` : ''}
  `;

  popup.classList.remove('tv-popup-hidden');

  popup.querySelector('[data-tv-popup-close]')?.addEventListener('click', () => {
    popup.classList.add('tv-popup-hidden');
  });
}

  // --- helpers you already had ---
	
	
// Known special-case mappings: selector label -> URL slug
const CHANNEL_SLUG_OVERRIDES = {
  'rté one': 'rte-one',
  'rte one': 'rte-one',
  'rté1': 'rte-one',
  'rté 1': 'rte-one',

  'rté2': 'rte2',
  'rte2': 'rte2',
  'rté 2': 'rte2',
  'rte 2': 'rte2',
  'rté two': 'rte2',
  'rte two': 'rte2',

  'u&dave': 'udave',
  'u&gold': 'ugold',
  'u&w': 'uw',
  'u&alibi': 'ualibi',
  'u&drama': 'udrama',
  'u&yesterday': 'uyesterday'
};

function makeSlug(name) {
  const raw = (name || '').trim();
  const key = raw.toLowerCase();

  // 1) Check overrides for weird names
  if (CHANNEL_SLUG_OVERRIDES[key]) {
    return CHANNEL_SLUG_OVERRIDES[key];
  }

  // 2) Generic rule for the rest
  return key
    .replace(/&/g, 'and')         // safe generic fallback
    .replace(/[^\w\s-]/g, '')     // strip accents, punctuation
    .trim()
    .replace(/\s+/g, '-');        // spaces -> hyphens
}

// Read channels from the Vue multiselect dropdown
function parseChannelsFromSelector() {
  const options = document.querySelectorAll(
    '.multiselect .multiselect__content .multiselect__option > span'
  );
  const channels = [];
  options.forEach(span => {
    const name = (span.textContent || '').trim();
    if (!name || name === 'All') return;
    channels.push({
      name,
      slug: makeSlug(name)
    });
  });
  return channels;
}

    function parseChannelsFromPage() {
      const links = [...document.querySelectorAll('a[href*="/tv/"]')];
      const map = new Map();
      links.forEach(a => {
        const href = a.getAttribute('href') || '';
        const match = href.match(/\/tv\/([^/?#]+)\/?$/);
        if (!match) return;
        const slug = match[1];
        if (['tonight', 'all-channels', 'whats-on-now', 'movies', 'tv'].includes(slug)) return;
        const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
        if (!text || text.length < 2) return;
        if (!map.has(slug)) map.set(slug, { slug, name: text });
      });
      return [...map.values()];
    }

    // if you have fallbackChannels, include it here
    const fallbackChannels = [
      { slug: 'rte-one', name: 'RTÉ One' },
      { slug: 'rte2', name: 'RTÉ2' },
      { slug: 'virgin-media-one', name: 'Virgin Media One' },
      { slug: 'tg4', name: 'TG4' },
      { slug: 'bbc-one', name: 'BBC One' },
      { slug: 'bbc-two', name: 'BBC Two' },
      { slug: 'channel-4', name: 'Channel 4' },
      { slug: 'sky-max', name: 'Sky Max' }
    ];

function getChannels() {
  // 1) Prefer explicit channel selector if present
  const fromSelector = parseChannelsFromSelector();
  if (fromSelector.length >= 5) {
    return fromSelector;
  }

  // 2) Fallback: parse /tv/{slug} anchors from the page
  const fromAnchors = parseChannelsFromPage();
  if (fromAnchors.length >= 5) {
    return fromAnchors;
  }

  // 3) Last resort: static fallback list for demo/testing
  return fallbackChannels;
}

function getScheduleForChannel(slug) {
  const dateStr = getTodayDateString();
  const key = `${slug}|${dateStr}|${state.timeRange}`;

  if (USE_DEMO_SCHEDULES) {
    // Demo mode: always use seeded or generic data
    return demoSchedules[slug] || [
      ['19:00', 'Schedule item one', []],
      ['20:00', 'Schedule item two', ['S']],
      ['21:00', 'Schedule item three', []]
    ];
  }

  // Live mode: use cache if we have it
  if (scheduleCache.has(key)) {
    return scheduleCache.get(key);
  }

  // No live data yet – kick off async fetch and fall back to demo for now
  fetchLiveSchedule(slug, dateStr, state.timeRange, key);
  return demoSchedules[slug] || [
    ['19:00', 'Schedule item one', []],
    ['20:00', 'Schedule item two', ['S']],
    ['21:00', 'Schedule item three', []]
  ];
}

function normaliseTitleForImdb(raw) {
  if (!raw) return '';
  const s = raw.replace(/\s+/g, ' ').trim();
  // Remove trailing " (R,S)", "(R)", "(S)" etc.
  return s.replace(/\s*\((R,?S?|S)\)\s*$/i, '').trim();
}

function extractTimeFromHtml(timeHtml) {
  if (!timeHtml) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = timeHtml;
  const text = tmp.textContent || '';
  const match = text.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}

function clampSelections() {
  const arr = [...state.selected];
  console.log('[TV Viewer] clampSelections called, length =', arr.length);
  if (arr.length > maxChannels) {
    state.selected = new Set(arr.slice(0, maxChannels));
    debugState('after clampSelections trim');
  }
}

    function channelItemHTML(channel) {
      const active = state.selected.has(channel.slug);
      return `
        <label class="tv-channel-item ${active ? 'active' : ''}">
          <input type="checkbox" data-channel-toggle="${channel.slug}" ${active ? 'checked' : ''}>
          <span>
            <strong>${channel.name}</strong>
            <span class="tv-channel-meta">/${channel.slug}</span>
          </span>
          <span class="tv-channel-meta">${active ? 'In viewer' : 'Add'}</span>
        </label>`;
    }

function programmeCardHTML([time, title, flags], channelSlug) {
  const flagText = flags.length ? flags.join(' · ') : 'Standard listing';
  const safeTitle = (title || '').replace(/"/g, '&quot;');
  const safeTime  = (time || '').replace(/"/g, '&quot;');

  return `
    <div class="tv-card"
         data-prog-time="${safeTime}"
         data-prog-title="${safeTitle}"
         data-channel-slug="${channelSlug}">
      <div class="tvv-line tvv-time">${time}</div>
      <div class="tvv-line tvv-title">${title}</div>
      <div class="tvv-line tvv-flags">${flagText}</div>
      <button type="button" class="tvv-details-btn" data-prog-details>
        Details
      </button>
    </div>
  `;
}

function columnHTML(channel) {
  const shows = getScheduleForChannel(channel.slug)
    .map(item => programmeCardHTML(item, channel.slug))
    .join('');
  return `
        <section class="tv-column" data-column="${channel.slug}">
          <header class="tv-column-head">
            <div class="tv-column-title">${channel.name}</div>
            <div class="tv-column-sub">Scrollable listing column · ${state.timeRange}</div>
          </header>
          <div class="tv-column-tools">
            <button type="button" data-move-left="${channel.slug}">←</button>
            <button type="button" data-move-right="${channel.slug}">→</button>
            <button type="button" data-remove-channel="${channel.slug}">Remove</button>
          </div>
          <div class="tv-programmes">${shows}</div>
        </section>`;
    }
	
	
	
function render() {
  const el = ensureRoot();

  // preserve scroll positions BEFORE changing innerHTML
  const oldSidebar = el.querySelector('.tv-sidebar');
  const sidebarScroll = oldSidebar ? oldSidebar.scrollTop : 0;

  const columnScrolls = {};
  el.querySelectorAll('.tv-programmes').forEach((list, idx) => {
    columnScrolls[idx] = list.scrollTop;
  });

  if (!state.open) {
    el.innerHTML = `
      <div class="tv-shell" style="height:auto;width:max-content;min-width:0;position:fixed;right:20px;bottom:20px;pointer-events:auto">
        <div class="tv-toolbar">
          <div class="tv-brand">TV Slide Viewer</div>
          <button class="tv-primary" data-open-viewer>Open prototype</button>
        </div>
      </div>`;
    bindEvents();
    return;
  }

  const selectedChannels = state.channels
    .filter(c => state.selected.has(c.slug))
    .slice(0, maxChannels);
	
  const todayStr = getTodayDateString(); // e.g. "23-04-2026"	

  let slidesHtml;
  if (isMobile()) {
    const active = selectedChannels[state.activeIndex] || selectedChannels[0];
    slidesHtml = active
      ? columnHTML(active)
      : '<div class="tv-note">Select a channel from the Channels sheet below.</div>';
  } else {
    slidesHtml = selectedChannels.length
      ? selectedChannels.map(columnHTML).join('')
      : '<div class="tv-note">Pick up to five channels from the list on the left. Each selected channel becomes its own scrollable slide column. Horizontal scrolling or button-driven paging can move across the chosen set.</div>';
  }

  el.innerHTML = `
    <div class="tv-shell">
      <div class="tv-toolbar">
        <div class="tv-brand">Entertainment.ie TV Slide Viewer</div>
        <span class="tv-badge">Prototype extension overlay</span>
        <button type="button" data-scan-page>Scan page</button>
        <button type="button" data-close-viewer>Hide</button>
      </div>

      <div class="tv-statusbar">
        <div class="tv-status-controls">
          <select data-time-range>
            <option value="now" ${state.timeRange==='now'?'selected':''}>Now</option>
            <option value="tonight" ${state.timeRange==='tonight'?'selected':''}>Tonight</option>
            <option value="evening-night" ${state.timeRange===DEFAULT_TIME?'selected':''}>Evening & Night</option>
            <option value="all-day" ${state.timeRange==='all-day'?'selected':''}>All Day</option>
          </select>
          <button type="button" class="tv-primary" data-fill-demo>Load demo set</button>
          <button type="button" data-reset-selection>Reset channels</button>
		  <button type="button" data-max-toggle>Max 5/10</button>
          <button type="button" data-toggle-channel-sheet class="tv-badge tv-mobile-only">Channels</button>
        </div>
        <span class="tv-note tv-status-note">
          Listings for ${todayStr}, selected ${selectedChannels.length}/${maxChannels}.
        </span>
      </div>

      <div class="tv-main">
        <aside class="tv-sidebar">
          <h2>Channel picker</h2>
          <div class="tv-note" style="margin-bottom:12px">
            This tries to infer channel links from the current page first. If the page does not expose enough channel anchors, it falls back to a seeded channel list.
          </div>
          <div class="tv-channel-list">
            ${state.channels.map(channelItemHTML).join('')}
          </div>
        </aside>

        <section class="tv-stage">
          <div class="tv-stage-head">
            <div>
              <h2>Viewer flow</h2>
              <div class="tv-note tv-desktop-only">
                1. Pick channels, 2. choose time range, 3. swipe or scroll horizontally through columns (desktop) or step between channels (mobile), 4. scroll inside any column for long schedules.
              </div>
            </div>
            <div class="tv-stage-tools">
              <button type="button" class="tv-info tv-mobile-only" data-tv-flow-info>?</button>
              <div class="tv-mobile-only">
                <button type="button" data-prev-channel>Prev</button>
                <button type="button" data-next-channel>Next</button>
              </div>
            </div>
          </div>

          <div class="tv-popup tv-popup-hidden"></div>

          <div class="tv-slides-wrap">
            <div class="tv-slides">
              ${slidesHtml}
            </div>
          </div>

          <div class="tv-channel-sheet tv-hidden">
            <div class="tv-channel-sheet-inner">
              <h2>Channels</h2>
              <div class="tv-channel-list">
                ${state.channels.map(channelItemHTML).join('')}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>`;

  bindEvents();

  // restore sidebar scroll
  const newSidebar = el.querySelector('.tv-sidebar');
  if (newSidebar) newSidebar.scrollTop = sidebarScroll;

  // restore column scrolls
  el.querySelectorAll('.tv-programmes').forEach((list, idx) => {
    if (columnScrolls[idx] != null) {
      list.scrollTop = columnScrolls[idx];
    }
  });
}
 function reorder(slug, direction) {
      const selected = state.channels.filter(c => state.selected.has(c.slug)).map(c => c.slug);
      const i = selected.indexOf(slug);
      if (i < 0) return;
      const j = direction === 'left' ? i - 1 : i + 1;
      if (j < 0 || j >= selected.length) return;
      [selected[i], selected[j]] = [selected[j], selected[i]];
      const preserved = state.channels.map(c => c.slug).filter(slug2 => state.selected.has(slug2));
      preserved.forEach(s => state.selected.delete(s));
      selected.forEach(s => state.selected.add(s));
      render();
    }
	
	
function focusListingFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const targetTime  = (params.get('viewerFocusTime') || '').trim();
  const targetTitle = (params.get('viewerFocusTitle') || '').trim().toLowerCase();

  if (!targetTime && !targetTitle) return;

  const normalise = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  const lis = document.querySelectorAll('ul.info-list li.lightbox-wrapper');
  let targetLi = null;

  lis.forEach(li => {
    if (targetLi) return;

    const tEl    = li.querySelector('.text-holder h3 a.lightbox');
    const timeEl = li.querySelector('.text-holder span.time');
    if (!tEl || !timeEl) return;

    const tText    = normalise(tEl.textContent);
    const timeText = normalise(timeEl.textContent);

    const timeMatches  = targetTime && timeText.endsWith(normalise(targetTime));
    const titleMatches = targetTitle && tText === targetTitle;

    if (timeMatches || titleMatches) {
      targetLi = li;
    }
  });

  if (!targetLi) {
    console.log('[TV Viewer] focusListingFromQuery: no match for', { targetTime, targetTitle });
    return;
  }

  targetLi.scrollIntoView({ block: 'center', behavior: 'smooth' });

  const detailsLink = targetLi.querySelector('a.btn-share.lightbox, a.lightbox');
  if (detailsLink) {
    setTimeout(() => {
      detailsLink.click();
    }, 300);
  }
}	





function bindEvents() {
  const el = root;
  if (!el) return;

  el.querySelector('[data-open-viewer]')?.addEventListener('click', () => {
    open();
  });

  el.querySelector('[data-close-viewer]')?.addEventListener('click', () => {
    close();
  });

  el.querySelector('[data-scan-page]')?.addEventListener('click', () => {
    state.channels = getChannels();
    render();
  });

  el.querySelector('[data-fill-demo]')?.addEventListener('click', () => {
    state.channels = getChannels();
    state.selected = new Set(state.channels.slice(0, maxChannels).map(c => c.slug));
    debugState('after fill-demo');
	saveSelectionToStorage(); 
    render();
  });

  el.querySelector('[data-time-range]')?.addEventListener('change', e => {
    state.timeRange = e.target.value;
    render();
  });

  el.querySelectorAll('[data-channel-toggle]').forEach(input => {
    input.addEventListener('change', e => {
      const slug = e.target.getAttribute('data-channel-toggle');
      console.log('[TV Viewer] checkbox change for', slug, 'checked =', e.target.checked);
      console.log('[TV Viewer] before change, selected size =', state.selected.size);

      if (e.target.checked) {
        if (state.selected.size >= maxChannels) {
          console.log('[TV Viewer] hit limit', maxChannels, '— blocking selection');
          e.target.checked = false;
          alert(`Limit is ${maxChannels} channels in the prototype viewer.`);
          return;
        }
        state.selected.add(slug);
      } else {
        state.selected.delete(slug);
      }

      clampSelections();
      debugState('after checkbox change');
	  saveSelectionToStorage(); 
      render();
    });
  });

  el.querySelectorAll('[data-remove-channel]').forEach(btn => {
    btn.addEventListener('click', e => {
      state.selected.delete(e.target.getAttribute('data-remove-channel'));
	  saveSelectionToStorage(); 
      render();
    });
  });

  el.querySelectorAll('[data-move-left]').forEach(btn =>
    btn.addEventListener('click', e => reorder(e.target.getAttribute('data-move-left'), 'left'))
  );
  el.querySelectorAll('[data-move-right]').forEach(btn =>
    btn.addEventListener('click', e => reorder(e.target.getAttribute('data-move-right'), 'right'))
  );
  
    el.querySelector('[data-max-toggle]')?.addEventListener('click', () => {
    maxChannels = (maxChannels === DEFAULT_MAX_CHANNELS)
      ? ALT_MAX_CHANNELS
      : DEFAULT_MAX_CHANNELS;

    console.log('[TV Viewer] maxChannels toggled to', maxChannels);

    // Drop extra selections if we shrank the max
    clampSelections();
    render();
  });
  
  el.querySelector('[data-reset-selection]')?.addEventListener('click', () => {
    if (!confirm('Clear your saved channel selection?')) return;

    state.selected = new Set();
    state.activeIndex = 0;

    if (typeof extStorage !== 'undefined' && extStorage.remove) {
      extStorage.remove(STORAGE_KEY, () => {
        // best-effort; ignore errors
        debugState('after reset-selection');
        render();
      });
    } else {
      debugState('after reset-selection (no storage)');
      render();
    }
  });  
  
  const flowInfoBtn = el.querySelector('[data-tv-flow-info]');
  if (flowInfoBtn && isMobile()) {
    flowInfoBtn.addEventListener('click', () => {
      alert('1. Pick channels\n2. Choose time range\n3. Use Prev/Next to step between channels\n4. Scroll inside a column for long schedules.');
    });
  }

  // Details button -> best-effort inline popup using site's data-* attributes
  el.querySelectorAll('[data-prog-details]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();

      const card = e.target.closest('.tv-card');
      if (!card) {
        console.log('[TV Viewer] details: no .tv-card found for button');
        return;
      }

      const time  = card.getAttribute('data-prog-time')  || '';
      const title = card.getAttribute('data-prog-title') || '';
      const cardChannelSlug = card.getAttribute('data-channel-slug') || '';

      console.log('[TV Viewer] details clicked for', { time, title, cardChannelSlug });

      if (!time || !title) {
        console.log('[TV Viewer] details: missing time/title on card');
        return;
      }

      // Find the site's "read more" lightbox button that matches this programme
      const shareButtons = document.querySelectorAll('a.btn-share.lightbox, a.lightbox');
      console.log('[TV Viewer] shareButtons count =', shareButtons.length);

      const normalise = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const normaliseTitleForMatch = s =>
        normalise(s).replace(/\s*\((r,?s?|s)\)\s*$/i, '').trim();

      const wantTime  = normalise(time);
      const wantTitle = normaliseTitleForMatch(title);

      let targetBtn = null;

      // First pass: match on time + title
      shareButtons.forEach(a => {
        if (targetBtn) return;
        const ds = a.dataset;

        const tmp = document.createElement('div');
        tmp.innerHTML = ds.time || '';
        const timeText = normalise(tmp.textContent);

        const dsTitle = normaliseTitleForMatch(ds.title || ds.programme || '');

        const timeMatches  = wantTime && timeText.endsWith(wantTime);
        const titleMatches = wantTitle && dsTitle === wantTitle;

        if (timeMatches && titleMatches) {
          targetBtn = a;
        }
      });

      // Fallback: time-only match if we still didn't find anything
      if (!targetBtn && wantTime) {
        shareButtons.forEach(a => {
          if (targetBtn) return;
          const ds = a.dataset;
          const tmp = document.createElement('div');
          tmp.innerHTML = ds.time || '';
          const timeText = normalise(tmp.textContent);
          if (timeText && timeText.endsWith(wantTime)) {
            targetBtn = a;
          }
        });
      }

      if (!targetBtn) {
        console.log('[TV Viewer] details: no matching btn-share for', { time, title });

        // Fallback: simple popup from card itself so user sees *something*
        showTvPopup({
          title,
          date: '',
          genre: '',
          description: 'No extra details available for this listing on this page.',
          timeHtml: time,
          image: '',
          channelSlug: cardChannelSlug
        });

        return;
      }

      const ds = targetBtn.dataset;

      // Try to get channel slug from dataset or surrounding DOM
      let channelSlug = cardChannelSlug || ds.channel || ds.channelSlug || '';

      if (!channelSlug) {
        const li = targetBtn.closest('li.lightbox-wrapper');
        if (li) {
          // Adjust once you see real markup (data-channel, etc.)
          channelSlug = li.getAttribute('data-channel') || '';
        }
      }

      console.log('[TV Viewer] details: using dataset', ds, 'channelSlug =', channelSlug);

      showTvPopup({
        title,
        date: ds.title || '',
        genre: ds.genre || ds.genres || '',
        description: ds.description || '',
        timeHtml: ds.time || '',
        image: ds.src || '',
        channelSlug
      });
    });
  });
  
  
    // Auto-focus a listing on channel pages when viewerFocus* params are present
  function focusListingFromQueryOnChannelPage() {
    const params = new URLSearchParams(window.location.search);
    const targetTime  = (params.get('viewerFocusTime') || '').trim();
    const targetTitle = (params.get('viewerFocusTitle') || '').trim();

    if (!targetTime && !targetTitle) {
      return;
    }

    console.log('[TV Viewer] focusListingFromQueryOnChannelPage raw =', {
      targetTime,
      targetTitle,
    });

    const normalise = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normaliseTitleForMatch = s =>
      normalise(s).replace(/\s*\((r,?s?|s)\)\s*$/i, '').trim();

    const wantTime  = normalise(targetTime);
    const wantTitle = normaliseTitleForMatch(targetTitle);

    let targetLi = null;

    document.querySelectorAll('li.lightbox-wrapper').forEach(li => {
      if (targetLi) return;

      const titleEl = li.querySelector('.text-holder h3 a.lightbox');
      const timeEl  = li.querySelector('.text-holder span.time');
      if (!titleEl || !timeEl) return;

      const liTitle = normaliseTitleForMatch(titleEl.textContent);
      const liTime  = normalise(timeEl.textContent);

      const timeMatches =
        wantTime && (liTime === wantTime || liTime.endsWith(wantTime));
      const titleMatches =
        wantTitle && liTitle === wantTitle;

      if (timeMatches && titleMatches) {
        targetLi = li;
      }
    });

    if (!targetLi) {
      console.log('[TV Viewer] focusListingFromQueryOnChannelPage: no match for', {
        targetTime,
        targetTitle,
        wantTime,
        wantTitle,
      });
      return;
    }

    console.log('[TV Viewer] focusListingFromQueryOnChannelPage: found match');

    targetLi.scrollIntoView({ block: 'center', behavior: 'smooth' });

    const detailsLink =
      targetLi.querySelector('a.btn-share.lightbox') ||
      targetLi.querySelector('a.lightbox');

    if (detailsLink) {
      setTimeout(() => {
        console.log('[TV Viewer] focusListingFromQueryOnChannelPage: clicking read more link');
        detailsLink.click();
      }, 400);
    }
  }
  
  
  // Sync vertical scroll across programme columns without feedback loop
  const programmeLists = Array.from(el.querySelectorAll('.tv-programmes'));
  let isSyncingScroll = false;

  programmeLists.forEach(list => {
    list.addEventListener('scroll', () => {
      if (isSyncingScroll) return; // ignore programmatic updates
      isSyncingScroll = true;

      const y = list.scrollTop;
      programmeLists.forEach(other => {
        if (other === list) return;
        other.scrollTop = y;
      });

      isSyncingScroll = false;
    });
  });

  // ------------------------
  // MOBILE-SPECIFIC ADDITIONS
  // ------------------------

  // Build list of selected slugs (up to maxChannels) for mobile navigation
  const selectedChannelSlugs = state.channels
    .filter(c => state.selected.has(c.slug))
    .slice(0, maxChannels)
    .map(c => c.slug);

  // Prev/Next buttons to move activeIndex on mobile
  const prevBtn = el.querySelector('[data-prev-channel]');
  const nextBtn = el.querySelector('[data-next-channel]');

  if (prevBtn && nextBtn && isMobile() && selectedChannelSlugs.length) {
    prevBtn.addEventListener('click', () => {
      if (!selectedChannelSlugs.length) return;
      state.activeIndex = (state.activeIndex - 1 + selectedChannelSlugs.length) % selectedChannelSlugs.length;
      render();
    });

    nextBtn.addEventListener('click', () => {
      if (!selectedChannelSlugs.length) return;
      state.activeIndex = (state.activeIndex + 1) % selectedChannelSlugs.length;
      render();
    });
  }

  // Channel sheet toggle (mobile)
  const sheet = el.querySelector('.tv-channel-sheet');
  const sheetToggle = el.querySelector('[data-toggle-channel-sheet]');

  if (sheet && sheetToggle) {
    sheetToggle.addEventListener('click', () => {
      sheet.classList.toggle('tv-hidden');
    });

    // When picking a channel from the sheet, update activeIndex and close sheet
    if (isMobile()) {
      sheet.querySelectorAll('[data-channel-toggle]').forEach(input => {
        input.addEventListener('change', e => {
          const slug = e.target.getAttribute('data-channel-toggle');
          const idx = selectedChannelSlugs.indexOf(slug);
          if (idx !== -1) {
            state.activeIndex = idx;
          }
          sheet.classList.add('tv-hidden');
        });
      });
    }
	
	  // Auto-run focus when we land on a /tv/{channel}/ page with viewerFocus params
  if (/^\/tv\/[^/]+\/?$/.test(window.location.pathname)) {
    focusListingFromQueryOnChannelPage();
  }
	
  }
}


    // --- public API for the module ---

    function open() {
      if (state.open) return;
      state.open = true;
      lockScroll();
	  loadSelectionFromStorage();
      ensureRoot();
      if (!state.channels.length) {
        state.channels = getChannels();
      }
	  ensureCurrentChannelInList();
      render();
    }

    function close() {
      if (!state.open) return;
      state.open = false;
      unlockScroll();
      if (root) {
        root.remove();
        root = null;
      }
    }

    function toggle() {
      if (state.open) close();
      else open();
    }

// Auto-focus listing if viewerFocus* params are present on a channel page
if (/^\/tv\/[^/]+\/?$/.test(window.location.pathname)) {
  focusListingFromQuery();
}

    return { open, close, toggle };
  }
  
  

  // 2) Message listener from background/action
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.type !== 'TV_VIEWER_TOGGLE') return;

    if (!viewerInstance) {
      viewerInstance = createViewerModule();
    }

    viewerInstance.toggle();
  });
  
  // 3) Auto-initialise viewer on channel pages so focusFromQuery can run,
//    but do NOT open the overlay.
if (/^\/tv\/[^/]+\/?$/.test(window.location.pathname)) {
  if (!viewerInstance) {
    viewerInstance = createViewerModule();
  }
  // Important: do NOT call viewerInstance.open() here.
}
}