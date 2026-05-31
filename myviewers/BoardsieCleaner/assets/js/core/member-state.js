// assets/js/core/member-state.js

console.log('[BoardsCleaner] validateMember');

const VALID_MEMBER_HASHES = [
  '4624b987510ccef95b099111bea5aaebf318bfc906161ad4942ebe0b28ce0fa6'
];

async function sha256Hex(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateMember(code) {
  if (!code) return false;

  const plain = code.trim();
//     if (plain === 'TEST123')
//       return true; // dev shortcut
  if (!plain) return false;

  const hash = await sha256Hex(plain);
  console.log('[BoardsCleaner] validateMember', { plain, hash });
  return VALID_MEMBER_HASHES.includes(hash);
}

async function logMemberState(tag = 'BC state', deps = {}) {
  const loadMemberState =
    deps.loadMemberState ||
    window.loadMemberState;

  const normaliseBcSettings =
    deps.normaliseBcSettings ||
    window.normaliseBcSettings;

  const STORAGE_KEYS =
    deps.STORAGE_KEYS ||
    window.STORAGE_KEYS;

  if (
    typeof loadMemberState !== 'function' ||
    typeof normaliseBcSettings !== 'function' ||
    !STORAGE_KEYS
  ) {
    return;
  }

  try {
    const state = await loadMemberState();
    const safeState = state || {};
    const settings = normaliseBcSettings(safeState[STORAGE_KEYS.settings]);

    // Keep this quiet for now, matching your current content.js behaviour.
    // console.log(`[BoardsCleaner] ${tag}`, {
    //   memberActive: !!safeState[STORAGE_KEYS.memberActive],
    //   memberCode: safeState[STORAGE_KEYS.memberCode],
    //   settings
    // });

    return {
      memberActive: !!safeState[STORAGE_KEYS.memberActive],
      memberCode: safeState[STORAGE_KEYS.memberCode] || '',
      settings
    };
  } catch (err) {
    console.error(`[BoardsCleaner] ${tag} failed`, err);
    return null;
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

async function autoDetectMembershipFromProfile(deps = {}) {
  const loadMemberState =
    deps.loadMemberState ||
    window.loadMemberState;

  const saveMemberState =
    deps.saveMemberState ||
    window.saveMemberState;

  const normaliseBcSettings =
    deps.normaliseBcSettings ||
    window.normaliseBcSettings;

  const STORAGE_KEYS =
    deps.STORAGE_KEYS ||
    window.STORAGE_KEYS;

  const showPopup =
    deps.showPopup ||
    window.showPopup;

  const updateCmpIconMembershipState =
    deps.updateCmpIconMembershipState ||
    window.updateCmpIconMembershipState;

  if (
    typeof loadMemberState !== 'function' ||
    typeof saveMemberState !== 'function' ||
    typeof normaliseBcSettings !== 'function' ||
    !STORAGE_KEYS
  ) {
    return false;
  }

  try {
    const url = new URL(location.href);
    const isSelfProfile =
      url.origin === 'https://www.boards.ie' &&
      url.pathname === '/profile/discussions/';

    if (!isSelfProfile) {
      return false;
    }

    const rolesEl = await waitForRolesElement();
    if (!rolesEl) {
      console.log('BoardsCleaner: Roles element did not appear in time');
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

    const current = await loadMemberState();
    const safeCurrent = current || {};
    const settings = normaliseBcSettings(safeCurrent[STORAGE_KEYS.settings]);

    await saveMemberState('', true, settings);

    if (typeof showPopup === 'function') {
      showPopup('BoardsCleaner: membership detected from your profile.');
    }

    if (typeof updateCmpIconMembershipState === 'function') {
      updateCmpIconMembershipState();
    } else {
      console.log('BoardsCleaner: membership set from profile, icon update skipped on this page');
    }

    return true;
  } catch (e) {
    console.error('BoardsCleaner: error during auto membership detection', e);
    return false;
  }
}

export {
  VALID_MEMBER_HASHES,
  sha256Hex,
  validateMember,
  logMemberState,
  waitForRolesElement,
  autoDetectMembershipFromProfile
};