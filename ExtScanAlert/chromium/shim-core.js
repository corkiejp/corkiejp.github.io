// shim-core.js
(() => {
  const proxyStorageMap = new Map();

  // The true production dataset tree the BBC's internal framework loops require
  const bbcOptimizelyDatafileSnapshot = {
    "accountId": "4621041136",
    "projectId": "28346550223",
    "revision": "24",
    "attributes": [],
    "audiences": [
      {
        "id": "\$opt_dummy_audience",
        "name": "Optimizely-Generated Audience for Backwards Compatibility",
        "conditions": "[\"or\", {\"match\": \"exact\", \"name\": \"\(opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"\)opt_dummy_value\"}]"
      }
    ],
    "version": "4",
    "events": [
      { "id": "5744248918638592", "experimentIds": [], "key": "page_view" },
      { "id": "6553857734475776", "experimentIds": ["9300003461161"], "key": "mparticle_homepage_nevada_click" }
    ],
    "integrations": [],
    "holdouts": [],
    "localHoldouts": [],
    "anonymizeIP": true,
    "botFiltering": false,
    "typedAudiences": [],
    "variables": [],
    "environmentKey": "production",
    "sdkKey": "Y67aV8AjKqtntTQvKqk1A",
    "featureFlags": [
      { "id": "130558", "key": "test_x_flag", "rolloutId": "rollout-130558-28413170187", "experimentIds": [], "variables": [{ "id": "42556", "key": "string_variable", "type": "string", "defaultValue": "Monkeys!" }] },
      { "id": "357713", "key": "aa_test_fx", "rolloutId": "rollout-357713-28413170187", "experimentIds": [], "variables": [] },
      { "id": "442292", "key": "aa_test_mobile_apps", "rolloutId": "rollout-442292-28413170187", "experimentIds": [], "variables": [] },
      { "id": "521818", "key": "test_x_flag2", "rolloutId": "rollout-521818-28413170187", "experimentIds": [], "variables": [] },
      { "id": "542506", "key": "sample_a_b_test_mobile_apps", "rolloutId": "rollout-542506-28413170187", "experimentIds": [], "variables": [] },
      { "id": "550398", "key": "feature_article_progress_bar", "rolloutId":"rollout-550398-28413170187", "experimentIds": [], "variables": [] },
      { "id": "553844", "key": "features_page_aa_validation", "rolloutId":"rollout-553844-28413170187", "experimentIds": [], "variables": [] },
      { "id": "554676", "key": "travelling_save_share_buttons", "rolloutId":"rollout-554676-28413170187", "experimentIds": [], "variables": [] },
      { "id": "580836", "key": "mparticle_homepage_nevada", "rolloutId":"rollout-580836-28413170187", "experimentIds": ["9300003461161"], "variables": [] }
    ],
    "rollouts": [
      { "id": "rollout-130558-28413170187", "experiments": [{ "id": "default-rollout-130558-28413170187", "key": "default-rollout-130558-28413170187", "status": "Running", "layerId": "rollout-130558-28413170187", "variations": [{ "id": "410144", "key": "off", "featureEnabled": false, "variables": [{ "id": "42556", "value": "Monkeys!" }] }], "trafficAllocation": [{ "entityId": "410144", "endOfRange": 10000 }], "forcedVariations": {}, "audienceIds": [], "audienceConditions": [], "type": "td" }] }
    ],
    "experiments": [
      {
        "id": "9300003461161", "key": "mparticle_homepage_nevada", "status": "Running", "layerId": "9300002712897",
        "variations": [
          { "id": "1832799", "key": "naive_recommendations", "featureEnabled": true, "variables": [] },
          { "id": "1832800", "key": "personalised_recommendations", "featureEnabled": true, "variables": [] }
        ],
        "trafficAllocation": [{ "entityId": "1832799", "endOfRange": 10000 }],
        "forcedVariations": { "test-naive": "naive_recommendations", "test-personalised": "personalised_recommendations" },
        "audienceIds": [], "audienceConditions": [], "type": "ab"
      }
    ],
    "groups": [],
    "region": "US"
  };

  // --- NETWORK INTERCEPTION LAYER ---
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && url.includes('optimizely.com/datafiles/')) {
      console.info("[ExtScanAlert] Successfully hijacked Optimizely configuration fetch request.");
      return new Response(JSON.stringify(bbcOptimizelyDatafileSnapshot), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    return originalFetch.apply(this, args);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._url && this._url.includes('optimizely.com/datafiles/')) {
      console.info("[ExtScanAlert] Successfully hijacked Optimizely configuration XHR request.");
      Object.defineProperty(this, 'readyState', { writable: true, value: 4 });
      Object.defineProperty(this, 'status', { writable: true, value: 200 });
      Object.defineProperty(this, 'responseText', { writable: true, value: JSON.stringify(bbcOptimizelyDatafileSnapshot) });
      Object.defineProperty(this, 'response', { writable: true, value: bbcOptimizelyDatafileSnapshot });
      
      if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
      if (typeof this.onload === 'function') this.onload();
      return;
    }
    return originalSend.call(this, body);
  };

  // --- DEEP PROXY LOGIC LAYER ---
  const createDeepProxyWrapper = (namespaceLabel) => {
    if (!proxyStorageMap.has(namespaceLabel)) {
      proxyStorageMap.set(namespaceLabel, {});
    }
    const localStore = proxyStorageMap.get(namespaceLabel);
    
    if (namespaceLabel === 'optimizely') {
      localStore.isMobileWebview = false;
      localStore.getOptimizelyConfig = () => bbcOptimizelyDatafileSnapshot;
    }

    const fallbackNoOp = () => {};
    const handler = {
      get: (target, property) => {
        if (property === 'then') return undefined;
        if (property === Symbol.toPrimitive || property === 'valueOf') {
          return (hint) => hint === 'number' ? 0 : '';
        }
        if (property === 'push') {
          return (item) => { if (typeof item === 'function') { try { item(); } catch(e) {} } };
        }
        if (property === Symbol.toStringTag || property === 'toString') {
          return () => '';
        }
        if (property in localStore) return localStore[property];
        return createDeepProxyWrapper(`${namespaceLabel}.${String(property)}`);
      },
      set: (target, property, value) => {
        localStore[property] = value;
        return true;
      },
      apply: (target, thisArg, argumentsList) => {
        if (namespaceLabel.includes('getOptimizelyConfig')) return bbcOptimizelyDatafileSnapshot;
        return createDeepProxyWrapper(`${namespaceLabel}()`);
      }
    };
    return new Proxy(fallbackNoOp, handler);
  };

  // Register comprehensive globals including SpeedCurve layout parameters
  const targetGlobals = [
    'optimizely', 'tp', 'chartbeat', 'cxense', 'cX', 'permutive', 
    'BOOMR', 'LUX', 'speedcurve', 'doubleverify', 'dvtag',
    'echoClient', 'EchoClient', 'Echo'
  ];

  targetGlobals.forEach((globalName) => {
    let currentVal = undefined;
    Object.defineProperty(window, globalName, {
      get: () => currentVal !== undefined ? currentVal : createDeepProxyWrapper(globalName),
      set: (val) => { currentVal = val; },
      configurable: true,
      enumerable: true
    });
  });

  console.info("ExtScanAlert: Primitive-safe Network-mocking system finalized.");
})();
