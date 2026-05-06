// This is here to disable content.js for the use of the theme engine with BES!
chrome.storage.sync.get('contentScriptEnabled', (data) => {
  const contentScriptEnabled = data.contentScriptEnabled !== false;

  if (!contentScriptEnabled) {
    console.log('BoardsCleaner: content.js disabled by user setting');
    return;
  }

  initBoardsCleaner();
});


function initBoardsCleaner() {
  // everything that currently runs in content.js
  // observers, event listeners, runExtensionFeatures(), overlay logic, etc.
  // Warning! | All of content.js runs in this function
  

const ua = navigator.userAgent.toLowerCase();
const IS_MOBILE = /android|iphone|ipad|ipod|mobile/i.test(ua);


  
const DEFAULT_BC_SETTINGS = {
  globalColourShift: true,
  overlayDelay: 3,
  overlayMessage: navigator.userAgent.toLowerCase().match(/android|iphone|ipad|ipod|mobile/i)
    ? "Boards.ie Cleaner Loading..."
    : "Boards.ie Cleaner Created by corkie! Hope your enjoying a cleaner experience? | Loading...",
  cmpBlock: false,
  removeAds: false,
  removeAlerts: false,
  cookieDisagree: false,
  logoSolid: false, // NEW
  headerOverride: true,  // NEW: allow extension to control header colour on non-themed pages
  blockTwitterWidgets: false,
  blockInmobiCmp: false
};

function normaliseBcSettings(settings) {
  return {
    ...DEFAULT_BC_SETTINGS,
    ...(settings || {})
  };
}

function removeMatchingStylesheets(matchers = []) {
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

  links.forEach(link => {
    const href = link.href || '';
    const matchedBy = matchers.find(fragment => href.includes(fragment));

    if (!matchedBy) return;

    console.log('BoardsCleaner: removing stylesheet', {
      href,
      matchedBy
    });

    link.disabled = true;
    link.remove();
  });
}

function disableBoardsThemeCssIfActive() {
  if (!isBoardsThemeActive()) return;
  
    removeMatchingStylesheets([
   //  '/themes/boards/design/custom.css',
   //  '/applications/dashboard/design/style.css',
   //  '/applications/dashboard/design/style-compat.css',
	//   '/resources/design/vanillicon.css',
    // '/dist/v2/forum/chunks/addons/boards/forum.BstQCXWQ.css',
   // '/dist/v2/forum/chunks/addons/boards/forum.Bdhd0e_K.css',
   // '/plugins/ideation/design/ideation.css',
  ]);
  


  console.log('BoardsCleaner: removed boards custom.css because a BoardsCleaner theme is active');
}


function isBoardsThemeActive() {
  const html = document.documentElement;

  const hasPresetTheme = Array.from(html.classList).some(cls =>
    cls.startsWith('boards-preset-')
  );

  const hasCustomThemeMarker = html.classList.contains('boards-custom-theme-active');

  return hasPresetTheme || hasCustomThemeMarker;
}

function applyGlobalColourShift(enabled, headerOverrideEnabled = enabled) {
  const html = document.documentElement;
  const effectiveHeaderOverride = enabled || headerOverrideEnabled;

  if (isBoardsThemeActive()) {
    html.removeAttribute('data-bc-global-colour-shift');

    if (headerOverrideEnabled) {
      html.setAttribute('data-bc-header-override', 'on');
    } else {
      html.removeAttribute('data-bc-header-override');
    }

    if (!window.__bcThemeToastShown && typeof showPopup === 'function') {
      window.__bcThemeToastShown = true;
      showPopup(
        'BoardsCleaner: a Boards theme is active, colour shift is turned off for this page.'
      );
    }

    // console.log('BC applyGlobalColourShift themed-page:', {
    //  themeActive: true,
    //  headerOverrideEnabled,
    //  afterHeaderOverride: html.getAttribute('data-bc-header-override')
    // });

    applyLogoSwap(enabled);
    return;
  }

  if (IS_MOBILE) {
    html.setAttribute('data-bc-global-colour-shift', 'off');
    html.removeAttribute('data-bc-header-override');
    applyLogoSwap(enabled);
    return;
  }

  html.setAttribute('data-bc-global-colour-shift', enabled ? 'on' : 'off');

  if (headerOverrideEnabled) {
    html.setAttribute('data-bc-header-override', 'on');
  } else {
    html.removeAttribute('data-bc-header-override');
  }
  
    if (effectiveHeaderOverride) {
    html.setAttribute('data-bc-header-override', 'on');
  } else {
    html.removeAttribute('data-bc-header-override');
  }

  applyLogoSwap(enabled);
}

function updateBoardsHeaderLogo(enabled) {
  try {
    const customLogo = chrome.runtime.getURL("assets/boardsedited128.png");

    const logoImgs = document.querySelectorAll([
      'a.Header-logo img',
      'a.Header-logo.mobile img',
      'a.headerLogo img',
      '.headerLogo-logoFrame img',
      'img.headerLogo-logo',
      'img.titleBar-logo',
      'img[src*="boards-logo.png"]'
    ].join(', '));

    if (!logoImgs.length) {
      console.log('BoardsCleaner: no header logos found');
      return;
    }

    logoImgs.forEach((logoImg) => {
      if (!logoImg.dataset.bcOriginalSrc) {
        logoImg.dataset.bcOriginalSrc = logoImg.currentSrc || logoImg.src || '';
      }

      if (enabled) {
        logoImg.src = customLogo;
        logoImg.removeAttribute('srcset');
        logoImg.style.objectFit = 'contain';
      } else if (logoImg.dataset.bcOriginalSrc) {
        logoImg.src = logoImg.dataset.bcOriginalSrc;
        logoImg.style.objectFit = 'contain';
      }
    });

  //  console.log('BoardsCleaner: updated header logos:', logoImgs.length);
  } catch (e) {
    console.error('BoardsCleaner: failed to update header logo', e);
  }
}

function applyLogoSwap(enabled) {
  updateBoardsHeaderLogo(enabled);

  setTimeout(() => updateBoardsHeaderLogo(enabled), 250);
//  setTimeout(() => updateBoardsHeaderLogo(enabled), 800);
//  setTimeout(() => updateBoardsHeaderLogo(enabled), 1600);
//  setTimeout(() => updateBoardsHeaderLogo(enabled), 3000);
}


async function getStyledForumsList() {
  const syncData = await chrome.storage.sync.get(['forumThemeAssignments']);
  const localData = await chrome.storage.local.get(['customCssByForum']);

  const forumThemeAssignments = syncData.forumThemeAssignments || {};
  const customCssByForum = localData.customCssByForum || {};

  const keys = Array.from(
    new Set([
      ...Object.keys(forumThemeAssignments),
      ...Object.keys(customCssByForum)
    ])
  )
    .map(key => (key || '').trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

//  console.log('BC getStyledForumsList called');
//  console.log('BC forumThemeAssignments raw:', forumThemeAssignments);
//  console.log('BC customCssByForum raw:', customCssByForum);
//  console.log('BC merged forum keys:', keys);

  const list = keys.map((forumKey) => {
    const themeId = forumThemeAssignments[forumKey] || '';
    const cssText = customCssByForum[forumKey] || '';

    return {
      forumKey,
      themeId: themeId || null,
      hasCustomCss: typeof cssText === 'string' && cssText.trim().length > 0
    };
  });

  // console.log('BC getStyledForumsList built items:', list);
  return list;
}
  
// === Initial CSS injection (unchanged) ===
function injectExtensionCSS() {
  const existingStyle = document.getElementById("boards-cleaner-style");
  const icon128Url = chrome?.runtime?.getURL
    ? chrome.runtime.getURL("assets/icon128.png")
    : "";
	
    const icon128loader = chrome?.runtime?.getURL
    ? chrome.runtime.getURL("assets/boardsedited128.png")
    : "";

  const overlayCss = `
    body.overlay-hide {
      position: relative !important;
      overflow: hidden !important;
    }

    body.overlay-hide > *:not(#custom-loader) {
      opacity: 0 !important;
    }

    #custom-loader {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: var(--t-link, #3c5587);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      color: #fff;
      font-size: 20px;
      line-height: 1.4;
      text-align: center;
      padding: 24px;
      background-image: url("${icon128loader}");
      background-repeat: no-repeat;
      background-position: center 48px;
      background-size: 256px auto;
      box-sizing: border-box;
    }

    #custom-loader-message {
      margin-top: 120px;
      max-width: 90vw;
      white-space: normal;
      word-break: break-word;
    }

    .css-141gbze-modal-overlayContent {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      z-index: 2147483647 !important;
      background: rgba(0, 0, 0, 0.6) !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
    }

    .css-z6n287-modal {
      position: relative !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      margin: 0 !important;
      border-radius: 0 !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }

    .frame.css-ab90li-frameStyles-root {
      flex: 1 1 auto !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      overflow-y: auto !important;
      box-sizing: border-box !important;
    }

    .css-1usqrh9-frameStyles-bodyWrap {
      flex: 1 1 auto !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }

    .buttonClose,
    .closeButton {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      z-index: 2147483648 !important;
      background: transparent !important;
    }

    body.modal-active,
    html.modal-active {
      overflow: hidden !important;
    }

    .Options {
      display: inline-flex !important;
      align-items: center !important;
      gap: 8px !important;
    }

    .Options a,
    .Options span.ToggleFlyout {
      display: inline-flex !important;
      align-items: center !important;
    }
  `;

  const desktopThemeCss = `
    :root {
      --t-bg: #ffffff;
      --t-bg-2: #f4f4f4;
      --t-link: #3c5587;
      --t-link-hover: #1d5d9d;
      --t-header-top: #3c5587;
      --t-header-bottom: #2d436c;
      --t-header-border: #223455;
      --t-button-top: #3c5587;
      --t-button-bottom: #2d436c;
      --t-button-hover-top: #4a65a0;
      --t-button-hover-bottom: #34507e;
      --t-button-border: #223455;
    }

    html[data-bc-global-colour-shift="on"] {
      --t-bg: #c3d3e5;
      --t-bg-2: #c3d3e5;
      --t-link: #296db5;
      --t-link-hover: #296db5;
      --t-header-top: #296db5;
      --t-header-bottom: #296db5;
      --t-header-border: #296db5;
      --t-button-top: #296db5;
      --t-button-bottom: #296db5;
      --t-button-hover-top: #296db5;
      --t-button-hover-bottom: #296db5;
      --t-button-border: #296db5;
    }

    body,
	.Frame,
    .Content.MainContent,
    .page-content,
    .richEditor-text,
    .generic-block-wrapper,
    .generic-tab-page,
    .threads-wrapper-body,
    .sponsored-content,
    .sponsored-content .image-wrapper,
    .ttf-main,
    .ttf-forumactivity,
    .forum-threadlist-wrapper,
    .postbit-wrapper,
    .postbit-postbody,
    .postbit-actions,
    .forum-tools,
    .user-tools ul,
    .homepage-filter {
      background-color: var(--t-bg) !important;
    }

    .postbit-postdetails,
    .postbit-actionscontainer,
    .postbit-userinfo,
    .PostBitUser,
    .threadrow-container-zebra,
    .threadrow-container-zebra td,
    .forum-threadlist-lastpost,
    .forum-threadlist-replies,
    .forum-threadlist-views,
    .forum-threadlist-deleteinfo {
      background-color: var(--t-bg-2) !important;
    }

html[data-bc-header-override="on"] .titleBar,
html[data-bc-header-override="on"] .titleBar-inner,
html[data-bc-header-override="on"] .titleBar-region,
html[data-bc-header-override="on"] .titleBar .row,
html[data-bc-header-override="on"] .titleBar .container,
html[data-bc-header-override="on"] .header,
html[data-bc-header-override="on"] .header-navigation,
html[data-bc-header-override="on"] .header-container,
html[data-bc-header-override="on"] .navigation,
html[data-bc-header-override="on"] .navigation-wrap,
html[data-bc-header-override="on"] .navBar,
html[data-bc-header-override="on"] .navbar {
  background-color: var(--t-header-bottom) !important;
  background-image: none !important;
  border-color: var(--t-header-bottom) !important;
}

    .DataTable thead,
    .CommentHeaderBoards,
    .postbit-header,
    .Header,
    .GenericWrapperHeader,
	.SideNav-header,
    h1.GenericWrapperHeader,
    .generic-wrapper-header,
    .generic-wrapper-header .active,
    .forum-threadlist-header,
    .modal-title,
.PageControls.Top,
.PageControls.Bottom {
  position: static !important;
  background: var(--t-header-bottom) !important;
  border-color: var(--t-header-border) !important;
  z-index: 2;
}

    [class^="vanilla-"][class$="-dropDown-item"]:hover,
    .dropDown-contents .frameFooter a:hover,
    .dropDown-contents .frameFooter button:hover,
    ul.suggestedTextInput-menuItems li.suggestedTextInput-item:hover *,
    .postbit-header .Options li:hover,
    .Options .Flyout.MenuItems li.no-icon:hover,
    .forum-threadlist-forumtools.active,
    .homepage-filter li a:hover {
      background-color: var(--t-link) !important;
      color: #fff !important;
    }

    .dropDown-contents,
    .postbit-header .Options ul {
      background-color: var(--t-link) !important;
    }

html[data-bc-header-override="on"] .css-12tkh2i-TitleBar-classes-container,
html[data-bc-header-override="on"] .css-dp9rce-TitleBar-classes-bgContainer,
html[data-bc-header-override="on"] .css-1oj11qk-TitleBar-classes-bg1,
html[data-bc-header-override="on"] .css-4dzs6r-TitleBar-classes-overlay,
html[data-bc-header-override="on"] .css-3tnqcv-TitleBar-classes-titleBarContainer,
html[data-bc-header-override="on"] .css-14h4976-TitleBar-classes-bar,
html[data-bc-header-override="on"] .headerNavigation,
html[data-bc-header-override="on"] .css-1523lre-TitleBar-classes-nav,
html[data-bc-header-override="on"] .css-ukn4zc-titleBarNavStyles-navigation {
  background-color: var(--t-header-bottom) !important;
  background-image: none !important;
  border-color: var(--t-header-bottom) !important;
}

html[data-bc-header-override="on"] .headerNavigation,
html[data-bc-header-override="on"] .css-1523lre-TitleBar-classes-nav,
html[data-bc-header-override="on"] .css-ukn4zc-titleBarNavStyles-navigation,
html[data-bc-header-override="on"] .css-8fcb8p-titleBarNavStyles-items,
html[data-bc-header-override="on"] .css-1t3ndu5-titleBarNavStyles-firstItem,
html[data-bc-header-override="on"] .css-1c21t3e-titleBarNavStyles-root,
html[data-bc-header-override="on"] .css-1shblo9-TitleBar-classes-topElement-titleBarNavStyles-link {
  background-color: var(--t-header-bottom) !important;
  background-image: none !important;
  border-color: var(--t-header-bottom) !important;
}


.Frame-contentWrap.noad-top { margin-top: 0 !important; }
.Container { margin-top: 0 !important; }
.Content.MainContent { padding-top: 0 !important; }
.forum-threadlist-wrapper { margin-top: 0 !important; }
.no-ad-top-spacer { display: none !important; height: 0 !important; min-height: 0 !important; }
.Frame-contentWrap.noad-top { margin-top: 0 !important; padding-top: 0 !important; min-height: 0 !important; }
h1.H.HomepageTitle { display: none !important; }
#page-sidebar.pageBox.non-home {
    margin-top: 0 !important;
    padding-top: 0 !important;
}

/* Base: no pill, let themes do their thing */
html .headerLogo-logoFrame {
  padding: 0 !important;
  background: transparent !important;
  border-radius: 0 !important;
}

/* When our option is ON: blue pill behind the logo */
html.bc-logo-solid .headerLogo-logoFrame {
  background-color: #255ba3 !important;  /* your chosen blue */
  padding: 3px 8px !important;           /* tweak if needed */
  border-radius: 4px !important;
}



  `;

  const cssContent = IS_MOBILE ? overlayCss : overlayCss + "\n" + desktopThemeCss;

  if (existingStyle) {
    existingStyle.textContent = cssContent;
  } else {
    const style = document.createElement("style");
    style.id = "boards-cleaner-style";
    style.textContent = cssContent;
    document.head.appendChild(style);
  }
}

// Add after existing storage init or at top of content.js
const STORAGE_KEYS = {
    memberCode: 'bc_memberCode',
    memberActive: 'bc_memberActive',
    settings: 'bc_membersSettings'
};

// SHA-256 hash of your real activation code
const VALID_MEMBER_HASHES = [
    '4624b987510ccef95b099111bea5aaebf318bfc906161ad4942ebe0b28ce0fa6'
];

// Shadow dom

function getThemeHeaderShadowRoot() {
  const host = document.getElementById('themeHeader');
  return host && host.shadowRoot ? host.shadowRoot : null;
}

function getLegacyNavArea() {
  const root = getThemeHeaderShadowRoot();
  return root ? root.querySelector('.nav-area') : null;
}

function findLegacyNavItem(target) {
  const root = getThemeHeaderShadowRoot();
  if (!root) return null;

  if (target.startsWith('selector:')) {
    return root.querySelector(target.slice(9));
  }

  if (target.startsWith('data:')) {
    const wanted = target.slice(5);
    return Array.from(root.querySelectorAll('.nav-link')).find(
      el => (el.dataset.selector || '') === wanted
    ) || null;
  }

  if (target.startsWith('text:')) {
    const wanted = target.slice(5).trim().toLowerCase();
    return Array.from(root.querySelectorAll('.nav-link')).find(
      el => (el.textContent || '').trim().toLowerCase() === wanted
    ) || null;
  }

  return null;
}

function clickLegacyNavItem(target) {
  const el = findLegacyNavItem(target);

  if (!el) {
    console.warn('BoardsCleaner: nav item not found:', target);
    return false;
  }

  el.click();
  return true;
}

function isLegacyNavHidden() {
  const navArea = getLegacyNavArea();
  if (!navArea) return false;
  return navArea.dataset.bcHiddenApplied === '1';
}

function setLegacyNavHidden(hidden) {
  const navArea = getLegacyNavArea();
  if (!navArea) return;

  if (hidden) {
    if (!navArea.dataset.bcHiddenApplied) {
      navArea.dataset.bcPrevVisibility = navArea.style.visibility || '';
      navArea.dataset.bcPrevPointerEvents = navArea.style.pointerEvents || '';
      navArea.dataset.bcPrevHeight = navArea.style.height || '';
      navArea.dataset.bcPrevOverflow = navArea.style.overflow || '';
      navArea.dataset.bcPrevOpacity = navArea.style.opacity || '';
      navArea.dataset.bcHiddenApplied = '1';
    }

    navArea.style.visibility = 'hidden';
    navArea.style.pointerEvents = 'none';
    navArea.style.height = '0';
    navArea.style.overflow = 'hidden';
    navArea.style.opacity = '0';
  } else {
    navArea.style.visibility = navArea.dataset.bcPrevVisibility || '';
    navArea.style.pointerEvents = navArea.dataset.bcPrevPointerEvents || '';
    navArea.style.height = navArea.dataset.bcPrevHeight || '';
    navArea.style.overflow = navArea.dataset.bcPrevOverflow || '';
    navArea.style.opacity = navArea.dataset.bcPrevOpacity || '';

    delete navArea.dataset.bcPrevVisibility;
    delete navArea.dataset.bcPrevPointerEvents;
    delete navArea.dataset.bcPrevHeight;
    delete navArea.dataset.bcPrevOverflow;
    delete navArea.dataset.bcPrevOpacity;
    delete navArea.dataset.bcHiddenApplied;
  }

  updateLegacyNavHideButtonLabel();
}

function toggleLegacyNavHidden() {
  setLegacyNavHidden(!isLegacyNavHidden());
}

function closeLegacyNavPopup() {
  const panel = document.getElementById('bc-nav-popup-panel');
  const toggle = document.getElementById('bc-nav-popup-toggle');

  if (panel) panel.hidden = true;
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function toggleLegacyNavPopup() {
  const panel = document.getElementById('bc-nav-popup-panel');
  const toggle = document.getElementById('bc-nav-popup-toggle');
  if (!panel || !toggle) return;

  const willOpen = panel.hidden;
  panel.hidden = !panel.hidden;
  toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
}

function updateLegacyNavHideButtonLabel() {
  const btn = document.getElementById('bc-nav-popup-hide-toggle');
  if (!btn) return;
  btn.textContent = isLegacyNavHidden() ? 'Show original nav' : 'Hide original nav';
}

function injectLegacyNavPopupStyles() {
  if (document.getElementById('bc-nav-popup-style')) return;

  const style = document.createElement('style');
  style.id = 'bc-nav-popup-style';
  style.textContent = `
    #bc-nav-popup-wrap {
      position: relative;
      z-index: 2147483647;
      display: inline-flex;
      flex-direction: column;
      align-items: flex-end;
      margin-right: 8px;
    }

    #bc-nav-popup-toggle {
      width: 34px;
      height: 34px;
      border: 1px solid rgba(255,255,255,0.22);
      border-radius: 8px;
      background: rgba(255,255,255,0.10);
      color: #fff;
      font-size: 16px;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    #bc-nav-popup-toggle:hover {
      background: rgba(255,255,255,0.18);
    }

    #bc-nav-popup-panel[hidden] {
      display: none !important;
    }

    #bc-nav-popup-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 210px;
      padding: 8px;
      border-radius: 10px;
      background: rgba(20,20,20,0.97);
      box-shadow: 0 10px 24px rgba(0,0,0,0.35);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .bc-nav-popup-item,
    #bc-nav-popup-hide-toggle {
      padding: 9px 10px;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      background: #3c5587;
      color: #fff;
      text-align: left;
      cursor: pointer;
      font-size: 14px;
      line-height: 1.2;
    }

    .bc-nav-popup-item:hover,
    #bc-nav-popup-hide-toggle:hover {
      background: #4e6ca8;
    }

    #bc-nav-popup-sep {
      height: 1px;
      margin: 4px 0;
      background: rgba(255,255,255,0.12);
    }
  `;

  document.head.appendChild(style);
}

function insertLegacyNavPopup() {
  if (document.getElementById('bc-nav-popup-wrap')) return;

  const wrap = document.createElement('div');
  wrap.id = 'bc-nav-popup-wrap';

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'bc-nav-popup-toggle';
  toggleBtn.type = 'button';
  toggleBtn.textContent = '≡';
  toggleBtn.title = 'Open Boards legacy nav launcher';
  toggleBtn.setAttribute('aria-label', 'Open Boards legacy nav launcher');
  toggleBtn.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('div');
  panel.id = 'bc-nav-popup-panel';
  panel.hidden = true;

const items = [
  { label: 'Talk to...', target: 'data:#menu_talkto' },
  { label: 'Topics', target: 'data:#menu_topics' },
  { label: 'Regional', target: 'data:#menu_regional' },
  { label: 'Followed Forums', target: 'data:#menu_followed' }
];

  items.forEach(({ label, target }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bc-nav-popup-item';
    btn.textContent = label;
    btn.dataset.target = target;
    panel.appendChild(btn);
  });

  const sep = document.createElement('div');
  sep.id = 'bc-nav-popup-sep';
  panel.appendChild(sep);

  const hideToggleBtn = document.createElement('button');
  hideToggleBtn.type = 'button';
  hideToggleBtn.id = 'bc-nav-popup-hide-toggle';
  panel.appendChild(hideToggleBtn);

  wrap.appendChild(toggleBtn);
  wrap.appendChild(panel);

  const bar = document.querySelector('.css-14h4976-TitleBar-classes-bar');
  if (bar) {
    const meBox =
      bar.querySelector('.compactMeBox') ||
      bar.lastElementChild ||
      null;

    if (meBox && meBox.parentNode) {
      meBox.parentNode.insertBefore(wrap, meBox);
    } else {
      bar.appendChild(wrap);
    }
  } else {
    document.body.appendChild(wrap);
  }

  updateLegacyNavHideButtonLabel();

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLegacyNavPopup();
  });

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('.bc-nav-popup-item');
    if (!btn) return;

    const ok = clickLegacyNavItem(btn.dataset.target);
    if (!ok && typeof showPopup === 'function') {
      showPopup(`Legacy nav item not found: ${btn.textContent}`, 3500);
    }
    closeLegacyNavPopup();
  });

  hideToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLegacyNavHidden();
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      closeLegacyNavPopup();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLegacyNavPopup();
    }
  });
}

