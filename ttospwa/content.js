(async () => { 

const style = document.createElement('style');
style.textContent = `
  /* Your overlay.css content goes here */
  body.overlay-hide { opacity: 0 !important; }
#custom-loader {
  position: fixed;
  left: 0; top: 0; width: 100vw; height: 100vh;
  z-index: 9999;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2em;
}
  /* Add other overlay.css rules... */
`;
document.head.appendChild(style);


  // Hash function: SHA-256 for code validation
  async function hashCode(str) {
    const buffer = new TextEncoder().encode(str);
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
  }

  // Put your hashed shared code here (generate via console example)
  const correctHash = '381bcb983324d4b1443e7e7a7e43212eaf043fac348056a3c93436fc6fad5858';


// Helper to hash code (your existing function)
async function hashCode(str) {
  const buffer = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

async function showActivation() {
  // If user has valid access
  if (localStorage.getItem('paidAccess')) {
    return true;
  }

  // If user chose to skip activation prompt this session
  if (sessionStorage.getItem('skipActivationPrompt')) {
    return false; // Deny access; no features run
  }

  let authenticated = false;
  while (!authenticated) {
    const userCode = prompt(
      "Enter your Boards.ie Cleaner ext. activation code:\n\n" +
      "Type your code, or Cancel.\n\n" +
      "To skip activation prompt this session, type 'SKIP' (case-insensitive)."
    );

    if (userCode === null) return false; // User cancelled

    if (userCode.toLowerCase() === 'skip') {
      sessionStorage.setItem('skipActivationPrompt', 'true');
      alert('Activation prompt skipped for this session. Extension features will be disabled.');
      return false; // Deny access; no features run
    }

    const userHash = await hashCode(userCode);
    if (userHash === correctHash) {
      let savedMessage = localStorage.getItem('overlayMessage');
      let message = prompt(
        "Enter overlay message or leave blank for default:\n" +
        "Options:\n" +
        "1: Thank you for supporting Boards.ie!\n" +
        "2: Access granted!\n" +
        "3: Boards.ie Cleaner by corkie!\n\n" +
        `Current: ${savedMessage || "Default message"}`,
        savedMessage || ''
      );

      const overlayMessages = {
        "1": "Thank you for supporting Boards.ie!",
        "2": "Access granted!",
        "3": "Boards.ie Cleaner by corkie!"
      };
	  
	  const delayOptions = {
  "0": 0,
  "3": 3000,
  "7": 7000,
  "9": 9000,
  "12": 12000
};

let delayMessage = "Choose delay for Overlay:\n" +
  "0: None\n" +
  "3: 3 seconds\n" +
  "7: 7 seconds\n" +
  "9: 9 seconds\n" +
  "12: 12 seconds\n\n(Default = 3)";

let selectedDelay = prompt(delayMessage, "3"); // Default pre-selected
let delay = delayOptions[selectedDelay] ?? 3000; // Fallback to 3s default

localStorage.setItem('boardsCleanerDelay', delay);


      if (!message) {
        message = 'Boards.ie Cleaner | Created by corkie! | Thanks for supporting the site | Loading...';
      } else if (overlayMessages[message]) {
        message = overlayMessages[message];
      }

      localStorage.setItem('paidAccess', 'true');
      localStorage.setItem('overlayMessage', message);
      alert('Access granted!');
      authenticated = true;
      return true; // Allow features to run
    } else {
      alert('Invalid code, please try again.');
    }
  }
  return false; // fallback deny access
}

(async () => {
  const authorized = await showActivation();
  if (authorized) {
    runExtensionFeatures();
  } else {
    // Access denied or prompt skipped, do not run features
    // Optionally you can clear or remove overlays here if needed
  }
})();



})();

function runExtensionFeatures() {
  console.log("Content script loaded");

// === Create and insert overlay ASAP ===
let loader = document.createElement('div');
loader.id = 'custom-loader';
loader.textContent = localStorage.getItem('overlayMessage') || 'Boards.ie Cleaner  | Thanks for supporting the site | Loading...';
document.documentElement.appendChild(loader);
document.documentElement.classList.add('overlay-hide');

  // Remove Boards.ie warning banner & similar
  function removeWarning() {
    document.querySelectorAll('.DismissMessage.WarningMessage').forEach(el => el.remove());
  }
  removeWarning();

  // Inject ad-hiding CSS
  (function() {
    const adsStyle = document.createElement('style');
    adsStyle.textContent = '.mid-ad, .ad-container, .ad-text { display: none !important; }';
    document.head.appendChild(adsStyle);
  })();

  // Watch DOM for dynamic banner insertion
  const warningObserver = new MutationObserver(removeWarning);
  warningObserver.observe(document.documentElement, { childList: true, subtree: true });

  // Layout stability detection & overlay removal
  let lastChangeTime = performance.now();
  const stabilityObserver = new MutationObserver(() => {
    lastChangeTime = performance.now();
  });
  stabilityObserver.observe(document.documentElement, { childList: true, subtree: true });
//  const minDelay = 3000; // ms
  const minDelay = Number(localStorage.getItem('boardsCleanerDelay')) || 3000;
  const stableDuration = 500; // ms
  function checkIfStable() {
    const now = performance.now();
    if (now - lastChangeTime >= stableDuration && now >= minDelay) {
      document.documentElement.classList.remove('overlay-hide');
      loader.remove();
      stabilityObserver.disconnect();
      console.log("Overlay removed after stability check");
    } else {
      requestAnimationFrame(checkIfStable);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      lastChangeTime = performance.now();
      requestAnimationFrame(checkIfStable);
    });
  } else {
    lastChangeTime = performance.now();
    requestAnimationFrame(checkIfStable);
  }

function isFirefox() {
  return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}

function replacePacEmoji() {
  const pacMap = { ':pac:': 'https://i.imgur.com/JYORVpC.png' };
  const posts = document.querySelectorAll('.userContent > p');
  
  posts.forEach(post => {
    const childNodes = Array.from(post.childNodes);
    childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(':pac:')) {
        const fragments = node.textContent.split(':pac:');
        const fragmentNodes = [];

        fragments.forEach((text, index) => {
          if (text) fragmentNodes.push(document.createTextNode(text));
          if (index < fragments.length - 1) {
            const img = document.createElement('img');
            img.src = pacMap[':pac:'];
            img.alt = ':pac:';
            img.className = 'emoji';
            fragmentNodes.push(img);
          }
        });

        fragmentNodes.forEach(n => post.insertBefore(n, node));
        post.removeChild(node);
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!isFirefox()) {
      replacePacEmoji();
    }
  });
} else {
  if (!isFirefox()) {
    replacePacEmoji();
  }
}


  // Prevent 'Quote' button scrolling page to top
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('a.js-quoteButton[href="#"]');
    if (btn) {
      e.preventDefault();
    }
  });

  // Profile link toggling & popup code omitted for brevity (reuse your existing code)
  // Single toggle state variable
