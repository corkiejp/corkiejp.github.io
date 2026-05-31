// assets/js/features/utility-toolbar.js

import { ensureShortcutDialog } from './shortcut-dialog.js';
import {
  hasEditorModalTarget,
  openModalWithForm
} from './editor-modal-launcher.js';

let toolbarObserver = null;
let profileLinkModeIsComments = false;
let profileToggleObserver = null;
let profileToggleDelegatesBound = false;
let utilityShortcutsBound = false;

function getProfilePathMatch(pathname = window.location.pathname) {
  const cleanPath = (pathname || '').replace(/\/+$/, '');

  let match = cleanPath.match(/^\/profile\/(discussions|comments)\/([^/]+)$/i);
  if (match) return match;

  match = cleanPath.match(/^\/profile\/([^/]+)$/i);
  if (match) {
    return [match[0], 'discussions', match[1]];
  }

  return null;
}

function normaliseBoardsProfileHref(rawHref) {
  if (!rawHref) return null;

  try {
    const url = rawHref.startsWith('http')
      ? new URL(rawHref)
      : new URL(rawHref, window.location.origin);

    if (url.hostname !== 'www.boards.ie') return null;

    const path = url.pathname.replace(/\/+$/, '');
    let match = path.match(/^\/profile\/(discussions|comments)\/([^/]+)$/i);

    if (match) {
      return {
        section: match[1].toLowerCase(),
        username: decodeURIComponent(match[2]),
        url,
        isBareProfile: false
      };
    }

    match = path.match(/^\/profile\/([^/]+)$/i);

    if (match) {
      return {
        section: 'discussions',
        username: decodeURIComponent(match[1]),
        url,
        isBareProfile: true
      };
    }

    return null;
  } catch {
    return null;
  }
}

function buildBoardsProfileHref(username, useComments, originalHref = '') {
  const encodedUsername = encodeURIComponent(username);
  const isAbsolute = /^https?:\/\//i.test(originalHref);

  if (useComments) {
    return isAbsolute
      ? `https://www.boards.ie/profile/comments/${encodedUsername}`
      : `/profile/comments/${encodedUsername}`;
  }

  return isAbsolute
    ? `https://www.boards.ie/profile/${encodedUsername}`
    : `/profile/${encodedUsername}`;
}

function findFirstProfileLinkState() {
  const firstProfileLink = document.querySelector(
    'a[href^="/profile/"], a[href^="https://www.boards.ie/profile/"], a.atMention[href*="/profile/"]'
  );

  if (!firstProfileLink) return null;

  const href = firstProfileLink.getAttribute('href') || '';
  const parsed = normaliseBoardsProfileHref(href);
  return parsed ? parsed.section === 'comments' : null;
}

function syncProfileToggleStateFromPage() {
  const pathMatch = getProfilePathMatch();

  if (pathMatch) {
    profileLinkModeIsComments = pathMatch[1].toLowerCase() === 'comments';
    return profileLinkModeIsComments;
  }

  const linkState = findFirstProfileLinkState();
  if (typeof linkState === 'boolean') {
    profileLinkModeIsComments = linkState;
  }

  return profileLinkModeIsComments;
}

function rewriteProfileLink(link, useComments) {
  if (!(link instanceof Element)) return false;

  const href = link.getAttribute('href');
  if (!href) return false;

  const parsed = normaliseBoardsProfileHref(href);
  if (!parsed) return false;

  const newHref = buildBoardsProfileHref(parsed.username, useComments, href);
  if (newHref === href) return false;

  link.setAttribute('href', newHref);
  link.dataset.bcProfileToggleMode = useComments ? 'comments' : 'discussions';
  return true;
}

function rewriteAllProfileLinks(useComments = profileLinkModeIsComments) {
  const links = document.querySelectorAll(
    'a[href^="/profile/"], a[href^="https://www.boards.ie/profile/"], a.atMention[href*="/profile/"]'
  );

  let changedCount = 0;

  links.forEach((link) => {
    if (rewriteProfileLink(link, useComments)) {
      changedCount += 1;
    }
  });

  return changedCount;
}

function toggleProfileLinks(forceState) {
  const nextState =
    typeof forceState === 'boolean'
      ? forceState
      : !syncProfileToggleStateFromPage();

  profileLinkModeIsComments = nextState;

  const changedCount = rewriteAllProfileLinks(profileLinkModeIsComments);

  if (typeof window.showPopup === 'function') {
    const modeLabel = profileLinkModeIsComments ? 'comments' : 'discussions';
    const countLabel = changedCount ? ` (${changedCount} links updated)` : '';
    window.showPopup(`Profile links toggled to ${modeLabel}${countLabel}`);
  }

  refreshToolbarState();
}