function initLegacyNavPopupFeature() {
  injectLegacyNavPopupStyles();
  insertLegacyNavPopup();
  setLegacyNavHidden(true);
}

// Shadow dom.

function showBcToast(message, durationMs) {
  const existing = document.getElementById("bc-toast");
  if (existing) existing.remove();

  const effectiveDuration =
    typeof durationMs === "number"
      ? durationMs
      : Math.max(5000, (typeof bcOverlayDelayMs === "number" ? bcOverlayDelayMs : 0) + 2000);

  const toast = document.createElement("div");
  toast.id = "bc-toast";

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "88px",
    right: "16px",
    maxWidth: "320px",
    padding: "10px 14px",
    background: "rgba(0,0,0,0.92)",
    color: "#fff",
    fontSize: "13px",
    borderRadius: "6px",
    zIndex: "2147483647",
    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  });

  const icon = document.createElement("img");
  icon.src = chrome.runtime.getURL("assets/icon16.png");
  icon.alt = "";
  Object.assign(icon.style, {
    width: "16px",
    height: "16px",
    flex: "0 0 auto",
    borderRadius: "3px"
  });

  const text = document.createElement("span");
  text.textContent = message;
  Object.assign(text.style, {
    lineHeight: "1.35"
  });

  toast.appendChild(icon);
  toast.appendChild(text);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, effectiveDuration);
}

async function validateMember(code) {
    if (!code)
        return false;
    const plain = code.trim();
    if (plain === 'TEST123')
        return true; // dev shortcut

    const hash = await sha256Hex(plain);
    return VALID_MEMBER_HASHES.includes(hash);
}

