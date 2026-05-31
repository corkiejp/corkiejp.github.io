// assets/js/features/boards-styling.js

const BC_STYLE_LINK_ID = 'boards-cleaner-style-link';

export function ensureBoardsCleanerCss() {
  if (document.getElementById(BC_STYLE_LINK_ID)) return;

  const link = document.createElement('link');
  link.id = BC_STYLE_LINK_ID;
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('assets/css/boards-cleaner.css');
  document.head.appendChild(link);

  const loaderLogo = chrome.runtime.getURL('assets/boardsedited128.png');
  document.documentElement.style.setProperty('--bc-loader-logo-url', `url("${loaderLogo}")`);
}

export function removeBoardsCleanerCss() {
  const existing = document.getElementById(BC_STYLE_LINK_ID);
  if (existing) {
    existing.remove();
  }
}

export function clearBoardsStylingState() {
  const html = document.documentElement;
  html.removeAttribute('data-bc-global-colour-shift');
  html.removeAttribute('data-bc-header-override');
  html.classList.remove('bc-logo-solid');
  applyLogoSwap(false);
}

export function setBoardsCleanerCssEnabled(enabled) {
  if (enabled) {
    ensureBoardsCleanerCss();
  } else {
    removeBoardsCleanerCss();
  }
}



export function isBoardsThemeActive() {
  const html = document.documentElement;

  const hasPresetTheme = Array.from(html.classList).some((cls) =>
    cls.startsWith('boards-preset-')
  );

  const hasCustomThemeMarker = html.classList.contains('boards-custom-theme-active');

  return hasPresetTheme || hasCustomThemeMarker;
}

export function applyGlobalColourShift(enabled, headerOverrideEnabled = enabled, isMobile = false) {
  const html = document.documentElement;
  const effectiveHeaderOverride = enabled || headerOverrideEnabled;

  if (isBoardsThemeActive()) {
    html.removeAttribute('data-bc-global-colour-shift');

    if (headerOverrideEnabled) {
      html.setAttribute('data-bc-header-override', 'on');
    } else {
      html.removeAttribute('data-bc-header-override');
    }

    applyLogoSwap(enabled);
    return;
  }

  if (isMobile) {
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

export function applyLogoSolid(enabled) {
  const html = document.documentElement;

  if (enabled) {
    html.classList.add('bc-logo-solid');
  } else {
    html.classList.remove('bc-logo-solid');
  }
}

export function updateBoardsHeaderLogo(enabled) {
  try {
    const customLogo = chrome.runtime.getURL('assets/boardsedited128.png');

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
  } catch (e) {
    console.error('BoardsCleaner: failed to update header logo', e);
  }
}

export function applyLogoSwap(enabled) {
  updateBoardsHeaderLogo(enabled);
  setTimeout(() => updateBoardsHeaderLogo(enabled), 250);
}

export async function refreshBoardsStyling(getSettings) {
  const settings = await getSettings();
  const extensionCssEnabled = settings.extensionCssEnabled !== false;

  if (!extensionCssEnabled) {
    clearBoardsStylingState();
    removeBoardsCleanerCss();
    return;
  }

  ensureBoardsCleanerCss();

  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

  applyGlobalColourShift(
    settings.globalColourShift !== false,
    settings.headerOverride !== false,
    isMobile
  );

  applyLogoSolid(!!settings.logoSolid);
}

export async function initBoardsStyling(getSettings) {
  await refreshBoardsStyling(getSettings);

  setTimeout(() => {
    refreshBoardsStyling(getSettings);
  }, 500);
}