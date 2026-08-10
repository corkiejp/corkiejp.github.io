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

  const SUPPORTED_CLIENTS = new Set([
    'wsocial.eu',
    'bsky.app',
    'deer.social'
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

  function getProfileHandleFromHref(anchor) {
    const href = anchor.getAttribute('href') || '';

    // Match only /profile/<handle>.
    // This deliberately excludes /profile/<handle>/post/<rkey>.
    const match = href.match(/^\/profile\/([^/?#]+)\/?$/);

    return match ? decodeURIComponent(match[1]) : null;
  }

  function isHandleAnchor(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) {
      return false;
    }

    const handle = getProfileHandleFromHref(anchor);
    if (!handle) {
      return false;
    }

    const visibleText = cleanText(anchor.textContent);

    // This excludes the display-name link, for example "Richard Bell".
    return visibleText === `@${handle}`;
  }

  function getOrCreateCopyButton(anchor, fullHandle) {
    const parent = anchor.parentElement;
    if (!parent) return null;

    let button = parent.querySelector(
      `.${HANDLE_BUTTON_CLASS}[data-handle="${CSS.escape(fullHandle)}"]`
    );

    if (button) {
      return button;
    }

    button = document.createElement('button');
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

      try {
        await navigator.clipboard.writeText(value);

        const oldText = button.textContent;
        const oldLabel = button.getAttribute('aria-label');

        button.textContent = '✓';
        button.setAttribute('aria-label', 'Handle copied');

        setTimeout(() => {
          if (!button.isConnected) return;
          button.textContent = oldText;
          button.setAttribute('aria-label', oldLabel);
        }, 1000);
      } catch (error) {
        console.error('AT Protocol Handler: unable to copy handle', error);
      }
    });

    // Insert directly after the handle anchor, not around the entire post.
    anchor.insertAdjacentElement('afterend', button);

    return button;
  }

  function processHandleAnchor(anchor) {
    if (!isHandleAnchor(anchor)) {
      return;
    }

    const fullHandle = getProfileHandleFromHref(anchor);
    if (!fullHandle) {
      return;
    }

    const fullDisplayHandle = `@${fullHandle}`;
    const isWsocial = window.location.hostname === 'wsocial.eu';

    /*
     * React clients can reuse an existing anchor and change its text.
     * Therefore, a processed marker prevents duplicate buttons, but does
     * not prevent us from correcting the visible text again.
     */
    const alreadyProcessed =
      anchor.getAttribute(HANDLE_PROCESSED_ATTR) === 'true';

    anchor.setAttribute(HANDLE_PROCESSED_ATTR, 'true');
    anchor.setAttribute(HANDLE_VALUE_ATTR, fullDisplayHandle);
    anchor.title = fullDisplayHandle;
    anchor.dataset.fullHandle = fullDisplayHandle;

    if (isWsocial) {
      const shortened = fullHandle.replace(/\.wsocial\.eu$/i, '');
      const shortenedDisplay = `@${shortened}`;

      if (cleanText(anchor.textContent) !== shortenedDisplay) {
        anchor.textContent = shortenedDisplay;
      }
    }

    if (!alreadyProcessed) {
      getOrCreateCopyButton(anchor, fullHandle);
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
      .querySelectorAll('a[href^="/profile/"]')
      .forEach(processHandleAnchor);
  }

  function injectHandleStyles() {
    if (document.getElementById('atproto-handle-copy-style')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'atproto-handle-copy-style';

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
    `;

    document.head.appendChild(style);
  }

  function startHandleObserver() {
    if (!document.body) {
      return;
    }

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scanForHandles(node);
          }
        }

        /*
         * If React changes the text inside an existing anchor, the anchor
         * itself may not appear in addedNodes. Recheck changed elements.
         */
        if (
          mutation.type === 'characterData' &&
          mutation.target.parentElement
        ) {
          const anchor = mutation.target.parentElement.closest(
            'a[href^="/profile/"]'
          );

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

  injectHandleStyles();
  scanForHandles();
  startHandleObserver();
})();