let featureEnabled = true;
const processedAttr = 'data-quote-processed';
let quoteObserver = null;
let quoteDebounceTimeout = null;

function processQuotes(enabled) {
  document
    .querySelectorAll('article.css-1hlhx5t-quoteEmbed-body')
    .forEach((article) => {
      const userAnchor = article.querySelector('a[data-link-type="legacy"]');
      if (!userAnchor) return;

      const username = (userAnchor.textContent || '').trim();
      if (!username) return;

      if (enabled) {
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

          toggleLink.addEventListener('click', (e) => {
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
        article.style.display = '';

        const prev = article.previousElementSibling;
        if (
          prev &&
          prev.tagName === 'A' &&
          (
            prev.textContent.startsWith('Display quote of ') ||
            prev.textContent.startsWith('Hide quote of ')
          )
        ) {
          prev.remove();
        }

        article.removeAttribute(processedAttr);
      }
    });
}

function ensureQuoteObserver() {
  if (quoteObserver || !document.body) return;

  quoteObserver = new MutationObserver(() => {
    if (quoteDebounceTimeout) clearTimeout(quoteDebounceTimeout);

    quoteDebounceTimeout = setTimeout(() => {
      processQuotes(featureEnabled);
    }, 300);
  });

  quoteObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function toggleQuoteFeature(forceState) {
  featureEnabled =
    typeof forceState === 'boolean'
      ? forceState
      : !featureEnabled;

  processQuotes(featureEnabled);

  if (typeof window.showPopup === 'function') {
    window.showPopup(
      `Quote toggle feature is now ${featureEnabled ? 'ENABLED' : 'DISABLED'}.`
    );
  } else {
    alert(
      `Quote toggle feature is now ${featureEnabled ? 'ENABLED' : 'DISABLED'}.`
    );
  }

  return featureEnabled;
}

window.toggleQuoteFeature = toggleQuoteFeature;

function updateProfileIconState(profileIcon) {
  if (!profileIcon) return;

  const isComments = syncProfileToggleStateFromPage();
  const modeLabel = isComments ? 'comments' : 'discussions';

  profileIcon.title = `Profile links: ${modeLabel}`;
  profileIcon.setAttribute('aria-label', `Profile links: ${modeLabel}`);
  profileIcon.setAttribute('aria-pressed', isComments ? 'true' : 'false');
  profileIcon.style.backgroundColor = isComments ? '#2f6fed' : '';
  profileIcon.style.color = '#fff';
}

function updateEditorIconState(editorIcon) {
  if (!editorIcon) return;

  const available = hasEditorModalTarget();
  editorIcon.style.opacity = available ? '1' : '0.55';
  editorIcon.title = available
    ? 'Edit in modal (Alt+E)'
    : 'Edit in modal unavailable on this page';
  editorIcon.setAttribute(
    'aria-label',
    available
      ? 'Edit in modal (Alt+E)'
      : 'Edit in modal unavailable on this page'
  );
}

function activateProfileToggle(profileIcon, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const match = getProfilePathMatch();

  if (match) {
    const section = match[1].toLowerCase();
    const username = match[2];
    const targetSection = section === 'discussions' ? 'comments' : 'discussions';
    profileLinkModeIsComments = targetSection === 'comments';
    window.location.href = `/profile/${targetSection}/${username}`;
    return;
  }

  toggleProfileLinks();
  updateProfileIconState(profileIcon);
}

function handleDelegatedProfileToggleClick(event) {
  const link = event.target.closest(
    'a[href^="/profile/"], a[href^="https://www.boards.ie/profile/"], a.atMention[href*="/profile/"]'
  );

  if (!link) return;

  const href = link.getAttribute('href') || '';
  const parsed = normaliseBoardsProfileHref(href);
  if (!parsed) return;

  const desiredHref = buildBoardsProfileHref(
    parsed.username,
    profileLinkModeIsComments,
    href
  );

  if (href === desiredHref) return;

  event.preventDefault();
  event.stopPropagation();

  link.setAttribute('href', desiredHref);
  window.location.href = desiredHref;
}

function runUtilityCommand(command) {
  switch (command) {
    case 'open-shortcut-dialog':
      return openShortcutDialog();

    case 'open-editor-modal':
      return openEditorShortcut();

    case 'toggle-profile-links':
      return openProfileShortcut();

    case 'toggle-quotes':
      return toggleQuoteFeatureShortcut();

    case 'open-mike-comments':
      return openMemberComments('Boards.ie: Mike');

    case 'open-odhran-comments':
      return openMemberComments('Boards.ie: Odhran');

    case 'open-bookmarks':
      window.location.href = 'https://www.boards.ie/discussions/bookmarked';
      return true;

    case 'open-my-comments':
      window.location.href = 'https://www.boards.ie/profile/comments';
      return true;

    case 'open-notifications':
      window.location.href = 'https://www.boards.ie/profile/notifications';
      return true;

    case 'open-drafts':
      window.location.href = 'https://www.boards.ie/drafts';
      return true;
	  
	case 'open-ignore':
      window.location.href = 'https://www.boards.ie/profile/ignore';
      return true;
	  
	case 'open-sign':
      window.location.href = 'https://www.boards.ie/profile/signature';
      return true;  

    default:
      return false;
  }
}

let utilityCommandMessageBound = false;

function bindUtilityCommandMessages() {
  if (utilityCommandMessageBound) return;
  utilityCommandMessageBound = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.action !== 'bc-run-command') {
      return;
    }

    const ok = runUtilityCommand(message.command);
    sendResponse?.({ ok });
    return true;
  });
}

