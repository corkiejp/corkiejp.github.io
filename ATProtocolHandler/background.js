const api = typeof browser !== 'undefined' ? browser : chrome;

console.log('background.js loaded, omnibox listener attaching...');

const PDS_LOOKUP_CACHE_KEY = 'pdsLookupCache';
const WSO_PDS_ENDPOINT = 'https://pds.wsocial.network';
const EUROSKY_PDS_ENDPOINT = 'https://eurosky.social';

console.log('PDS extension background loaded');

function getStorageArea() {
  if (typeof browser !== 'undefined' && browser.storage?.local) {
    return browser.storage.local;
  }
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return chrome.storage.local;
  }
  return null;
}

function pdsGetCache() {
  const storage = getStorageArea();
  if (!storage) return Promise.resolve({});
  return new Promise(resolve => {
    storage.get(PDS_LOOKUP_CACHE_KEY, data => {
      resolve(data[PDS_LOOKUP_CACHE_KEY] || {});
    });
  });
}

function pdsSetCache(cache) {
  const storage = getStorageArea();
  if (!storage) return Promise.resolve();
  return new Promise(resolve => {
    storage.set({ [PDS_LOOKUP_CACHE_KEY]: cache }, () => resolve());
  });
}

async function resolveDidVia(baseUrl, handle) {
  const url = `${baseUrl}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`resolveHandle ${baseUrl} ${res.status}`);
  const json = await res.json();
  if (!json.did) throw new Error('No DID in resolveHandle response');
  return json.did;
}

async function getPdsEndpointViaPlc(did) {
  const url = `https://plc.directory/${encodeURIComponent(did)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PLC ${res.status}`);
  const json = await res.json();

  // PLC uses "service" (array) in the DID document, not "services"
  const services = Array.isArray(json.service) ? json.service : (json.services || {});

  // Find the atproto_pds service entry
  let endpoint = '';

  if (Array.isArray(services)) {
    const pdsSvc = services.find(s => s && s.id === '#atproto_pds');
    if (pdsSvc && typeof pdsSvc.serviceEndpoint === 'string') {
      endpoint = pdsSvc.serviceEndpoint;
    }
  } else if (services && services.atproto_pds) {
    // Fallback if some implementations use { services: { atproto_pds: { endpoint: ... } } }
    const svc = services.atproto_pds;
    if (svc && typeof svc.endpoint === 'string') {
      endpoint = svc.endpoint;
    }
  }

  return endpoint ? endpoint.replace(/\/+$/, '') : '';
}

