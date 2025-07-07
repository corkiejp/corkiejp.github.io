console.log("AT Protocol Handler content script loaded on", window.location.href);

// Remove any existing popup
function removePopup() {
  const old = document.getElementById('atproto-popup');
  if (old) old.remove();
}

// Show the popup with all links
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
    <b>Open at:// URI with:</b><br>
    <a href="https://corkiejp.github.io/ATProtoViewer/index.html?uri=${encodeURIComponent(aturl)}" target="_blank" style="display:block; margin-top:8px;">ATProtoViewer</a>
    <a href="https://corkiejp.github.io/ttospwa/index.html?uri=${encodeURIComponent(aturl)}" target="_blank" style="display:block; margin-top:4px;">List of sites to open!</a>
    <a href="${extensionListUrl}" target="_blank" style="display:block; margin-top:4px;">Extension List Page</a>
    <button id="atproto-popup-close" style="margin-top:12px;display:block;">Close</button>
  `;

  document.body.appendChild(popup);

  document.getElementById('atproto-popup-close').onclick = removePopup;
  setTimeout(() => {
    document.addEventListener('mousedown', function handler(e) {
      if (!popup.contains(e.target)) {
        removePopup();
        document.removeEventListener('mousedown', handler);
      }
    });
  }, 100);
}

// Main event listener for copy button clicks (ONLY for post copy buttons)
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
}); // <-- THIS WAS MISSING

// Keydown shortcut for posts and feeds (Alt+C)
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

      // Open the right viewer
      if (isDeerPost || isBskyPost) {
        // Open post in ATProtoViewer
        window.open(
          `https://corkiejp.github.io/ATProtoViewer/index.html?uri=${encodeURIComponent(url)}`,
          '_blank'
        );
        console.log('Post URL copied and viewer opened:', url);
      } else if (isDeerFeed || isBskyFeed) {
        // Open feed/list in ATProtoSimpleFeeds
        window.open(
          `https://corkiejp.github.io/ATProtoViewer/ATProtoSimpleFeeds.html?input=${encodeURIComponent(url)}`,
          '_blank'
        );
        console.log('Feed URL copied and viewer opened:', url);
      }
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  }
});
