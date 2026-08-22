console.log("AT Protocol Handler content script loaded on", window.location.href);

function isFirefoxAndroid() {
  const ua = navigator.userAgent || "";
  return ua.includes("Android") && ua.includes("Firefox");
}

// --- Utility: Remove any existing popup
function removePopup() {
  const old = document.getElementById('atproto-popup');
  if (old) old.remove();
}

// --- Utility: Show the popup with all links and snooze button
function showPopup(aturl, x, y) {
  removePopup();

  const extensionListUrl = `https://corkiejp.github.io/ATProtocolHandler/list.html?aturl=${encodeURIComponent(aturl)}`;

  const popup = document.createElement('div');
  popup.id = 'atproto-popup';
  popup.style.position = 'fixed';
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';
  popup.style.background = '#fff';
  popup.style.border = '1px solid #0074d9';
  popup.style.borderRadius = '8px';
  popup.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
  popup.style.padding = '1em';
  popup.style.zIndex = 99999;
  popup.style.fontFamily = 'sans-serif';
  popup.style.minWidth = '220px';
  popup.style.pointerEvents = 'auto';

  popup.innerHTML = `
  <h3 title="Drag to move" style="margin-top:0;margin-bottom:0.5em;cursor:move;user-select:none;">
    <span style="font-size:1.2em;vertical-align:middle;opacity:0.6;margin-right:0.3em;">&#9776;</span>
    ATProtocol Handler
  </h3>
  <div style="font-size:0.95em;color:#666;margin-bottom:0.5em;">
    <em>Tip: Drag the title bar to move this popup</em>
  </div>
    <b>Open at:// URI with:</b><br>

<a href="https://corkiejp.github.io/ATProtocolHandler/${aturl}" target="_blank" style="display:block; margin-top:8px;">AT Handler + custom links</a>

    <a href="https://corkiejp.github.io/ATProtoViewer/index.html?uri=${encodeURIComponent(aturl)}" target="_blank" style="display:block; margin-top:8px;">ATProtoViewer</a>
    <a href="https://corkiejp.github.io/ttospwa/index.html?uri=${encodeURIComponent(aturl)}" target="_blank" style="display:block; margin-top:4px;">List of sites to open!</a>
    <a href="${extensionListUrl}" target="_blank" style="display:block; margin-top:4px;">Extension List Page</a>
    <button id="atproto-popup-mobile" style="margin-top:8px;display:block;">List in Mobile View</button>
    <button id="atproto-popup-snooze" style="margin-top:8px;display:block;">Don’t show again this session</button>
    <button id="atproto-popup-close" style="margin-top:12px;display:block;">Close</button>
    <div style="margin-top:1em;text-align:left;">
      <b>Keyboard shortcuts:</b>
      <ul style="margin:0 0 0 1.2em; padding:0;">
        <li>Posts/feeds: <b>Alt+C</b></li>
        <li>Mobile View list: <b>Alt+L</b></li>
      </ul>
    </div>
  `;

  document.body.appendChild(popup);

  // Inject robust CSS for popup and buttons, including dark mode support
  if (!document.getElementById('atproto-popup-style')) {
    const style = document.createElement('style');
    style.id = 'atproto-popup-style';
    style.textContent = `
      #atproto-popup {
        background: #fff !important;
        color: #222 !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
        z-index: 99999 !important;
        min-width: 220px !important;
        font-family: sans-serif !important;
        padding: 1em !important;
        border: 1px solid #0074d9 !important;
      }
      #atproto-popup button {
        display: block !important;
        width: 100% !important;
        margin: 8px 0 0 0 !important;
        background: #0074d9 !important;
        color: #fff !important;
        border: none !important;
        border-radius: 4px !important;
        padding: 0.5em 1em !important;
        font-size: 1em !important;
        cursor: pointer !important;
        box-sizing: border-box !important;
        transition: background 0.2s;
      }
      #atproto-popup button:hover, #atproto-popup button:focus {
        background: #005fa3 !important;
      }
      #atproto-popup a {
        color: #0074d9 !important;
        text-decoration: underline !important;
        word-break: break-all !important;
      }
      #atproto-popup ul {
        margin: 0 0 0 1.2em !important;
        padding: 0 !important;
      }
    #atproto-popup h3 {
      margin-top: 0 !important;
      margin-bottom: 0.5em !important;
      cursor: move !important;
      user-select: none !important;
      font-size: 1.1em !important;
      font-weight: bold !important;
      display: flex;
      align-items: center;
      gap: 0.3em;
    }
      #atproto-popup em {
        color: #666 !important;
      }
      @media (prefers-color-scheme: dark) {
        #atproto-popup {
          background: #222 !important;
          color: #fff !important;
          border: 1px solid #39a9ff !important;
        }
        #atproto-popup button {
          background: #39a9ff !important;
          color: #222 !important;
        }
        #atproto-popup button:hover, #atproto-popup button:focus {
          background: #0074d9 !important;
          color: #fff !important;
        }
        #atproto-popup a {
          color: #39a9ff !important;
        }
        #atproto-popup em {
          color: #aaa !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // --- Ensure popup is fully on-screen initially ---
  const rect = popup.getBoundingClientRect();
  let newX = x;
  let newY = y;

  const margin = 10;

  if (newX < margin) newX = margin;
  if (newY < margin) newY = margin;
  if (newX + rect.width > window.innerWidth) {
    newX = window.innerWidth - rect.width - margin;
  }
  if (newY + rect.height > window.innerHeight) {
    newY = window.innerHeight - rect.height - margin;
  }

  popup.style.left = newX + 'px';
  popup.style.top = newY + 'px';

  // --- Draggable logic (mouse + touch, with viewport limiting) ---
  const header = popup.querySelector('h3');
  header.style.cursor = 'move';
  header.style.userSelect = 'none';

  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

// Mouse drag (listen on popup, but only drag if click is on header)
popup.addEventListener('mousedown', function(e) {
  const header = popup.querySelector('h3');
  if (e.target !== header && !header.contains(e.target)) {
    return;
  }

  console.log('popup mousedown on header', e.clientX, e.clientY);
  isDragging = true;
  offsetX = e.clientX - popup.offsetLeft;
  offsetY = e.clientY - popup.offsetTop;
  document.body.style.userSelect = 'none';

  function onMouseMove(e) {
    if (isDragging) {
      const left = clamp(e.clientX - offsetX, 0, window.innerWidth - popup.offsetWidth);
      const top = clamp(e.clientY - offsetY, 0, window.innerHeight - popup.offsetHeight);
      popup.style.left = left + 'px';
      popup.style.top = top + 'px';
    }
  }
  function onMouseUp() {
    isDragging = false;
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});

  // Touch drag
  header.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return;
    isDragging = true;
    offsetX = e.touches[0].clientX - popup.offsetLeft;
    offsetY = e.touches[0].clientY - popup.offsetTop;
    document.body.style.userSelect = 'none';

    function onTouchMove(e) {
      if (!isDragging || e.touches.length !== 1) return;
      e.preventDefault(); // Prevent page scroll
      const left = clamp(e.touches[0].clientX - offsetX, 0, window.innerWidth - popup.offsetWidth);
      const top = clamp(e.touches[0].clientY - offsetY, 0, window.innerHeight - popup.offsetHeight);
      popup.style.left = left + 'px';
      popup.style.top = top + 'px';
    }
    function onTouchEnd() {
      isDragging = false;
      document.body.style.userSelect = '';
      document.removeEventListener('touchmove', onTouchMove, {passive:false});
      document.removeEventListener('touchend', onTouchEnd);
    }
    document.addEventListener('touchmove', onTouchMove, {passive:false});
    document.addEventListener('touchend', onTouchEnd);
  }, {passive: false});

  // --- Button handlers ---
  document.getElementById('atproto-popup-close').onclick = removePopup;
  document.getElementById('atproto-popup-snooze').onclick = function() {
    sessionStorage.setItem('atprotoPopupSnooze', '1');
    removePopup();
  };
  document.getElementById('atproto-popup-mobile').onclick = function() {
    window.open(
      `https://corkiejp.github.io/ttospwa/index.html?uri=${encodeURIComponent(aturl)}`,
      '_blank',
      'width=400,height=700,menubar=no,toolbar=no,location=no,status=no'
    );
  };

  // --- Dismiss popup when clicking outside ---
  setTimeout(() => {
    document.addEventListener('mousedown', function handler(e) {
      if (!popup.contains(e.target)) {
        removePopup();
        document.removeEventListener('mousedown', handler);
      }
    });
  }, 100);
}


