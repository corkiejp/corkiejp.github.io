const api = typeof browser !== 'undefined' ? browser : chrome;

// Register declarativeNetRequest rules on install/update
api.runtime.onInstalled.addListener(() => {
  if (api.declarativeNetRequest) {
    const redirectUrl = api.runtime.getURL('redirect.html');
    const rule = {
      id: 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          // Dynamic extension redirect URL incorporating the query backreference
          regexSubstitution: `${redirectUrl}?q=\\1`
        }
      },
      condition: {
        regexFilter: '^https://127\\.0\\.0\\.1/\\?q=([^&]+).*$',
        resourceTypes: ['main_frame']
      }
    };

    api.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [rule]
    }).then(() => {
      console.log('Successfully registered dynamic redirect rule.');
    }).catch((err) => {
      console.error('Failed to register dynamic redirect rule:', err);
    });
  }
});