let toggleState = false; // false = discussions, true = comments



function toggleProfileLinks() {
  // Select all <a> tags that look like profile or mention links
    toggleState = !toggleState;
  const links = document.querySelectorAll(
    'a[href^="/profile/"], a[href^="https://www.boards.ie/profile/"], a.atMention[href*="/profile/"]'
  );

  links.forEach(link => {
    let href = link.getAttribute('href');

    // Match root-relative and absolute, with/without 'discussions'/'comments', with or without trailing slash
    // Capture the username (Group 1)
    let match = href.match(
      /^(?:https?:\/\/(?:www\.)?boards\.ie)?\/profile\/(?:discussions\/|comments\/)?([^\/?#]+)(?:[\/?#].*)?$/
    );
    if (match) {
      const username = match[1];
      // Build the toggled link; always root-relative for best compatibility
      const newHref = toggleState
        ? `/profile/comments/${username}`
        : `/profile/discussions/${username}`;
      link.setAttribute('href', newHref);
    }
  });

  showPopup(`Profile links toggled to ${toggleState ? 'comments' : 'discussions'}`);
}





// Reusable popup function
function showPopup(message) {
  let popup = document.getElementById('togglePopup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'togglePopup';
    Object.assign(popup.style, {
      position: 'fixed',
      bottom: '60px',            // Positioned above the button (button is at 20px)
      right: '20px',
      padding: '10px 20px',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      borderRadius: '5px',
      zIndex: 99999,
      fontSize: '14px',
      transition: 'opacity 0.5s',
      pointerEvents: 'none'      // Allow clicks to pass through popup
    });
    document.body.appendChild(popup);
  }
  popup.textContent = message;
  popup.style.opacity = '1';

  setTimeout(() => {
    popup.style.opacity = '0';
  }, 2000);
}
document.addEventListener('click', function(event) {
  // Find closest element with js-userCard class, either span or anchor
  const el = event.target.closest('.js-userCard');
  if (!el) return;

  let username = null;

  if (el.tagName.toLowerCase() === 'a' && el.href) {
    // Extract username from URL
    const match = el.href.match(/\/profile\/(?:discussions\/|comments\/)?([^\/?#]+)/);
    if (match) {
      username = decodeURIComponent(match[1]);
    }
  } else if (el.tagName.toLowerCase() === 'span') {
    // Extract username from text content for span elements
    username = el.textContent.trim();
  }

  if (!username) return;

  event.preventDefault(); // Prevent default behavior, e.g., dropdown

  const profileURL = toggleState
    ? `/profile/comments/${encodeURIComponent(username)}`
    : `/profile/discussions/${encodeURIComponent(username)}`;

  // Redirect browser to the toggled profile URL
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
    z-index: 99999;
    font-size: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
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
    position: fixed;
    bottom: 70px;
    right: 10px;
    background-color: white;
    z-index: 99999;
  }
  dialog#shortcutDialog {
    padding: 1em 1.5em;
    border-radius: 8px;
    border: 1px solid #ccc;
    box-shadow: 0 8px 16px rgba(0,0,0,0.25);
    max-width: 320px;
  }
  dialog#shortcutDialog::backdrop {
    background: rgba(0,0,0,0.3);
  }
  dialog#shortcutDialog button.closeBtn {
    margin-top: 1em;
    padding: 0.3em 1em;
    cursor: pointer;
  }
`;
document.head.appendChild(style);

function insertToggleButton() {
  // Create the Toggle Profiles button
  const btn = document.createElement('button');
  btn.id = 'profileToggleBtn';
  btn.textContent = 'Toggle Profiles';
  document.body.appendChild(btn);

  // Updated click handler to toggle between discussions/comments pages if detecting on those pages
  btn.addEventListener('click', () => {
    const path = window.location.pathname;
    const match = path.match(/^\/profile\/(discussions|comments)\/([^\/]+)(\/.*)?$/);
    if (match) {
      const section = match[1]; // 'discussions' or 'comments'
      const username = match[2];
      const targetSection = (section === 'discussions') ? 'comments' : 'discussions';
      const newPath = `/profile/${targetSection}/${username}`;
      window.location.href = newPath;
    } else {
      // fallback to your existing toggleProfileLinks function if available
      if (typeof toggleProfileLinks === 'function') {
        toggleProfileLinks();
      }
    }
  });

  // Create the info icon next to the toggle button
  const infoIcon = document.createElement('span');
  infoIcon.className = 'infoIcon';
  infoIcon.textContent = 'i';
  infoIcon.setAttribute('role', 'button');
  infoIcon.setAttribute('tabindex', '0');
  document.body.appendChild(infoIcon);

  // Create the modal dialog
  const dialog = document.createElement('dialog');
  dialog.id = 'shortcutDialog';

  // Inner content for modal dialog
  const content = document.createElement('div');
  content.innerHTML = `
    <h2>Boards.ie Cleaner</h2>
	<h3>Shortcut Keys & Links</h3>
    <ul>
	  <li><b>Info this popup</b> Alt + i </li>
      <li><b>Toggle Profiles:</b> Alt + p </li>
	  <li><b>Clear activation and overlay msg!</b> Alt + q </li>
      <li><b>Bookmarks:</b> <a href="https://www.boards.ie/discussions/bookmarked" target="_top">Alt + 8</a></li>
      <li><b>Mike Comments:</b> <a href="https://www.boards.ie/profile/comments/Boards.ie%3A%20Mike" target="_top">Alt + m</a></li>
      <li><b>Odhran Comments:</b> <a href="https://www.boards.ie/profile/comments/Boards.ie%3A%20Odhran" target="_top">Alt + o</a></li>
      <li><b>Your Own comments:</b> <a href="https://www.boards.ie/profile/comments" target="_top">Alt + c</a></li>
      <li><b>Subbed Members:</b> <a href="https://www.boards.ie/search?domain=members&sort=dateInserted&scope=site&roleIDs[0]=95&source=community" target="_top">Alt + s</a></li>
      <li><b>Subbed Forum:</b> <a href="https://www.boards.ie/group/1878-subscribers-forum" target="_top">Alt + #</a></li>
      <li><b>Notifications:</b> <a href="https://www.boards.ie/profile/notifications" target="_top">Alt + n</a></li>
    </ul>
  `;
  dialog.appendChild(content);


// Open info screen with Alt+I shortcut
window.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'i') {
    e.preventDefault();
    dialog.showModal();
  }
});


  // Add a close button inside the dialog
  const closeBtn = document.createElement('button');
  closeBtn.className = 'closeBtn';
  closeBtn.textContent = 'Close';
  dialog.appendChild(closeBtn);

  // Append dialog to document body
  document.body.appendChild(dialog);

  // Open modal on clicking info icon
  infoIcon.addEventListener('click', () => {
    dialog.showModal();
  });

  // Close modal on clicking close button
  closeBtn.addEventListener('click', () => {
    dialog.close();
  });

  // Keyboard accessibility: allow Enter or Space to open modal
  infoIcon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dialog.showModal();
    }
  });
}

insertToggleButton();



  // Keyboard shortcut to toggle profiles on Alt+P
window.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'p') {
    e.preventDefault();

    // Get current pathname
    const path = window.location.pathname;

    // Regex to extract username and whether in discussions or comments
    const match = path.match(/^\/profile\/(discussions|comments)\/([^\/]+)(\/.*)?$/);
    if (match) {
      const section = match[1]; // 'discussions' or 'comments'
      const username = match[2];

      // Determine the target section (toggle)
      const targetSection = (section === 'discussions') ? 'comments' : 'discussions';

      // Construct new URL path
      const newPath = `/profile/${targetSection}/${username}`;

      // Navigate to toggled page
      window.location.href = newPath;

    } else {
      // If not on a profile discussions/comments page, fallback to toggling profile links in page
      if (typeof toggleProfileLinks === 'function') {
        toggleProfileLinks();
      }
    }
  }
});

(function() {
  'use strict';

  let featureEnabled = true;
  const processedAttr = 'data-quote-processed';

  function processQuotes(enabled) {
    document.querySelectorAll('article.css-1hlhx5t-quoteEmbed-body').forEach(article => {
      const userAnchor = article.querySelector('a[data-link-type="legacy"]');
      if (!userAnchor) return;
      const username = userAnchor.textContent.trim();

      if (enabled) {
        // Only handle if not processed, or if all quotes are visible but links are absent
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
        // Always show, always remove the links, always remove the processed attribute
        article.style.display = '';
        const prev = article.previousElementSibling;
        if (prev && prev.tagName === 'A' && prev.textContent.startsWith('Display quote of')) {
          prev.remove();
        }
        article.removeAttribute(processedAttr);
      }
    });
  }

  // Use debounce to efficiently process batches of mutations on the DOM
  let debounceTimeout;
  const observer = new MutationObserver(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      processQuotes(featureEnabled);
    }, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial batch processing, plus delayed retries for slow/batched loads
  function initialize() {
    processQuotes(featureEnabled);

    let retryCount = 0;
    const maxRetries = 5;
    const retryInterval = setInterval(() => {
      if (retryCount++ >= maxRetries) clearInterval(retryInterval);
      processQuotes(featureEnabled);
    }, 2000);
  }
  if (document.readyState === 'complete') {
    initialize();
  } else {
    window.addEventListener('load', () => setTimeout(initialize, 1000));
  }

  // Desktop only: Alt+2 toggles full quote hiding feature
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
window.addEventListener('keydown', function(event) {
  if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) return;
  switch(event.key.toLowerCase()) {
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
	  
	  
  }
});

window.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'q') {
    localStorage.removeItem('paidAccess');
    localStorage.removeItem('overlayMessage');
    alert('Paid access and overlay message cleared. Please refresh the page.');
  }
});

// Select all divs with original class
const threadBitDivs = document.querySelectorAll('div.spritethreadbit.spritethreadbit-latestpost');

threadBitDivs.forEach(div => {
  // Option 1: Replace classes individually
  div.classList.replace('spritethreadbit', 'spritethreadrow');
  div.classList.replace('spritethreadbit-latestpost', 'latest-button');

  // Option 2 (alternative): Directly overwrite class attribute
  // div.className = 'spritethreadrow latest-button';

  // Optional: style to indicate clickable if needed
  div.style.cursor = 'pointer';
});

(function() {
  function isAndroid() {
    return /android/i.test(navigator.userAgent);
  }

  // Declare or update minDelay and stableDuration
  if (typeof window._overlayMinDelay === 'undefined') {
    window._overlayMinDelay = isAndroid() ? 9000 : 3000;      // ms
  }

  if (typeof window._overlayStableDuration === 'undefined') {
    window._overlayStableDuration = isAndroid() ? 1800 : 600; // ms
  }

  // Declare or update lastChangeTime
  if (typeof window._lastChangeTime === 'undefined') {
    window._lastChangeTime = performance.now();
  } else {
    window._lastChangeTime = performance.now();
  }

  // Declare or initialize MutationObserver
  if (typeof window._stabilityObserver === 'undefined') {
    window._stabilityObserver = new MutationObserver(() => {
      window._lastChangeTime = performance.now();
    });
    window._stabilityObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Stability check function
  function checkIfStable(loader) {
    const now = performance.now();
    if (now - window._lastChangeTime >= window._overlayStableDuration && now >= window._overlayMinDelay) {
      document.documentElement.classList.remove('overlay-hide');
      if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
      window._stabilityObserver.disconnect();
      console.log("Overlay removed after stability check");
    } else {
      requestAnimationFrame(() => checkIfStable(loader));
    }
  }

  // Example overlay creation (ensure "loader" exists in your code before call)
  let loader = document.getElementById('custom-loader');
  if (loader) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          requestAnimationFrame(() => checkIfStable(loader));
        }, isAndroid() ? 1000 : 0);
      });
    } else {
      setTimeout(() => {
        requestAnimationFrame(() => checkIfStable(loader));
      }, isAndroid() ? 1000 : 0);
    }
  }
})();


}
