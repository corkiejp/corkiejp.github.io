// assets/js/features/dom-enhancements.js

const EMOJI_MAP = {
  ':pac:': 'https://i.imgur.com/JYORVpC.png',
  ':poop:': '💩'
};

function isFirefox() {
  return navigator.userAgent.toLowerCase().includes('firefox');
}

function formatPmTitle(fullText) {
  if (!fullText) return '';
  return fullText.replace(/^(.+\d{4})\s+(\d{1,2}:\d{2}\s*[AP]M)$/i, '$1 at $2');
}

export function refreshDomEnhancements(root = document) {
  refreshPmTimeFormatting(root);
  replaceCustomEmojis(root);
  refreshThreadbitTweaks(root);
}

export function initDomEnhancements(root = document) {
  refreshDomEnhancements(root);
}

export function refreshPmTimeFormatting(root = document) {
  const timeEls = root.querySelectorAll('.MItem.DateCreated time[title]');

  timeEls.forEach((timeEl) => {
    const fullText = timeEl.getAttribute('title');
    if (!fullText) return;
    if (timeEl.dataset.bcFullDateTime === fullText) return;

    const formatted = formatPmTitle(fullText);
    if (!formatted) return;

    timeEl.textContent = formatted;
    timeEl.dataset.bcFullDateTime = fullText;
  });
}

export function replaceCustomEmojis(root = document) {
  if (isFirefox()) return;

  const posts = root.querySelectorAll('.userContent p');

  posts.forEach((post) => {
    const childNodes = Array.from(post.childNodes);

    childNodes.forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;

      const text = node.textContent;
      if (!text) return;

      let changed = false;
      const fragment = document.createDocumentFragment();
      let remaining = text;

      while (remaining.length) {
        let matched = false;

        for (const [code, replacement] of Object.entries(EMOJI_MAP)) {
          const idx = remaining.indexOf(code);
          if (idx === -1) continue;

          if (idx > 0) {
            fragment.appendChild(document.createTextNode(remaining.slice(0, idx)));
          }

          if (replacement.startsWith('http')) {
            const img = document.createElement('img');
            img.src = replacement;
            img.alt = code;
            img.className = 'emoji';
            fragment.appendChild(img);
          } else {
            const span = document.createElement('span');
            span.textContent = replacement;
            span.className = 'emoji';
            fragment.appendChild(span);
          }

          remaining = remaining.slice(idx + code.length);
          matched = true;
          changed = true;
          break;
        }

        if (!matched) {
          fragment.appendChild(document.createTextNode(remaining));
          remaining = '';
        }
      }

      if (changed) {
        post.insertBefore(fragment, node);
        post.removeChild(node);
      }
    });
  });
}

export function refreshThreadbitTweaks(root = document) {
  const threadBits = root.querySelectorAll(
    'div.spritethreadbit.spritethreadbit-latestpost'
  );

  threadBits.forEach((el) => {
    el.classList.replace('spritethreadbit', 'spritethreadrow');
    el.classList.replace('spritethreadbit-latestpost', 'latest-button');
    el.style.cursor = 'pointer';
  });
}