async function loadMemberState() {
    return new Promise(resolve => {
        if (!chrome.storage || !chrome.storage.sync) {
            resolve({});
            return;
        }
        chrome.storage.sync.get(
            [STORAGE_KEYS.memberCode, STORAGE_KEYS.memberActive, STORAGE_KEYS.settings],
            result => resolve(result));
    });
}

async function saveMemberState(code, active, settings) {
    if (!chrome.storage || !chrome.storage.sync)
        return;
    chrome.storage.sync.set({
        [STORAGE_KEYS.memberCode]: code,
        [STORAGE_KEYS.memberActive]: active,
        [STORAGE_KEYS.settings]: settings
    });
}

async function sha256Hex(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

(async function maybeAutoDetectMembership() {
    try {
        const url = new URL(location.href);

        // Only run detection on the bare self-profile discussions URL
        const isSelfProfile = (
            url.origin === 'https://www.boards.ie' &&
            url.pathname === '/profile/discussions/'
        );
        if (!isSelfProfile) {
            return;
        }

        const rolesEl = await waitForRolesElement();
        if (!rolesEl) {
            console.log('BoardsCleaner: Roles element did not appear in time');
            return;
        }

        // Collect ALL dd.Roles, not just the first one
        const roleEls = document.querySelectorAll('dd.Roles');
        const rolesText = Array.from(roleEls)
            .map(el => (el.textContent || '').trim())
            .join(', ')
            .toLowerCase();

        console.log('BoardsCleaner: profile roles text:', rolesText);

        // 1) Direct paid-member check
        const hasPaidMember = rolesText.includes('paid member');

        // 2) Staff / privileged roles (mods, employees, admins)
        const staffKeywords = [
            'moderator',
            'moderators',
            'employee',
            'administrators',
            'administrator'
        ];
        const hasStaffRole = staffKeywords.some(kw => rolesText.includes(kw));

        const isMember = hasPaidMember || hasStaffRole;

        if (!isMember) {
            // console.log('BoardsCleaner: No paid/staff membership detected from profile roles');
            return;
        }

        console.log('BoardsCleaner: Membership detected from profile roles', {
            hasPaidMember,
            hasStaffRole
        });

        const current = await loadMemberState();
        const settings = current[STORAGE_KEYS.settings] || {};

        await saveMemberState('PROFILE-DETECTED', true, settings);

        showBcToast('BoardsCleaner: membership detected from your profile.');

        if (typeof updateCmpIconMembershipState === 'function') {
            updateCmpIconMembershipState();
        } else {
            console.log('BoardsCleaner: membership set from profile, icon update skipped on this page');
        }
    } catch (e) {
        console.error('BoardsCleaner: error during auto membership detection', e);
    }
})();

function waitForRolesElement(timeoutMs = 5000) {
    return new Promise(resolve => {
        const existing = document.querySelector('dd.Roles');
        if (existing) {
            resolve(existing);
            return;
        }

        const observer = new MutationObserver(() => {
            const el = document.querySelector('dd.Roles');
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeoutMs);
    });
}

// Call the function early in your content.js
if (!isBoardsThemeActive()) {
  injectExtensionCSS();
}

  // Give your own theme engine a tick to add its classes,
  // then remove the Boards custom.css if a BC theme is active.
  // setTimeout(() => {
  //  disableBoardsThemeCssIfActive();
 // }, 0);


setTimeout(() => {
  initLegacyNavPopupFeature();
}, 1000);

async function getBcSettings() {
  const state = await loadMemberState();
  const safeState = state || {};
  return normaliseBcSettings(safeState[STORAGE_KEYS.settings]);
}

async function logMemberState(tag = 'BC state') {
  try {
    const state = await loadMemberState();
    const settings = normaliseBcSettings((state || {})[STORAGE_KEYS.settings]);
    // console.log(`[BoardsCleaner] ${tag}`, {
    //  memberActive: !!(state || {})[STORAGE_KEYS.memberActive],
    //  memberCode: (state || {})[STORAGE_KEYS.memberCode],
    //  settings
    // });
  } catch (err) {
    console.error(`[BoardsCleaner] ${tag} failed`, err);
  }
}


function applyLogoSolid(enabled) {
  const html = document.documentElement;
  if (enabled) {
    html.classList.add('bc-logo-solid');
  } else {
    html.classList.remove('bc-logo-solid');
  }
}

// === Overlay configuration  ===
async function configureOverlayIfNeeded() {
//  const ua = navigator.userAgent.toLowerCase();
//  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

  // You can still keep this if you like, but we’ll override delay below:
  const settings = await getBcSettings();
  applyGlobalColourShift(
  settings.globalColourShift !== false,
  settings.headerOverride !== false   // treat undefined as true for backwards compat
);
    // NEW: reapply the logo pill based on stored setting
  applyLogoSolid(!!settings.logoSolid);
  
  // Re-check shortly after load in case theme-engine classes are added late
setTimeout(() => {
  applyGlobalColourShift(
    settings.globalColourShift !== false,
    settings.headerOverride !== false
  );
  applyLogoSolid(!!settings.logoSolid);
}, 500);
  
  // console.log('BC configureOverlayIfNeeded settings:', settings);

  // Overlay message – keep this logic so we see text
  let message = settings.overlayMessage;
  if (!message || !message.trim()) {
      if (IS_MOBILE) {
          message = 'Boards.ie Cleaner | Loading...';
      } else {
          message = 'Boards.ie Cleaner | Created by corkie! | Thanks for supporting the site | Loading...';
      }
  }

  // TEMP: hard‑code delay to 7 seconds for testing
  // const delaySeconds = 12;
  // const delayMs = delaySeconds * 1000;
  // temp line as well
 // message = 'This is a test! .....';
 
   let delaySeconds;
  if (typeof settings.overlayDelay === 'number' && !Number.isNaN(settings.overlayDelay)) {
    delaySeconds = settings.overlayDelay;
  } else {
    delaySeconds = IS_MOBILE ? 9 : 3;
  }

  const delayMs = delaySeconds * 1000;
  // console.log('BC configureOverlayIfNeeded using:', { message, delayMs });

  applyOverlayConfig(message, delayMs);

}






let bcOverlayDelayMs = 0;
let bcOverlayMessage = '';

function applyOverlayConfig(message, delayMs) {
  bcOverlayDelayMs = typeof delayMs === 'number' && delayMs >= 0 ? delayMs : 0;
  bcOverlayMessage = message || '';

  // If delay is zero, don't show overlay at all.
  if (bcOverlayDelayMs === 0) {
    // Clean up any existing loader and classes
    const existingLoader = document.getElementById('custom-loader');
    if (existingLoader) existingLoader.remove();
    document.body.classList.remove('overlay-hide');
    return;
  }

  // Ensure CSS is injected (if you only inject once, guard inside injectExtensionCSS)
  injectExtensionCSS();
  
    // Give your own theme engine a tick to add its classes,
  // then remove the Boards custom.css if a BC theme is active.
  // setTimeout(() => {
  //  disableBoardsThemeCssIfActive();
  // }, 0);

  // Create or update the loader element
  let loader = document.getElementById('custom-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'custom-loader';

    const msg = document.createElement('div');
    msg.id = 'custom-loader-message';
    loader.appendChild(msg);

    document.body.appendChild(loader);
  }

  const msgEl = loader.querySelector('#custom-loader-message');
  if (msgEl) {
    msgEl.textContent = bcOverlayMessage;
  }

  // Mask the page
  document.body.classList.add('overlay-hide');
    lastChangeTime = performance.now();
  requestAnimationFrame(checkIfStable);
}

function removeBoardsAlerts() {
  try {
    const selectors = [
      '.DismissMessage.WarningMessage',
      '.DismissMessage.AlertMessage'
      // Add more later as you identify other banners
    ];

    document.querySelectorAll(selectors.join(',')).forEach(el => el.remove());
  } catch (e) {
    console.error('BC removeBoardsAlerts error', e);
  }
}

function removeBoardsAds() {
  try {
    const selectors = [
      '.mid-ad',
      '.ad-container',
      '.ad-text',
      '.adsbygoogle',
      '.advertisement',
      '.ad-slot',
	  '.no-ad-top-spacer'
      // Adjust/extend once you inspect exact Boards markup
    ];

    document.querySelectorAll(selectors.join(',')).forEach(el => el.remove());
  } catch (e) {
    console.error('BC removeBoardsAds error', e);
  }
}

function handleBoardsCmp(settings) {
  if (!settings.cookieDisagree && !settings.cmpBlock) {
    return;
  }

  // If you later want cmpBlock to mean something else, you can branch here.
  // For now, either flag means "auto handle Quantcast CMP via dismissQuantcast".

  // Try immediately
  if (dismissQuantcast()) {
    return;
  }

  // Watch for popup load once
  const observer = new MutationObserver(() => {
    if (dismissQuantcast()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Late-load safeguard
  setTimeout(() => {
    if (dismissQuantcast()) {
      observer.disconnect();
    }
  }, 2000);
}

function dismissQuantcast() {
  // We assume settings say this is enabled; no localStorage check here

  // Prefer specific Quantcast footer button
  const disagreeBtns = document.querySelectorAll('.qc-cmp2-footer button[mode="secondary"]');
  if (disagreeBtns[1]) {
    disagreeBtns[1].click();
    // console.log('BC: Clicked DISAGREE via footer button');

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);

    return true;
  }

  // Fallback: any button whose text contains DISAGREE
  const allBtns = document.querySelectorAll('button');
  for (let btn of allBtns) {
    if ((btn.textContent || '').toUpperCase().includes('DISAGREE')) {
      btn.click();

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

      // console.log('BC: Clicked DISAGREE via text match');
      return true;
    }
  }

  // Optional: AGREE fallback (only if you still want it)
  const agreeBtn = document.querySelector('button[mode="primary"], .css-47sehv');
  if (agreeBtn) {
    agreeBtn.click();

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);

    // console.log('BC: Clicked AGREE as fallback');
    return true;
  }

  return false;
}

async function runExtensionFeatures() {
  console.log("BoardsCleaner content script features starting");

  const state = await loadMemberState().catch(() => ({}));
  const safeState = state || {};
  const isMemberActive = !!safeState[STORAGE_KEYS.memberActive];
  const settings = safeState[STORAGE_KEYS.settings] || {};

  // Only run member features if membership is active
  if (!isMemberActive) {
    return;
  }

  // Remove warning / subscription banners
  if (settings.removeAlerts) {
    removeBoardsAlerts();
  }

  // Remove ad containers
  if (settings.removeAds) {
    removeBoardsAds();
  }

  // Handle CMP / cookie popup
if (settings.cmpBlock || settings.cookieDisagree) {
  handleBoardsCmp(settings);
}

  // ...other member features go here (subbed forums, etc.)
}

    // Layout stability detection & overlay removal
    let lastChangeTime = performance.now();
    const stabilityObserver = new MutationObserver(() => {
        lastChangeTime = performance.now();
    });
    stabilityObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    // const ua = navigator.userAgent.toLowerCase();
    // const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

//    let stableDuration = isMobile ? 1800 : 500;

    // Check here!

    // out for sync | const storedValue = localStorage.getItem('boardsCleanerDelay');
    // const minDelay = storedValue !== null ? Number(storedValue) : (isMobile ? 7000 : 1000);
    // let stableDuration = isMobile ? 1800 : 500;

    //  if (typeof window._overlayMinDelay === 'undefined') {
    // out for sync |    const storedDelay = localStorage.getItem('boardsCleanerDelay');
    //   window._overlayMinDelay = storedDelay !== null ? Number(storedDelay) : 1000;
    // }

    //  if (window._overlayMinDelay === 0) {
    //    stableDuration = 0;

    //  } else {

    //  }

// let lastChangeTime = 0; // ensure declared

function checkIfStable() {
  const now = performance.now();
  const minDelayMs =
    typeof bcOverlayDelayMs === 'number' ? bcOverlayDelayMs : 0;

  if (now - lastChangeTime >= minDelayMs) {
    document.body.classList.remove('overlay-hide');

    const loader = document.getElementById('custom-loader');
    if (loader) loader.remove();

    // if (stabilityObserver) stabilityObserver.disconnect();

    console.log(
      "Overlay removed after stability check. Delay used:",
      minDelayMs,
      "ms"
    );
  } else {
    requestAnimationFrame(checkIfStable);
  }
}

function startOverlayStabilityLoop() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      lastChangeTime = performance.now();
      requestAnimationFrame(checkIfStable);
    });
  } else {
    lastChangeTime = performance.now();
    requestAnimationFrame(checkIfStable);
  }
}

