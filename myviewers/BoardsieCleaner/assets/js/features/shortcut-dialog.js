// assets/js/features/shortcut-dialog.js

function getCurrentForumSlug() {
  const path = (window.location.pathname || '').toLowerCase();
  const patterns = [
    /^\/categories\/([^/?#]+)/,
    /^\/discussion\/([^/?#]+)/,
    /^\/forum\/([^/?#]+)/
  ];

  for (const re of patterns) {
    const match = path.match(re);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]).trim().toLowerCase();
      } catch {
        return match[1].trim().toLowerCase();
      }
    }
  }

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    try {
      const url = new URL(canonical.href);
      for (const re of patterns) {
        const match = url.pathname.toLowerCase().match(re);
        if (match?.[1]) {
          return decodeURIComponent(match[1]).trim().toLowerCase();
        }
      }
    } catch {}
  }

  return '';
}

function formatShortcutText(shortcut) {
  return shortcut && String(shortcut).trim() ? shortcut : '';
}

function getShortcutManagerUiInfo() {
  const ua = navigator.userAgent || '';
  const isFirefox = /Firefox\//i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isAndroid || /Mobile|Tablet|Mobi/i.test(ua);

  if (isMobile) {
    return { type: 'none' };
  }

  if (isFirefox) {
    return { type: 'firefox-help' };
  }

  return { type: 'chrome-button' };
}

function createShortcutManagerHelpNode() {
  const info = getShortcutManagerUiInfo();

  if (info.type === 'none') {
    return null;
  }

  if (info.type === 'firefox-help') {
    const p = document.createElement('p');
    p.className = 'bc-shortcut-help-text';
    p.textContent =
      'Firefox: open Add-ons Manager (Ctrl+Shift+A), then use the gear menu and choose Manage Extension Shortcuts.';
    return p;
  }

  const manageShortcutsBtn = document.createElement('button');
  manageShortcutsBtn.type = 'button';
  manageShortcutsBtn.className = 'bc-shortcut-action-btn';
  manageShortcutsBtn.textContent = 'Manage Chrome shortcut assignments';
  manageShortcutsBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'bc-open-extension-shortcuts-page' });
  });
  return manageShortcutsBtn;
}


function addShortcutItem(list, labelText, shortcutText) {
  const li = document.createElement('li');
  const bold = document.createElement('b');
  bold.textContent = labelText;
  li.appendChild(bold);
  li.appendChild(document.createTextNode(` ${shortcutText}`));
  list.appendChild(li);
}

function addShortcutLinkItem(list, labelText, shortcutText, href, linkText) {
  const li = document.createElement('li');
  li.className = 'bc-shortcut-item';

  const bold = document.createElement('b');
  bold.textContent = labelText;
  li.appendChild(bold);
  li.appendChild(document.createTextNode(` ${shortcutText} — `));

  const a = document.createElement('a');
  a.href = href;
  a.target = '_top';
  a.rel = 'noopener noreferrer';
  a.textContent = linkText;
  a.className = 'bc-shortcut-link';
  a.title = `${labelText} ${linkText}`;
  li.appendChild(a);

  list.appendChild(li);
}

