// assets/js/features/boards-modals.js

export function initBoardsModals(deps = {}) {
  const loadMemberState =
    deps.loadMemberState ||
    window.loadMemberState ||
    (async () => ({}));

  const saveMemberState =
    deps.saveMemberState ||
    window.saveMemberState ||
    (async () => {});

  const validateMember =
    deps.validateMember ||
    window.validateMember ||
    (async () => false);

  const logMemberState =
    deps.logMemberState ||
    window.logMemberState ||
    (async () => {});

  const normaliseBcSettings =
    deps.normaliseBcSettings ||
    window.normaliseBcSettings ||
    ((settings) => settings || {});

  const STORAGE_KEYS =
    deps.STORAGE_KEYS ||
    window.STORAGE_KEYS ||
    {
      memberCode: 'bc_memberCode',
      memberActive: 'bc_memberActive',
      settings: 'bc_membersSettings'
    };

  const updateCmpIconMembershipState =
    deps.updateCmpIconMembershipState ||
    window.updateCmpIconMembershipState ||
    (() => {});

  const getStyledForumsList =
    deps.getStyledForumsList ||
    window.getStyledForumsList ||
    (async () => []);

  const showPopup =
    deps.showPopup ||
    window.showPopup ||
    (() => {});
	
  const refreshBoardsStyling =
  deps.refreshBoardsStyling ||
  window.refreshBoardsStyling ||
  (async () => {});

  function getCurrentForumSlug() {
    const path = window.location.pathname.toLowerCase();

    const patterns = [
      /^\/categories\/([^/?#]+)/,
      /^\/discussion\/[^/]+\/([^/?#]+)/,
      /^\/forum\/([^/?#]+)/
    ];

    for (const re of patterns) {
      const match = path.match(re);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim().toLowerCase();
      }
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      try {
        const u = new URL(canonical.href);
        const m = u.pathname.toLowerCase().match(/^\/categories\/([^/?#]+)/);
        if (m && m[1]) {
          return decodeURIComponent(m[1]).trim().toLowerCase();
        }
      } catch (_) {}
    }

    return '';
  }

function openOptionsForCurrentForum() {
  const forumKey = getCurrentForumSlug();

  chrome.runtime.sendMessage({
    action: 'bc-open-options',
    forumKey: forumKey || ''
  });
}

  function waitForRolesElement(timeoutMs = 5000) {
    return new Promise(resolve => {
      const existing = document.querySelector('dd.Roles');
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const el = document.querySelector('dd.Roles');
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeoutMs);
    });
  }

  async function showMembersModal() {
    let existingHost = document.getElementById('bc-members-host');
    let existingModal = existingHost?.shadowRoot?.getElementById('bc-members-modal');

    if (existingModal) {
      existingModal.showModal();
      return;
    }

    const host = document.createElement('div');
    host.id = 'bc-members-host';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('assets/css/boards-modals.css');
    shadow.appendChild(link);

    const modal = document.createElement('dialog');
    modal.id = 'bc-members-modal';
    modal.className = 'bc-modal';

    const innerWrap = document.createElement('div');
    innerWrap.className = 'bc-modal-wrap';

    const headerRow = document.createElement('div');
    headerRow.className = 'bc-modal-header';

    const headerIcon = document.createElement('img');
    headerIcon.src = chrome.runtime.getURL('assets/icon48.png');
    headerIcon.alt = 'BoardsCleaner icon';
    headerIcon.className = 'bc-header-icon';

    const headerTitle = document.createElement('h3');
    headerTitle.textContent = 'BoardsCleaner Settings';

    headerRow.appendChild(headerIcon);
    headerRow.appendChild(headerTitle);
    innerWrap.appendChild(headerRow);

    const generalHeading = document.createElement('h4');
    generalHeading.textContent = 'General settings';
    innerWrap.appendChild(generalHeading);
	
	const extensionCssLabel = document.createElement('label');
extensionCssLabel.className = 'bc-field';

const extensionCssWrap = document.createElement('label');
extensionCssWrap.className = 'bc-toggle-row';

const extensionCssCheckbox = document.createElement('input');
extensionCssCheckbox.id = 'bc-setting-extension-css-enabled';
extensionCssCheckbox.type = 'checkbox';

const extensionCssTextWrap = document.createElement('span');
extensionCssTextWrap.className = 'bc-toggle-text-wrap';

const extensionCssTitle = document.createElement('span');
extensionCssTitle.className = 'bc-toggle-title';
extensionCssTitle.textContent = 'Enable BoardsCleaner extension CSS';

const extensionCssHelp = document.createElement('span');
extensionCssHelp.className = 'bc-toggle-help';
extensionCssHelp.textContent =
  'Turns the main BoardsCleaner stylesheet on or off.';

extensionCssTextWrap.appendChild(extensionCssTitle);
extensionCssTextWrap.appendChild(extensionCssHelp);

extensionCssWrap.appendChild(extensionCssCheckbox);
extensionCssWrap.appendChild(extensionCssTextWrap);

innerWrap.appendChild(extensionCssWrap);

const vanillaCssInfo = document.createElement('div');
vanillaCssInfo.className = 'bc-status';
vanillaCssInfo.style.marginTop = '8px';
vanillaCssInfo.style.marginBottom = '12px';
vanillaCssInfo.textContent =
  'Experimental vanilla forum CSS is now enabled by adding ?bc_vf_css=1 to a Boards.ie URL.';

const vanillaCssDemoLink = document.createElement('a');
vanillaCssDemoLink.href = 'https://www.boards.ie/discussions/bookmarked?bc_vf_css=1';
vanillaCssDemoLink.target = '_top';
vanillaCssDemoLink.rel = 'noopener noreferrer';
vanillaCssDemoLink.textContent = 'Open bookmarks url example with bc_vf_css=1';

const vanillaCssLinkWrap = document.createElement('div');
vanillaCssLinkWrap.style.marginBottom = '14px';
vanillaCssLinkWrap.appendChild(vanillaCssDemoLink);

innerWrap.appendChild(vanillaCssInfo);
innerWrap.appendChild(vanillaCssLinkWrap);

    const overlayDelayLabel = document.createElement('label');
    overlayDelayLabel.className = 'bc-field';
    overlayDelayLabel.appendChild(document.createTextNode('Overlay delay (seconds):'));
    const overlayDelayInput = document.createElement('input');
    overlayDelayInput.id = 'bc-setting-overlay-delay';
    overlayDelayInput.type = 'number';
    overlayDelayInput.min = '0';
    overlayDelayInput.max = '10';
    overlayDelayLabel.appendChild(overlayDelayInput);
    innerWrap.appendChild(overlayDelayLabel);

    const overlayMessageLabel = document.createElement('label');
    overlayMessageLabel.className = 'bc-field';
    overlayMessageLabel.appendChild(document.createTextNode('Overlay message:'));
    const overlayMessageInput = document.createElement('input');
    overlayMessageInput.id = 'bc-setting-overlay-message';
    overlayMessageInput.type = 'text';
    overlayMessageLabel.appendChild(overlayMessageInput);
    innerWrap.appendChild(overlayMessageLabel);

    innerWrap.appendChild(document.createElement('hr'));

    const membershipHeading = document.createElement('h4');
    membershipHeading.textContent = 'Membership Activation';
    innerWrap.appendChild(membershipHeading);

    const activationLabel = document.createElement('label');
    activationLabel.className = 'bc-field';
    activationLabel.appendChild(document.createTextNode('Activation code:'));
    const codeInput = document.createElement('input');
    codeInput.id = 'bc-member-code-input';
    codeInput.type = 'password';
    codeInput.autocomplete = 'new-password';
    codeInput.setAttribute('inputmode', 'text');
    activationLabel.appendChild(codeInput);
    innerWrap.appendChild(activationLabel);

    const showCodeWrap = document.createElement('div');
    showCodeWrap.className = 'bc-show-code-wrap';
    const showCodeLabel = document.createElement('label');
    const showCodeCheckbox = document.createElement('input');
    showCodeCheckbox.type = 'checkbox';
    showCodeCheckbox.id = 'bc-member-show-code';
    showCodeLabel.appendChild(showCodeCheckbox);
    showCodeLabel.appendChild(document.createTextNode(' Show code'));
    showCodeWrap.appendChild(showCodeLabel);
    innerWrap.appendChild(showCodeWrap);

    const detectWrap = document.createElement('div');
    detectWrap.className = 'bc-detect-wrap';
    const detectBtn = document.createElement('button');
    detectBtn.id = 'bc-member-detect-profile-btn';
    detectBtn.type = 'button';
    detectBtn.textContent = 'Detect membership from my Boards profile';
    detectWrap.appendChild(detectBtn);
    innerWrap.appendChild(detectWrap);

    const statusEl = document.createElement('div');
    statusEl.id = 'bc-member-status';
    statusEl.className = 'bc-status';
    statusEl.textContent = 'Enter code and click Activate, or detect from profile.';
    innerWrap.appendChild(statusEl);

    const membersFeatures = document.createElement('div');
    membersFeatures.id = 'bc-members-features';
    membersFeatures.className = 'bc-members-features';

    const membersHeading = document.createElement('h4');
    membersHeading.textContent = 'Members-only features';
    membersFeatures.appendChild(membersHeading);

    const cmpLabel = document.createElement('label');
    cmpLabel.className = 'bc-cmp-label';
    const cmpBlockCheckbox = document.createElement('input');
    cmpBlockCheckbox.type = 'checkbox';
    cmpBlockCheckbox.id = 'bc-setting-cmp-block';
    cmpBlockCheckbox.disabled = true;
    cmpLabel.appendChild(cmpBlockCheckbox);
    cmpLabel.appendChild(
      document.createTextNode(' CMP block (not available on boards.ie – dialog must be answered)')
    );
    membersFeatures.appendChild(cmpLabel);

    const cookieLabel = document.createElement('label');
    const cookieDisagreeCheckbox = document.createElement('input');
    cookieDisagreeCheckbox.type = 'checkbox';
    cookieDisagreeCheckbox.id = 'bc-setting-cookie-disagree';
    cookieLabel.appendChild(cookieDisagreeCheckbox);
    cookieLabel.appendChild(
      document.createTextNode(' Privacy dialog – auto-click “DISAGREE” when shown')
    );
    membersFeatures.appendChild(cookieLabel);

    const adsLabel = document.createElement('label');
    const removeAdsCheckbox = document.createElement('input');
    removeAdsCheckbox.type = 'checkbox';
    removeAdsCheckbox.id = 'bc-setting-remove-ads';
    adsLabel.appendChild(removeAdsCheckbox);
    adsLabel.appendChild(
      document.createTextNode(' Remove ads – delete ad containers from the page')
    );
    membersFeatures.appendChild(adsLabel);

    const alertsLabel = document.createElement('label');
    const removeAlertsCheckbox = document.createElement('input');
    removeAlertsCheckbox.type = 'checkbox';
    removeAlertsCheckbox.id = 'bc-setting-remove-alerts';
    alertsLabel.appendChild(removeAlertsCheckbox);
    alertsLabel.appendChild(
      document.createTextNode(' Remove warning / subscription banners')
    );
    membersFeatures.appendChild(alertsLabel);

    const twitterWidgetsLabel = document.createElement('label');
    const blockTwitterWidgetsCheckbox = document.createElement('input');
    blockTwitterWidgetsCheckbox.type = 'checkbox';
    blockTwitterWidgetsCheckbox.id = 'bc-setting-block-twitter-widgets';
    twitterWidgetsLabel.appendChild(blockTwitterWidgetsCheckbox);
    twitterWidgetsLabel.appendChild(
      document.createTextNode(' Block Twitter/X widgets on boards.ie for faster loading')
    );
    membersFeatures.appendChild(twitterWidgetsLabel);

    const inmobiLabel = document.createElement('label');
    const blockInmobiCmpCheckbox = document.createElement('input');
    blockInmobiCmpCheckbox.type = 'checkbox';
    blockInmobiCmpCheckbox.id = 'bc-setting-block-inmobi-cmp';
    inmobiLabel.appendChild(blockInmobiCmpCheckbox);
    inmobiLabel.appendChild(
      document.createTextNode(' Block InMobi CMP on boards.ie (experimental)')
    );
    membersFeatures.appendChild(inmobiLabel);
	
	const memberLinksWrap = document.createElement('div');
memberLinksWrap.className = 'bc-member-links';

const memberLinksTitle = document.createElement('div');
memberLinksTitle.className = 'bc-member-links-title';
memberLinksTitle.textContent = 'Member interest links';
memberLinksWrap.appendChild(memberLinksTitle);

const subbedForumsLink = document.createElement('a');
subbedForumsLink.href = 'https://www.boards.ie/group/1878-subscribers-forum';
subbedForumsLink.target = '_top';
subbedForumsLink.rel = 'noopener noreferrer';
subbedForumsLink.textContent = 'Subbed Forums';
memberLinksWrap.appendChild(subbedForumsLink);

const oldestMembersLink = document.createElement('a');
oldestMembersLink.href = 'https://www.boards.ie/search?domain=members&sort=dateInserted&scope=site&roleIDs[0]=95&source=community';
oldestMembersLink.target = '_top';
oldestMembersLink.rel = 'noopener noreferrer';
oldestMembersLink.textContent = 'Subbed Members by oldest';
memberLinksWrap.appendChild(oldestMembersLink);

const mikeCommentsLink = document.createElement('a');
mikeCommentsLink.href = 'https://www.boards.ie/profile/comments/Boards.ie%3A%20Mike';
mikeCommentsLink.target = '_top';
mikeCommentsLink.rel = 'noopener noreferrer';
mikeCommentsLink.textContent = 'Mike Comments';
memberLinksWrap.appendChild(mikeCommentsLink);

const odhranCommentsLink = document.createElement('a');
odhranCommentsLink.href = 'https://www.boards.ie/profile/comments/Boards.ie%3A%20Odhran';
odhranCommentsLink.target = '_top';
odhranCommentsLink.rel = 'noopener noreferrer';
odhranCommentsLink.textContent = 'Odhran Comments';
memberLinksWrap.appendChild(odhranCommentsLink);

membersFeatures.appendChild(memberLinksWrap);

    const dangerWrap = document.createElement('div');
    dangerWrap.className = 'bc-danger-wrap';

    const dangerStrong = document.createElement('strong');
    dangerStrong.className = 'bc-danger-strong';
    dangerStrong.textContent = 'Danger zone';
    dangerWrap.appendChild(dangerStrong);
    dangerWrap.appendChild(document.createElement('br'));

    const deactivateBtn = document.createElement('button');
    deactivateBtn.id = 'bc-members-deactivate-btn';
    deactivateBtn.type = 'button';
    deactivateBtn.className = 'bc-danger-btn';
    deactivateBtn.textContent = 'Deactivate membership and reset features';
    dangerWrap.appendChild(deactivateBtn);

    membersFeatures.appendChild(dangerWrap);
    innerWrap.appendChild(membersFeatures);

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'bc-actions-wrap';

    const saveBtn = document.createElement('button');
    saveBtn.id = 'bc-members-save-btn';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';

    const activateBtn = document.createElement('button');
    activateBtn.id = 'bc-member-activate-btn';
    activateBtn.type = 'button';
    activateBtn.textContent = 'Activate';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'bc-member-close-btn';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';

    actionsWrap.appendChild(saveBtn);
    actionsWrap.appendChild(activateBtn);
    actionsWrap.appendChild(closeBtn);
    innerWrap.appendChild(actionsWrap);

    modal.appendChild(innerWrap);
    shadow.appendChild(modal);

    const settingsKey = STORAGE_KEYS.settings || 'bc_membersSettings';
    const memberCodeKey = STORAGE_KEYS.memberCode || 'bc_memberCode';
    const memberActiveKey = STORAGE_KEYS.memberActive || 'bc_memberActive';

    const state = await loadMemberState();
    const safeState = state || {};
    const settings = normaliseBcSettings(safeState[settingsKey] || {});
	
	extensionCssCheckbox.checked = settings.extensionCssEnabled !== false;

    overlayDelayInput.value =
      typeof settings.overlayDelay === 'number' ? settings.overlayDelay : 3;
    overlayMessageInput.value = settings.overlayMessage || '';
    const storedCode = String(safeState[memberCodeKey] || '');
	codeInput.value = storedCode === 'PROFILE-DETECTED' ? '' : storedCode;
    cmpBlockCheckbox.checked = !!settings.cmpBlock;
    cookieDisagreeCheckbox.checked = !!settings.cookieDisagree;
    removeAdsCheckbox.checked = !!settings.removeAds;
    removeAlertsCheckbox.checked = !!settings.removeAlerts;
    blockTwitterWidgetsCheckbox.checked = !!settings.blockTwitterWidgets;
    blockInmobiCmpCheckbox.checked = !!settings.blockInmobiCmp;

    const isActive = !!safeState[memberActiveKey];
    membersFeatures.style.display = isActive ? 'block' : 'none';
    statusEl.textContent = isActive
      ? 'Membership active. You can change members-only options below and click Save.'
      : 'Enter code and click Activate, or detect from profile.';
    statusEl.dataset.state = isActive ? 'success' : '';

    showCodeCheckbox.addEventListener('change', () => {
      codeInput.type = showCodeCheckbox.checked ? 'text' : 'password';
    });

    detectBtn.addEventListener('click', async () => {
      try {
        const url = new URL(location.href);
        const isSelfProfile =
          url.origin === 'https://www.boards.ie' &&
          url.pathname === '/profile/discussions/';

        if (!isSelfProfile) {
          statusEl.textContent =
            'Opening your Boards profile discussions page for membership detection...';
          statusEl.dataset.state = '';

          window.location.href = 'https://www.boards.ie/profile/discussions/';
          return;
        }

        const rolesEl = await waitForRolesElement();
        if (!rolesEl) {
          statusEl.textContent = 'Roles element did not appear in time.';
          statusEl.dataset.state = 'error';
          return;
        }

        const roleEls = document.querySelectorAll('dd.Roles');
        const rolesText = Array.from(roleEls)
          .map(el => (el.textContent || '').trim())
          .join(', ')
          .toLowerCase();

        const hasPaidMember = rolesText.includes('paid member');

        const staffKeywords = [
          'moderator',
          'moderators',
          'employee',
          'administrators',
          'administrator'
        ];
        const hasStaffRole = staffKeywords.some(kw => rolesText.includes(kw));

        const isMember = hasPaidMember || hasStaffRole;

        if (!isMember) {
          statusEl.textContent = 'No paid/staff membership detected from your profile.';
          statusEl.dataset.state = 'error';
          return;
        }

        const currentState = await loadMemberState();
        const safeCurrentState = currentState || {};
        const currentSettings = normaliseBcSettings(
          safeCurrentState[settingsKey] || {}
        );

        await saveMemberState('', true, currentSettings);
        await logMemberState('after profile detect');

        codeInput.value = '';
        membersFeatures.style.display = 'block';
        statusEl.textContent = 'Membership detected from your profile.';
        statusEl.dataset.state = 'success';

        if (typeof updateCmpIconMembershipState === 'function') {
          updateCmpIconMembershipState();
        }

        if (typeof showPopup === 'function') {
          showPopup('BoardsCleaner: membership detected from your profile.');
        }
      } catch (err) {
        console.error('[BoardsCleaner][boards-modals] detect profile failed', err);
        statusEl.textContent = 'Could not detect membership from profile.';
        statusEl.dataset.state = 'error';
      }
    });

    activateBtn.addEventListener('click', async () => {
      try {
        const code = codeInput.value.trim();

        if (!code) {
          statusEl.textContent = 'Please enter a code.';
          statusEl.dataset.state = 'error';
          return;
        }

        const ok = await validateMember(code);

        if (!ok) {
          statusEl.textContent = 'Invalid code.';
          statusEl.dataset.state = 'error';
          return;
        }

        const currentState = await loadMemberState();
        const safeCurrentState = currentState || {};
        const currentSettings = normaliseBcSettings(
          safeCurrentState[settingsKey] || {}
        );

        await saveMemberState(code, true, currentSettings);
        await logMemberState('after activate');

        membersFeatures.style.display = 'block';
        statusEl.textContent = 'Membership activated.';
        statusEl.dataset.state = 'success';

        if (typeof updateCmpIconMembershipState === 'function') {
          updateCmpIconMembershipState();
        }
      } catch (err) {
        console.error('[BoardsCleaner][boards-modals] activate failed', err);
        statusEl.textContent = 'Could not activate membership.';
        statusEl.dataset.state = 'error';
      }
    });

    saveBtn.addEventListener('click', async () => {
      try {
        const currentState = await loadMemberState();
        const safeCurrentState = currentState || {};

        const nextSettings = normaliseBcSettings({
          ...(safeCurrentState[settingsKey] || {}),
		  extensionCssEnabled: !!extensionCssCheckbox.checked,
          overlayDelay: Math.max(0, Math.min(10, Number(overlayDelayInput.value) || 0)),
          overlayMessage: overlayMessageInput.value || '',
          cmpBlock: !!cmpBlockCheckbox.checked,
          cookieDisagree: !!cookieDisagreeCheckbox.checked,
          removeAds: !!removeAdsCheckbox.checked,
          removeAlerts: !!removeAlertsCheckbox.checked,
          blockTwitterWidgets: !!blockTwitterWidgetsCheckbox.checked,
          blockInmobiCmp: !!blockInmobiCmpCheckbox.checked
        });

        await saveMemberState(
          safeCurrentState[memberCodeKey] || codeInput.value.trim() || '',
          !!safeCurrentState[memberActiveKey],
          nextSettings
        );
        await logMemberState('after save');
		await refreshBoardsStyling();

        statusEl.textContent = 'Settings saved.';
        statusEl.dataset.state = 'success';

        if (typeof showPopup === 'function') {
          showPopup('BoardsCleaner settings saved.');
        }
      } catch (err) {
        console.error('[BoardsCleaner][boards-modals] save failed', err);
        statusEl.textContent = 'Could not save settings.';
        statusEl.dataset.state = 'error';
      }
    });

    deactivateBtn.addEventListener('click', async () => {
      try {
        const resetSettings = normaliseBcSettings({
		  extensionCssEnabled: !!extensionCssCheckbox.checked,
          overlayDelay: Math.max(0, Math.min(10, Number(overlayDelayInput.value) || 3)),
          overlayMessage: overlayMessageInput.value || '',
          cmpBlock: false,
          cookieDisagree: false,
          removeAds: false,
          removeAlerts: false,
          blockTwitterWidgets: false,
          blockInmobiCmp: false
        });

        await saveMemberState('', false, resetSettings);
        await logMemberState('after deactivate');

        codeInput.value = '';
        cmpBlockCheckbox.checked = false;
        cookieDisagreeCheckbox.checked = false;
        removeAdsCheckbox.checked = false;
        removeAlertsCheckbox.checked = false;
        blockTwitterWidgetsCheckbox.checked = false;
        blockInmobiCmpCheckbox.checked = false;
        membersFeatures.style.display = 'none';

        statusEl.textContent = 'Membership deactivated and feature settings reset.';
        statusEl.dataset.state = 'error';

        if (typeof updateCmpIconMembershipState === 'function') {
          updateCmpIconMembershipState();
        }
      } catch (err) {
        console.error('[BoardsCleaner][boards-modals] deactivate failed', err);
        statusEl.textContent = 'Could not deactivate membership.';
        statusEl.dataset.state = 'error';
      }
    });

    closeBtn.addEventListener('click', () => {
      modal.close();
    });

    modal.addEventListener('close', () => {
      host.remove();
    });

    modal.showModal();
  }

async function showStyledForumsModal() {
  let existingHost = document.getElementById('bc-styled-forums-host');
  let existingModal = existingHost?.shadowRoot?.getElementById('bc-styled-forums-modal');

  if (existingModal) {
    existingModal.showModal();
    return;
  }

  const host = document.createElement('div');
  host.id = 'bc-styled-forums-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('assets/css/boards-modals.css');
  shadow.appendChild(link);

  const modal = document.createElement('dialog');
  modal.id = 'bc-styled-forums-modal';
  modal.className = 'bc-modal';

  const wrap = document.createElement('div');
  wrap.className = 'bc-modal-wrap';

  const headerRow = document.createElement('div');
  headerRow.className = 'bc-modal-header';

  const headerIcon = document.createElement('img');
  headerIcon.src = chrome.runtime.getURL('assets/icon48.png');
  headerIcon.alt = 'BoardsCleaner icon';
  headerIcon.className = 'bc-header-icon';

  const headerTitle = document.createElement('h3');
  headerTitle.textContent = 'Styled forums';

  headerRow.appendChild(headerIcon);
  headerRow.appendChild(headerTitle);
  wrap.appendChild(headerRow);

  const statusEl = document.createElement('div');
  statusEl.className = 'bc-status';
  statusEl.textContent = 'Loading styled forums...';
  wrap.appendChild(statusEl);

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search styled forums...';
  searchInput.className = 'bc-search';
  searchInput.disabled = true;
  wrap.appendChild(searchInput);

  const countEl = document.createElement('div');
  countEl.className = 'bc-count';
  wrap.appendChild(countEl);

  const emptyEl = document.createElement('div');
  emptyEl.className = 'bc-empty';
  emptyEl.textContent = 'No styled forums found.';
  emptyEl.style.display = 'none';
  wrap.appendChild(emptyEl);

  const listEl = document.createElement('div');
  listEl.className = 'bc-list';
  wrap.appendChild(listEl);

  const actions = document.createElement('div');
  actions.className = 'bc-actions';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  actions.appendChild(closeBtn);

  wrap.appendChild(actions);
  modal.appendChild(wrap);
  shadow.appendChild(modal);

  let items = [];

  try {
    if (typeof getStyledForumsList !== 'function') {
      throw new Error('getStyledForumsList is not available');
    }

    const result = await getStyledForumsList();

    if (Array.isArray(result)) {
      items = result;
    } else if (result && Array.isArray(result.items)) {
      items = result.items;
    } else if (result && typeof result === 'object') {
      items = Object.entries(result).map(([forumKey, value]) => ({
        forumKey,
        themeId: value?.themeId || '',
        hasCustomCss: !!(value?.hasCustomCss || value?.customCss)
      }));
    } else {
      items = [];
    }
  } catch (err) {
    console.error('[BoardsCleaner][boards-modals] styled forums load failed', err);
    statusEl.textContent = 'Could not load styled forums.';
    statusEl.dataset.state = 'error';
    countEl.textContent = '0 styled forums';
    emptyEl.style.display = 'block';
    modal.showModal();
    return;
  }

  items = items
    .filter(item => item && item.forumKey)
    .map(item => ({
      forumKey: String(item.forumKey || '').trim(),
      themeId: String(item.themeId || '').trim(),
      hasCustomCss: !!(item.hasCustomCss || item.customCss)
    }))
    .filter(item => item.forumKey)
    .sort((a, b) => a.forumKey.localeCompare(b.forumKey));

  function render(query = '') {
    const q = String(query || '').trim().toLowerCase();

    const visible = !q
      ? items
      : items.filter(item =>
          item.forumKey.toLowerCase().includes(q) ||
          item.themeId.toLowerCase().includes(q)
        );

    listEl.innerHTML = '';
    countEl.textContent = `${visible.length} styled forum${visible.length === 1 ? '' : 's'}`;
    emptyEl.style.display = visible.length === 0 ? 'block' : 'none';

    visible.forEach(item => {
      const row = document.createElement('div');
      row.className = 'bc-row';

      const header = document.createElement('div');
      header.className = 'bc-row-header';

      const title = document.createElement('div');
      title.className = 'bc-row-title';
      title.textContent = item.forumKey;

      const theme = document.createElement('div');
      theme.className = 'bc-row-theme';
      theme.textContent = item.themeId
        ? `Theme: ${item.themeId}`
        : 'Theme: (custom CSS only)';

      header.appendChild(title);
      header.appendChild(theme);
      row.appendChild(header);

      const flags = document.createElement('div');
      flags.className = 'bc-row-flags';
      flags.textContent = `Custom CSS: ${item.hasCustomCss ? 'Yes' : 'No'}`;
      row.appendChild(flags);

      const rowActions = document.createElement('div');
      rowActions.className = 'bc-row-actions';

      const openLink = document.createElement('a');
      openLink.href = `https://www.boards.ie/categories/${encodeURIComponent(item.forumKey)}`;
      openLink.target = '_top';
      openLink.textContent = 'Open forum';
      rowActions.appendChild(openLink);

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit theme';
editBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({
    action: 'bc-open-options',
    forumKey: item.forumKey
  });
});
      rowActions.appendChild(editBtn);

      row.appendChild(rowActions);
      listEl.appendChild(row);
    });
  }

  statusEl.textContent = items.length
    ? 'Forums with saved theme or custom CSS.'
    : 'No styled forums found.';

  statusEl.dataset.state = items.length ? 'success' : '';
  searchInput.disabled = false;

  render('');

  searchInput.addEventListener('input', () => {
    render(searchInput.value);
  });

  closeBtn.addEventListener('click', () => {
    modal.close();
  });

  modal.addEventListener('close', () => {
    host.remove();
  });

  modal.showModal();
}

  window.showMembersModal = showMembersModal;
  window.showStyledForumsModal = showStyledForumsModal;
  window.getCurrentForumSlug = getCurrentForumSlug;
  window.openOptionsForCurrentForum = openOptionsForCurrentForum;

  return {
    showMembersModal,
    showStyledForumsModal,
    getCurrentForumSlug,
    openOptionsForCurrentForum
  };
}