function bindProfileToggleDelegates() {
  if (profileToggleDelegatesBound) return;

  document.addEventListener('click', handleDelegatedProfileToggleClick, true);
  profileToggleDelegatesBound = true;
}

function startProfileToggleObserver() {
  if (profileToggleObserver || !document.body) return;

  profileToggleObserver = new MutationObserver(() => {
    rewriteAllProfileLinks(profileLinkModeIsComments);
    refreshToolbarState();
  });

  profileToggleObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function initProfileToggleManager() {
  syncProfileToggleStateFromPage();
  rewriteAllProfileLinks(profileLinkModeIsComments);
  bindProfileToggleDelegates();
  startProfileToggleObserver();
}

function createButton({ className = 'navIcon', text, title, ariaLabel }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.textContent = text;
  if (title) btn.title = title;
  if (ariaLabel) btn.setAttribute('aria-label', ariaLabel);
  return btn;
}

function getToolbarButtonByText(text) {
  const wrapper = document.querySelector('.infoIconWrapper');
  if (!wrapper) return null;
  return Array.from(wrapper.querySelectorAll('button')).find(
    (btn) => btn.textContent === text
  ) || null;
}

function openShortcutDialog() {
  const dialog = ensureShortcutDialog();
  if (dialog && typeof dialog.showModal === 'function') {
    dialog.showModal();
    return true;
  }

  if (typeof window.showPopup === 'function') {
    window.showPopup('Help dialog not available on this page.');
  }

  return false;
}

function openProfileShortcut() {
  const profileIcon = getToolbarButtonByText('P');
  activateProfileToggle(profileIcon, null);
}

function openEditorShortcut() {
  return openModalWithForm();
}

function openMemberComments(username) {
  if (!username) return false;
  window.location.href = `https://www.boards.ie/profile/comments/${encodeURIComponent(username)}`;
  return true;
}

async function handleUtilityShortcut(event) {
  const { pageShortcutsEnabled = false, shortcutsEnabled = true } =
    await chrome.storage.sync.get(['pageShortcutsEnabled', 'shortcutsEnabled']);

  if (shortcutsEnabled === false || pageShortcutsEnabled === false) {
    return;
  }

  const key = (event.key || '').toLowerCase();
  let command = '';

  // Ctrl-only fallback shortcuts
  if (event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
    switch (key) {
      case 'i':
        command = 'open-ignore';
        break;
      case '4':
        command = 'open-sign';
        break;		
      default:
        return;
    }

    event.preventDefault();
    runUtilityCommand(command);
    return;
  }

  // Existing Alt-only shortcuts
  if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) return;

  switch (key) {
    case '2':
      command = 'toggle-quotes';
      break;
    case 'i':
      command = 'open-shortcut-dialog';
      break;
    case 'p':
      command = 'toggle-profile-links';
      break;
    case 'e':
      command = 'open-editor-modal';
      break;
    case 'm':
      command = 'open-mike-comments';
      break;
    case 'o':
      command = 'open-odhran-comments';
      break;
    case '6':
    command = 'open-notifications';
    break;
  case '8':
    command = 'open-bookmarks';
    break;
  case 'c':
    command = 'open-my-comments';
    break;
  case 'x':
    command = 'open-drafts';
    break;
    default:
      return;
  }

  event.preventDefault();
  runUtilityCommand(command);
}


