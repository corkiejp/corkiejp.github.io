/*!
 * Derived in part from Unwall by Mert Keleş:
 * https://github.com/kelesmert/unwall/
 *
 * Original project license: GPL-3.0-or-later
 * Keep this notice with derived code.
 */

const ANTIWALL_TEXT_PATTERNS = [
  /adblock(?:er)?[\s\S]{0,40}detected|enabled|active/i,
  /detected|enabled|active[\s\S]{0,40}adblock(?:er)?/i,
  /disable[\s\S]{0,40}(?:your\s+)?ad[- ]?block(?:er|ing)?/i,
  /turn off[\s\S]{0,40}ad[- ]?block(?:er|ing)?/i,
  /please[\s\S]{0,40}(?:disable|turn off)[\s\S]{0,40}adblock/i,
  /whitelist[\s\S]{0,40}(?:this\s+)?(?:site|website)/i,
  /allow[\s\S]{0,40}ads[\s\S]{0,40}(?:continue|access|support)/i
];

const ANTIWALL_ATTR_PATTERNS = [
  /adblock(?:er|ing)?/i,
  /overlay|modal|popup|wall|notice|detect|detected/i
];

const PROTECTED_SELECTOR = [
  'video', 'audio', 'iframe', 'canvas', 'object', 'embed', 'picture',
  'form', 'input', 'textarea', 'select',
  '[type="password"]', '[type="file"]',
  '.video-js', '.display-card.video', '[class*="video-player"]',
  '[class*="videoplayer"]', '[class*="youtube"]', '[class*="player-container"]',
  '[id*="video-player"]'
].join(',');

const SCROLL_LOCK_CLASSES = [
  'modal-open', 'no-scroll', 'noscroll', 'scroll-lock', 'scroll-locked', 'overflow-hidden', 'locked'
];

const antiwallState = {
  observer: null,
  observerTimer: null,
  scheduledScan: false,
  suppressObserver: false
};

function antiwallNormalizedText(element) {
  return String(element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function antiwallSignalText(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function antiwallIsVisible(element) {
  if (!(element instanceof Element)) return false;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity || 1) > 0.02 &&
    rect.width > 5 &&
    rect.height > 5
  );
}

function antiwallContainsProtectedContent(element) {
  if (!(element instanceof Element)) return false;
  try {
    return !!(element.matches(PROTECTED_SELECTOR) || element.querySelector(PROTECTED_SELECTOR));
  } catch {
    return false;
  }
}

function antiwallAttributeText(element) {
  if (!(element instanceof Element)) return '';
  const parts = [
    element.id,
    element.className,
    element.getAttribute('name'),
    element.getAttribute('aria-label'),
    element.getAttribute('role')
  ];

  try {
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-')) {
        parts.push(attr.name, attr.value);
      }
    }
  } catch {}

  return antiwallSignalText(parts.join(' '));
}