// --- Main event listener for copy button clicks (ONLY for post copy buttons)
async function tryReadClipboardWithRetries(retries, delayMs) {
  for (let i = 0; i < retries; i++) {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.startsWith('at://')) {
        return text;
      }
    } catch (err) {
      console.error('Clipboard read failed:', err);
      // For permission/API failures, no point retrying
      break;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return null;
}

document.body.addEventListener('click', (e) => {
  let el = e.target;

  // Traverse up the DOM tree to check for the right attributes
  while (el) {
    const label = el.getAttribute && el.getAttribute('aria-label');
    const testId = el.getAttribute && el.getAttribute('data-testid');

    if (label === 'Copy post at:// URI' || testId === 'postAtUriShareBtn') {
      const onFirefoxAndroid = isFirefoxAndroid();

      // Slightly longer delay + more retries on Firefox Android
      const baseDelay = onFirefoxAndroid ? 200 : 100;
      const retryDelay = onFirefoxAndroid ? 120 : 80;
      const retries = onFirefoxAndroid ? 3 : 1;

      setTimeout(async () => {
        const text = await tryReadClipboardWithRetries(retries, retryDelay);
        if (text) {
          showPopup(text, e.clientX, e.clientY);
        }
      }, baseDelay);

      break;
    }

    el = el.parentElement;
  }
});