// startOverlayStabilityLoop();

    function isFirefox() {
        return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    }

    function replaceCustomEmojis() {
        const emojiMap = {
            ':pac:': 'https://i.imgur.com/JYORVpC.png',
            ':poop:': '\u{1F4A9}' // Unicode poop emoji 💩
        };
        const posts = document.querySelectorAll('.userContent > p');

        posts.forEach(post => {
            const childNodes = Array.from(post.childNodes);
            childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    let txt = node.textContent;

                    Object.keys(emojiMap).forEach(code => {
                        if (txt.includes(code)) {
                            const fragments = txt.split(code);
                            const fragmentNodes = [];

                            fragments.forEach((text, idx) => {
                                if (text)
                                    fragmentNodes.push(document.createTextNode(text));
                                if (idx < fragments.length - 1) {
                                    const replacement = emojiMap[code];
                                    if (replacement.startsWith('http')) {
                                        const img = document.createElement('img');
                                        img.src = replacement;
                                        img.alt = code;
                                        img.className = 'emoji';
                                        fragmentNodes.push(img);
                                    } else {
                                        const span = document.createElement('span');
                                        span.textContent = replacement;
                                        span.className = 'emoji';
                                        fragmentNodes.push(span);
                                    }
                                }
                            });
                            fragmentNodes.forEach(n => post.insertBefore(n, node));
                            post.removeChild(node);
                        }
                    });
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!isFirefox()) {
                replaceCustomEmojis();
            }
        });
    } else {
        if (!isFirefox()) {
            replaceCustomEmojis();
        }
    }

    // Prevent 'Quote' button scrolling page to top
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('a.js-quoteButton[href="#"]');
        if (btn) {
            e.preventDefault();
        }
    });

    // Profile link toggling & popup code
    let toggleState = false; // false = discussions, true = comments

    function toggleProfileLinks() {
        toggleState = !toggleState;
        const links = document.querySelectorAll(
                'a[href^="/profile/"], a[href^="https://www.boards.ie/profile/"], a.atMention[href*="/profile/"]');

        links.forEach(link => {
            let href = link.getAttribute('href');

            let match = href.match(
                    /^(?:https?:\/\/(?:www\.)?boards\.ie)?\/profile\/(?:discussions\/|comments\/)?([^\/?#]+)(?:[\/?#].*)?$/);
            if (match) {
                const username = match[1];
                const newHref = toggleState
                     ? `/profile/comments/${username}`
                     : `/profile/discussions/${username}`;
                link.setAttribute('href', newHref);
            }
        });

        showPopup(`Profile links toggled to ${toggleState ? 'comments' : 'discussions'}`);
    }

    // Overlay delay options in milliseconds (for display), sync uses seconds
    const delayOptions = [0, 3000, 7000, 9000, 12000];

    async function getCurrentDelayIndexFromSync() {
        const rawSettings = await getBcSettings();
        const settings = rawSettings || {};

        const seconds =
            typeof settings.overlayDelay === 'number' && !Number.isNaN(settings.overlayDelay)
             ? settings.overlayDelay
             : 3;

        const ms = seconds * 1000;
        const idx = delayOptions.indexOf(ms);
        return idx === -1 ? 1 : idx; // default to 3 seconds (index 1) if unknown
    }

    async function incrementDelay() {
        const currentIndex = await getCurrentDelayIndexFromSync();
        const nextIndex = (currentIndex + 1) % delayOptions.length;
        const nextMs = delayOptions[nextIndex];
        const nextSeconds = nextMs / 1000;

        const state = await loadMemberState();
        const settings = state[STORAGE_KEYS.settings] || {};

        const newSettings = {
            ...settings,
            overlayDelay: nextSeconds
        };

        await saveMemberState(
            state[STORAGE_KEYS.memberCode] || 'SAVED',
            !!state[STORAGE_KEYS.memberActive],
            newSettings);

        applyOverlayConfig(
            settings.overlayMessage ||
            (navigator.userAgent.toLowerCase().match(/android|iphone|ipad|ipod|mobile/)
                 ? 'Boards.ie Cleaner | Loading...'
                 : 'Boards.ie Cleaner | Created by corkie! | Thanks for supporting the site | Loading...'),
            nextMs);

        alert(`BoardsCleaner delay set to: ${nextSeconds} seconds`);
    }

    /*
    // temporarily disabled check here
    // Listen for Alt + '+' keypress
    window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === '+' || e.key === '=')) {
    e.preventDefault();
    incrementDelay();
    }
    });

     */

    window.addEventListener('keydown', (e) => {
        if (!e.altKey)
            return;

        if (e.key === '+' || e.key === '=') {
            // Overlay delay cycling is WIP; currently disabled to avoid errors.
            // TODO: Re-enable once getBcSettings and overlay delay settings are fully wired.
            // incrementDelay();
        }
    });

(function () {
  const formSelector = '.MessageForm.CommentForm';

  function ensureFloatingButtonStyles() {
    if (document.getElementById('boardsCleanerFloatingBtnStyles')) return;

    const style = document.createElement('style');
    style.id = 'boardsCleanerFloatingBtnStyles';
    style.textContent = `
      #boardsCleanerFloatingBtn {
        position: absolute;
        z-index: 100000;
        top: -40px;
        left: 0;
        padding: 6px 12px;
        font-size: 14px;
        background: linear-gradient(
          180deg,
          var(--t-button-top, #2f6fed) 0%,
          var(--t-button-bottom, #1d4fb8) 100%
        );
        color: var(--t-btn-text, #ffffff);
        border: 1px solid var(--t-button-border, #163d8f);
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }

      #boardsCleanerFloatingBtn:hover {
        background: linear-gradient(
          180deg,
          var(--t-button-hover-top, #4a84f5) 0%,
          var(--t-button-hover-bottom, #2a61d4) 100%
        );
      }
    `;
    document.head.appendChild(style);
  }

  function addFloatingButtonLeft() {
    const container = document.querySelector(formSelector);
    if (!container || document.getElementById('boardsCleanerFloatingBtn')) return;

    ensureFloatingButtonStyles();

    const btn = document.createElement('button');
    btn.id = 'boardsCleanerFloatingBtn';
    btn.textContent = 'Edit in Modal';
    btn.title = 'Open modal editor';

    if (!container.style.position) {
      container.style.position = 'relative';
    }

    container.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModalWithForm();
    });
  }



        function openModalWithForm() {
            const formContainer = document.querySelector(formSelector);
            if (!formContainer)
                return;

            const originalParent = formContainer.parentNode;
            const originalNextSibling = formContainer.nextSibling;

            const modalBg = document.createElement('div');
            Object.assign(modalBg.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.5)',
                zIndex: '2147483647',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'auto',
                padding: '20px',
                boxSizing: 'border-box'
            });

            const modalBox = document.createElement('div');
            Object.assign(modalBox.style, {
                background: 'white',
                borderRadius: '8px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '15px',
                boxShadow: '0 6px 32px rgba(0,0,0,0.18)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            });

            modalBox.appendChild(formContainer);

            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close & Return';
            Object.assign(closeBtn.style, {
                alignSelf: 'flex-end',
                marginTop: '12px',
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            });
            closeBtn.title = 'Close modal and return editor to page';

            closeBtn.addEventListener('click', () => {
                if (originalNextSibling) {
                    originalParent.insertBefore(formContainer, originalNextSibling);
                } else {
                    originalParent.appendChild(formContainer);
                }
                document.body.removeChild(modalBg);

                const editable = formContainer.querySelector('[contenteditable="true"], textarea');
                if (editable)
                    editable.focus();
            });

            modalBox.appendChild(closeBtn);
            modalBg.appendChild(modalBox);
            document.body.appendChild(modalBg);

            const editable = formContainer.querySelector('[contenteditable="true"], textarea');
            if (editable)
                editable.focus();

            modalBg.addEventListener('click', e => {
                if (e.target === modalBg)
                    closeBtn.click();
            });
        }

        function init() {
            addFloatingButtonLeft();
        }

        let tries = 0;
        const maxTries = 30;
        const interval = setInterval(() => {
            init();
            if (++tries > maxTries)
                clearInterval(interval);
        }, 300);
    })();

    // Reusable popup function
function showPopup(message, durationMs) {
  const existing = document.getElementById("togglePopup");
  if (existing) existing.remove();

  const effectiveDuration =
    typeof durationMs === "number"
      ? durationMs
      : Math.min(
          8000,
          Math.max(
            3500,
            (typeof bcOverlayDelayMs === "number" ? bcOverlayDelayMs : 0) + 2000
          )
        );

  const popup = document.createElement("div");
  popup.id = "togglePopup";

  Object.assign(popup.style, {
    position: "fixed",
    bottom: "60px",
    right: "20px",
    maxWidth: "320px",
    padding: "10px 14px",
    backgroundColor: "rgba(0,0,0,0.82)",
    color: "#fff",
    borderRadius: "6px",
    zIndex: "2147483647",
    fontSize: "14px",
    lineHeight: "1.35",
    transition: "opacity 0.5s ease",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    opacity: "0"
  });

  const icon = document.createElement("img");
  icon.src = chrome.runtime.getURL("assets/icon16.png");
  icon.alt = "";
  Object.assign(icon.style, {
    width: "16px",
    height: "16px",
    flex: "0 0 auto",
    borderRadius: "3px"
  });

  const text = document.createElement("span");
  text.textContent = message;
  Object.assign(text.style, {
    display: "block"
  });

  popup.appendChild(icon);
  popup.appendChild(text);
  document.body.appendChild(popup);

  requestAnimationFrame(() => {
    popup.style.opacity = "1";
  });

  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => {
      popup.remove();
    }, 500);
  }, effectiveDuration);
}

    document.addEventListener('click', function (event) {
        const el = event.target.closest('.js-userCard');
        if (!el)
            return;

        let username = null;

        if (el.tagName.toLowerCase() === 'a' && el.href) {
            const match = el.href.match(/\/profile\/(?:discussions\/|comments\/)?([^\/?#]+)/);
            if (match) {
                username = decodeURIComponent(match[1]);
            }
        } else if (el.tagName.toLowerCase() === 'span') {
            username = el.textContent.trim();
        }

        if (!username)
            return;

        event.preventDefault();

        const profileURL = toggleState
             ? `/profile/comments/${encodeURIComponent(username)}`
             : `/profile/discussions/${encodeURIComponent(username)}`;

        window.location.href = profileURL;
    });

    // Add CSS for toggle button, info icon, and dialog styling
    const style = document.createElement('style');
    style.textContent = `
#profileToggleBtn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  z-index: 2147483647;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  cursor: pointer;
}
.infoIconWrapper {
  position: fixed;
  bottom: 70px;
  right: 10px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.infoIcon {
  cursor: pointer;
  font-weight: bold;
  border: 1px solid #888;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  text-align: center;
  line-height: 18px;
  font-size: 14px;
  user-select: none;
}
.navIcon {
  cursor: pointer;
  font-weight: bold;
  border: 1px solid #888;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  text-align: center;
  line-height: 18px;
  font-size: 14px;
  user-select: none;
  background-color: white;
}
.navIcon {
  font-size: 12px;
}

dialog#shortcutDialog {
  padding: 1em 1.5em;
  max-width: 340px;
  border-radius: 8px;
  border: 1px solid var(--t-button-border, #223455);
  background: var(--t-bg, #ffffff);
  color: var(--t-text, #1f2328);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
}

dialog#shortcutDialog::backdrop {
  background: rgba(0, 0, 0, 0.3);
}

dialog#shortcutDialog h2,
dialog#shortcutDialog h3,
dialog#shortcutDialog b {
  color: var(--t-text, #1f2328);
}

dialog#shortcutDialog ul {
  margin: 0;
  padding-left: 1.2em;
}

dialog#shortcutDialog li {
  margin: 0 0 8px;
  color: var(--t-text, #1f2328);
}

dialog#shortcutDialog a.bc-shortcut-link,
dialog#shortcutDialog a {
  color: var(--t-link, #3c5587);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1.5px;
  font-weight: 600;
}

dialog#shortcutDialog a.bc-shortcut-link:hover,
dialog#shortcutDialog a.bc-shortcut-link:focus,
dialog#shortcutDialog a:hover,
dialog#shortcutDialog a:focus {
  color: var(--t-link-hover, #1d5d9d);
  text-decoration-thickness: 2px;
}

dialog#shortcutDialog .bc-shortcut-action-btn,
dialog#shortcutDialog button.closeBtn,
dialog#shortcutDialog #bc-reset-overlay-btn {
  margin-top: 10px;
  padding: 0.45em 0.9em;
  border: 1px solid var(--t-button-border, #223455);
  border-radius: 4px;
  background: linear-gradient(
    180deg,
    var(--t-button-top, #3c5587) 0%,
    var(--t-button-bottom, #2d436c) 100%
  );
  color: var(--t-btn-text, #ffffff);
  cursor: pointer;
}

dialog#shortcutDialog .bc-shortcut-action-btn:hover,
dialog#shortcutDialog button.closeBtn:hover,
dialog#shortcutDialog #bc-reset-overlay-btn:hover {
  background: linear-gradient(
    180deg,
    var(--t-button-hover-top, #4a65a0) 0%,
    var(--t-button-hover-bottom, #34507e) 100%
  );
}

dialog#shortcutDialog .bc-shortcut-action-btn:focus,
dialog#shortcutDialog button.closeBtn:focus,
dialog#shortcutDialog #bc-reset-overlay-btn:focus,
dialog#shortcutDialog a:focus {
  outline: 2px solid var(--t-link, #3c5587);
  outline-offset: 2px;
}

dialog#shortcutDialog hr {
  border: 0;
  border-top: 1px solid var(--t-button-border, #223455);
  margin: 12px 0;
}

/* Data Table Wrap was to make room for page controls */

.DataTableWrap {
  margin-top: 70px;
  z-index: 1;
}
.Pager.PagerLinkCount-11.NumberedPager,
.ButtonGroup.discussion-sort-filter-module.pull-left {
  background: var(--t-bg) !important;
}
.Options {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
}
.Options > a,
.Options > span.ToggleFlyout {
  display: inline-flex !important;
  align-items: center !important;
}
`;
    document.head.appendChild(style);

    function makeProfileToggleButtonDraggable(btn) {
        let dragging = false;
        let startX,
        startY,
        origX = 0,
        origY = 0;

        function getOffsets() {
            let dx = parseFloat(btn.getAttribute('data-x')) || 0;
            let dy = parseFloat(btn.getAttribute('data-y')) || 0;
            return [dx, dy];
        }

        function dragStart(e) {
            dragging = true;
            const pointer = e.touches ? e.touches[0] : e;
            [origX, origY] = getOffsets();
            startX = pointer.clientX;
            startY = pointer.clientY;
            document.addEventListener('mousemove', dragMove);
            document.addEventListener('mouseup', dragEnd);
            document.addEventListener('touchmove', dragMove, {
                passive: false
            });
            document.addEventListener('touchend', dragEnd);
            e.preventDefault();
        }
        function dragMove(e) {
            if (!dragging)
                return;
            const pointer = e.touches ? e.touches[0] : e;
            let dx = origX + (pointer.clientX - startX);
            let dy = origY + (pointer.clientY - startY);

            dx = Math.max(0, Math.min(window.innerWidth - btn.offsetWidth, dx));
            dy = Math.max(0, Math.min(window.innerHeight - btn.offsetHeight, dy));

            btn.style.transform = `translate(${dx}px,${dy}px)`;
            btn.setAttribute('data-x', dx);
            btn.setAttribute('data-y', dy);
            btn.style.left = '';
            btn.style.right = '';
            btn.style.top = '';
            btn.style.bottom = '';
            e.preventDefault();
        }
        function dragEnd() {
            dragging = false;
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('mouseup', dragEnd);
            document.removeEventListener('touchmove', dragMove);
            document.removeEventListener('touchend', dragEnd);
        }
        btn.addEventListener('mousedown', dragStart);
        btn.addEventListener('touchstart', dragStart, {
            passive: false
        });
    }

    function insertToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'profileToggleBtn';
        btn.textContent = 'Toggle Profiles';
        document.body.appendChild(btn);

        btn.addEventListener('click', () => {
            const path = window.location.pathname;
            const match = path.match(/^\/profile\/(discussions|comments)\/([^\/]+)(\/.*)?$/);
            if (match) {
                const section = match[1];
                const username = match[2];
                const targetSection = (section === 'discussions') ? 'comments' : 'discussions';
                const newPath = `/profile/${targetSection}/${username}`;
                window.location.href = newPath;
            } else {
                if (typeof toggleProfileLinks === 'function') {
                    toggleProfileLinks();
                }
            }
            makeProfileToggleButtonDraggable(btn);
        });

        const infoWrapper = document.createElement('div');
        infoWrapper.className = 'infoIconWrapper';

        const homeIcon = document.createElement('span');
        homeIcon.className = 'navIcon';
        homeIcon.textContent = '▲';
        homeIcon.setAttribute('role', 'button');
        homeIcon.setAttribute('tabindex', '0');

        const cmpIcon = document.createElement('span');
        cmpIcon.className = 'navIcon';
        cmpIcon.textContent = '🍪';
        cmpIcon.title = 'Toggle Quantcast CMP auto-dismiss';
        cmpIcon.setAttribute('role', 'button');
        cmpIcon.setAttribute('tabindex', '0');

        const infoIcon = document.createElement('span');
        infoIcon.className = 'infoIcon';
        infoIcon.textContent = 'i';
        infoIcon.setAttribute('role', 'button');
        infoIcon.setAttribute('tabindex', '0');

        const endIcon = document.createElement('span');
        endIcon.className = 'navIcon';
        endIcon.textContent = '▼';
        endIcon.setAttribute('role', 'button');
        endIcon.setAttribute('tabindex', '0');

        infoWrapper.appendChild(homeIcon);
        infoWrapper.appendChild(cmpIcon);
        infoWrapper.appendChild(infoIcon);
        infoWrapper.appendChild(endIcon);
		
/*		
// Old method using localStorage, keeping for possible repurpose!		

        // Mobile-only overlay edit button
        function isMobileDevice() {
            return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
        }

        function editOverlaySettingsMobile() {
            const currentMessage = bcOverlayMessage || 'Boards.ie Cleaner | Loading...';
            const messageInput = prompt(
                    "Enter custom overlay message (or 1/2/3):\n\n1: Thank you for supporting Boards.ie!\n2: Access granted!\n3: Boards.ie Cleaner by corkie!\n\nCurrent: " + currentMessage,
                    currentMessage);
            if (messageInput === null)
                return;

            const presets = {
                "1": "Thank you for supporting Boards.ie!",
                "2": "Access granted!",
                "3": "Boards.ie Cleaner by corkie!"
            };
            let message = messageInput.trim() || 'Boards.ie Cleaner | Created by corkie! | Thanks for supporting the site | Loading...';
            if (presets[message])
                message = presets[message];

            const currentDelay = (typeof bcOverlayDelayMs === 'number' ? bcOverlayDelayMs : 9000).toString();
            const delayInput = prompt(
                    "Overlay delay (ms):\n0, 3000, 7000, 9000, 12000\n\nCurrent: " + currentDelay,
                    currentDelay);
            if (delayInput === null)
                return;

            const valid = new Set(['0', '3000', '7000', '9000', '12000']);
            const delay = valid.has(delayInput.trim()) ? delayInput.trim() : '9000';

            //  localStorage.setItem('overlayMessage', message);
            //  localStorage.setItem('boardsCleanerDelay', delay);
            alert('Saved! Refresh page.');
        }
		


        if (isMobileDevice()) {
            const editBtn = document.createElement('span');
            editBtn.className = 'navIcon';
            editBtn.textContent = '✎';
            editBtn.title = 'Edit overlay message & delay';
            editBtn.tabIndex = 0;
            infoWrapper.appendChild(editBtn);
            editBtn.onclick = editOverlaySettingsMobile;
        }
		
*/		

        document.body.appendChild(infoWrapper);

        // NEW: CMP icon as modal launcher, background shows membership active state


        function updateCmpIconMembershipState() {
            if (!cmpIcon)
                return;
            if (!chrome.storage || !chrome.storage.sync) {
                cmpIcon.style.backgroundColor = '#dc3545';
                cmpIcon.title = 'Members settings (storage unavailable)';
                return;
            }

            chrome.storage.sync.get([STORAGE_KEYS.memberActive], (result) => {
                const active = !!result[STORAGE_KEYS.memberActive];
                cmpIcon.style.backgroundColor = active ? '#28a745' : '#dc3545';
                cmpIcon.style.color = 'white';
                cmpIcon.title = active
                     ? 'Membership active – click for settings'
                     : 'Membership inactive – click to enter code';
            });
        }

        // Temp position!
        // Make CMP icon open the modal instead of toggling directly
        cmpIcon.addEventListener('click', () => {
            // Open the members modal (we’ll add showMembersModal separately)
            if (typeof showMembersModal === 'function') {
                showMembersModal();
            } else {
                console.warn('showMembersModal not yet defined');
            }
        });
		
		function applyLogoSolid(enabled) {
  const html = document.documentElement;
  if (enabled) {
    html.classList.add('bc-logo-solid');
  } else {
    html.classList.remove('bc-logo-solid');
  }
}

function showMembersModal() {
    let existingHost = document.getElementById('bc-members-modal-host');
    let existingModal = existingHost?.shadowRoot?.getElementById('bc-members-modal');
    if (existingModal) {
        existingModal.showModal();
        return;
    }

    const host = document.createElement('div');
    host.id = 'bc-members-modal-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
        :host, * {
            box-sizing: border-box;
        }

        dialog#bc-members-modal {
            border: none;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4);
            max-width: 90vw;
            max-height: 90vh;
            width: 440px;
            padding: 0;
            overflow: hidden;
            background: #f5f5f5;
            color: #222;
            font: 14px/1.4 Arial, sans-serif;
        }

        dialog#bc-members-modal::backdrop {
            background: rgba(0,0,0,0.55);
        }

        .bc-inner {
            padding: 16px;
            max-height: 80vh;
            overflow-y: auto;
            background: #f5f5f5;
            color: #222;
        }

        h3, h4, label, div, span, p, strong {
            color: #222;
        }

        h3 {
            margin: 0;
            line-height: 1.1;
            font-size: 20px;
        }

        h4 {
            margin: 8px 0 4px;
            font-size: 16px;
        }

        hr {
            margin: 12px 0;
            border: 0;
            border-top: 1px solid #ccc;
        }

        label {
            display: block;
            margin-top: 4px;
        }

        input[type="text"],
        input[type="password"],
        input[type="number"],
        textarea,
        select {
            width: 100%;
            background: #fff;
            color: #111;
            border: 1px solid #999;
            border-radius: 4px;
            padding: 6px 8px;
            margin-top: 2px;
            font: inherit;
        }

        input[type="number"] {
            width: 80px;
            margin-left: 4px;
        }

        input[type="checkbox"] {
            accent-color: #296db5;
        }

        button {
            background: #296db5;
            color: #fff;
            border: 1px solid #1f5691;
            border-radius: 4px;
            padding: 8px 12px;
            font: inherit;
            cursor: pointer;
        }

        button:hover {
            background: #1f5d9d;
        }

        button:disabled {
            opacity: 0.6;
            cursor: default;
        }

        .bc-header-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }

        .bc-header-icon {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            flex: 0 0 auto;
        }

        .bc-show-code-wrap {
            margin-top: 4px;
        }

        .bc-show-code-wrap label {
            font-size: 12px;
        }

        .bc-status {
            margin-top: 8px;
            color: orange;
        }

        .bc-detect-wrap {
            margin-top: 8px;
        }

        .bc-members-features {
            margin-top: 12px;
            display: none;
        }

        .bc-cmp-label {
            opacity: 0.6;
        }

        .bc-danger-wrap {
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #ccc;
        }

        .bc-danger-strong,
        .bc-danger-btn {
            color: #c00;
        }

        .bc-danger-btn {
            background: transparent;
            border: none;
            padding: 0;
            margin-top: 4px;
            text-decoration: underline;
            cursor: pointer;
        }

        .bc-actions-wrap {
            margin-top: 12px;
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }
    `;
    shadow.appendChild(style);

    const modal = document.createElement('dialog');
    modal.id = 'bc-members-modal';

    const innerWrap = document.createElement('div');
    innerWrap.className = 'bc-inner';

    const headerRow = document.createElement('div');
    headerRow.className = 'bc-header-row';

    const headerIcon = document.createElement('img');
    headerIcon.src = chrome.runtime.getURL('assets/icon48.png');
    headerIcon.alt = 'BoardsCleaner icon';
    headerIcon.className = 'bc-header-icon';

    const headerTitle = document.createElement('h3');
    headerTitle.textContent = 'BoardsCleaner Settings';

    headerRow.appendChild(headerIcon);
    headerRow.appendChild(headerTitle);
    innerWrap.appendChild(headerRow);

    const generalHeading = document.createElement('h4');
    generalHeading.textContent = 'General settings';
    innerWrap.appendChild(generalHeading);

    const globalShiftLabel = document.createElement('label');
    const globalShiftInput = document.createElement('input');
    globalShiftInput.type = 'checkbox';
    globalShiftInput.id = 'bc-setting-global-colour-shift';
    globalShiftLabel.appendChild(globalShiftInput);
    globalShiftLabel.appendChild(document.createTextNode(' Use BoardsCleaner global colour shift'));
    innerWrap.appendChild(globalShiftLabel);

    const logoSolidLabel = document.createElement('label');
    const logoSolidInput = document.createElement('input');
    logoSolidInput.type = 'checkbox';
    logoSolidInput.id = 'bc-setting-logo-solid';
    logoSolidLabel.appendChild(logoSolidInput);
    logoSolidLabel.appendChild(document.createTextNode(' Put solid background behind header logo'));
    innerWrap.appendChild(logoSolidLabel);

    const headerOverrideLabel = document.createElement('label');
    const headerOverrideInput = document.createElement('input');
    headerOverrideInput.type = 'checkbox';
    headerOverrideInput.id = 'bc-setting-header-override';
    headerOverrideLabel.appendChild(headerOverrideInput);
    headerOverrideLabel.appendChild(document.createTextNode(' Use BoardsCleaner header override'));
    innerWrap.appendChild(headerOverrideLabel);

    const overlayDelayLabel = document.createElement('label');
    overlayDelayLabel.appendChild(document.createTextNode('Overlay delay (seconds):'));
    const overlayDelayInputEl = document.createElement('input');
    overlayDelayInputEl.id = 'bc-setting-overlay-delay';
    overlayDelayInputEl.type = 'number';
    overlayDelayInputEl.min = '0';
    overlayDelayInputEl.max = '10';
    overlayDelayLabel.appendChild(overlayDelayInputEl);
    innerWrap.appendChild(overlayDelayLabel);

    const overlayMessageLabel = document.createElement('label');
    overlayMessageLabel.appendChild(document.createTextNode('Overlay message:'));
    const overlayMessageInputEl = document.createElement('input');
    overlayMessageInputEl.id = 'bc-setting-overlay-message';
    overlayMessageInputEl.type = 'text';
    overlayMessageLabel.appendChild(overlayMessageInputEl);
    innerWrap.appendChild(overlayMessageLabel);

    const hr = document.createElement('hr');
    innerWrap.appendChild(hr);

    const membershipHeading = document.createElement('h4');
    membershipHeading.textContent = 'Membership Activation';
    innerWrap.appendChild(membershipHeading);

    const activationLabel = document.createElement('label');
    activationLabel.appendChild(document.createTextNode('Activation code:'));
    const activationInput = document.createElement('input');
    activationInput.id = 'bc-member-code-input';
    activationInput.type = 'password';
    activationInput.autocomplete = 'new-password';
    activationInput.setAttribute('inputmode', 'text');
    activationLabel.appendChild(activationInput);
    innerWrap.appendChild(activationLabel);

    const showCodeWrap = document.createElement('div');
    showCodeWrap.className = 'bc-show-code-wrap';
    const showCodeLabel = document.createElement('label');
    const showCodeInput = document.createElement('input');
    showCodeInput.type = 'checkbox';
    showCodeInput.id = 'bc-member-show-code';
    showCodeLabel.appendChild(showCodeInput);
    showCodeLabel.appendChild(document.createTextNode(' Show code'));
    showCodeWrap.appendChild(showCodeLabel);
    innerWrap.appendChild(showCodeWrap);

    const statusDiv = document.createElement('div');
    statusDiv.id = 'bc-member-status';
    statusDiv.className = 'bc-status';
    statusDiv.textContent = 'Enter code and click Activate, or detect from profile.';
    innerWrap.appendChild(statusDiv);

    const detectWrap = document.createElement('div');
    detectWrap.className = 'bc-detect-wrap';
    const detectButton = document.createElement('button');
    detectButton.id = 'bc-member-detect-profile-btn';
    detectButton.type = 'button';
    detectButton.textContent = 'Detect membership from my Boards profile';
    detectWrap.appendChild(detectButton);
    innerWrap.appendChild(detectWrap);

    const membersFeaturesWrap = document.createElement('div');
    membersFeaturesWrap.id = 'bc-members-features';
    membersFeaturesWrap.className = 'bc-members-features';

    const membersHeading = document.createElement('h4');
    membersHeading.textContent = 'Members-only features';
    membersFeaturesWrap.appendChild(membersHeading);

    const cmpLabel = document.createElement('label');
    cmpLabel.className = 'bc-cmp-label';
    const cmpInput = document.createElement('input');
    cmpInput.type = 'checkbox';
    cmpInput.id = 'bc-setting-cmp-block';
    cmpInput.disabled = true;
    cmpLabel.appendChild(cmpInput);
    cmpLabel.appendChild(document.createTextNode(' CMP block (not available on boards.ie – dialog must be answered)'));
    membersFeaturesWrap.appendChild(cmpLabel);

    const cookieLabel = document.createElement('label');
    const cookieInput = document.createElement('input');
    cookieInput.type = 'checkbox';
    cookieInput.id = 'bc-setting-cookie-disagree';
    cookieLabel.appendChild(cookieInput);
    cookieLabel.appendChild(document.createTextNode(' Privacy dialog – auto-click “DISAGREE” when shown'));
    membersFeaturesWrap.appendChild(cookieLabel);

    const adsLabel = document.createElement('label');
    const adsInput = document.createElement('input');
    adsInput.type = 'checkbox';
    adsInput.id = 'bc-setting-remove-ads';
    adsLabel.appendChild(adsInput);
    adsLabel.appendChild(document.createTextNode(' Remove ads – delete ad containers from the page'));
    membersFeaturesWrap.appendChild(adsLabel);

    const alertsLabel = document.createElement('label');
    const alertsInput = document.createElement('input');
    alertsInput.type = 'checkbox';
    alertsInput.id = 'bc-setting-remove-alerts';
    alertsLabel.appendChild(alertsInput);
    alertsLabel.appendChild(document.createTextNode(' Remove warning / subscription banners'));
    membersFeaturesWrap.appendChild(alertsLabel);
	
	const twitterWidgetsLabel = document.createElement('label');
const twitterWidgetsInput = document.createElement('input');
twitterWidgetsInput.type = 'checkbox';
twitterWidgetsInput.id = 'bc-setting-block-twitter-widgets';
twitterWidgetsLabel.appendChild(twitterWidgetsInput);
twitterWidgetsLabel.appendChild(
    document.createTextNode(' Block Twitter/X widgets on boards.ie for faster loading')
);
membersFeaturesWrap.appendChild(twitterWidgetsLabel);

const inmobiLabel = document.createElement('label');
const inmobiInput = document.createElement('input');
inmobiInput.type = 'checkbox';
inmobiInput.id = 'bc-setting-block-inmobi-cmp';
inmobiLabel.appendChild(inmobiInput);
inmobiLabel.appendChild(
    document.createTextNode(' Block InMobi CMP on boards.ie (experimental)')
);
membersFeaturesWrap.appendChild(inmobiLabel);

    const dangerWrap = document.createElement('div');
    dangerWrap.className = 'bc-danger-wrap';

    const dangerStrong = document.createElement('strong');
    dangerStrong.className = 'bc-danger-strong';
    dangerStrong.textContent = 'Danger zone';
    dangerWrap.appendChild(dangerStrong);
    dangerWrap.appendChild(document.createElement('br'));

    const deactivateButton = document.createElement('button');
    deactivateButton.id = 'bc-members-deactivate-btn';
    deactivateButton.type = 'button';
    deactivateButton.className = 'bc-danger-btn';
    deactivateButton.textContent = 'Deactivate membership and reset features';
    dangerWrap.appendChild(deactivateButton);

    membersFeaturesWrap.appendChild(dangerWrap);
    innerWrap.appendChild(membersFeaturesWrap);

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'bc-actions-wrap';

    const saveButton = document.createElement('button');
    saveButton.id = 'bc-members-save-btn';
    saveButton.type = 'button';
    saveButton.textContent = 'Save';

    const activateButton = document.createElement('button');
    activateButton.id = 'bc-member-activate-btn';
    activateButton.type = 'button';
    activateButton.textContent = 'Activate';

    const closeButton = document.createElement('button');
    closeButton.id = 'bc-member-close-btn';
    closeButton.type = 'button';
    closeButton.textContent = 'Close';

    actionsWrap.appendChild(saveButton);
    actionsWrap.appendChild(activateButton);
    actionsWrap.appendChild(closeButton);
    innerWrap.appendChild(actionsWrap);

    modal.appendChild(innerWrap);
    shadow.appendChild(modal);
    modal.showModal();
	
	
const blockTwitterWidgetsCheckbox = modal.querySelector('#bc-setting-block-twitter-widgets');
const blockInmobiCmpCheckbox = modal.querySelector('#bc-setting-block-inmobi-cmp');
const globalColourShiftCheckbox = modal.querySelector('#bc-setting-global-colour-shift');
const logoSolidCheckbox = modal.querySelector('#bc-setting-logo-solid');
const headerOverrideCheckbox = modal.querySelector('#bc-setting-header-override');
const codeInput = modal.querySelector('#bc-member-code-input');
const statusEl = modal.querySelector('#bc-member-status');
const activateBtn = modal.querySelector('#bc-member-activate-btn');
const closeBtn = modal.querySelector('#bc-member-close-btn');
const showCodeCheckbox = modal.querySelector('#bc-member-show-code');
const detectBtn = modal.querySelector('#bc-member-detect-profile-btn');
const overlayDelayInput = modal.querySelector('#bc-setting-overlay-delay');
const overlayMessageInput = modal.querySelector('#bc-setting-overlay-message');
const membersFeatures = modal.querySelector('#bc-members-features');
const cmpBlockCheckbox = modal.querySelector('#bc-setting-cmp-block');
const removeAdsCheckbox = modal.querySelector('#bc-setting-remove-ads');
const removeAlertsCheckbox = modal.querySelector('#bc-setting-remove-alerts');
const cookieDisagreeCheckbox = modal.querySelector('#bc-setting-cookie-disagree');
const deactivateBtn = modal.querySelector('#bc-members-deactivate-btn');
const saveBtn = modal.querySelector('#bc-members-save-btn');



if (saveBtn) {
  saveBtn.addEventListener('click', async (event) => {
    event.preventDefault();

    try {
      const state = await loadMemberState();
      const safeState = state || {};
      const currentSettings = normaliseBcSettings(safeState[STORAGE_KEYS.settings]);

      const delayRaw = overlayDelayInput ? overlayDelayInput.value.trim() : '';
      let delaySeconds = Number(delayRaw);
      if (!Number.isFinite(delaySeconds) || delaySeconds < 0) {
        delaySeconds = 3;
      }

      const messageText =
        overlayMessageInput && overlayMessageInput.value
          ? overlayMessageInput.value.trim()
          : (navigator.userAgent.toLowerCase().match(/android|iphone|ipad|ipod|mobile/)
              ? 'Boards.ie Cleaner | Loading...'
              : 'Boards.ie Cleaner | Created by corkie! | Thanks for supporting the site | Loading...');

      const newSettings = {
        ...currentSettings,
        globalColourShift: globalColourShiftCheckbox ? globalColourShiftCheckbox.checked : currentSettings.globalColourShift,
        logoSolid: logoSolidCheckbox ? logoSolidCheckbox.checked : currentSettings.logoSolid,
        headerOverride: headerOverrideCheckbox ? headerOverrideCheckbox.checked : currentSettings.headerOverride,
        overlayDelay: delaySeconds,
        overlayMessage: messageText,
        cmpBlock: cmpBlockCheckbox ? cmpBlockCheckbox.checked : currentSettings.cmpBlock,
        removeAds: removeAdsCheckbox ? removeAdsCheckbox.checked : currentSettings.removeAds,
        removeAlerts: removeAlertsCheckbox ? removeAlertsCheckbox.checked : currentSettings.removeAlerts,
        cookieDisagree: cookieDisagreeCheckbox ? cookieDisagreeCheckbox.checked : currentSettings.cookieDisagree,
        blockTwitterWidgets: blockTwitterWidgetsCheckbox ? blockTwitterWidgetsCheckbox.checked : currentSettings.blockTwitterWidgets,
        blockInmobiCmp: blockInmobiCmpCheckbox ? blockInmobiCmpCheckbox.checked : currentSettings.blockInmobiCmp,
      };

      await saveMemberState(
        safeState[STORAGE_KEYS.memberCode] || 'SAVED',
        !!safeState[STORAGE_KEYS.memberActive],
        newSettings
      );
	  
	  await logMemberState('after modal save');

      applyGlobalColourShift(
        newSettings.globalColourShift !== false,
        newSettings.headerOverride !== false
      );
      applyLogoSolid(!!newSettings.logoSolid);

      if (!isBoardsThemeActive()) {
        injectExtensionCSS();
      }
	  
	    // Give your own theme engine a tick to add its classes,
  // then remove the Boards custom.css if a BC theme is active.
  // setTimeout(() => {
  //  disableBoardsThemeCssIfActive();
  // }, 0);

      bcOverlayDelayMs = delaySeconds * 1000;
      bcOverlayMessage = messageText;

      alert('BoardsCleaner settings saved.');
    } catch (err) {
      console.error('Error saving BoardsCleaner settings from modal', err);
      alert('Error saving BoardsCleaner settings. See console for details.');
    }
  });
} 


if (deactivateBtn) {
  deactivateBtn.addEventListener('click', async (event) => {
    event.preventDefault();

    if (!confirm('Deactivate BoardsCleaner membership and reset all features to defaults?')) {
      return;
    }

    try {
      const state = await loadMemberState();
      const safeState = state || {};

      const defaultSettings = {
        globalColourShift: true,
        overlayDelay: 1,
        overlayMessage: (navigator.userAgent.toLowerCase().match(/android|iphone|ipad|ipod|mobile/)
          ? 'Boards.ie Cleaner | Loading...'
          : 'Boards.ie Cleaner | Created by corkie! | See the cookie 🍪 icon to set! Refresh seen too long'),
        cmpBlock: false,
        removeAds: false,
        removeAlerts: false,
        cookieDisagree: false,
        logoSolid: false,
        headerOverride: true,
        blockTwitterWidgets: false,
        blockInmobiCmp: false
      };

      await saveMemberState(
        safeState[STORAGE_KEYS.memberCode] || '',
        false,
        defaultSettings
      );

      applyGlobalColourShift(
        defaultSettings.globalColourShift !== false,
        defaultSettings.headerOverride !== false
      );
      applyLogoSolid(!!defaultSettings.logoSolid);

      if (!isBoardsThemeActive()) {
        injectExtensionCSS();
      }

      if (statusEl) {
        statusEl.textContent = 'Membership deactivated. Defaults restored.';
        statusEl.style.color = 'orange';
      }

      if (membersFeatures) {
        membersFeatures.style.display = 'none';
      }

      if (globalColourShiftCheckbox) {
        globalColourShiftCheckbox.checked = defaultSettings.globalColourShift !== false;
      }
      if (logoSolidCheckbox) {
        logoSolidCheckbox.checked = !!defaultSettings.logoSolid;
      }
      if (headerOverrideCheckbox) {
        headerOverrideCheckbox.checked = defaultSettings.headerOverride !== false;
      }
      if (overlayDelayInput) {
        overlayDelayInput.value = defaultSettings.overlayDelay;
      }
      if (overlayMessageInput) {
        overlayMessageInput.value = defaultSettings.overlayMessage;
      }

      if (cmpBlockCheckbox) cmpBlockCheckbox.checked = false;
      if (removeAdsCheckbox) removeAdsCheckbox.checked = false;
      if (removeAlertsCheckbox) removeAlertsCheckbox.checked = false;
      if (cookieDisagreeCheckbox) cookieDisagreeCheckbox.checked = false;
      if (blockTwitterWidgetsCheckbox) blockTwitterWidgetsCheckbox.checked = false;
      if (blockInmobiCmpCheckbox) blockInmobiCmpCheckbox.checked = false;

      updateCmpIconMembershipState();
      alert('BoardsCleaner membership deactivated and features reset to defaults.');
    } catch (err) {
      console.error('Error deactivating BoardsCleaner membership', err);
      alert('Error deactivating membership. See console for details.');
    }
  });
}




(async () => {
  const state = await loadMemberState();
  const safeState = state || {};
  const isActive = !!safeState[STORAGE_KEYS.memberActive];
  const settings = normaliseBcSettings(safeState[STORAGE_KEYS.settings]);

  if (globalColourShiftCheckbox) {
    globalColourShiftCheckbox.checked = settings.globalColourShift !== false;
  }
  if (logoSolidCheckbox) {
    logoSolidCheckbox.checked = !!settings.logoSolid;
  }
  if (headerOverrideCheckbox) {
    headerOverrideCheckbox.checked = settings.headerOverride !== false;
  }

  if (overlayDelayInput) {
    overlayDelayInput.value =
      typeof settings.overlayDelay === 'number' && !Number.isNaN(settings.overlayDelay)
        ? settings.overlayDelay
        : 3;
  }

  if (overlayMessageInput) {
    overlayMessageInput.value =
      typeof settings.overlayMessage === 'string' && settings.overlayMessage.trim()
        ? settings.overlayMessage
        : (navigator.userAgent.toLowerCase().match(/android|iphone|ipad|ipod|mobile/)
            ? 'Boards.ie Cleaner | Loading...'
            : 'Boards.ie Cleaner | Created by corkie! | Thanks for supporting the site | Loading...');
  }

  if (cmpBlockCheckbox) cmpBlockCheckbox.checked = !!settings.cmpBlock;
  if (removeAdsCheckbox) removeAdsCheckbox.checked = !!settings.removeAds;
  if (removeAlertsCheckbox) removeAlertsCheckbox.checked = !!settings.removeAlerts;
  if (cookieDisagreeCheckbox) cookieDisagreeCheckbox.checked = !!settings.cookieDisagree;
  if (blockTwitterWidgetsCheckbox) blockTwitterWidgetsCheckbox.checked = !!settings.blockTwitterWidgets;
  if (blockInmobiCmpCheckbox) blockInmobiCmpCheckbox.checked = !!settings.blockInmobiCmp;

  if (isActive) {
    statusEl.textContent = 'Membership already active.';
    statusEl.style.color = 'green';
  } else {
    statusEl.textContent = 'Enter code and click Activate, or detect from profile.';
    statusEl.style.color = 'orange';
  }

  if (membersFeatures) {
    membersFeatures.style.display = isActive ? 'block' : 'none';
  }
})();

showCodeCheckbox.addEventListener('change', () => {
  codeInput.type = showCodeCheckbox.checked ? 'text' : 'password';
});

detectBtn.addEventListener('click', () => {
  statusEl.textContent = 'Opening your Boards profile to detect membership…';
  statusEl.style.color = 'orange';
  window.location.href = 'https://www.boards.ie/profile/discussions/';
});

activateBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();
  if (!code) {
    statusEl.textContent = 'Please enter a code.';
    statusEl.style.color = 'red';
    return;
  }

  const ok = await validateMember(code);
  if (ok) {
    const state = await loadMemberState();
    const safeState = state || {};
    const currentSettings = normaliseBcSettings(safeState[STORAGE_KEYS.settings]);

    await saveMemberState(code, true, currentSettings);
	await logMemberState('after activate');

    statusEl.textContent = 'Membership activated.';
    statusEl.style.color = 'green';

    if (membersFeatures) {
      membersFeatures.style.display = 'block';
    }``

    updateCmpIconMembershipState();
  } else {
    statusEl.textContent = 'Invalid code.';
    statusEl.style.color = 'red';
  }
});

closeBtn.addEventListener('click', () => {
  modal.close();
});

modal.addEventListener('close', () => {
  host.remove();
});
}

function getCurrentForumSlug() {
  const path = window.location.pathname.toLowerCase();

  const patterns = [
    /^\/categories\/([^/?#]+)/,
    /^\/discussion\/[^/]+\/([^/?#]+)/,
    /^\/forum\/([^/?#]+)/
  ];

  for (const re of patterns) {
    const match = path.match(re);
    if (match && match[1]) {
      return decodeURIComponent(match[1]).trim().toLowerCase();
    }
  }

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    try {
      const u = new URL(canonical.href);
      const m = u.pathname.toLowerCase().match(/^\/categories\/([^/?#]+)/);
      if (m && m[1]) return decodeURIComponent(m[1]).trim().toLowerCase();
    } catch (_) {}
  }

  return '';
}

function openOptionsForCurrentForum() {
  const slug = getCurrentForumSlug();
  const baseUrl = chrome.runtime.getURL('options.html');
  const url = slug
    ? `${baseUrl}?forum=${encodeURIComponent(slug)}`
    : baseUrl;

  window.open(url, '_blank', 'noopener');
}



async function showStyledForumsModal() {
//  alert('BC styled forums modal debug v1');
//  console.log('BC showStyledForumsModal debug v1');
  let existingHost = document.getElementById('bc-styled-forums-host');
  let existingModal = existingHost?.shadowRoot?.getElementById('bc-styled-forums-modal');
  if (existingModal) {
    existingModal.showModal();
    return;
  }

  const host = document.createElement('div');
  host.id = 'bc-styled-forums-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host {
      box-sizing: border-box;
    }
    dialog#bc-styled-forums-modal {
      border: none;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      max-width: 90vw;
      max-height: 90vh;
      width: 520px;
      padding: 0;
      overflow: hidden;
      background: #f5f5f5;
      color: #222;
      font: 14px/1.4 Arial, sans-serif;
    }
    dialog#bc-styled-forums-modal::backdrop {
      background: rgba(0,0,0,0.55);
    }
    .bc-inner {
      padding: 16px;
      max-height: 80vh;
      overflow-y: auto;
      background: #f5f5f5;
      color: #222;
    }
    .bc-header-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .bc-header-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      flex: 0 0 auto;
    }
    h3 {
      margin: 0;
      line-height: 1.1;
      font-size: 20px;
    }
    p {
      margin: 4px 0 10px;
    }
    .bc-search-row {
      margin-bottom: 10px;
    }
    .bc-search-row input[type="text"] {
      width: 100%;
      box-sizing: border-box;
      background: #fff;
      color: #111;
      border: 1px solid #999;
      border-radius: 4px;
      padding: 6px 8px;
      font: inherit;
    }
    .bc-count {
      font-size: 12px;
      opacity: 0.75;
      margin-bottom: 6px;
    }
    .bc-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .bc-row {
      padding: 8px 10px;
      border-radius: 6px;
      background: #fff;
      border: 1px solid #ccc;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .bc-row-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 2px;
    }
    .bc-row-title {
      font-weight: bold;
      font-size: 14px;
      word-break: break-word;
    }
    .bc-row-theme {
      font-size: 12px;
      opacity: 0.85;
    }
    .bc-row-flags {
      font-size: 11px;
      opacity: 0.8;
    }
    .bc-row-actions {
      margin-top: 4px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .bc-row-actions a,
    .bc-row-actions button {
      background: #296db5;
      color: #fff;
      border: 1px solid #1f5691;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
      text-decoration: none;
    }
    .bc-row-actions a:hover,
    .bc-row-actions button:hover {
      background: #1f5d9d;
    }
    .bc-empty {
      margin-top: 8px;
      font-size: 13px;
      opacity: 0.8;
    }
    .bc-actions-wrap {
      margin-top: 12px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .bc-actions-wrap button {
      background: #296db5;
      color: #fff;
      border: 1px solid #1f5691;
      border-radius: 4px;
      padding: 8px 12px;
      font: inherit;
      cursor: pointer;
    }
    .bc-actions-wrap button:hover {
      background: #1f5d9d;
    }
  `;
  shadow.appendChild(style);

  const modal = document.createElement('dialog');
  modal.id = 'bc-styled-forums-modal';

  const inner = document.createElement('div');
  inner.className = 'bc-inner';

  // Header
  const headerRow = document.createElement('div');
  headerRow.className = 'bc-header-row';

  const headerIcon = document.createElement('img');
  headerIcon.src = chrome.runtime.getURL('assets/icon48.png');
  headerIcon.alt = 'BoardsCleaner icon';
  headerIcon.className = 'bc-header-icon';

  const headerTitle = document.createElement('h3');
  headerTitle.textContent = 'Styled forums';

  headerRow.appendChild(headerIcon);
  headerRow.appendChild(headerTitle);
  inner.appendChild(headerRow);

