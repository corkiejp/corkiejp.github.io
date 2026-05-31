// ?bc_vf_css=1

const VF_CUSTOM_CSS_URL =
//	'https://corkiejp.github.io/ttospwa/boardstheme2608-2.css';
  'https://open.vanillaforums.com/themes/open-vf-com/design/custom.css?v=69fcff17';

const PARAM_NAME = 'bc_vf_css';
let linkPropagationObserver = null;

function hasTruthyFlag(value) {
  if (value == null) return false;
  const normalised = String(value).trim().toLowerCase();
  return normalised === '1' || normalised === 'true' || normalised === 'yes' || normalised === 'on';
}

function getParamFromSearchOrHash(paramName) {
  const searchParams = new URLSearchParams(window.location.search);
  const searchValue = searchParams.get(paramName);
  if (searchValue !== null) return searchValue;

  const hash = window.location.hash || '';
  const hashQueryIndex = hash.indexOf('?');
  if (hashQueryIndex === -1) return null;

  const hashQuery = hash.slice(hashQueryIndex + 1);
  const hashParams = new URLSearchParams(hashQuery);
  return hashParams.get(paramName);
}

function shouldUseVanillaForumsCustomCss() {
  return hasTruthyFlag(getParamFromSearchOrHash(PARAM_NAME));
}

function isBoardsNavigationLink(anchor) {
  if (!(anchor instanceof HTMLAnchorElement)) return false;

  const rawHref = anchor.getAttribute('href') || '';
  if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:')) {
    return false;
  }

  try {
    const url = new URL(anchor.href, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

function appendFlagToAnchor(anchor) {
  if (!isBoardsNavigationLink(anchor)) return false;

  try {
    const url = new URL(anchor.href, window.location.origin);

    if (!hasTruthyFlag(url.searchParams.get(PARAM_NAME))) {
      url.searchParams.set(PARAM_NAME, '1');
      anchor.href = url.toString();
      anchor.dataset.bcVfCssPropagated = 'true';
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function propagateFlagToExistingLinks() {
  document.querySelectorAll('a[href]').forEach((anchor) => {
    appendFlagToAnchor(anchor);
  });
}

function startLinkPropagationObserver() {
  if (linkPropagationObserver || !document.body) return;

  linkPropagationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;

        if (node.matches?.('a[href]')) {
          appendFlagToAnchor(node);
        }

        node.querySelectorAll?.('a[href]').forEach((anchor) => {
          appendFlagToAnchor(anchor);
        });
      });
    }
  });

  linkPropagationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function swapBoardsCustomCssLink() {
  const selectors = [
    'link[rel="stylesheet"][href*="/themes/boards/design/custom.css"]',
    'link[rel="stylesheet"][href*="themes/boards/design/custom.css"]',
    'link[rel="stylesheet"][data-bc-original-href]'
  ];

  document.querySelectorAll(selectors.join(', ')).forEach((linkEl) => {
    const currentHref = linkEl.href || '';

    if (
      !linkEl.dataset.bcOriginalHref &&
      currentHref.includes('/themes/boards/design/custom.css')
    ) {
      linkEl.dataset.bcOriginalHref = currentHref;
    }

    if (linkEl.href !== VF_CUSTOM_CSS_URL) {
      linkEl.href = VF_CUSTOM_CSS_URL;
    }
  });
}

export function initExperimentalThemeCssSwap() {
  if (!shouldUseVanillaForumsCustomCss()) return;

  swapBoardsCustomCssLink();
  propagateFlagToExistingLinks();
  startLinkPropagationObserver();

  console.log('[BoardsCleaner] Experimental VF custom.css swap enabled via URL param');
}