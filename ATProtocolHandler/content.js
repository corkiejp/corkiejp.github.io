console.log("AT Protocol Handler content script loaded on", window.location.href);

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

  popup.innerHTML = `
  <h3 title="Drag to move" style="margin-top:0;margin-bottom:0.5em;cursor:move;user-select:none;">
    <span style="font-size:1.2em;vertical-align:middle;opacity:0.6;margin-right:0.3em;">&#9776;</span>
    ATProtocol Handler
  </h3>
  <div style="font-size:0.95em;color:#666;margin-bottom:0.5em;">
    <em>Tip: Drag the title bar to move this popup</em>
  </div>
    <b>Open at:// URI with:</b><br>
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

  // --- Draggable logic (mouse + touch, with viewport limiting) ---
  const header = popup.querySelector('h3');
  header.style.cursor = 'move';
  header.style.userSelect = 'none';

  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // Mouse drag
  header.addEventListener('mousedown', function(e) {
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
document.body.addEventListener('click', async (e) => {
  let el = e.target;
  // Traverse up the DOM tree to check for the right attributes
  while (el) {
    if (
      (el.getAttribute && el.getAttribute('aria-label') === 'Copy post at:// URI') ||
      (el.getAttribute && el.getAttribute('data-testid') === 'postAtUriShareBtn')
    ) {
      setTimeout(async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text.startsWith('at://')) {
            showPopup(text, e.clientX, e.clientY);
          }
        } catch (err) {
          console.error('Clipboard read failed:', err);
        }
      }, 100);
      break;
    }
    el = el.parentElement;
  }
}); 

// --- Keydown shortcut for posts and feeds (Alt+C)
document.addEventListener('keydown', async function(e) {
  if (e.altKey && e.key.toLowerCase() === 'c') {
    const url = window.location.href;

    // Patterns for posts
    const isDeerPost = url.startsWith('https://deer.social/') && url.includes('/post/');
    const isBskyPost = url.startsWith('https://bsky.app/profile/') && url.includes('/post/');

    // Patterns for feeds/lists
    const isDeerFeed = url.startsWith('https://deer.social/') && url.includes('/feed/');
    const isBskyFeed = url.startsWith('https://bsky.app/profile/') && url.includes('/feed/');

    try {
      // Copy the URL in all cases
      if (isDeerPost || isBskyPost || isDeerFeed || isBskyFeed) {
        await navigator.clipboard.writeText(url);
      }

      // Open the right viewer for posts
      if (isDeerPost || isBskyPost) {
        window.open(
          `https://corkiejp.github.io/ATProtoViewer/index.html?uri=${encodeURIComponent(url)}`,
          '_blank'
        );
        console.log('Post URL copied and viewer opened:', url);
      }
      // Open the right viewer for feeds/lists
      else if (isDeerFeed || isBskyFeed) {
        window.open(
          `https://corkiejp.github.io/ATProtoViewer/ATProtoSimpleFeeds.html?input=${encodeURIComponent(url)}`,
          '_blank'
        );
        console.log('Feed URL copied and viewer opened:', url);
      }
      // --- Klearsky support ---
      else if (window.location.hostname === 'klearsky.pages.dev') {
        // Try to extract the at:// URI from the hash
        const hash = window.location.hash;
        const match = hash.match(/[?&]uri=([^&]+)/);
        if (match) {
          const aturl = decodeURIComponent(match[1]);
          await navigator.clipboard.writeText(aturl);

          // Open the post in ATProtoViewer
          window.open(
            `https://corkiejp.github.io/ATProtoViewer/index.html?uri=${encodeURIComponent(aturl)}`,
            '_blank'
          );
          console.log('Klearsky at:// URI copied and viewer opened:', aturl);
        } else {
          // Optionally, handle feeds or lists if you want (klearsky doesn't have a standard feed/list URL pattern)
          alert('No at:// post URI found in the current Klearsky page.');
        }
      }
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
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

document.addEventListener('keydown', function(e) {
  // Alt+L for opening the external popup
  if (e.altKey && e.key.toLowerCase() === 'l') {
    let url = null;

    // For bsky.app and deer.social, just use the current URL if it's a post
    if (
      (window.location.hostname === 'bsky.app' && window.location.pathname.startsWith('/profile/') && window.location.pathname.includes('/post/')) ||
      (window.location.hostname === 'deer.social' && window.location.pathname.includes('/post/'))
    ) {
      url = window.location.href;
    }

    // For klearsky, extract the Bluesky or at:// url from the hash
    if (window.location.hostname === 'klearsky.pages.dev') {
      const hash = window.location.hash;
      // Try to get a Bluesky or at:// URL from the hash
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
  }
});