async function resolveDidForHandle(handle) {
  const candidates = [
    WSO_PDS_ENDPOINT,
    EUROSKY_PDS_ENDPOINT,
    'https://bsky.social'
  ];

  for (const base of candidates) {
    try {
      const url = `${base}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      if (json.did) return json.did;
    } catch {
      // try next
    }
  }

  throw new Error('resolveHandle failed for all known PDSes');
}

async function getPdsEndpointForDid(did) {
  const url = `https://plc.directory/${encodeURIComponent(did)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PLC ${res.status}`);
  const json = await res.json();
  const svc = json.services && json.services.atproto_pds;
  const endpoint = svc && typeof svc.endpoint === 'string' ? svc.endpoint : '';
  return endpoint.replace(/\/+$/, '');
}

async function lookupPdsForHandle(handle) {
  const key = String(handle || '').toLowerCase();
  const cache = await pdsGetCache();

  if (cache[key] && cache[key].expiresAt > Date.now()) {
    return cache[key]; // { endpoint, source }
  }

  let did = null;
  let endpoint = '';
  let source = 'unresolved';

  let resolvedByWsocial = false;
  let resolvedByEurosky = false;

  // 1) Try wsocial PDS
  try {
    did = await resolveDidVia(WSO_PDS_ENDPOINT, handle);
    resolvedByWsocial = true;
  } catch (err) {
    // ignore, try next
  }

  // 2) Try Eurosky PDS
  if (!did) {
    try {
      did = await resolveDidVia(EUROSKY_PDS_ENDPOINT, handle);
      resolvedByEurosky = true;
    } catch (err) {
      // ignore, try next
    }
  }

  // 3) Fallback to bsky.social resolver if still no DID
  if (!did) {
    try {
      did = await resolveDidVia('https://bsky.social', handle);
    } catch (err) {
      console.warn('PDS lookup: could not resolve DID for handle', handle, err);

      const unresolved = {
        endpoint: '',
        source: 'unresolved',
        expiresAt: Date.now() + 6 * 60 * 60 * 1000
      };
      cache[key] = unresolved;
      await pdsSetCache(cache);
      return unresolved;
    }
  }

  // 4) Ask PLC what PDS actually hosts this DID
  try {
    const plcEndpoint = await getPdsEndpointViaPlc(did);

    if (plcEndpoint) {
      endpoint = plcEndpoint;
      source = 'plc';
    } else {
      // PLC knows the DID but doesn’t list a PDS
      endpoint = '';
      source = 'plcMissing';
    }
  } catch (err) {
    console.warn('PDS lookup: PLC error for DID', did, err);
    endpoint = '';
    source = 'plcError';
  }

  // 5) Do NOT override PLC with wsocial/Eurosky here.
  // If PLC gave us nothing, we only record who was able to resolve it,
  // but we won’t label it as W/E in the UI.
  if (!endpoint) {
    if (resolvedByWsocial) {
      source = 'resolverOnly_wsocial';
    } else if (resolvedByEurosky) {
      source = 'resolverOnly_eurosky';
    } else {
      source = 'resolverOnly_other';
    }
  }

  const result = {
    endpoint,        // may be '' when PLC has no services
    source,          // 'plc', 'plcMissing', 'plcError', 'resolverOnly_*', 'unresolved'
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  };

  cache[key] = result;
  await pdsSetCache(cache);
  return result;
}

function openAtList(aturl) {
  const url = encodeURIComponent(aturl);
  const target = api.runtime.getURL(`list.html?aturl=${url}`);
  console.log('Opening AT list:', target);
  api.tabs.create({ url: target });
}

function openDefaultList() {
  const target = api.runtime.getURL('list.html');
  console.log('Opening default list:', target);
  api.tabs.create({ url: target });
}

if (api.omnibox) {
  api.omnibox.onInputEntered.addListener((text) => {
    console.log('omnibox input entered:', text);
    const trimmed = (text || '').trim();

    if (!trimmed) {
      openDefaultList();
      return;
    }

    // If it starts with at://, open list.html?aturl=...
    if (trimmed.startsWith('at://')) {
      openAtList(trimmed);
      return;
    }

    // If it looks like a full URL (http/https or at:// embedded), also pass as aturl
    if (/^https?:\/\//i.test(trimmed) || trimmed.includes('at://')) {
      openAtList(trimmed);
      return;
    }

    // Fallback: open default list
    openDefaultList();
  });

  api.omnibox.onInputChanged.addListener((text, suggest) => {
    const trimmed = (text || '').trim();
    const suggestions = [];

    if (!trimmed) {
      suggestions.push({
        content: '',
        description: 'Open AT list (type an AT URI or URL after "at")'
      });
    } else if (trimmed.startsWith('at://') || trimmed.includes('at://') || /^https?:\/\//i.test(trimmed)) {
      suggestions.push({
        content: trimmed,
        description: `Open list for: ${trimmed}`
      });
    } else {
      suggestions.push({
        content: trimmed,
        description: `Open list (input: ${trimmed})`
      });
    }

    try {
      suggest(suggestions);
    } catch (e) {
      console.warn('omnibox suggest failed:', e);
    }
  });
} else {
  console.warn('omnibox not available in this browser');
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('background onMessage received:', msg);

    if (msg && msg.type === 'pdsLookup') {
      const { handle } = msg;

      lookupPdsForHandle(handle)
        .then(result => {
          console.log('PDS lookup result:', result);
          const endpoint = (result.endpoint || '').toLowerCase();
          sendResponse({
            endpoint: result.endpoint,
            source: result.source,
            isWsocial: endpoint === WSO_PDS_ENDPOINT,
            isEurosky: endpoint === EUROSKY_PDS_ENDPOINT
          });
        })
        .catch(err => {
          console.error('PDS lookup failed:', err);
          sendResponse({ error: String(err) });
        });

      return true; // async
    }

    // New: return cached result only, no fresh lookup
    if (msg && msg.type === 'pdsLookupCached') {
      const { handle } = msg;
      const key = String(handle || '').toLowerCase();

      pdsGetCache().then(cache => {
        const entry = cache[key];
        if (entry && entry.expiresAt > Date.now()) {
          const endpoint = (entry.endpoint || '').toLowerCase();
          sendResponse({
            endpoint: entry.endpoint,
            source: entry.source,
            isWsocial: endpoint === WSO_PDS_ENDPOINT,
            isEurosky: endpoint === EUROSKY_PDS_ENDPOINT,
            fromCache: true
          });
        } else {
          // No valid cache
          sendResponse({ fromCache: false });
        }
      });

      return true;
    }
  });
}