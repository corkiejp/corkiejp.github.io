// content.js

if (!window.__tvSlideViewerContentHooked) {
  window.__tvSlideViewerContentHooked = true;

  let viewerInstance = null;

  function createViewerModule() {
    // --- state & constants ---
    let root = null;
    const MAX_CHANNELS = 5;
    const DEFAULT_TIME = 'evening-night';

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
      selected: new Set(['rte-one', 'rte2', 'virgin-media-one']),
      timeRange: DEFAULT_TIME,
      slideIndex: 0
    };

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

    // --- helpers you already had ---

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
      const parsed = parseChannelsFromPage();
      return parsed.length >= 5 ? parsed : fallbackChannels;
    }

    function getScheduleForChannel(slug) {
      const items = demoSchedules[slug] || [
        ['19:00', 'Schedule item one', []],
        ['20:00', 'Schedule item two', ['S']],
        ['21:00', 'Schedule item three', []]
      ];
      return items;
    }

    function clampSelections() {
      const arr = [...state.selected];
      if (arr.length > MAX_CHANNELS) {
        state.selected = new Set(arr.slice(0, MAX_CHANNELS));
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

    function programmeCardHTML([time, title, flags]) {
      const flagText = flags.length ? flags.join(' · ') : 'Standard listing';
      return `
        <article class="tv-card">
          <div class="tv-time">${time}</div>
          <div class="tv-title">${title}</div>
          <div class="tv-flags">${flagText}</div>
        </article>`;
    }

    function columnHTML(channel) {
      const shows = getScheduleForChannel(channel.slug).map(programmeCardHTML).join('');
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

    // --- render & events ---

    function render() {
      if (!state.open) {
        const el = ensureRoot();
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

      const el = ensureRoot();
      const selectedChannels = state.channels.filter(c => state.selected.has(c.slug)).slice(0, MAX_CHANNELS);
      const slides = selectedChannels.length
        ? selectedChannels.map(columnHTML).join('')
        : '<div class="tv-note">Pick up to five channels from the list on the left. Each selected channel becomes its own scrollable slide column. Horizontal scrolling or button-driven paging can move across the chosen set.</div>';

      el.innerHTML = `
        <div class="tv-shell">
          <div class="tv-toolbar">
            <div class="tv-brand">Entertainment.ie TV Slide Viewer</div>
            <span class="tv-badge">Prototype extension overlay</span>
            <button type="button" data-scan-page>Scan page</button>
            <button type="button" data-close-viewer>Hide</button>
          </div>
          <div class="tv-statusbar">
            <select data-time-range>
              <option value="now" ${state.timeRange==='now'?'selected':''}>Now</option>
              <option value="tonight" ${state.timeRange==='tonight'?'selected':''}>Tonight</option>
              <option value="evening-night" ${state.timeRange===DEFAULT_TIME?'selected':''}>Evening & Night</option>
              <option value="all-day" ${state.timeRange==='all-day'?'selected':''}>All Day</option>
            </select>
            <button type="button" class="tv-primary" data-fill-demo>Load demo set</button>
            <span class="tv-note">Selected ${selectedChannels.length}/${MAX_CHANNELS}. Idea: keep the site as source, but browse channels in a faster side-by-side viewer.</span>
          </div>
          <div class="tv-main">
            <aside class="tv-sidebar">
              <h2>Channel picker</h2>
              <div class="tv-note" style="margin-bottom:12px">This tries to infer channel links from the current page first. If the page does not expose enough channel anchors, it falls back to a seeded channel list.</div>
              <div class="tv-channel-list">${state.channels.map(channelItemHTML).join('')}</div>
            </aside>
            <section class="tv-stage">
              <div class="tv-stage-head">
                <div>
                  <h2>Viewer flow</h2>
                  <div class="tv-note">1. Pick channels, 2. choose time range, 3. swipe or scroll horizontally through columns, 4. scroll inside any column for long schedules.</div>
                </div>
              </div>
              <div class="tv-slides-wrap">
                <div class="tv-slides">${slides}</div>
              </div>
            </section>
          </div>
        </div>`;
      bindEvents();
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
        state.selected = new Set(state.channels.slice(0, 4).map(c => c.slug));
        render();
      });

      el.querySelector('[data-time-range]')?.addEventListener('change', e => {
        state.timeRange = e.target.value;
        render();
      });

      el.querySelectorAll('[data-channel-toggle]').forEach(input => {
        input.addEventListener('change', e => {
          const slug = e.target.getAttribute('data-channel-toggle');
          if (e.target.checked) {
            if (state.selected.size >= MAX_CHANNELS) {
              e.target.checked = false;
              alert(`Limit is ${MAX_CHANNELS} channels in the prototype viewer.`);
              return;
            }
            state.selected.add(slug);
          } else {
            state.selected.delete(slug);
          }
          clampSelections();
          render();
        });
      });

      el.querySelectorAll('[data-remove-channel]').forEach(btn => {
        btn.addEventListener('click', e => {
          state.selected.delete(e.target.getAttribute('data-remove-channel'));
          render();
        });
      });

      el.querySelectorAll('[data-move-left]').forEach(btn =>
        btn.addEventListener('click', e => reorder(e.target.getAttribute('data-move-left'), 'left'))
      );
      el.querySelectorAll('[data-move-right]').forEach(btn =>
        btn.addEventListener('click', e => reorder(e.target.getAttribute('data-move-right'), 'right'))
      );
    }

    // --- public API for the module ---

    function open() {
      if (state.open) return;
      state.open = true;
      lockScroll();
      ensureRoot();
      if (!state.channels.length) {
        state.channels = getChannels();
      }
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

    return { open, close, toggle };
  }

  // message listener from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== 'TV_VIEWER_TOGGLE') return;
    if (!viewerInstance) viewerInstance = createViewerModule();
    viewerInstance.toggle();
  });
}