function bindUtilityShortcuts() {
  if (utilityShortcutsBound) return;
  utilityShortcutsBound = true;
  window.addEventListener('keydown', handleUtilityShortcut);
}


function ensureToolbar() {
  let wrapper = document.querySelector('.infoIconWrapper');
  if (wrapper) return wrapper;

  wrapper = document.createElement('div');
  wrapper.className = 'infoIconWrapper';

  const homeIcon = createButton({
    text: '↑',
    title: 'Scroll to top',
    ariaLabel: 'Scroll to top'
  });

  const profileIcon = createButton({
    text: 'P',
    title: 'Toggle profile links',
    ariaLabel: 'Toggle profile links'
  });

  const editorIcon = createButton({
    text: '✎',
    title: 'Edit in modal (Alt+E)',
    ariaLabel: 'Edit in modal (Alt+E)'
  });

  const cmpIcon = createButton({
    text: '🍪',
    title: 'Membership settings',
    ariaLabel: 'Membership settings'
  });
  cmpIcon.id = 'bc-cmp-toolbar-btn';

  const infoIcon = createButton({
    className: 'infoIcon',
    text: 'i',
    title: 'Open help dialog',
    ariaLabel: 'Open help dialog'
  });

  const endIcon = createButton({
    text: '↓',
    title: 'Scroll to bottom',
    ariaLabel: 'Scroll to bottom'
  });

  wrapper.appendChild(homeIcon);
  wrapper.appendChild(profileIcon);
  wrapper.appendChild(editorIcon);
  wrapper.appendChild(cmpIcon);
  wrapper.appendChild(infoIcon);
  wrapper.appendChild(endIcon);
  document.body.appendChild(wrapper);

  homeIcon.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  endIcon.addEventListener('click', () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: maxScroll, behavior: 'smooth' });
  });

  profileIcon.addEventListener('click', (e) => {
    activateProfileToggle(profileIcon, e);
  });

  editorIcon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openEditorShortcut();
  });

  cmpIcon.addEventListener('click', () => {
    if (typeof window.showMembersModal === 'function') {
      window.showMembersModal();
    } else {
      console.warn('[BoardsCleaner][utility-toolbar] showMembersModal not available');
    }
  });

  infoIcon.addEventListener('click', () => {
    openShortcutDialog();
  });

  function updateCmpIconMembershipState() {
    const memberActiveKey = window.STORAGE_KEYS?.memberActive || 'bc_memberActive';

    if (!cmpIcon || !cmpIcon.isConnected) return;

    try {
      if (!chrome?.storage?.sync) {
        cmpIcon.style.backgroundColor = '#dc3545';
        cmpIcon.style.color = '#fff';
        cmpIcon.title = 'Members settings unavailable: storage unavailable';
        return;
      }

      chrome.storage.sync.get([memberActiveKey], (result) => {
        const runtimeErr = chrome.runtime?.lastError;
        if (runtimeErr) {
          const msg = String(runtimeErr.message || '');
          if (msg.includes('Extension context invalidated')) {
            return;
          }

          console.warn('[BoardsCleaner][utility-toolbar] storage read failed:', runtimeErr.message);
          return;
        }

        if (!cmpIcon || !cmpIcon.isConnected) return;

        const active = !!result?.[memberActiveKey];
        cmpIcon.style.backgroundColor = active ? '#28a745' : '#dc3545';
        cmpIcon.style.color = '#fff';
        cmpIcon.title = active
          ? 'Membership active — click for settings'
          : 'Membership inactive — click to enter code';
      });
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (msg.includes('Extension context invalidated')) {
        return;
      }

      console.warn('[BoardsCleaner][utility-toolbar] updateCmpIconMembershipState failed', err);
    }
  }

  window.updateCmpIconMembershipState = updateCmpIconMembershipState;
  updateCmpIconMembershipState();
  updateProfileIconState(profileIcon);
  updateEditorIconState(editorIcon);

  return wrapper;
}