const noteBox = document.createElement('div');
noteBox.className = 'bc-note-box';
noteBox.textContent =
  'This list is read-only here. To edit, clear, or choose which styled forums BoardsCleaner controls, use the extension settings page.';

const settingsLink = document.createElement('button');
settingsLink.type = 'button';
settingsLink.textContent = 'Open BoardsCleaner settings';
settingsLink.style.marginTop = '6px';

settingsLink.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'bc-open-options' });
});

noteBox.appendChild(document.createElement('br'));
noteBox.appendChild(settingsLink);

inner.appendChild(noteBox);

  // Search
  const searchRow = document.createElement('div');
  searchRow.className = 'bc-search-row';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Filter by forum key or theme id...';
  searchRow.appendChild(searchInput);
  inner.appendChild(searchRow);

  const countEl = document.createElement('div');
  countEl.className = 'bc-count';
  inner.appendChild(countEl);

  const listEl = document.createElement('div');
  listEl.className = 'bc-list';
  inner.appendChild(listEl);

  const emptyEl = document.createElement('div');
  emptyEl.className = 'bc-empty';
  emptyEl.textContent =
    'No styled forums found yet. Use the theme engine to assign themes.';
  inner.appendChild(emptyEl);

  // Footer actions
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'bc-actions-wrap';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  actionsWrap.appendChild(closeBtn);
  inner.appendChild(actionsWrap);

  modal.appendChild(inner);
  shadow.appendChild(modal);
  modal.showModal();
  



  // Data + render
