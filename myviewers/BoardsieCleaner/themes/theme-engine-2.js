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
    shadowPatch: null
  },

  'current-affairs-imho': {
    id: 'current-affairs-imho',
    label: 'Current Affairs / IMHO',
    className: 'boards-preset-current-affairs-imho',
    cssFile: 'themes/presets/current-affairs-imho.css',
    shadowPatch: null
  },

  'forest': {
    id: 'forest',
    label: 'Forest',
    className: 'boards-preset-forest',
    cssFile: 'themes/presets/forest.css',
    shadowPatch: applyForestShadowPatch
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
 * Forest example shadow patch
 * ---------------------------
 * This is just a placeholder skeleton.
 * Replace token values / CSS block with your proven TM version later.
 */
function applyForestShadowPatch() {
  const host = document.querySelector('#themeHeader');
  if (!host || !host.shadowRoot) return;

  const styleId = 'bc-shadow-patch-forest';
  let styleEl = host.shadowRoot.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    host.shadowRoot.appendChild(styleEl);
  }

  styleEl.textContent = `
    .nav-area {
      background: #162018 !important;
      border-bottom: 1px solid #425a47 !important;
    }

    #nav,
    ul,
    ul li {
      background: #162018 !important;
      background-image: none !important;
    }

    #nav > li > a,
    #nav > li > span,
    .nav-link,
    ul li a,
    ul li span {
      color: #91c98b !important;
      background: transparent !important;
    }
  `;
}