function refreshToolbarState() {
  const wrapper = document.querySelector('.infoIconWrapper');
  if (!wrapper) return;

  const buttons = Array.from(wrapper.querySelectorAll('button'));
  const profileIcon = buttons.find((btn) => btn.textContent === 'P');
  const editorIcon = buttons.find((btn) => btn.textContent === '✎');

  if (profileIcon) updateProfileIconState(profileIcon);
  if (editorIcon) updateEditorIconState(editorIcon);

  if (typeof window.updateCmpIconMembershipState === 'function') {
    window.updateCmpIconMembershipState();
  }
}

function startToolbarObserver() {
  if (toolbarObserver || !document.body) return;

  toolbarObserver = new MutationObserver(() => {
    ensureToolbar();
    refreshToolbarState();
  });

  toolbarObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function injectUtilityToolbarStyles() {
  if (document.getElementById('bc-utility-toolbar-styles')) return;

  const style = document.createElement('style');
  style.id = 'bc-utility-toolbar-styles';
  style.textContent = `
.infoIconWrapper {
position: fixed;
bottom: 70px;
right: 10px;
z-index: 2147483647;
display: flex;
flex-direction: column;
gap: 4px;
}

.infoIcon,
.navIcon {
cursor: pointer;
font-weight: bold;
border: 1px solid #888;
border-radius: 50%;
width: 18px;
height: 18px;
text-align: center;
line-height: 18px;
user-select: none;
}

.infoIcon {
font-size: 14px;
}

.navIcon {
font-size: 12px;
background-color: white;
}

dialog#shortcutDialog {
padding: 1em 1.5em;
max-width: 340px;
border-radius: 8px;
border: 1px solid var(--t-button-border, #223455);
background: var(--t-bg, #ffffff);
color: var(--t-text, #1f2328);
box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
}

dialog#shortcutDialog::backdrop {
background: rgba(0, 0, 0, 0.3);
}

dialog#shortcutDialog h2,
dialog#shortcutDialog h3,
dialog#shortcutDialog b,
dialog#shortcutDialog li {
color: var(--t-text, #1f2328);
}

dialog#shortcutDialog ul {
margin: 0;
padding-left: 1.2em;
}

dialog#shortcutDialog li {
margin: 0 0 8px;
}

dialog#shortcutDialog a.bc-shortcut-link,
dialog#shortcutDialog a {
color: var(--t-link, #3c5587);
text-decoration: underline;
text-underline-offset: 2px;
text-decoration-thickness: 1.5px;
font-weight: 600;
}

dialog#shortcutDialog a.bc-shortcut-link:hover,
dialog#shortcutDialog a.bc-shortcut-link:focus,
dialog#shortcutDialog a:hover,
dialog#shortcutDialog a:focus {
color: var(--t-link-hover, #1d5d9d);
text-decoration-thickness: 2px;
}

dialog#shortcutDialog .bc-shortcut-action-btn,
dialog#shortcutDialog button.closeBtn,
dialog#shortcutDialog #bc-reset-overlay-btn {
margin-top: 10px;
padding: 0.45em 0.9em;
border: 1px solid var(--t-button-border, #223455);
border-radius: 4px;
background: linear-gradient(
180deg,
var(--t-button-top, #3c5587) 0%,
var(--t-button-bottom, #2d436c) 100%
);
color: var(--t-btn-text, #ffffff);
cursor: pointer;
}

dialog#shortcutDialog .bc-shortcut-action-btn:hover,
dialog#shortcutDialog button.closeBtn:hover,
dialog#shortcutDialog #bc-reset-overlay-btn:hover {
background: linear-gradient(
180deg,
var(--t-button-hover-top, #4a65a0) 0%,
var(--t-button-hover-bottom, #34507e) 100%
);
}

dialog#shortcutDialog .bc-shortcut-action-btn:focus,
dialog#shortcutDialog button.closeBtn:focus,
dialog#shortcutDialog #bc-reset-overlay-btn:focus,
dialog#shortcutDialog a:focus {
outline: 2px solid var(--t-link, #3c5587);
outline-offset: 2px;
}

dialog#shortcutDialog hr {
border: 0;
border-top: 1px solid var(--t-button-border, #223455);
margin: 12px 0;
}
`;
  document.head.appendChild(style);
}


export function initUtilityToolbar() {
  if (!document.body) return;
  initProfileToggleManager();
  injectUtilityToolbarStyles();
  ensureToolbar();
  refreshToolbarState();
  processQuotes(featureEnabled); // is this line still needed?
  ensureQuoteObserver(); // is this line still needed?
  bindUtilityCommandMessages();
  bindUtilityShortcuts();
  startToolbarObserver();
}