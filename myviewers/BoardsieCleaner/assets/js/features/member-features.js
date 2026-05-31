// assets/js/features/member-features.js

export function initMemberFeatures(deps = {}) {
  const loadMemberState =
    deps.loadMemberState || window.loadMemberState;

  const saveMemberState =
    deps.saveMemberState || window.saveMemberState;

  const normaliseBcSettings =
    deps.normaliseBcSettings || window.normaliseBcSettings;

  const STORAGE_KEYS =
    deps.STORAGE_KEYS || window.STORAGE_KEYS;

  const showPopup =
    deps.showPopup || window.showPopup || (() => {});

  const updateCmpIconMembershipState =
    deps.updateCmpIconMembershipState ||
    window.updateCmpIconMembershipState ||
    (() => {});

  function removeBoardsAlerts(root = document) {
    try {
      const selectors = [
        '.DismissMessage.WarningMessage',
        '.DismissMessage.AlertMessage'
      ];

      root.querySelectorAll(selectors.join(',')).forEach(el => el.remove());
    } catch (e) {
      console.error('BC removeBoardsAlerts error', e);
    }
  }

  function removeBoardsAds(root = document) {
    try {
      const selectors = [
        '.mid-ad',
        '.ad-container',
        '.ad-text',
        '.adsbygoogle',
        '.advertisement',
        '.ad-slot',
        '.no-ad-top-spacer'
      ];

      root.querySelectorAll(selectors.join(',')).forEach(el => el.remove());
    } catch (e) {
      console.error('BC removeBoardsAds error', e);
    }
  }

  function dismissQuantcast() {
    const disagreeBtns = document.querySelectorAll('.qc-cmp2-footer button[mode="secondary"]');
    if (disagreeBtns[1]) {
      disagreeBtns[1].click();

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

      return true;
    }

    const allBtns = document.querySelectorAll('button');
    for (const btn of allBtns) {
      if ((btn.textContent || '').toUpperCase().includes('DISAGREE')) {
        btn.click();

        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        return true;
      }
    }

    const agreeBtn = document.querySelector('button[mode="primary"], .css-47sehv');
    if (agreeBtn) {
      agreeBtn.click();

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

      return true;
    }

    return false;
  }

  function handleBoardsCmp(settings) {
    if (!settings.cookieDisagree && !settings.cmpBlock) {
      return;
    }

    if (dismissQuantcast()) {
      return;
    }

    if (!document.body) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (dismissQuantcast()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      if (dismissQuantcast()) {
        observer.disconnect();
      }
    }, 2000);
  }

  function isOwnProfileDiscussionsPage() {
    try {
      const url = new URL(window.location.href);
      return (
        url.origin === 'https://www.boards.ie' &&
        url.pathname === '/profile/discussions/'
      );
    } catch {
      return false;
    }
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

  async function autoDetectMembershipFromOwnProfile() {
    if (
      typeof loadMemberState !== 'function' ||
      typeof saveMemberState !== 'function' ||
      typeof normaliseBcSettings !== 'function' ||
      !STORAGE_KEYS
    ) {
      return false;
    }

    if (!isOwnProfileDiscussionsPage()) {
      return false;
    }

    try {
      const rolesEl = await waitForRolesElement();
      if (!rolesEl) {
        return false;
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
        return false;
      }

      const currentState = await loadMemberState().catch(() => ({}));
      const safeCurrentState = currentState || {};

      if (safeCurrentState[STORAGE_KEYS.memberActive]) {
        return true;
      }

      const currentSettings = normaliseBcSettings(
        safeCurrentState[STORAGE_KEYS.settings] || {}
      );

      await saveMemberState(
        safeCurrentState[STORAGE_KEYS.memberCode] || '',
        true,
        currentSettings
      );

      updateCmpIconMembershipState();
      showPopup('BoardsCleaner: membership detected from your profile.');
      return true;
    } catch (err) {
      console.error('[BoardsCleaner][member-features] auto detect failed', err);
      return false;
    }
  }

  async function runMemberFeatures() {
    if (
      typeof loadMemberState !== 'function' ||
      typeof normaliseBcSettings !== 'function' ||
      !STORAGE_KEYS
    ) {
      return;
    }

    try {
      await autoDetectMembershipFromOwnProfile();

      const state = await loadMemberState().catch(() => ({}));
      const safeState = state || {};
      const isMemberActive = !!safeState[STORAGE_KEYS.memberActive];
      const settings = normaliseBcSettings(safeState[STORAGE_KEYS.settings] || {});

      if (!isMemberActive) {
        return;
      }

      if (settings.removeAlerts) {
        removeBoardsAlerts();
      }

      if (settings.removeAds) {
        removeBoardsAds();
      }

      if (settings.cmpBlock || settings.cookieDisagree) {
        handleBoardsCmp(settings);
      }
    } catch (err) {
      console.error('[BoardsCleaner][member-features] run failed', err);
    }
  }

  function rerunMemberFeaturesSoon(delay = 300) {
    window.setTimeout(() => {
      runMemberFeatures();
    }, delay);
  }

  return {
    removeBoardsAlerts,
    removeBoardsAds,
    dismissQuantcast,
    handleBoardsCmp,
    autoDetectMembershipFromOwnProfile,
    runMemberFeatures,
    rerunMemberFeaturesSoon
  };
}