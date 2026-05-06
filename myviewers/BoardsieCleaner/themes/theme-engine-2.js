/*
 * Boards.ie Cleaner — Theme Engine v2 (skeleton)
 * ==============================================
 *
 * Goals:
 * - Generic preset library, not forum-owned presets
 * - Assign any preset to any forum slug
 * - Use chrome.storage.local for custom CSS text
 * - Keep custom CSS as the final override layer
 * - Shared structural cleanup separated from preset styling
 * - Optional shadow-root patch support for components like #themeHeader
 *
 * Notes:
 * - This file is a fresh architecture pass, not a direct edit of the old engine.
 * - Keep the old theme-engine.js intact until this version is proven.
 */
 


const THEME_PRESETS = {
  'afterhours-dark': {
    id: 'afterhours-dark',
    label: 'After Hours Dark',
    className: 'boards-preset-afterhours-dark',
    cssFile: 'themes/presets/afterhours-dark.css',
    shadowPatch: applyThemeHeaderShadowPatch
  },

  'current-affairs-imho': {
    id: 'current-affairs-imho',
    label: 'Current Affairs / IMHO',
    className: 'boards-preset-current-affairs-imho',
    cssFile: 'themes/presets/current-affairs-imho.css',
    shadowPatch: applyThemeHeaderShadowPatch
  },

  'forest': {
    id: 'forest',
    label: 'Forest',
    className: 'boards-preset-forest',
    cssFile: 'themes/presets/forest.css',
    shadowPatch: applyThemeHeaderShadowPatch
  },
  
  'peonies-in-spring': {
  id: 'peonies-in-spring',
  label: 'peonies-in-spring',
  className: 'boards-preset-peonies-in-spring',
  cssFile: 'themes/presets/peonies-in-spring.css',
  shadowPatch: applyThemeHeaderShadowPatch
},
'wild-rust': {
  id: 'wild-rust',
  label: 'Wild Rust',
  className: 'boards-preset-wild-rust',
  cssFile: 'themes/presets/wild-rust.css',
  shadowPatch: applyThemeHeaderShadowPatch
}
};

/*
 * Shared structural cleanup
 * -------------------------
 * This is for layout/wrapper cleanup that should not be duplicated
 * across every preset CSS file.
 *
 * Include:
 * - page wrapper backgrounds if needed
 * - ad spacer cleanup
 * - structural neutralisation rules
 *
 * Keep this intentionally small at first.
 */
const SHARED_STRUCTURE_CSS = `
  .no-ad-top-spacer {
    display: none !important;
  }

  .Frame-contentWrap.noad-top {
    background: transparent !important;
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
`;

/*
 * Style element ids
 */
const STYLE_IDS = {
  shared: 'bc-theme-shared-structure',
  preset: 'bc-theme-preset',
  custom: 'bc-theme-custom'
};

/*
 * Storage keys
 * ------------
 * Suggested split:
 * - sync: lightweight settings + forum -> preset assignment
 * - local: custom CSS blobs
 */
const STORAGE_KEYS = {
  themeSettings: 'themeSettings',
  forumThemeAssignments: 'forumThemeAssignments',
  customCssByForum: 'customCssByForum',
  themeEngine2Enabled: 'themeEngine2Enabled'
};

/*
 * Main entry
 */
(async function initThemeEngine2() {
  try {
    const enabled = await isThemeEngine2Enabled();
    if (!enabled) return;

    const forumKey = detectForumKey();
	
    if (!forumKey) return;

    const settings = await getThemeSettings(forumKey);
	
    if (!settings) return;

    clearThemeClasses();
    applyForumClass(forumKey);

    injectSharedStructureCss(SHARED_STRUCTURE_CSS);
	 

    if (settings.preset) {
      applyPresetClass(settings.preset);
      await injectPresetCss(settings.preset);
	        console.log('[BoardsCleaner] preset class applied =', settings.preset.className);
      await applyOptionalShadowPatch(settings.preset);
	  console.log('[BoardsCleaner] optional shadow patch attempted');
    }

if (settings.customCss && settings.customCss.trim()) {
  injectCustomCss(settings.customCss);
  document.documentElement.classList.add('boards-custom-theme-active');
}

    // Keep legacy nav modal init order note here if needed later:
    // initLegacyNavModalIfNeeded();
  } catch (err) {
    console.error('[BoardsCleaner][theme-engine-2] init failed:', err);
  }
})();

/*
 * Feature toggle for safe rollout
 * -------------------------------
 * Keep this on a flag while developing.
 */