function antiwallHasTextSignal(element) {
  const text = antiwallNormalizedText(element);
  if (!text || text.length > 1200) return false;
  return ANTIWALL_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function antiwallHasAttrSignal(element) {
  const text = antiwallAttributeText(element);
  if (!text) return false;
  return ANTIWALL_ATTR_PATTERNS.some((pattern) => pattern.test(text));
}

function antiwallNumericZIndex(element) {
  const n = parseInt(getComputedStyle(element).zIndex, 10);
  return Number.isFinite(n) ? n : 0;
}

function antiwallFindWarningElements(scope = document) {
  const root = scope instanceof Document ? scope : (scope.ownerDocument || document);
  const selectors = [
    '[role="dialog"]', '[role="alertdialog"]', '[aria-modal="true"]',
    '[id]', '[class]', '[aria-label]',
    'h1', 'h2', 'h3', 'h4', 'p', 'span', 'button', 'div', 'section', 'aside'
  ].join(',');

  return [...root.querySelectorAll(selectors)]
    .filter(antiwallIsVisible)
    .filter((el) => !el.closest(PROTECTED_SELECTOR))
    .filter((el) => antiwallHasTextSignal(el) || antiwallHasAttrSignal(el))
    .filter((el) => {
      const childHasOwnSignal = [...el.children].some(
        (child) => antiwallIsVisible(child) && (antiwallHasTextSignal(child) || antiwallHasAttrSignal(child))
      );
      return !childHasOwnSignal;
    });
}

function antiwallFindPopup(element) {
  let current = element;
  while (current && current !== document.body && current !== document.documentElement) {
    if (antiwallContainsProtectedContent(current)) return null;
    const tag = current.tagName.toLowerCase();
    if (tag === 'main' || tag === 'article') return null;

    const style = getComputedStyle(current);
    const rect = current.getBoundingClientRect();
    const role = current.getAttribute('role');
    const dialogRole = role === 'dialog' || role === 'alertdialog';
    const ariaModal = current.getAttribute('aria-modal') === 'true';
    const positioned = ['fixed', 'absolute', 'sticky'].includes(style.position);
    const reasonableSize = rect.width >= Math.min(250, innerWidth * 0.25) && rect.height >= Math.min(120, innerHeight * 0.15);
    const notHugeContent = antiwallNormalizedText(current).length < 2500;
    const stackingLooksModal = antiwallNumericZIndex(current) >= 5 || style.position === 'fixed' || dialogRole || ariaModal;

    if (reasonableSize && notHugeContent && stackingLooksModal && (dialogRole || ariaModal || positioned)) {
      return current;
    }

    current = current.parentElement;
  }
  return null;
}

function antiwallColorAlpha(color) {
  if (!color || color === 'transparent') return 0;
  const m = color.match(/rgba?\([^,]+,[^,]+,[^,]+(?:,\s*([0-9.]+))?\)/i);
  if (!m) return 1;
  return m[1] === undefined ? 1 : Number(m[1]);
}

function antiwallHasBlur(style) {
  return style.filter?.includes('blur') ||
         style.backdropFilter?.includes('blur') ||
         style.webkitBackdropFilter?.includes('blur');
}

function antiwallFindBackdrop(popup) {
  const popupZ = antiwallNumericZIndex(popup);
  const parent = popup.parentElement;
  const candidates = new Set([
    ...document.body.children,
    ...(parent ? parent.children : [])
  ]);

  return [...candidates].filter((element) => {
    if (element === popup) return false;
    if (!antiwallIsVisible(element)) return false;
    if (antiwallContainsProtectedContent(element)) return false;

    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const text = antiwallNormalizedText(element);
    const fullScreen = rect.width >= innerWidth * 0.9 && rect.height >= innerHeight * 0.9;
    const fixed = style.position === 'fixed';
    const nearPopup = antiwallNumericZIndex(element) >= popupZ - 5;
    const visibleBackground = antiwallColorAlpha(style.backgroundColor) > 0.05;
    const looksLikeBackdrop = antiwallHasBlur(style) || visibleBackground || Number(style.opacity || 1) < 0.95;

    return fixed && fullScreen && nearPopup && looksLikeBackdrop && text.length < 300;
  });
}

function antiwallFindBlurElements(popups, backdrops) {
  const candidates = new Set([...document.body.children]);

  for (const element of [...popups, ...backdrops]) {
    const parent = element.parentElement;
    if (parent) {
      for (const child of parent.children) candidates.add(child);
    }
  }

  return [...candidates].filter((element) => {
    if (popups.includes(element) || backdrops.includes(element)) return false;
    if (!antiwallIsVisible(element)) return false;
    if (antiwallContainsProtectedContent(element)) return false;

    const style = getComputedStyle(element);
    if (!antiwallHasBlur(style)) return false;

    const rect = element.getBoundingClientRect();
    return rect.width >= innerWidth * 0.5 || rect.height >= innerHeight * 0.35;
  });
}

function antiwallDetectScrollLock() {
  const html = document.documentElement;
  const body = document.body;
  const entries = [];

  for (const element of [html, body]) {
    if (!element) continue;
    const style = getComputedStyle(element);
    const overflowLocked = ['hidden', 'clip'].includes(style.overflow) || ['hidden', 'clip'].includes(style.overflowY);
    const fixedBody = element === body && style.position === 'fixed';
    const maxHeight = parseFloat(style.maxHeight);
    const heightLimited = Number.isFinite(maxHeight) && maxHeight > 0 && maxHeight <= innerHeight + 5;
    const touchLocked = style.touchAction === 'none';

    if (overflowLocked || fixedBody || heightLimited || touchLocked) {
      entries.push({ element, overflowLocked, fixedBody, heightLimited, touchLocked });
    }
  }

  const bodyClassLocks = body ? SCROLL_LOCK_CLASSES.filter((name) => body.classList.contains(name)) : [];
  return { locked: entries.length > 0 || bodyClassLocks.length > 0, entries, bodyClassLocks };
}

function antiwallUnique(elements) {
  return [...new Set(elements.filter(Boolean))];
}

function antiwallScoreDetection({ warningElements, popups, backdrops, blurElements, scrollLock }) {
  let confidence = 0;
  const reasons = [];

  const hasTextSignal = warningElements.some(antiwallHasTextSignal);
  const hasAttrSignal = warningElements.some(antiwallHasAttrSignal) || popups.some(antiwallHasAttrSignal);

  if (hasTextSignal) {
    confidence += 70;
    reasons.push('anti-adblock-text');
  }

  if (hasAttrSignal) {
    confidence += 58;
    reasons.push('anti-adblock-dom-signal');
  }

  if (popups.some((element) => {
    const role = element.getAttribute('role');
    return role === 'dialog' || role === 'alertdialog' || element.getAttribute('aria-modal') === 'true';
  })) {
    confidence += 10;
    reasons.push('dialog-semantics');
  }

  if (popups.some((element) => ['fixed', 'absolute', 'sticky'].includes(getComputedStyle(element).position))) {
    confidence += 8;
    reasons.push('modal-positioning');
  }

  if (popups.some((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.position === 'fixed' && rect.width >= innerWidth * 0.75 && rect.height >= innerHeight * 0.45;
  })) {
    confidence += 12;
    reasons.push('blocking-overlay-layout');
  }

  if (backdrops.length > 0) {
    confidence += 6;
    reasons.push('related-backdrop');
  }

  if (blurElements.length > 0) {
    confidence += 4;
    reasons.push('related-blur');
  }

  if (scrollLock.locked) {
    confidence += 4;
    reasons.push('scroll-lock');
  }

  return { confidence: Math.min(confidence, 100), reasons };
}

function detectAntiWall(scope = document) {
  const warningElements = antiwallFindWarningElements(scope);
  const popups = antiwallUnique(warningElements.map(antiwallFindPopup).filter(Boolean));
  const backdrops = antiwallUnique(popups.flatMap(antiwallFindBackdrop));
  const blurElements = popups.length ? antiwallFindBlurElements(popups, backdrops) : [];
  const scrollLock = popups.length ? antiwallDetectScrollLock() : { locked: false, entries: [], bodyClassLocks: [] };
  const score = antiwallScoreDetection({ warningElements, popups, backdrops, blurElements, scrollLock });

  return {
    found: popups.length > 0 && score.confidence >= 70,
    confidence: score.confidence,
    reasons: score.reasons,
    warningElements,
    popups,
    backdrops,
    blurElements,
    scrollLock
  };
}

function createAntiWallRestoreSession() {
  const records = [];

  return {
    records,
    setStyle(element, property, value, priority = 'important') {
      records.push({
        type: 'style',
        element,
        property,
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property)
      });
      element.style.setProperty(property, value, priority);
    },
    setAttribute(element, name, value) {
      records.push({
        type: 'attribute',
        element,
        name,
        hadValue: element.hasAttribute(name),
        value: element.getAttribute(name)
      });
      if (value == null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    },
    saveClassAttribute(element) {
      records.push({
        type: 'class',
        element,
        value: element.getAttribute('class')
      });
    },
    hideElement(element, reason) {
      records.push({
        type: 'style-attribute',
        element,
        value: element.getAttribute('style')
      });
      this.setAttribute(element, 'aria-hidden', 'true');
      this.setAttribute(element, 'data-antiwall-hidden', reason);
      element.style.setProperty('display', 'none', 'important');
      element.style.setProperty('pointer-events', 'none', 'important');
    },
    restore() {
      antiwallState.suppressObserver = true;

      for (const record of [...records].reverse()) {
        if (!record.element?.isConnected) continue;

        if (record.type === 'style') {
          record.element.style.setProperty(record.property, record.value, record.priority);
        } else if (record.type === 'attribute') {
          if (record.hadValue) record.element.setAttribute(record.name, record.value);
          else record.element.removeAttribute(record.name);
        } else if (record.type === 'class') {
          if (record.value == null) record.element.removeAttribute('class');
          else record.element.setAttribute('class', record.value);
        } else if (record.type === 'style-attribute') {
          if (record.value == null) record.element.removeAttribute('style');
          else record.element.setAttribute('style', record.value);
          record.element.removeAttribute('data-antiwall-hidden');
        }
      }

      antiwallState.suppressObserver = false;
    }
  };
}

function unlockAntiWallScroll(detection, restore) {
  if (!detection.scrollLock.locked) return false;

  const body = document.body;

  for (const entry of detection.scrollLock.entries) {
    const element = entry.element;
    const style = getComputedStyle(element);

    if (entry.overflowLocked) {
      restore.setStyle(element, 'overflow-y', 'auto');
      if (['hidden', 'clip'].includes(style.overflowX)) {
        restore.setStyle(element, 'overflow-x', 'visible');
      }
    }

    if (entry.fixedBody) {
      restore.setStyle(element, 'position', 'static');
      restore.setStyle(element, 'top', 'auto');
    }

    if (entry.heightLimited) {
      restore.setStyle(element, 'max-height', 'none');
    }

    if (entry.touchLocked) {
      restore.setStyle(element, 'touch-action', 'auto');
    }
  }

  if (body && detection.scrollLock.bodyClassLocks.length) {
    restore.saveClassAttribute(body);
    for (const className of detection.scrollLock.bodyClassLocks) {
      body.classList.remove(className);
    }
  }

  return true;
}

function cleanAntiWallDetection(detection) {
  const restore = createAntiWallRestoreSession();
  antiwallState.suppressObserver = true;

  try {
    for (const popup of detection.popups) {
      restore.hideElement(popup, 'popup');
    }

    for (const backdrop of detection.backdrops) {
      restore.hideElement(backdrop, 'backdrop');
    }

    for (const element of detection.blurElements) {
      const style = getComputedStyle(element);
      if (style.filter?.includes('blur')) {
        restore.setStyle(element, 'filter', 'none');
      }
      if (style.backdropFilter?.includes('blur') || style.webkitBackdropFilter?.includes('blur')) {
        restore.setStyle(element, 'backdrop-filter', 'none');
        restore.setStyle(element, '-webkit-backdrop-filter', 'none');
      }
    }

    const cssScrollUnlocked = unlockAntiWallScroll(detection, restore);

    return {
      restore,
      popupCount: detection.popups.length,
      backdropCount: detection.backdrops.length,
      blurCount: detection.blurElements.length,
      cssScrollUnlocked
    };
  } finally {
    antiwallState.suppressObserver = false;
  }
}

function scanAndCleanAntiWall(scope = document, { minConfidence = 70 } = {}) {
  const detection = detectAntiWall(scope);
  if (!detection.found || detection.confidence < minConfidence) return null;
  return {
    detection,
    result: cleanAntiWallDetection(detection)
  };
}

function stopAntiWallObserver() {
  antiwallState.observer?.disconnect();
  antiwallState.observer = null;
  if (antiwallState.observerTimer) {
    clearTimeout(antiwallState.observerTimer);
    antiwallState.observerTimer = null;
  }
}

function scheduleAntiWallScan(callback) {
  if (antiwallState.scheduledScan || antiwallState.suppressObserver) return;
  antiwallState.scheduledScan = true;
  setTimeout(() => {
    antiwallState.scheduledScan = false;
    callback?.();
  }, 300);
}

function startAntiWallObserver(callback, durationMs = 7000) {
  stopAntiWallObserver();

  const observer = new MutationObserver((mutations) => {
    if (antiwallState.suppressObserver) return;

    const interesting = mutations.some((mutation) => {
      if (mutation.type === 'childList') {
        return [...mutation.addedNodes].some((node) => node instanceof Element);
      }
      if (mutation.type === 'attributes') {
        return mutation.target instanceof Element;
      }
      return false;
    });

    if (interesting) {
      scheduleAntiWallScan(callback);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'aria-modal']
  });

  antiwallState.observer = observer;
  antiwallState.observerTimer = setTimeout(stopAntiWallObserver, durationMs);
}