function ensureShortcutDialogStyles() {
  if (document.getElementById('bc-shortcut-dialog-styles')) return;

  const style = document.createElement('style');
  style.id = 'bc-shortcut-dialog-styles';
  style.textContent = `
dialog#shortcutDialog {
  padding: 1em 1.2em;
  width: min(340px, calc(100vw - 20px));
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
dialog#shortcutDialog label,
dialog#shortcutDialog li {
  color: var(--t-text, #1f2328);
}

dialog#shortcutDialog h2 {
  margin: 0;
  line-height: 1.1;
}

dialog#shortcutDialog h3 {
  margin: 12px 0 8px;
  font-size: 1rem;
  line-height: 1.2;
}

dialog#shortcutDialog p {
  margin: 0 0 8px;
}

dialog#shortcutDialog ul {
  margin: 0;
  padding-left: 1.15em;
}

dialog#shortcutDialog li {
  margin: 0 0 7px;
  line-height: 1.35;
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
dialog#shortcutDialog button.closeBtn {
  margin-top: 10px;
  margin-right: 8px;
  padding: 0.45em 0.9em;
  border: 1px solid var(--t-button-border, #223455);
  border-radius: 4px;
  background: linear-gradient(
    180deg,
    var(--t-button-top, #3c5587) 0,
    var(--t-button-bottom, #2d436c) 100%
  );
  color: var(--t-btn-text, #ffffff);
  cursor: pointer;
}

dialog#shortcutDialog .bc-shortcut-action-btn:hover,
dialog#shortcutDialog button.closeBtn:hover {
  background: linear-gradient(
    180deg,
    var(--t-button-hover-top, #4a65a0) 0,
    var(--t-button-hover-bottom, #34507e) 100%
  );
}

dialog#shortcutDialog .bc-shortcut-action-btn:focus,
dialog#shortcutDialog button.closeBtn:focus,
dialog#shortcutDialog a:focus,
dialog#shortcutDialog input:focus {
  outline: 2px solid var(--t-link, #3c5587);
  outline-offset: 2px;
}

dialog#shortcutDialog hr {
  border: 0;
  border-top: 1px solid var(--t-button-border, #223455);
  margin: 12px 0;
}

.bc-shortcut-toggle-wrap {
  margin-top: 10px;
}

.bc-shortcut-toggle-wrap label {
  display: block;
  margin: 0 0 8px;
}

.bc-shortcut-toggle-wrap input {
  margin-right: 6px;
}
dialog#shortcutDialog .bc-shortcut-help-text {
  margin-top: 10px;
  line-height: 1.4;
}
`;
  document.head.appendChild(style);
}

export function ensureShortcutDialog() {
  let dialog = document.getElementById('shortcutDialog');
  if (dialog) return dialog;

  ensureShortcutDialogStyles();

  dialog = document.createElement('dialog');
  dialog.id = 'shortcutDialog';

  const content = document.createElement('div');

  const headerRow = document.createElement('div');
  headerRow.style.display = 'flex';
  headerRow.style.alignItems = 'center';
  headerRow.style.gap = '10px';
  headerRow.style.marginBottom = '10px';

  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('assets/icon48.png');
  icon.alt = 'BoardsCleaner icon';
  icon.style.width = '30px';
  icon.style.height = '30px';
  icon.style.borderRadius = '6px';
  icon.style.flex = '0 0 auto';

  const title = document.createElement('h2');
  title.textContent = 'Boards.ie Cleaner';

  headerRow.appendChild(icon);
  headerRow.appendChild(title);
  content.appendChild(headerRow);

  const intro = document.createElement('p');
  intro.textContent = 'Shortcut keys and quick links';
  content.appendChild(intro);

  const shortcutsTitle = document.createElement('h3');
  shortcutsTitle.textContent = 'Shortcuts';
  content.appendChild(shortcutsTitle);

  const shortcutsList = document.createElement('ul');
  content.appendChild(shortcutsList);

  const linksTitle = document.createElement('h3');
  linksTitle.textContent = 'Quick links';
  content.appendChild(linksTitle);

  const linksList = document.createElement('ul');
  content.appendChild(linksList);

  chrome.runtime.sendMessage({ action: 'bc-get-commands' }, (response) => {
    const commands = response?.commands || [];
    const commandMap = new Map(
      commands.map((cmd) => [cmd.name, formatShortcutText(cmd.shortcut || '')])
    );

    addShortcutItem(
      shortcutsList,
      'Shortcut help dialog:',
      commandMap.get('open-shortcut-dialog') || 'Alt+I (fallback)'
    );
    addShortcutItem(
      shortcutsList,
      'Open comment editor modal:',
      commandMap.get('open-editor-modal') || 'Alt+E (fallback)'
    );
    addShortcutItem(
      shortcutsList,
      'Toggle Profiles:',
      commandMap.get('toggle-profile-links') || 'Alt+P (fallback)'
    );
    addShortcutItem(
      shortcutsList,
      'Toggle Quotes:',
      commandMap.get('toggle-quotes') || 'Alt+2 (fallback)'
    );

    addShortcutLinkItem(
      linksList,
      'Mike Profile:',
      commandMap.get('open-mike-comments') || 'Alt+M (fallback)',
      'https://www.boards.ie/profile/comments/Boards.ie: Mike',
      'Open'
    );
    addShortcutLinkItem(
      linksList,
      'Odhran Profie:',
      commandMap.get('open-odhran-comments') || 'Alt+O (fallback)',
      'https://www.boards.ie/profile/comments/Boards.ie: Odhran',
      'Open'
    );
    addShortcutLinkItem(
      linksList,
      'Bookmarks:',
      commandMap.get('open-bookmarks') || 'Alt+8 (Default&fallback)',
      'https://www.boards.ie/discussions/bookmarked',
      'Open'
    );
    addShortcutLinkItem(
      linksList,
      'Your Own comments:',
      commandMap.get('open-my-comments') || 'Alt+C (Default&fallback)',
      'https://www.boards.ie/profile/comments',
      'Open'
    );
    addShortcutLinkItem(
      linksList,
      'Notifications:',
      commandMap.get('open-notifications') || 'Alt+6 (Default&fallback)',
      'https://www.boards.ie/profile/notifications',
      'Open'
    );
    addShortcutLinkItem(
      linksList,
      'Drafts:',
      commandMap.get('open-drafts') || 'Alt+X (Default&fallback)',
      'https://www.boards.ie/drafts',
      'Open'
    );
	addShortcutLinkItem(
      linksList,
	  'Ignore:',
      commandMap.get('open-ignore') || 'Ctrl+I (fallback)',
      'https://www.boards.ie/profile/ignore',
      'Open'
    );
	addShortcutLinkItem(
      linksList,
	  'Signature:',
      commandMap.get('open-sign') || 'Ctrl+4 (fallback)',
      'https://www.boards.ie/profile/signature',
      'Open'
    );	
  });

  content.appendChild(document.createElement('hr'));

  const togglesWrap = document.createElement('div');
  togglesWrap.className = 'bc-shortcut-toggle-wrap';

  const allShortcutsLabel = document.createElement('label');
  const allShortcutsCheckbox = document.createElement('input');
  allShortcutsCheckbox.type = 'checkbox';
  allShortcutsCheckbox.id = 'bc-shortcuts-enabled';
  allShortcutsLabel.appendChild(allShortcutsCheckbox);
  allShortcutsLabel.appendChild(
    document.createTextNode(' Enable extension shortcuts')
  );
  togglesWrap.appendChild(allShortcutsLabel);

  const pageShortcutsLabel = document.createElement('label');
  const pageShortcutsCheckbox = document.createElement('input');
  pageShortcutsCheckbox.type = 'checkbox';
  pageShortcutsCheckbox.id = 'bc-page-shortcuts-enabled';
  pageShortcutsLabel.appendChild(pageShortcutsCheckbox);
  pageShortcutsLabel.appendChild(
    document.createTextNode(' Enable fallback page shortcuts')
  );
  togglesWrap.appendChild(pageShortcutsLabel);

  chrome.storage.sync.get(['shortcutsEnabled', 'pageShortcutsEnabled'], (data) => {
    allShortcutsCheckbox.checked = data?.shortcutsEnabled !== false;
    pageShortcutsCheckbox.checked = data?.pageShortcutsEnabled === true;
  });

  allShortcutsCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({
      shortcutsEnabled: !!allShortcutsCheckbox.checked
    });
  });

  pageShortcutsCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({
      pageShortcutsEnabled: !!pageShortcutsCheckbox.checked
    });
  });

  content.appendChild(togglesWrap);

