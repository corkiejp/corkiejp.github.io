// assets/js/bootstrap.js

(async () => {
  try {
    const contentScriptEnabled = await new Promise((resolve) => {
      if (!chrome?.storage?.sync) {
        resolve(true);
        return;
      }

      chrome.storage.sync.get('contentScriptEnabled', (data) => {
        resolve(data?.contentScriptEnabled !== false);
      });
    });

    if (!contentScriptEnabled) {
      console.log('[BoardsCleaner][bootstrap] disabled by user setting');
      return;
    }

    const storageMod = await import(chrome.runtime.getURL('assets/js/core/storage.js'));
    const observerMod = await import(chrome.runtime.getURL('assets/js/core/dom-observer.js'));
    const domEnhancementsMod = await import(
      chrome.runtime.getURL('assets/js/features/dom-enhancements.js')
    );
    const stylingMod = await import(
      chrome.runtime.getURL('assets/js/features/boards-styling.js')
    );
    const modalMod = await import(
      chrome.runtime.getURL('assets/js/features/boards-modals.js')
    );
    const memberFeaturesMod = await import(
      chrome.runtime.getURL('assets/js/features/member-features.js')
    );
    const experimentalThemeCssSwapMod = await import(
      chrome.runtime.getURL('assets/js/features/experimental-theme-css-swap.js')
    );
    const legacyNavPopupMod = await import(
      chrome.runtime.getURL('assets/js/features/legacy-nav-popup.js')
    );
    const utilityToolbarMod = await import(
      chrome.runtime.getURL('assets/js/features/utility-toolbar.js')
    );
	
	const memberStateMod = await import(
  chrome.runtime.getURL('assets/js/core/member-state.js')
);

const {
  validateMember,
  logMemberState,
  autoDetectMembershipFromProfile
} = memberStateMod;

    const {
      getBcSettings,
      loadMemberState,
      saveMemberState,
      normaliseBcSettings,
      STORAGE_KEYS,
      getStyledForumsList
    } = storageMod;

    const { initDomObserver, registerDomTask, runDomTasksNow } = observerMod;
    const { initDomEnhancements, refreshDomEnhancements } = domEnhancementsMod;
    const { initBoardsStyling, refreshBoardsStyling } = stylingMod;
    const { initBoardsModals } = modalMod;
    const { initMemberFeatures } = memberFeaturesMod;
    const { initExperimentalThemeCssSwap } = experimentalThemeCssSwapMod;
    const { initLegacyNavPopupFeature } = legacyNavPopupMod;
    const { initUtilityToolbar } = utilityToolbarMod;
	

    const settings = await getBcSettings();
    console.log('[BoardsCleaner][bootstrap] settings loaded', settings);

    await initBoardsStyling(getBcSettings);

    initBoardsModals({
      loadMemberState,
      saveMemberState,
validateMember,
logMemberState,
      normaliseBcSettings,
      STORAGE_KEYS,
      getStyledForumsList,
      updateCmpIconMembershipState: window.updateCmpIconMembershipState,
      showPopup: window.showPopup,
	  refreshBoardsStyling: () => refreshBoardsStyling(getBcSettings)
    });

const memberFeatures = initMemberFeatures({
  loadMemberState,
  saveMemberState,
  normaliseBcSettings,
  STORAGE_KEYS,
  showPopup: window.showPopup,
  updateCmpIconMembershipState: window.updateCmpIconMembershipState
});

    initExperimentalThemeCssSwap();
    initDomEnhancements();
    initUtilityToolbar();
    initLegacyNavPopupFeature({ showPopup: window.showPopup, getBcSettings });

    await memberFeatures.runMemberFeatures();

    registerDomTask('dom-enhancements-refresh', () => {
      refreshDomEnhancements();
    });

    registerDomTask('utility-toolbar-refresh', () => {
      initUtilityToolbar();
    });

    registerDomTask('legacy-nav-popup-refresh', () => {
      initLegacyNavPopupFeature({ showPopup: window.showPopup, getBcSettings });
    });

    registerDomTask('member-features-refresh', () => {
      memberFeatures.rerunMemberFeaturesSoon(150);
    });

    initDomObserver();



    runDomTasksNow({
      reason: 'bootstrap-init'
    });

    console.log('[BoardsCleaner][bootstrap] module bootstrap active');
  } catch (err) {
    const message = String(err?.message || err || '');

    if (message.includes('Extension context invalidated')) {
      console.warn('[BoardsCleaner][bootstrap] stopped after extension context invalidation');
      return;
    }

    console.error('[BoardsCleaner][bootstrap] init failed', err);
  }
})();