async function isThemeEngine2Enabled() {
  try {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.themeEngine2Enabled]);
    return result[STORAGE_KEYS.themeEngine2Enabled] === true;
  } catch (err) {
    console.error('[BoardsCleaner][theme-engine-2] toggle read failed:', err);
    return false;
  }
}

/*
 * Detect current forum slug
 * -------------------------
 * Start simple.
 * Expand later if you want category pages + discussion pages + breadcrumbs.
 */
function slugifyForumKey(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function detectForumKey() {
  const path = location.pathname;

  const categoryMatch = path.match(/^\/categories\/([^/?#]+)/i);
  if (categoryMatch) {
    const key = categoryMatch[1].toLowerCase();
    console.log('[BoardsCleaner][theme-engine-2] forumKey from URL:', key);
    return key;
  }

  const crumbLinks = [
    ...document.querySelectorAll(
      '.Breadcrumbs a, nav[aria-label="Breadcrumb"] a, .CrumbLabel a'
    )
  ];

  const categoryMatches = [];
  for (const link of crumbLinks) {
    const href = link.getAttribute('href') || '';
    const match =
      href.match(/^https?:\/\/[^/]+\/categories\/([^/?#]+)/i) ||
      href.match(/^\/categories\/([^/?#]+)/i);
    if (match) categoryMatches.push(match[1].toLowerCase());
  }

  if (categoryMatches.length > 0) {
    const key = categoryMatches[categoryMatches.length - 1];
    console.log('[BoardsCleaner][theme-engine-2] forumKey from breadcrumbs:', key);
    return key;
  }

  for (const link of crumbLinks) {
    const text = (link.textContent || '').trim().toLowerCase();
    if (text === 'after hours') {
      console.log('[BoardsCleaner][theme-engine-2] forumKey fallback: after-hours');
      return 'after-hours';
    }
    if (text === 'teach na ngealt') {
      console.log('[BoardsCleaner][theme-engine-2] forumKey fallback: teach-na-ngealt');
      return 'teach-na-ngealt';
    }
  }


  return null;
}
/*
 * Load settings for the current forum
 * -----------------------------------
 * forumThemeAssignments from sync
 * customCssByForum from local
 */
async function getThemeSettings(forumKey) {
  try {
    const [syncData, localData] = await Promise.all([
      chrome.storage.sync.get([
        STORAGE_KEYS.themeSettings,
        STORAGE_KEYS.forumThemeAssignments
      ]),
      chrome.storage.local.get([
        STORAGE_KEYS.customCssByForum
      ])
    ]);

    const themeSettings = syncData[STORAGE_KEYS.themeSettings] || {
      enabled: true,
      usePresets: true
    };

    if (themeSettings.enabled === false) {
      return null;
    }

    const forumAssignments = syncData[STORAGE_KEYS.forumThemeAssignments] || {};
    const customCssByForum = localData[STORAGE_KEYS.customCssByForum] || {};

    const assignedPresetId = forumAssignments[forumKey];

    if (!assignedPresetId || assignedPresetId === '__disabled__') {
      return {
        preset: null,
        customCss: customCssByForum[forumKey] || ''
      };
    }

    const presetDef = THEME_PRESETS[assignedPresetId];
    if (!presetDef) {
      return {
        preset: null,
        customCss: customCssByForum[forumKey] || ''
      };
    }

    return {
      preset: presetDef,
      customCss: customCssByForum[forumKey] || ''
    };
  } catch (err) {
    console.error('[BoardsCleaner][theme-engine-2] getThemeSettings failed:', err);
    return null;
  }
}

/*
 * CSS injection helpers
 */
function injectSharedStructureCss(cssText) {
  upsertStyle(STYLE_IDS.shared, cssText);
}

async function injectPresetCss(preset) {
  if (!preset || !preset.cssFile) return;

  try {
    const cssText = await fetchExtensionCss(preset.cssFile);
    upsertStyle(STYLE_IDS.preset, cssText);
  } catch (err) {
    console.error('[BoardsCleaner][theme-engine-2] preset CSS load failed:', preset.cssFile, err);
  }
}

function injectCustomCss(cssText) {
  upsertStyle(STYLE_IDS.custom, cssText);
  applyThemeHeaderShadowPatch();
}

function upsertStyle(id, cssText) {
  let styleEl = document.getElementById(id);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = id;
    document.documentElement.appendChild(styleEl);
  }

  styleEl.textContent = cssText;
}

async function fetchExtensionCss(relativePath) {
  const url = chrome.runtime.getURL(relativePath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${relativePath}: ${response.status}`);
  }
  return await response.text();
}

/*
 * HTML class management
 * ---------------------
 * Separate forum identity from preset identity.
 */
function clearThemeClasses() {
  const html = document.documentElement;

  Array.from(html.classList).forEach(cls => {
    if (
      cls.startsWith('boards-theme-forum-') ||
      cls.startsWith('boards-preset-') ||
      cls === 'boards-custom-theme-active'
    ) {
      html.classList.remove(cls);
    }
  });
}

function applyForumClass(forumKey) {
  document.documentElement.classList.add(`boards-theme-forum-${forumKey}`);
}

function applyPresetClass(preset) {
  if (!preset || !preset.className) return;
  document.documentElement.classList.add(preset.className);
}

/*
 * Optional shadow-root patch support
 * ----------------------------------
 * Needed for cases like #themeHeader nav inside open shadow root.
 */
async function applyOptionalShadowPatch(preset) {
  if (!preset || typeof preset.shadowPatch !== 'function') return;
  try {
    preset.shadowPatch();
  } catch (err) {
    console.error('[BoardsCleaner][theme-engine-2] shadow patch failed:', preset.id, err);
  }
}

/*
 * Global example shadow patch
 * ---------------------------
 * This is just a placeholder skeleton.
 * Replace token values / CSS block with your proven TM version later.
 */
function applyThemeHeaderShadowPatch() {
  const host = document.querySelector('#themeHeader');
  if (!host || !host.shadowRoot) return false;

  const root = host.shadowRoot;
  const styleId = 'bc-shadow-patch-themeHeader';
  let styleEl = root.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    root.appendChild(styleEl);
  }

  const htmlStyles = getComputedStyle(document.documentElement);

  const pick = (name, fallback) => {
    const value = htmlStyles.getPropertyValue(name);
    return value && value.trim() ? value.trim() : fallback;
  };

  const bg = pick('--t-bg', '#1f1f1f');
  const bg2 = pick('--t-bg-2', bg);
  const surface = pick('--t-surface', bg);
  const surface2 = pick('--t-surface-2', bg2);
  const border = pick('--t-border', '#444');
  const borderSoft = pick('--t-border-soft', border);
  const text = pick('--t-text', '#ffffff');
  const muted = pick('--t-muted', text);
  const link = pick('--t-link', '#8ecae6');
  const linkHover = pick('--t-link-hover', link);
  const headerTop = pick('--t-header-top', bg);
  const headerBottom = pick('--t-header-bottom', bg);
  const headerBorder = pick('--t-header-border', border);

  styleEl.textContent = `
    :host {
      --bc-shadow-bg: ${bg};
      --bc-shadow-bg-2: ${bg2};
      --bc-shadow-surface: ${surface};
      --bc-shadow-surface-2: ${surface2};
      --bc-shadow-border: ${border};
      --bc-shadow-border-soft: ${borderSoft};
      --bc-shadow-text: ${text};
      --bc-shadow-muted: ${muted};
      --bc-shadow-link: ${link};
      --bc-shadow-link-hover: ${linkHover};
      --bc-shadow-header-top: ${headerTop};
      --bc-shadow-header-bottom: ${headerBottom};
      --bc-shadow-header-border: ${headerBorder};
    }

    .nav-area,
    #nav,
    ul,
    ul li,
    nav,
    [class*="nav"],
    [class*="menu"] {
      background: var(--bc-shadow-header-bottom) !important;
      background-image: none !important;
      border-color: var(--bc-shadow-header-border) !important;
      color: var(--bc-shadow-text) !important;
    }

    .nav-area {
      border-bottom: 1px solid var(--bc-shadow-header-border) !important;
    }

    #nav > li,
    ul > li,
    .nav-item,
    .menu-item {
      background: transparent !important;
      color: inherit !important;
      border-color: var(--bc-shadow-border-soft) !important;
    }

    #nav > li > a,
    #nav > li > span,
    .nav-link,
    .nav-link:link,
    .nav-link:visited,
    ul li a,
    ul li span,
    button,
    [role="button"] {
      color: var(--bc-shadow-link) !important;
      background: transparent !important;
      background-image: none !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }

    #nav > li > a:hover,
    #nav > li > span:hover,
    .nav-link:hover,
    .nav-link:focus,
    ul li a:hover,
    button:hover,
    [role="button"]:hover {
      color: var(--bc-shadow-link-hover) !important;
      background: var(--bc-shadow-surface-2) !important;
    }

    .active,
    .selected,
    [aria-current="page"],
    [aria-selected="true"] {
      background: var(--bc-shadow-surface) !important;
      color: var(--bc-shadow-link-hover) !important;
      border-color: var(--bc-shadow-border) !important;
    }

    svg,
    path,
    iconify-icon {
      color: var(--bc-shadow-link) !important;
      fill: currentColor !important;
      stroke: currentColor !important;
    }
  `;

  return true;
}