const shortcutManagerHelpNode = createShortcutManagerHelpNode();
if (shortcutManagerHelpNode) {
  content.appendChild(shortcutManagerHelpNode);
}

  const styledForumsBtn = document.createElement('button');
  styledForumsBtn.type = 'button';
  styledForumsBtn.className = 'bc-shortcut-action-btn';
  styledForumsBtn.textContent = 'View styled forums list';
  styledForumsBtn.addEventListener('click', () => {
    if (typeof window.showStyledForumsModal === 'function') {
      window.showStyledForumsModal();
    } else if (typeof window.showPopup === 'function') {
      window.showPopup('Styled forums modal not available on this page.');
    }
  });
  content.appendChild(styledForumsBtn);

  const editThemeBtn = document.createElement('button');
  editThemeBtn.type = 'button';
  editThemeBtn.className = 'bc-shortcut-action-btn';

  const currentForumSlug = getCurrentForumSlug();
  editThemeBtn.textContent = currentForumSlug
    ? `Edit theme for this forum: ${currentForumSlug}`
    : 'Open theme options';

  editThemeBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'bc-open-options',
      forumKey: currentForumSlug || ''
    });
  });
  content.appendChild(editThemeBtn);

  dialog.appendChild(content);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'closeBtn';
  closeBtn.textContent = 'Close';
  closeBtn.type = 'button';
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.appendChild(closeBtn);

  document.body.appendChild(dialog);
  return dialog;
}