// --- KLEASKY: Show popup when navigating to a post (hash-based SPA navigation), with snooze
if (window.location.hostname === 'klearsky.pages.dev') {
  function getAtUriFromHash() {
    const hash = window.location.hash;
    const match = hash.match(/[?&]uri=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  let lastHash = '';
  function maybeShowPopupForPost() {
    if (
      window.location.hash.startsWith('#/post') &&
      window.location.hash !== lastHash &&
      !sessionStorage.getItem('atprotoPopupSnooze')
    ) {
      lastHash = window.location.hash;
      const aturl = getAtUriFromHash();
      if (aturl) {
        showPopup(aturl, window.innerWidth / 2 - 120, 80);
      }
    }
  }

  // Listen for hashchange
  window.addEventListener('hashchange', maybeShowPopupForPost);

  // Fallback: observe DOM changes for SPA navigation quirks
  const observer = new MutationObserver(maybeShowPopupForPost);
  observer.observe(document.body, { childList: true, subtree: true });

  // Also check on initial load
  maybeShowPopupForPost();
}

// --- Unified keydown shortcuts (Alt+C and Alt+L) ---
document.addEventListener('keydown', async function(e) {
  if (!e.altKey) return;

  const key = e.key.toLowerCase();

  // --- Alt+C: copy URL / open ATProtoViewer for post or feed ---
  if (key === 'c') {
    const url = window.location.href;

    const isDeerPost = url.startsWith('https://deer.social/') && url.includes('/post/');
    const isBskyPost = url.startsWith('https://bsky.app/profile/') && url.includes('/post/');
    const isWsPost   = url.startsWith('https://wsocial.eu/profile/') && url.includes('/post/');

    const isDeerFeed = url.startsWith('https://deer.social/') && url.includes('/feed/');
    const isBskyFeed = url.startsWith('https://bsky.app/profile/') && url.includes('/feed/');
    const isWsFeed   = url.startsWith('https://wsocial.eu/profile/') && url.includes('/feed/');

    try {
      if (isDeerPost || isBskyPost || isWsPost || isDeerFeed || isBskyFeed || isWsFeed) {
        await navigator.clipboard.writeText(url);
      }

      if (isDeerPost || isBskyPost || isWsPost) {
        window.open(
          `https://corkiejp.github.io/ATProtoViewer/index.html?uri=${encodeURIComponent(url)}`,
          '_blank'
        );
        console.log('Post URL copied and viewer opened:', url);
      } else if (isDeerFeed || isBskyFeed || isWsFeed) {
        window.open(
          `https://corkiejp.github.io/ATProtoViewer/ATProtoSimpleFeeds.html?input=${encodeURIComponent(url)}`,
          '_blank'
        );
        console.log('Feed URL copied and viewer opened:', url);
      } else if (window.location.hostname === 'klearsky.pages.dev') {
        const hash = window.location.hash;
        const match = hash.match(/[?&]uri=([^&]+)/);
        if (match) {
          const aturl = decodeURIComponent(match[1]);
          await navigator.clipboard.writeText(aturl);
          window.open(
            `https://corkiejp.github.io/ATProtoViewer/index.html?uri=${encodeURIComponent(aturl)}`,
            '_blank'
          );
          console.log('Klearsky at:// URI copied and viewer opened:', aturl);
        } else {
          alert('No at:// post URI found in the current Klearsky page.');
        }
      }
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
    return;
  }

  // --- Alt+L: open mobile view list (ttospwa) ---
  if (key === 'l') {
    let url = null;

    if (
      (window.location.hostname === 'bsky.app' &&
       window.location.pathname.startsWith('/profile/') &&
       window.location.pathname.includes('/post/')) ||
      (window.location.hostname === 'deer.social' &&
       window.location.pathname.includes('/post/')) ||
      (window.location.hostname === 'wsocial.eu' &&
       window.location.pathname.includes('/post/'))
    ) {
      url = window.location.href;
    }

    if (window.location.hostname === 'klearsky.pages.dev') {
      const hash = window.location.hash;
      const match = hash.match(/[?&]uri=([^&]+)/);
      if (match) url = decodeURIComponent(match[1]);
    }

    if (url) {
      window.open(
        `https://corkiejp.github.io/ttospwa/index.html?uri=${encodeURIComponent(url)}`,
        '_blank',
        'width=400,height=700,menubar=no,toolbar=no,location=no,status=no'
      );
    } else {
      alert('Not on a supported post page.');
    }
    return;
  }
});

// -----------------------------------------------------------------------------
// Profile-handle display and copy controls
// -----------------------------------------------------------------------------

(() => {
  const HANDLE_BUTTON_CLASS = 'atproto-handle-copy-button';
  const HANDLE_PROCESSED_ATTR = 'data-atproto-handle-processed';
  const HANDLE_VALUE_ATTR = 'data-atproto-full-handle';
  const HANDLE_STYLE_ID = 'atproto-handle-copy-style';
  
const DEFAULT_HANDLE_SETTINGS = {
  showCopyButtons: true,

  hideHandles: {
    bskySocial: false,
    euroskySocial: false,
    wsocialEu: false,
    blackskyApp: false,
    northskySocial: false
  },

  shortenHandles: {
    bskySocial: false,
    euroskySocial: false,
    wsocialEu: true,
    blackskyApp: false,
    northskySocial: false
  }
};

  let handleSettings = { ...DEFAULT_HANDLE_SETTINGS };

  function getExtensionStorage() {
    if (typeof browser !== 'undefined' && browser.storage?.local) {
      return browser.storage.local;
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return chrome.storage.local;
    }

    return null;
  }

function loadHandleSettings() {
  const storage = getExtensionStorage();

  if (!storage) {
    return Promise.resolve({
      showCopyButtons: DEFAULT_HANDLE_SETTINGS.showCopyButtons,
      hideHandles: { ...DEFAULT_HANDLE_SETTINGS.hideHandles },
      shortenHandles: { ...DEFAULT_HANDLE_SETTINGS.shortenHandles }
    });
  }

  return new Promise(resolve => {
    storage.get(DEFAULT_HANDLE_SETTINGS, result => {
      resolve({
        showCopyButtons:
          result?.showCopyButtons ??
          DEFAULT_HANDLE_SETTINGS.showCopyButtons,

        hideHandles: {
          ...DEFAULT_HANDLE_SETTINGS.hideHandles,
          ...(result?.hideHandles || {})
        },

        shortenHandles: {
          ...DEFAULT_HANDLE_SETTINGS.shortenHandles,
          ...(result?.shortenHandles || {})
        }
      });
    });
  });
}

function copyButtonsEnabled() {
  return !!handleSettings.showCopyButtons;
}

  function removeCopyButtons(anchor) {
    const parent = anchor.parentElement;
    if (!parent) return;

    parent
      .querySelectorAll(`.${HANDLE_BUTTON_CLASS}`)
      .forEach(button => button.remove());
  }

const SUPPORTED_CLIENTS = new Set([
  'wsocial.eu',
  'bsky.app',
  'mu.social',
  'deer.social',
  'blacksky.community',
  'northsky.app'
]);

  const BIDI_MARKS_RE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

  function isSupportedClient() {
    return SUPPORTED_CLIENTS.has(window.location.hostname);
  }

  function cleanText(value) {
    return String(value || '')
      .replace(BIDI_MARKS_RE, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  function getShortenedHandle(fullHandle) {
  const value = cleanHandle(fullHandle);
  const shorten = handleSettings.shortenHandles || {};

  if (shorten.bskySocial && value.endsWith('.bsky.social')) {
    return fullHandle.replace(/\.bsky\.social$/i, '');
  }

  if (shorten.euroskySocial && value.endsWith('.eurosky.social')) {
    return fullHandle.replace(/\.eurosky\.social$/i, '');
  }

  if (shorten.wsocialEu && value.endsWith('.wsocial.eu')) {
    return fullHandle.replace(/\.wsocial\.eu$/i, '');
  }

  if (shorten.blackskyApp && value.endsWith('.blacksky.app')) {
    return fullHandle.replace(/\.blacksky\.app$/i, '');
  }

  if (shorten.northskySocial && value.endsWith('.northsky.social')) {
    return fullHandle.replace(/\.northsky\.social$/i, '');
  }

  return fullHandle;
}

  function cleanHandle(value) {
    return String(value || '')
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^@/, '')
      .toLowerCase();
  }


  function getProfileRepository(anchor) {
    const rawHref = anchor.getAttribute('href') || '';

    let url;

    try {
      url = new URL(rawHref, window.location.href);
    } catch {
      return null;
    }

    if (url.origin !== window.location.origin) {
      return null;
    }

    /*
     * Match only:
     *
     *   /profile/<repo>
     *
     * This excludes:
     *
     *   /profile/<repo>/post/<rkey>
     */
    const match = url.pathname.match(/^\/profile\/([^/?#]+)\/?$/);

    if (!match) {
      return null;
    }

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  function getHandleInfo(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) {
      return null;
    }

    const repository = getProfileRepository(anchor);

    if (!repository) {
      return null;
    }

    const visibleText = cleanText(anchor.textContent);

    /*
     * This deliberately excludes display-name links such as:
     *
     *   Richard Bell
     *
     * and accepts handle links such as:
     *
     *   @richard-bell.wsocial.eu
     *   @scoiattolo.mountainherder.xyz
     */
    if (!/^@[^@\s]+$/u.test(visibleText)) {
      return null;
    }

    const visibleHandle = visibleText.slice(1);
    const isWsocial = window.location.hostname === 'wsocial.eu';

    /*
     * wsocial.eu puts the actual handle in the profile URL.
     *
     * Deer uses a DID in the profile URL, for example:
     *
     *   /profile/did:plc:uyqnubfj3qlho6psy6uvvt6u
     *
     * Therefore Deer and the other clients use the visible handle.
     */
const repositoryIsWsocialHandle =
  /\.wsocial\.eu$/i.test(repository);

const fullHandle =
  isWsocial && repositoryIsWsocialHandle
    ? repository
    : visibleHandle;

    return {
      repository,
      visibleHandle,
      fullHandle,
      displayHandle: `@${visibleHandle}`,
      isWsocial
    };
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.warn(
          'AT Protocol Handler: Clipboard API failed; trying fallback.',
          error
        );
      }
    }

    const textarea = document.createElement('textarea');

    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let copied = false;

    try {
      copied = document.execCommand('copy');
    } catch (error) {
      console.error(
        'AT Protocol Handler: clipboard fallback failed.',
        error
      );
    }

    textarea.remove();

    return copied;
  }

  function getExistingCopyButton(parent, fullHandle) {
    return Array.from(
      parent.querySelectorAll(`.${HANDLE_BUTTON_CLASS}`)
    ).find(button => button.dataset.handle === fullHandle) || null;
  }

  function showCopySuccess(button) {
    const originalText = button.textContent;
    const originalLabel = button.getAttribute('aria-label');

    button.textContent = '✓';
    button.setAttribute('aria-label', 'Handle copied');

    window.setTimeout(() => {
      if (!button.isConnected) {
        return;
      }

      button.textContent = originalText;
      button.setAttribute('aria-label', originalLabel);
    }, 1000);
  }

  function getOrCreateCopyButton(anchor, fullHandle) {
    const parent = anchor.parentElement;

    if (!parent) {
      return null;
    }

    const existingButton = getExistingCopyButton(parent, fullHandle);

    if (existingButton) {
      return existingButton;
    }

    const button = document.createElement('button');

    button.type = 'button';
    button.className = HANDLE_BUTTON_CLASS;
    button.dataset.handle = fullHandle;
    button.textContent = '⧉';
    button.title = `Copy @${fullHandle}`;
    button.setAttribute('aria-label', `Copy @${fullHandle}`);

    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();

      const value = `@${fullHandle}`;
      const copied = await copyText(value);

      if (copied) {
        showCopySuccess(button);
      } else {
        console.error(
          'AT Protocol Handler: unable to copy handle.',
          value
        );
      }
    });

    /*
     * Insert only beside the handle anchor.
     * Nothing around the complete post header is wrapped or changed.
     */
    anchor.insertAdjacentElement('afterend', button);

    return button;
  }
  
    function isCustomDomainHandle(fullHandle) {
    const value = cleanHandle(fullHandle);
    if (!value.includes('.')) return false;

    // Skip the “stock” handle domains you already treat specially
    if (value.endsWith('.bsky.social')) return false;
    if (value.endsWith('.eurosky.social')) return false;
    if (value.endsWith('.wsocial.eu')) return false;

    return true;
  }

function addPdsCheckButton(anchor, fullHandle) {
  if (!isSupportedClient()) return;

  const parent = anchor.parentElement;
  if (!parent) return;

  if (!isCustomDomainHandle(fullHandle)) return;

  if (parent.querySelector('.atproto-pds-check')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'atproto-pds-check';
  btn.textContent = '?';
  btn.title = 'Check which PDS hosts this handle';
  btn.setAttribute('aria-label', `Check PDS for @${fullHandle}`);

  // 1) Try to load cached result immediately
  (chrome.runtime || browser.runtime).sendMessage(
    { type: 'pdsLookupCached', handle: fullHandle },
    res => {
      if (res && res.fromCache) {
        // We have a valid cached result: render it immediately
        if (res.error) {
          btn.textContent = '!';
          btn.title = 'Could not check PDS';
          btn.classList.add('pds-error');
          return;
        }

        if (res.isWsocial) {
          btn.textContent = 'W';
          btn.title = 'Hosted on wsocial PDS (confirmed by PLC)';
          btn.classList.add('pds-wsocial');
        } else if (res.isEurosky) {
          btn.textContent = 'E';
          btn.title = 'Hosted on Eurosky PDS (confirmed by PLC)';
          btn.classList.add('pds-eurosky');
} else if (res.endpoint) {
  btn.textContent = 'P';
  btn.title = `Hosted on ${res.endpoint} (confirmed by PLC)`;
  btn.classList.add('pds-other');
} else {
          btn.textContent = 'Ø';
          btn.title = 'PDS not confirmed by PLC';
          btn.classList.add('pds-unknown');
        }
      }
      // If no cache, leave as '?' and wait for click
    }
  );

  // 2) On click, always do a fresh lookup and update cache
  btn.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();

    btn.disabled = true;
    btn.textContent = '…';
    btn.title = 'Checking PDS…';

    (chrome.runtime || browser.runtime).sendMessage(
      { type: 'pdsLookup', handle: fullHandle },
      res => {
        btn.disabled = false;

        if (!res || res.error) {
          btn.textContent = '!';
          btn.title = 'Could not check PDS';
          btn.classList.add('pds-error');
          return;
        }

        if (res.isWsocial) {
          btn.textContent = 'W';
          btn.title = 'Hosted on wsocial PDS (confirmed by PLC)';
          btn.classList.add('pds-wsocial');
        } else if (res.isEurosky) {
          btn.textContent = 'E';
          btn.title = 'Hosted on Eurosky PDS (confirmed by PLC)';
          btn.classList.add('pds-eurosky');
        } else if (res.endpoint) {
          btn.textContent = 'P';
          btn.title = `Hosted on ${res.endpoint} (confirmed by PLC)`;
          btn.classList.add('pds-other');
        } else {
          btn.textContent = 'Ø';
          btn.title = 'PDS not confirmed by PLC';
          btn.classList.add('pds-unknown');
        }
      }
    );
  });

  anchor.insertAdjacentElement('afterend', btn);
}

function processHandleAnchor(anchor) {
  const info = getHandleInfo(anchor);

  if (!info) {
    return;
  }

  const {
    fullHandle,
    isWsocial
  } = info;

  anchor.setAttribute(HANDLE_PROCESSED_ATTR, 'true');
  anchor.setAttribute(HANDLE_VALUE_ATTR, `@${fullHandle}`);
  anchor.dataset.fullHandle = `@${fullHandle}`;
  anchor.title = `@${fullHandle}`;

  const displayHandle = getShortenedHandle(fullHandle);
  const displayText = `@${displayHandle}`;

  if (cleanText(anchor.textContent) !== displayText) {
    anchor.textContent = displayText;
  }

  if (isSupportedClient()) {
    addPdsCheckButton(anchor, fullHandle);
  }

  /*
   * This is intentionally called on every scan.
   * The helper returns the existing button when one is already present,
   * but recreates it if React has replaced or removed it.
   */
  if (copyButtonsEnabled()) {
    getOrCreateCopyButton(anchor, fullHandle);
  } else {
    removeCopyButtons(anchor);
  }
}


  function scanForHandles(root = document) {
    if (!isSupportedClient()) {
      return;
    }

    if (root instanceof HTMLAnchorElement) {
      processHandleAnchor(root);
    }

    if (!root.querySelectorAll) {
      return;
    }

    root
      .querySelectorAll('a[href*="/profile/"]')
      .forEach(processHandleAnchor);
  }

function injectHandleStyles() {
  if (document.getElementById(HANDLE_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');

  style.id = HANDLE_STYLE_ID;

  style.textContent = `
    .${HANDLE_BUTTON_CLASS} {
      appearance: none;
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      font: inherit;
      line-height: 1;
      opacity: 0.65;
      padding: 2px 3px;
      margin-left: 2px;
      vertical-align: middle;
    }

    .${HANDLE_BUTTON_CLASS}:hover,
    .${HANDLE_BUTTON_CLASS}:focus-visible {
      color: #11e8b2;
      opacity: 1;
    }

    .${HANDLE_BUTTON_CLASS}:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
      border-radius: 3px;
    }

    .atproto-pds-check {
      appearance: none;
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      font: inherit;
      line-height: 1;
      opacity: 0.7;
      padding: 4px 6px;
      margin-left: 4px;
      vertical-align: middle;
      min-width: 22px;
      min-height: 22px;
      border-radius: 4px;
    }

    .atproto-pds-check:hover,
    .atproto-pds-check:focus-visible {
      opacity: 1;
      background: rgba(0,0,0,0.06);
    }

    .atproto-pds-check:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }
  `;

  document.head.appendChild(style);
}

  function startHandleObserver() {
    if (!document.body) {
      return;
    }

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) {
              continue;
            }

            scanForHandles(node);
          }
        }

        if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;

          if (!parent) {
            continue;
          }

          const anchor = parent.closest('a[href*="/profile/"]');

          if (anchor) {
            processHandleAnchor(anchor);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  async function initialiseHandleControls() {
    handleSettings = await loadHandleSettings();
    injectHandleStyles();
    scanForHandles();
    startHandleObserver();
  }

  if (document.body) {
    initialiseHandleControls();
  } else {
    window.addEventListener(
      'DOMContentLoaded',
      initialiseHandleControls,
      { once: true }
    );
  }
  const storage = getExtensionStorage();

  if (storage?.onChanged?.addListener) {
    storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      let changed = false;

      for (const [key, change] of Object.entries(changes)) {
        if (key in DEFAULT_HANDLE_SETTINGS) {
          handleSettings[key] = change.newValue;
          changed = true;
        }
      }

      if (changed) {
        scanForHandles();
      }
    });
  }  
  // Expose helpers for post filtering
window.ATProtoHandler = {
  shouldHideHandle(handle) {
    const value = cleanHandle(handle);
    if (!value) return false;

    const hide = handleSettings.hideHandles || {};

    return (
      (hide.bskySocial && value.endsWith('.bsky.social')) ||
      (hide.euroskySocial && value.endsWith('.eurosky.social')) ||
      (hide.wsocialEu && value.endsWith('.wsocial.eu')) ||
      (hide.blackskyApp && value.endsWith('.blacksky.app')) ||
      (hide.northskySocial && value.endsWith('.northsky.social'))
    );
  }
};
})();

// -----------------------------------------------------------------------------
// Opt-in post/reply hiding
// -----------------------------------------------------------------------------

(() => {
  const HIDDEN_ATTR = 'data-atproto-post-hidden';
  const HIDDEN_CLASS = 'atproto-hidden-post-placeholder';
  
    // Invalid handle popup (session‑scoped)
    const INVALID_HANDLE_MESSAGE =
	'Everything is gonna be alright!\n\n' +
    'Invalid handle detected in your feed.\n\n' +
    'This is usually a temporary issue with the client or PDS and often resolves itself quickly.\n\n' +
    '• If this is your own handle and you’re using a custom domain, check your DNS/domain setup.\n' +
    '• If it persists for specific accounts, contact support for that client/PDS.';
  let invalidHandlePopupShown = false;
  let invalidHandlePopupEl = null;
  
    // Persistent "never show again" flag
	// localStorage.setItem('atproto_never_show_invalid_handle_popup', 'false');
	// or localStorage.removeItem('atproto_never_show_invalid_handle_popup');
  const NEVER_SHOW_INVALID_HANDLE_KEY = 'atproto_never_show_invalid_handle_popup'
  
    function shouldShowInvalidHandlePopup() {
    if (localStorage.getItem(NEVER_SHOW_INVALID_HANDLE_KEY) === 'true') {
      return false;
    }
    if (invalidHandlePopupShown) {
      return false;
    }
    return true;
  }
  
  
  
    function cleanHandle(value) {
    return String(value || '')
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^@/, '')
      .toLowerCase();
  }
  
    function shouldHideHandle(handle) {
    return window.ATProtoHandler?.shouldHideHandle(handle) || false;
  }

  function getThreadHandle(item) {
    const testId = item.getAttribute('data-testid') || '';
    const prefix = 'postThreadItem-by-';

    if (testId.startsWith(prefix)) {
      const fromTestId = cleanHandle(testId.slice(prefix.length));
      if (fromTestId && !fromTestId.startsWith('did:')) {
        return fromTestId;
      }
    }

    const nodeList = item.querySelectorAll('a[href*="/profile/"], [aria-label], [data-atproto-full-handle], [data-full-handle]');

    for (const node of nodeList) {
      const direct = cleanHandle(node.getAttribute('data-atproto-full-handle') || node.getAttribute('data-full-handle'));
      if (direct && !direct.startsWith('did:')) {
        return direct;
      }

      const text = cleanHandle(node.textContent);
      if (text && text.includes('.') && !text.startsWith('did:')) {
        return text;
      }

      const aria = cleanHandle(node.getAttribute('aria-label'));
      if (
        aria &&
        aria.includes('.') &&
        !aria.includes('avatar') &&
        !aria.startsWith('follow ') &&
        !aria.startsWith('view profile') &&
        !aria.startsWith('post by ')
      ) {
        return aria;
      }
    }

    return null;
  }

  function getPostContainerFromContent(content) {
    let current = content;

    while (current && current !== document.body) {
      if (
        current.querySelector('[data-testid="postDropdownBtn"]') &&
        current.querySelector('a[href*="/profile/"]')
      ) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }
  
  function findInvalidHandlePost() {
    // Find any link that shows "⚠Invalid Handle" or "Invalid Handle"
    const invalidLinks = document.querySelectorAll('a[aria-label="View profile"]');

    for (const link of invalidLinks) {
      const text = link.textContent || '';
      if (text.includes('⚠Invalid Handle') || text.includes('Invalid Handle')) {
        // Walk up to find the post container
        let node = link;
        while (node && node !== document.body) {
          if (
            node.getAttribute?.('data-testid')?.startsWith('postThreadItem-by-') ||
            node.getAttribute?.('data-testid') === 'contentHider-post' ||
            node.matches?.('article[data-testid]') ||
            node.matches?.('[data-testid*="postThreadItem"]')
          ) {
            return node;
          }
          node = node.parentElement;
        }
        // If no specific post container, the link itself is enough to trigger
        return link;
      }
    }

    return null;
  }
  
    function scanForInvalidHandleLabels() {
    const post = findInvalidHandlePost();
    if (post) {
      maybeShowInvalidHandlePopup();
    }
  }

  function getPostCandidates() {
    const candidates = new Set();
    const host = window.location.hostname;

    // 1) Thread/post pages and replies (all clients)
    document
      .querySelectorAll('[data-testid^="postThreadItem-by-"]')
      .forEach(item => candidates.add(item));

    // 2) Feed cards that use contentHider-post (all major clients)
    if (
      host === 'wsocial.eu' ||
      host === 'bsky.app' ||
      host === 'deer.social' ||
      host === 'mu.social' ||
      host === 'blacksky.community' ||
      host === 'northsky.app'
    ) {
      document
        .querySelectorAll('[data-testid="contentHider-post"]')
        .forEach(content => {
          const container = getPostContainerFromContent(content);
          if (container) candidates.add(container);
        });
    }

    // 3) Search results and generic article/post containers (all clients)
    //    This covers search pages and any other listing views.
    document
      .querySelectorAll(
        'article[data-testid], ' +
        '[data-testid*="postThreadItem"], ' +
        '[data-testid="feedItem"]'
      )
      .forEach(item => {
        // Avoid duplicating items already captured by (1)
        if (!item.getAttribute('data-testid')?.startsWith('postThreadItem-by-')) {
          candidates.add(item);
        }
      });

    return [...candidates];
  }

  function scanPosts() {
    const candidates = getPostCandidates();

    for (const item of candidates) {
      if (!item.isConnected) continue;
      if (item.getAttribute(HIDDEN_ATTR) === 'true') continue;

      const handle = getThreadHandle(item);
      if (handle && window.ATProtoHandler?.shouldHideHandle(handle)) {
        hidePost(item, handle);
      }
    }
  }
  
  

  function initialisePostFiltering() {
    injectHiddenStyles();
    scanPosts();
	scanForInvalidHandleLabels();
	scanSearchAutocomplete();

    console.log('AT Protocol Handler post filtering active on', window.location.hostname);

    setTimeout(scanPosts, 300);
    setTimeout(scanPosts, 1000);
    setTimeout(scanPosts, 2500);
	setTimeout(scanSearchAutocomplete, 300);
    setTimeout(scanSearchAutocomplete, 1000);
    setTimeout(scanSearchAutocomplete, 2500);

    if (!document.body) return;

    const observer = new MutationObserver(() => {
      scanPosts();
	  scanForInvalidHandleLabels();
	  scanSearchAutocomplete();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  
  function injectHiddenStyles() {
    if (document.getElementById('atproto-hidden-post-style')) return;

    const style = document.createElement('style');
    style.id = 'atproto-hidden-post-style';
    style.textContent = `
      .${HIDDEN_CLASS} {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        min-height: 54px !important;
        padding: 14px 16px !important;
        border: 1px solid currentColor !important;
        border-radius: 10px !important;
        opacity: .85 !important;
        font: inherit !important;
      }

      .${HIDDEN_CLASS} button {
        appearance: none !important;
        border: 1px solid currentColor !important;
        background: transparent !important;
        color: inherit !important;
        border-radius: 7px !important;
        padding: 5px 9px !important;
        cursor: pointer !important;
        font: inherit !important;
        white-space: nowrap !important;
      }
    `;

    document.head.appendChild(style);
  }

  function scanSearchAutocomplete() {
    // Pattern 1: wsocial / deer.social style
    // <a data-testid="searchAutoCompleteResult-{handle}">
    const byTestId = document.querySelectorAll('a[data-testid^="searchAutoCompleteResult-"]');
    for (const item of byTestId) {
      if (!item.isConnected) continue;
      if (item.dataset.atprotoHiddenAutocomplete === 'true') continue;

      const testId = item.getAttribute('data-testid') || '';
      const handle = cleanHandle(testId.replace('searchAutoCompleteResult-', ''));

      if (handle && shouldHideHandle(handle)) {
        item.style.display = 'none';
        item.dataset.atprotoHiddenAutocomplete = 'true';
      }
    }

    // Pattern 2: blacksky / northsky / bsky.app style
    // [role="listbox"] [role="option"] with "@handle" text
    const byRole = document.querySelectorAll('[role="listbox"] [role="option"]');
    for (const item of byRole) {
      if (!item.isConnected) continue;
      if (item.dataset.atprotoHiddenAutocomplete === 'true') continue;

      const text = (item.textContent || '').trim();
      const match = text.match(/@([^\s\u200B-\u200F\u202A-\u202E\u2066-\u2069]+)/);
      if (!match) continue;

      const handle = cleanHandle(match[1]);
      if (!handle) continue;

      if (shouldHideHandle(handle)) {
        item.style.display = 'none';
        item.dataset.atprotoHiddenAutocomplete = 'true';
      }
    }
  }

  function hidePost(item, handle) {
    if (item.getAttribute(HIDDEN_ATTR) === 'true') return;
    if (item.getAttribute('data-atproto-post-shown') === 'true') return;

    const wrapper = document.createElement('div');
    wrapper.className = HIDDEN_CLASS;
    wrapper.setAttribute('role', 'status');
    wrapper.dataset.hiddenHandle = handle;

    const message = document.createElement('span');
    message.textContent = 'Posts from @' + handle + ' are hidden.';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Show';
    button.setAttribute('aria-label', `Show post from @${handle}`);

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showPost(item);
    });

    wrapper.append(message, button);

    item.dataset.atprotoOriginalHtml = item.innerHTML;
    item.setAttribute(HIDDEN_ATTR, 'true');
    item.innerHTML = '';
    item.appendChild(wrapper);
    item.removeAttribute('data-atproto-post-shown');
  }

  function showPost(item) {
    const original = item.dataset.atprotoOriginalHtml;

    if (typeof original !== 'string') {
      console.warn('AT Protocol Handler: no saved markup for hidden post');
      return;
    }

    item.innerHTML = original;
    delete item.dataset.atprotoOriginalHtml;
    item.removeAttribute(HIDDEN_ATTR);

    item.setAttribute('data-atproto-post-shown', 'true');
  }
  
  function createInvalidHandlePopup() {
    if (invalidHandlePopupEl) return invalidHandlePopupEl;

    const popup = document.createElement('div');
    popup.id = 'atproto-invalid-handle-popup';
    popup.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      max-width: 320px;
      padding: 14px 16px;
      border-radius: 12px;
      background: #111827;
      color: #f9fafb;
      font: 13.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      gap: 10px;
      white-space: pre-wrap;
      line-height: 1.45;
    `;

    const message = document.createElement('div');
    message.textContent = INVALID_HANDLE_MESSAGE;

    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 2px;
    `;

    const neverBtn = document.createElement('button');
    neverBtn.type = 'button';
    neverBtn.textContent = 'Never show again';
    neverBtn.style.cssText = `
      appearance: none;
      border: 1px solid #374151;
      background: #1f2937;
      color: #e5e7eb;
      border-radius: 6px;
      padding: 5px 10px;
      cursor: pointer;
      font: inherit;
    `;

    neverBtn.addEventListener('click', () => {
      localStorage.setItem(NEVER_SHOW_INVALID_HANDLE_KEY, 'true');
      popup.remove();
      invalidHandlePopupEl = null;
      invalidHandlePopupShown = true;
    });

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.style.cssText = `
      appearance: none;
      border: 1px solid #374151;
      background: #1f2937;
      color: #e5e7eb;
      border-radius: 6px;
      padding: 5px 10px;
      cursor: pointer;
      font: inherit;
    `;

    dismissBtn.addEventListener('click', () => {
      popup.remove();
      invalidHandlePopupEl = null;
      invalidHandlePopupShown = true;
    });

    buttons.append(neverBtn, dismissBtn);
    popup.append(message, buttons);
    document.body.appendChild(popup);
    invalidHandlePopupEl = popup;
    return popup;
  }
  

  
  function maybeShowInvalidHandlePopup() {
    if (!shouldShowInvalidHandlePopup()) return;
    if (!document.body) return;
    createInvalidHandlePopup();
  }


  if (document.body) {
    initialisePostFiltering();
  } else {
    window.addEventListener(
      'DOMContentLoaded',
      initialisePostFiltering,
      { once: true }
    );
  }
  
    // Debug helper: force-show the invalid-handle popup
  window.__triggerInvalidHandlePopup = function () {
    invalidHandlePopupShown = false;
    maybeShowInvalidHandlePopup();
  };
  
    // Bridge: allow page to trigger the invalid-handle popup via postMessage
	// window.postMessage({ type: 'ATPROTO_TRIGGER_INVALID_HANDLE' }, '*');
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== 'ATPROTO_TRIGGER_INVALID_HANDLE') return;

    invalidHandlePopupShown = false;
    maybeShowInvalidHandlePopup();
  });
  
})();