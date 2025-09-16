(function() {
  const fullscreenCSS = `
    /* Fullscreen overlay */
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

    /* Fullscreen modal */
    .css-q5q25-modal {
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

    /* Popup frame */
    .frame.css-ab90li-frameStyles-root {
      flex: 1 1 auto !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      overflow-y: auto !important;
      box-sizing: border-box !important;
    }
    
    /* Scrollable content section */
    .css-1usqrh9-frameStyles-bodyWrap {
      flex: 1 1 auto !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
    }

    /* Close button fix */
    .buttonClose, .closeButton {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      z-index: 2147483648 !important;
      background: transparent;
    }

    /* Lock page scroll when modal active */
    body.modal-active, html.modal-active {
      overflow: hidden !important;
    }
  `;

  // Inject CSS once
  if (!document.getElementById('fullscreen-popup-style')) {
    const style = document.createElement('style');
    style.id = 'fullscreen-popup-style';
    style.textContent = fullscreenCSS;
    document.head.appendChild(style);
  }

  // Lock body scroll and add modal-active class
  function lockScroll() {
    document.body.classList.add('modal-active');
    document.documentElement.classList.add('modal-active');
  }

  function unlockScroll() {
    document.body.classList.remove('modal-active');
    document.documentElement.classList.remove('modal-active');
  }

  // Observe popup activation by monitoring DOM for popup container presence
  const observer = new MutationObserver(() => {
    const popup = document.querySelector('.frame.css-ab90li-frameStyles-root');
    if (popup && window.getComputedStyle(popup).display !== 'none') {
      lockScroll();
    } else {
      unlockScroll();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Optional: listen for "Flag" clicks to anticipate popup open
  document.addEventListener('click', (e) => {
    if (e.target.closest('span.ReactLabel') && e.target.closest('span.ReactLabel').textContent.trim() === 'Flag') {
      // Popup likely opening, let CSS and scroll lock handle display
    }
  });

})();