const allItems = await getStyledForumsList();
// console.log('BC styled forums list:', allItems);
// console.log('BC styled forums count:', Array.isArray(allItems) ? allItems.length : 'not-array');
  function render(filterText) {
    const query = (filterText || '').trim().toLowerCase();
    listEl.innerHTML = '';

    const visible = allItems.filter(item => {
      if (!query) return true;
      const hay = `${item.forumKey} ${item.themeId || ''}`.toLowerCase();
      return hay.includes(query);
    });

    countEl.textContent = `${visible.length} styled forum${visible.length === 1 ? '' : 's'}`;
    emptyEl.style.display = visible.length === 0 ? 'block' : 'none';

    visible.forEach(item => {
      const row = document.createElement('div');
      row.className = 'bc-row';

      const header = document.createElement('div');
      header.className = 'bc-row-header';

      const title = document.createElement('div');
      title.className = 'bc-row-title';
      title.textContent = item.forumKey;

      const theme = document.createElement('div');
      theme.className = 'bc-row-theme';
      theme.textContent = item.themeId
        ? `Theme: ${item.themeId}`
        : 'Theme: (custom CSS only)';

      header.appendChild(title);
      header.appendChild(theme);
      row.appendChild(header);

      const flags = document.createElement('div');
      flags.className = 'bc-row-flags';
      flags.textContent = `Custom CSS: ${item.hasCustomCss ? 'Yes' : 'No'}`;
      row.appendChild(flags);

const actions = document.createElement('div');
actions.className = 'bc-row-actions';

const openLink = document.createElement('a');
openLink.href = `https://www.boards.ie/categories/${encodeURIComponent(item.forumKey)}`;
openLink.target = '_top';
openLink.textContent = 'Open forum';
actions.appendChild(openLink);

const editBtn = document.createElement('button');
editBtn.type = 'button';
editBtn.textContent = 'Edit theme';
editBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({
    action: 'bc-open-options',
    forumKey: item.forumKey
  });
});
actions.appendChild(editBtn);

row.appendChild(actions);
listEl.appendChild(row);
    });
  }


  render('');

  searchInput.addEventListener('input', () => {
    render(searchInput.value);
  });

  closeBtn.addEventListener('click', () => {
    modal.close();
  });

  modal.addEventListener('close', () => {
    host.remove();
  });
}




        cmpIcon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                cmpIcon.click();
            }
        });

        // Initial state colour
        updateCmpIconMembershipState();

        const dialog = document.createElement('dialog');
        dialog.id = 'shortcutDialog';

        const content = document.createElement('div');

        const headerRow = document.createElement('div');
        headerRow.style.display = 'flex';
        headerRow.style.alignItems = 'center';
        headerRow.style.gap = '10px';
        headerRow.style.marginBottom = '10px';

        const icon = document.createElement('img');
        icon.src = chrome.runtime.getURL('assets/icon48.png');
        icon.alt = 'BoardsCleaner icon';
        icon.style.width = '30px';
        icon.style.height = '30px';
        icon.style.borderRadius = '6px';
        icon.style.flex = '0 0 auto';

        const title = document.createElement('h2');
        title.textContent = 'Boards.ie Cleaner';
        title.style.margin = '0';
        title.style.lineHeight = '1.1';

        headerRow.appendChild(icon);
        headerRow.appendChild(title);
        content.appendChild(headerRow);

        const subTitle = document.createElement('h3');
        subTitle.textContent = 'Shortcut Keys / Links';
        subTitle.style.marginTop = '0';
        content.appendChild(subTitle);

        const ul = document.createElement('ul');

        function addShortcutItem(labelText, tailText = '') {
            const li = document.createElement('li');
            const bold = document.createElement('b');
            bold.textContent = labelText;
            li.appendChild(bold);
            if (tailText) {
                li.appendChild(document.createTextNode(` ${tailText}`));
            }
            ul.appendChild(li);
        }
		
		

