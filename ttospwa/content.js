(async () => { 


function injectExtensionCSS() {
  const existingStyle = document.getElementById('boards-cleaner-style');
  const cssContent = `
    /* Overlay styles */
    body.overlay-hide { opacity: 0 !important; }
    #custom-loader {
      position: fixed;
      left: 0; top: 0; width: 100vw; height: 100vh;
      z-index: 9999;
      background: #3c5587;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 2em;
      background-image: url('https://us.v-cdn.net/6034073/uploads/CRMQG2RAVE82/boards-logo.png?v=68936b38');
      background-repeat: no-repeat;
      background-position: center 2em;
      background-size: 280px auto;
      flex-direction: column;
      text-align: center;
      padding-top: 50px;
    }

    /* Fullscreen modal overlay */
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
      background: rgba(255,255,255,0.9) !important;
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
    .buttonClose, .closeButton {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      z-index: 2147483648 !important;
      background: transparent;
    }
    body.modal-active, html.modal-active {
      overflow: hidden !important;
    }

	
	
  `;

  if (existingStyle) {
    // Append CSS if needed (avoid duplicates)
    if (!existingStyle.textContent.includes('.Options')) {
      existingStyle.textContent += cssContent;
    }
  } else {
    const style = document.createElement('style');
    style.id = 'boards-cleaner-style';
    style.textContent = cssContent;
    document.head.appendChild(style);
  }
}

// Call the function early in your content.js
injectExtensionCSS();






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
  document
    .querySelectorAll('.DismissMessage.WarningMessage, .DismissMessage.AlertMessage, .DismissMessage.WarningMessage')
    .forEach(el => el.remove());
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

  const storedValue = localStorage.getItem('boardsCleanerDelay');
  const minDelay = storedValue !== null ? Number(storedValue) : 3000;
  
  
  
  let stableDuration = 500; // default value
  
  if (typeof window._overlayMinDelay === 'undefined') {
  const storedDelay = localStorage.getItem('boardsCleanerDelay');
  window._overlayMinDelay = storedDelay !== null ? Number(storedDelay) : 3000;
}

  
  console.log('Overlay min delay:', window._overlayMinDelay);
if (window._overlayMinDelay === 0) {
  stableDuration = 0;
  console.log('stableDuration set to 0');
} else {
  console.log('stableDuration remains at', stableDuration);
}

  
  console.log('minDelay from localStorage:', minDelay);
  console.log('stableDuration:', stableDuration);
  function checkIfStable() {
    const now = performance.now();
    if (now - lastChangeTime >= stableDuration && now >= minDelay) {
      document.documentElement.classList.remove('overlay-hide');
      loader.remove();
      stabilityObserver.disconnect();
	  console.log("Overlay removed after stability check. Delay used:", window._overlayMinDelay, "ms, Stable Duration:", window._overlayStableDuration, "ms");
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
        let updated = false;
        let txt = node.textContent;

        Object.keys(emojiMap).forEach(code => {
          if (txt.includes(code)) {
            updated = true;
            const fragments = txt.split(code);
            const fragmentNodes = [];

            fragments.forEach((text, idx) => {
              if (text) fragmentNodes.push(document.createTextNode(text));
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


const delayOptions = [0, 3000, 7000, 9000, 12000]; // in ms
const storageKey = 'boardsCleanerDelay';

// Initialize delay in localStorage if not set
if (!localStorage.getItem(storageKey)) {
  localStorage.setItem(storageKey, delayOptions[1]); // default 3 seconds
}

// Function to get current delay index
function getCurrentDelayIndex() {
  const delay = Number(localStorage.getItem(storageKey));
  return delayOptions.indexOf(delay);
}

// Function to increment and update delay
function incrementDelay() {
  let currentIndex = getCurrentDelayIndex();
  let nextIndex = (currentIndex + 1) % delayOptions.length;
  localStorage.setItem(storageKey, delayOptions[nextIndex]);
  alert(`BoardsCleaner delay set to: ${delayOptions[nextIndex] / 1000} seconds`);
}

// Listen for Alt + '+' keypress
window.addEventListener('keydown', (e) => {
  // Normalize '+' key detection across keyboards
  if (e.altKey && (e.key === '+' || e.key === '=')) {
    e.preventDefault();
    incrementDelay();
  }
});




(function() {
  // Selector for the full comment form container on Boards.ie
  const formSelector = '.MessageForm.CommentForm';

  // Add the floating "Edit in Modal" button near the full comment form container
  function addFloatingButton() {
    const container = document.querySelector(formSelector);
    if (!container || document.getElementById('boardsCleanerFloatingBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'boardsCleanerFloatingBtn';
    btn.textContent = 'Edit in Modal';
    Object.assign(btn.style, {
      position: 'absolute',
      zIndex: '100000',
      top: '-40px',
      left: '0',
      padding: '6px 12px',
      fontSize: '14px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
    });
    btn.title = 'Open modal editor';

    container.style.position = 'relative';
    container.appendChild(btn);

    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openModalWithForm();
    });
  }

  // Opens the modal and moves the full form into it
  function openModalWithForm() {
    const formContainer = document.querySelector(formSelector);
    if (!formContainer) return;

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

    // Move form container into modal
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
      if (editable) editable.focus();
    });

    modalBox.appendChild(closeBtn);
    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const editable = formContainer.querySelector('[contenteditable="true"], textarea');
    if (editable) editable.focus();

    // Allow modal close on clicking outside content
    modalBg.addEventListener('click', e => {
      if (e.target === modalBg) closeBtn.click();
    });
  }

  // Initialize with retries to wait for form to load
  function init() {
    addFloatingButton();
  }

  let tries = 0;
  const maxTries = 30;
  const interval = setInterval(() => {
    init();
    if (++tries > maxTries) clearInterval(interval);
  }, 300);
})();





(function() {
  // Selector for the full comment form container on Boards.ie
  const formSelector = '.MessageForm.CommentForm';

  // Add the floating "Edit in Modal" button near the full comment form container
  function addFloatingButton() {
    const container = document.querySelector(formSelector);
    if (!container || document.getElementById('boardsCleanerFloatingBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'boardsCleanerFloatingBtn';
    btn.textContent = 'Edit in Modal';
    Object.assign(btn.style, {
      position: 'absolute',
      zIndex: '100000',
      top: '-40px',
      right: '0',
      padding: '6px 12px',
      fontSize: '14px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
    });
    btn.title = 'Open modal editor';

    container.style.position = 'relative';
    container.appendChild(btn);

    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openModalWithForm();
    });
  }

  // Opens the modal and moves the full form into it
  function openModalWithForm() {
    const formContainer = document.querySelector(formSelector);
    if (!formContainer) return;

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

    // Move form container into modal
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
      if (editable) editable.focus();
    });

    modalBox.appendChild(closeBtn);
    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const editable = formContainer.querySelector('[contenteditable="true"], textarea');
    if (editable) editable.focus();

    // Allow modal close on clicking outside content
    modalBg.addEventListener('click', e => {
      if (e.target === modalBg) closeBtn.click();
    });
  }

  // Initialize with retries to wait for form to load
  function init() {
    addFloatingButton();
  }

  let tries = 0;
  const maxTries = 30;
  const interval = setInterval(() => {
    init();
    if (++tries > maxTries) clearInterval(interval);
  }, 300);
})();



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
    z-index: 2147483647;
    font-size: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
  }
  /* Wrapper for the three icons */
.infoIconWrapper {
  position: fixed;
  bottom: 70px;      /* same vertical anchor as your old icon */
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

/* Optional: tweak specific ones */
.navIcon {
  font-size: 12px;   /* if you want slightly different glyph sizing */
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
	
	
	.PageControls.Top, .PageControls.Bottom {
  position: static !important; /* or relative */		
 background: #3c5587; /* or site background so it doesn’t look transparent */
  z-index: 2;
	
	}
	
	.DataTableWrap {
	margin-top: 70px;    /* adjust value to taste */
	z-index: 1;
	}
	
	.Pager.PagerLinkCount-11.NumberedPager, .ButtonGroup.discussion-sort-filter-module.pull-left {
	background: #fff;	
	}


    /* Inline buttons */
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
  let startX, startY, origX = 0, origY = 0;

  // Read initial offset from last move or start at initial CSS (bottom/right)
  function getOffsets() {
    // If data-x/y on button, use those; else, compute from CSS and set them.
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
    document.addEventListener('touchmove', dragMove, {passive: false});
    document.addEventListener('touchend', dragEnd);
    e.preventDefault();
  }
  function dragMove(e) {
    if (!dragging) return;
    const pointer = e.touches ? e.touches[0] : e;
    let dx = origX + (pointer.clientX - startX);
    let dy = origY + (pointer.clientY - startY);

    // Clamp so button stays on screen
    dx = Math.max(0, Math.min(window.innerWidth - btn.offsetWidth, dx));
    dy = Math.max(0, Math.min(window.innerHeight - btn.offsetHeight, dy));

    btn.style.transform = `translate(${dx}px,${dy}px)`;
    btn.setAttribute('data-x', dx);
    btn.setAttribute('data-y', dy);
    // Remove bottom/right/top/left CSS so translate takes effect
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
  btn.addEventListener('touchstart', dragStart, {passive: false});
}




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
	makeProfileToggleButtonDraggable(btn);
  });

  // Create the info icon next to the toggle button
// Create wrapper
const infoWrapper = document.createElement('div');
infoWrapper.className = 'infoIconWrapper';

// Home icon (scroll to top)
const homeIcon = document.createElement('span');
homeIcon.className = 'navIcon';
homeIcon.textContent = '⭡'; // or 'H'
homeIcon.setAttribute('role', 'button');
homeIcon.setAttribute('tabindex', '0');

// Info icon (existing)
const infoIcon = document.createElement('span');
infoIcon.className = 'infoIcon';
infoIcon.textContent = 'i';
infoIcon.setAttribute('role', 'button');
infoIcon.setAttribute('tabindex', '0');

// End icon (scroll to bottom)
const endIcon = document.createElement('span');
endIcon.className = 'navIcon';
endIcon.textContent = '⭳'; // or 'E'
endIcon.setAttribute('role', 'button');
endIcon.setAttribute('tabindex', '0');

// Build vertical stack: home above, info middle, end below
infoWrapper.appendChild(homeIcon);
infoWrapper.appendChild(infoIcon);
infoWrapper.appendChild(endIcon);

document.body.appendChild(infoWrapper);





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
	  <li><b>Toggle Quotes:</b> Alt + 2 </li>
	  <li><b>Clear activation and overlay msg!</b> Alt + q </li>
	  <li><b>Cycle overlay delay</b> Alt + '+' </li>
      <li><b>Bookmarks:</b> <a href="https://www.boards.ie/discussions/bookmarked" target="_top">Alt + 8</a></li>
      <li><b>Mike Comments:</b> <a href="https://www.boards.ie/profile/comments/Boards.ie%3A%20Mike" target="_top">Alt + m</a></li>
      <li><b>Odhran Comments:</b> <a href="https://www.boards.ie/profile/comments/Boards.ie%3A%20Odhran" target="_top">Alt + o</a></li>
      <li><b>Your Own comments:</b> <a href="https://www.boards.ie/profile/comments" target="_top">Alt + c</a></li>
      <li><b>Subbed Members:</b> <a href="https://www.boards.ie/search?domain=members&sort=dateInserted&scope=site&roleIDs[0]=95&source=community" target="_top">Alt + s</a></li>
      <li><b>Subbed Forum:</b> <a href="https://www.boards.ie/group/1878-subscribers-forum" target="_top">Alt + #</a></li>
      <li><b>Notifications:</b> <a href="https://www.boards.ie/profile/notifications" target="_top">Alt + n</a></li>
	  
	  <li><b>Drafts:</b> <a href="https://www.boards.ie/drafts" target="_top">Alt + x</a></li>
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

homeIcon.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

endIcon.addEventListener('click', () => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: maxScroll, behavior: 'smooth' });
});

// Optional keyboard support (Enter/Space)
[homeIcon, endIcon].forEach(el => {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });
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
    case 'x':
      window.open('https://www.boards.ie/drafts', '_top');
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

let storedDelay = Number(localStorage.getItem('boardsCleanerDelay'));
let storedStable = Number(localStorage.getItem('boardsCleanerStableDuration'));

window._overlayMinDelay = (typeof storedDelay === 'number' && storedDelay > 0) 
  ? storedDelay 
  : (isAndroid() ? 9000 : 3000);

window._overlayStableDuration = (typeof storedStable === 'number' && storedStable > 0) 
  ? storedStable 
  : (isAndroid() ? 1800 : 600);


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