function addShortcutLinkItem(labelText, linkText, href) {
    const li = document.createElement('li');
    li.className = 'bc-shortcut-item';

    const bold = document.createElement('b');
    bold.textContent = labelText;
    li.appendChild(bold);
    li.appendChild(document.createTextNode(' '));

    const a = document.createElement('a');
    a.href = href;
    a.target = '_top';
    a.rel = 'noopener noreferrer';
    a.textContent = linkText;
    a.className = 'bc-shortcut-link';
    a.title = `${labelText} ${linkText}`;

    li.appendChild(a);
    ul.appendChild(li);
}

        addShortcutItem('Info this popup', 'Alt + i');
        addShortcutItem('Toggle Profiles:', 'Alt + p');
        addShortcutItem('Toggle Quotes:', 'Alt + 2');
        addShortcutLinkItem('Bookmarks:', 'Alt + 8', 'https://www.boards.ie/discussions/bookmarked');
        addShortcutLinkItem('Mike Comments:', 'Alt + m', 'https://www.boards.ie/profile/comments/Boards.ie%3A%20Mike');
        addShortcutLinkItem('Odhran Comments:', 'Alt + o', 'https://www.boards.ie/profile/comments/Boards.ie%3A%20Odhran');
        addShortcutLinkItem('Your Own comments:', 'Alt + c', 'https://www.boards.ie/profile/comments');
        addShortcutLinkItem('Subbed Members:', 'Alt + s', 'https://www.boards.ie/search?domain=members&sort=dateInserted&scope=site&roleIDs[0]=95&source=community');
        addShortcutLinkItem('Subbed Forum:', 'Alt + #', 'https://www.boards.ie/group/1878-subscribers-forum');
        addShortcutLinkItem('Notifications:', 'Alt + n', 'https://www.boards.ie/profile/notifications');
        addShortcutLinkItem('Drafts:', 'Alt + x', 'https://www.boards.ie/drafts');

        content.appendChild(ul);
		
		
	
const styledForumsBtn = document.createElement('button');
styledForumsBtn.type = 'button';
styledForumsBtn.className = 'bc-shortcut-action-btn';
styledForumsBtn.textContent = 'View styled forums list';
styledForumsBtn.addEventListener('click', () => {
  if (typeof showStyledForumsModal === 'function') {
    showStyledForumsModal();
  } else {
    showPopup('Styled forums modal not available on this page.');
  }
});
content.appendChild(styledForumsBtn);

// New: “Edit theme for this forum” button
const editThemeBtn = document.createElement('button');
editThemeBtn.type = 'button';
editThemeBtn.className = 'bc-shortcut-action-btn';

const currentForumSlug = detectForumKey?.() || getCurrentForumSlug?.() || '';
editThemeBtn.textContent = currentForumSlug
  ? `Edit theme for this forum (${currentForumSlug})`
  : 'Open theme options';

editThemeBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({
    action: 'bc-open-options',
    forumKey: currentForumSlug
  });
});

content.appendChild(editThemeBtn);


// Needed line below to create the content above!
     dialog.appendChild(content);





        window.addEventListener('keydown', function (e) {
            if (e.altKey && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                dialog.showModal();
            }
        });

        homeIcon.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        endIcon.addEventListener('click', () => {
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo({
                top: maxScroll,
                behavior: 'smooth'
            });
        });

        [homeIcon, endIcon].forEach(el => {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    el.click();
                }
            });
        });

        const closeBtn = document.createElement('button');
        closeBtn.className = 'closeBtn';
        closeBtn.textContent = 'Close';
        dialog.appendChild(closeBtn);

        document.body.appendChild(dialog);

        infoIcon.addEventListener('click', () => {
            dialog.showModal();
        });

        closeBtn.addEventListener('click', () => {
            dialog.close();
        });

        infoIcon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dialog.showModal();
            }
        });
    }

    insertToggleButton();

    // Keyboard shortcut to toggle profiles on Alt+P
    window.addEventListener('keydown', function (e) {
        if (e.altKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();

            const path = window.location.pathname;

            const match = path.match(/^\/profile\/(discussions|comments)\/([^\/]+)(\/.*)?$/);
            if (match) {
                const section = match[1];
                const username = match[2];

                const targetSection = (section === 'discussions') ? 'comments' : 'discussions';

                const newPath = `/profile/${targetSection}/${username}`;

                window.location.href = newPath;
            } else {
                if (typeof toggleProfileLinks === 'function') {
                    toggleProfileLinks();
                }
            }
        }
    });

    (function () {
        'use strict';

        let featureEnabled = true;
        const processedAttr = 'data-quote-processed';

        function processQuotes(enabled) {
            document.querySelectorAll('article.css-1hlhx5t-quoteEmbed-body').forEach(article => {
                const userAnchor = article.querySelector('a[data-link-type="legacy"]');
                if (!userAnchor)
                    return;
                const username = userAnchor.textContent.trim();

                if (enabled) {
                    if (article.getAttribute(processedAttr) !== 'true') {
                        article.style.display = 'none';
                        const toggleLink = document.createElement('a');
                        toggleLink.href = '#';
                        toggleLink.textContent = `Display quote of ${username}`;
                        toggleLink.style.cursor = 'pointer';
                        toggleLink.style.color = '#007bff';
                        toggleLink.style.textDecoration = 'underline';
                        toggleLink.style.display = 'block';
                        toggleLink.style.margin = '10px 0';

                        toggleLink.addEventListener('click', e => {
                            e.preventDefault();
                            if (article.style.display === 'none') {
                                article.style.display = '';
                                toggleLink.textContent = `Hide quote of ${username}`;
                            } else {
                                article.style.display = 'none';
                                toggleLink.textContent = `Display quote of ${username}`;
                            }
                        });

                        article.parentNode.insertBefore(toggleLink, article);
                        article.setAttribute(processedAttr, 'true');
                    }
                } else {
                    article.style.display = '';
                    const prev = article.previousElementSibling;
                    if (prev && prev.tagName === 'A' && prev.textContent.startsWith('Display quote of')) {
                        prev.remove();
                    }
                    article.removeAttribute(processedAttr);
                }
            });
        }

        let debounceTimeout;
        const observer = new MutationObserver(() => {
            if (debounceTimeout)
                clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                processQuotes(featureEnabled);
            }, 300);
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        function initialize() {
            processQuotes(featureEnabled);

            let retryCount = 0;
            const maxRetries = 5;
            const retryInterval = setInterval(() => {
                if (retryCount++ >= maxRetries)
                    clearInterval(retryInterval);
                processQuotes(featureEnabled);
            }, 2000);
        }
        if (document.readyState === 'complete') {
            initialize();
        } else {
            window.addEventListener('load', () => setTimeout(initialize, 1000));
        }

        if (!(/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent))) {
            window.addEventListener('keydown', e => {
                if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.key === '2') {
                    featureEnabled = !featureEnabled;
                    processQuotes(featureEnabled);
                    alert(`Quote toggle feature is now ${featureEnabled ? 'ENABLED' : 'DISABLED'}.`);
                }
            });
        }
    })();

    // Other keyboard shortcuts to open Boards.ie links (unchanged)
    window.addEventListener('keydown', function (event) {
        if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey)
            return;
        switch (event.key.toLowerCase()) {
        case '8':
            window.open('https://www.boards.ie/discussions/bookmarked', '_top');
            event.preventDefault();
            break;
        case 'm':
            window.open('https://www.boards.ie/profile/comments/Boards.ie%3A%20Mike', '_top');
            event.preventDefault();
            break;
        case 'o':
            window.open('https://www.boards.ie/profile/comments/Boards.ie%3A%20Odhran', '_top');
            event.preventDefault();
            break;
        case 's':
            window.open('https://www.boards.ie/search?domain=members&sort=dateInserted&scope=site&roleIDs[0]=95&source=community', '_top');
            event.preventDefault();
            break;
        case 'c':
            window.open('https://www.boards.ie/profile/comments', '_top');
            event.preventDefault();
            break;
        case '#':
            window.open('https://www.boards.ie/group/1878-subscribers-forum', '_top');
            event.preventDefault();
            break;
        case 'n':
            window.open('https://www.boards.ie/profile/notifications', '_top');
            event.preventDefault();
            break;
        case 'x':
            window.open('https://www.boards.ie/drafts', '_top');
            event.preventDefault();
            break;
        }
    });
	
async function resetOverlaySettingsToDefaults() {
  const state = await loadMemberState();
  const safeState = state || {};
  const currentSettings = safeState[STORAGE_KEYS.settings] || {};

  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  const defaultMessage = isMobile
    ? 'Boards.ie Cleaner | Loading... Look for the 🍪 icon'
    : 'Boards.ie Cleaner | Created by corkie! | Look for the 🍪 icon | Loading...';

  const newSettings = {
    ...currentSettings,
    overlayDelay: 1,
    overlayMessage: defaultMessage
  };

  await saveMemberState(
    safeState[STORAGE_KEYS.memberCode] || '',
    !!safeState[STORAGE_KEYS.memberActive],
    newSettings
  );

  bcOverlayDelayMs = 1000;
  bcOverlayMessage = defaultMessage;
  applyOverlayConfig(defaultMessage, 1000);

  document.body.classList.remove('overlay-hide');
  const loader = document.getElementById('custom-loader');
  if (loader) loader.remove();

  requestAnimationFrame(() => {
    if (typeof checkIfStable === 'function') {
      checkIfStable();
    }
  });
}
	

window.addEventListener('keydown', async function (e) {
  if (!e.altKey || e.key.toLowerCase() !== 'q') {
    return;
  }

  e.preventDefault();

  try {
    await resetOverlaySettingsToDefaults();
    alert('Overlay message and delay reset to defaults. Refresh if needed.');
  } catch (err) {
    console.error('BoardsCleaner: failed to reset overlay settings via Alt+Q', err);
    alert('Could not reset overlay settings. See console for details.');
  }
});

    // Select all divs with original class
    const threadBitDivs = document.querySelectorAll('div.spritethreadbit.spritethreadbit-latestpost');

    threadBitDivs.forEach(div => {
        div.classList.replace('spritethreadbit', 'spritethreadrow');
        div.classList.replace('spritethreadbit-latestpost', 'latest-button');
        div.style.cursor = 'pointer';
    });



// Run overlay configuration, then features
(async () => {
  try {
    await configureOverlayIfNeeded();
  } catch (e) {
    console.error('configureOverlayIfNeeded error', e);
  }
  logMemberState('startup');
  runExtensionFeatures();
})();


// Below needed to end a function for controlling content.js 
}  //  Warning do not delete.
