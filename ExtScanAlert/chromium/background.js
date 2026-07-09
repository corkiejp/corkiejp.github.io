let SLOW_PAGE_RULES = [];
let SITE_WHITELIST_RULES = [];
const DEBUG_DNR_KEEP = true;

const MAX_LOGS = 100;
const FINGERPRINT_DEDUPE_MS = 250;
const RECENT_SCRIPT_WINDOW_MS = 15000;
const MAX_RECENT_SCRIPTS_PER_TAB = 30;

const fingerprintSeen = new Map();
const recentScriptsByTab = new Map();

const MAX_CANDIDATE_SITES = 10;
const MAX_UNKNOWN_PROVIDERS = 200;
const MAX_INTERESTING_KNOWN = 200;

// Skip obvious high-usage providers from stored "interesting" list
const PROVIDER_IGNORE_SET = new Set([
  'turnstile',
  'recaptcha',
  'hcaptcha'
  // add any others you expect to be ubiquitous
]);


// Base-domain and noise helpers

function getBaseDomain(host) {
  const value = String(host || '').toLowerCase();
  const parts = value.split('.');
  if (parts.length < 2) return value;
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  return `${secondLast}.${last}`;
}

function isNoiseHost(host) {
  if (!noiseDomains || !noiseDomains.length) return false;
  const base = getBaseDomain(host);
  return noiseDomains.includes(base);
}

let noiseDomains = null;

async function loadNoiseDomains() {
  if (noiseDomains) return noiseDomains;

  try {
    const url = chrome.runtime.getURL('noise-domains-curated.json');
    const res = await fetch(url);
    const data = await res.json();
    const list = Array.isArray(data.noiseDomains) ? data.noiseDomains : [];

    // normalize to lowercase for matching
    noiseDomains = list.map((d) => String(d).trim().toLowerCase());
  } catch (err) {
    console.error('Failed to load noise-domains-curated.json', err);
    noiseDomains = [];
  }

  return noiseDomains;
}


function normalizeProviderId(input) {
  return String(input || '').trim().toLowerCase();
}

function getProviderMapFromRules(rules) {
  return new Map(
    rules
      .filter((r) => r && r.id)
      .map((r) => [normalizeProviderId(r.id), r])
  );
}

const DEFAULT_SETTINGS = {
  mode: 'block',
  notificationsEnabled: false,
  fingerprintNotificationsEnabled: true,
  fingerprintProtectionEnabled: false,
  fingerprintProtectionFamilies: ['anti-bot / fraud'],
  sitePolicies: {},
  providerPolicies: {},
  notifiedHosts: {},
  fingerprintNotifiedHosts: {},
  perHostCounts: {},
  logs: [],
  status: { initialized: false, lastInit: null, installs: 0 },
  slowPageProtection: false,
  theme: 'dark',
  unknownProviders: {},
  interestingKnownProviders: {},
  dangerousCopyEnabled: true,
  dangerousCopyBlockMode: false
};

let PROVIDER_RULES = [];

const FALLBACK_PROVIDER_RULES = [
  {
    id: 'recaptcha',
    name: 'Google reCAPTCHA',
    family: 'anti-bot / fraud',
    category: 'anti-bot / captcha',
    patterns: ['recaptcha', 'gstatic.com/recaptcha', 'google.com/recaptcha'],
    scoreBoost: 4
  },
  {
    id: 'castle',
    name: 'Castle',
    family: 'anti-bot / fraud',
    category: 'anti-bot / device fingerprinting',
    patterns: ['castle', 'ondemand.castle', 'castle.io'],
    scoreBoost: 4
  },
  {
    id: 'clarity',
    name: 'Microsoft Clarity',
    family: 'analytics / UX',
    category: 'session recording / behavioral analytics',
    patterns: ['clarity.ms', 'scripts.clarity.ms', 'clarity.context.js', 'clarity.js'],
    scoreBoost: 1
  }
];

async function getState() {
  return chrome.storage.local.get(DEFAULT_SETTINGS);
}

async function savePartial(data) {
  return chrome.storage.local.set(data);
}

function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function normalizeHost(input) {
  const host = safeHost(input) || String(input || '').trim().toLowerCase();
  return host.replace(/^www\./, '');
}



function debugKeep(...args) {
  if (!DEBUG_DNR_KEEP) return;
  console.log('[ExtScanAlert DNR DEBUG]', ...args);
}

function isKeepHost(host) {
  const normalized = normalizeHost(host);
  return normalized === 'keep.google.com';
}



function getProviderRuleForHost(host, providerId, state) {
  if (!host || !providerId) return null;
  const providerPolicies = state.providerPolicies || {};
  const hostPolicies = providerPolicies[host];
  if (!hostPolicies || typeof hostPolicies !== 'object') return null;

  const rule = hostPolicies[providerId];
  if (!rule || typeof rule !== 'object') return null;

  const provider = getProviderById(providerId);

  let mode =
    rule.mode === 'allow'
      ? 'allow'
      : rule.mode === 'block'
      ? 'block'
      : rule.mode === 'observe'
      ? 'observe'
      : null;

  if (!mode) return null;

  if (String(provider?.actionMode || '').trim().toLowerCase() === 'observe-only' && mode !== 'observe') {
    mode = 'observe';
  }

  return mode ? { mode, providerId } : null;
}

function getMatchedProviderIds(providers = []) {
  if (!Array.isArray(providers)) return [];
  return providers
    .map((p) => normalizeProviderId(p?.id))
    .filter(Boolean);
}

function getMatchedProviderFamilies(providers = []) {
  if (!Array.isArray(providers)) return [];
  return [...new Set(
    providers
      .map((p) => String(p?.family || '').trim())
      .filter(Boolean)
  )];
}

function getSitePolicyForHost(host, state) {
  if (!host) return null;
  const policies = state.sitePolicies || {};
  const sitePolicy = policies[host];
  if (!sitePolicy || typeof sitePolicy !== 'object') return null;

  const mode =
    sitePolicy.mode === 'allow'
      ? 'allow'
      : sitePolicy.mode === 'block'
      ? 'block'
      : 'observe';

  const families =
    Array.isArray(sitePolicy.families) && sitePolicy.families.length
      ? sitePolicy.families.map(String)
      : [];

  return { mode, families };
}


function getEffectiveFingerprintPolicy(pageUrl, state, providers = []) {
  const host = normalizeHost(pageUrl);

  const fallback = {
    mode: state.fingerprintProtectionEnabled ? 'block' : 'observe',
    families:
      Array.isArray(state.fingerprintProtectionFamilies) &&
      state.fingerprintProtectionFamilies.length
        ? state.fingerprintProtectionFamilies
        : ['anti-bot / fraud'],
    scope: 'global',
    providerId: '',
    matchedProviderIds: getMatchedProviderIds(providers)
  };

  if (!host) return { host: '', ...fallback };

  const matchedProviderIds = getMatchedProviderIds(providers);
  for (const providerId of matchedProviderIds) {
    const providerRule = getProviderRuleForHost(host, providerId, state);
    if (providerRule) {
      const provider = Array.isArray(providers)
        ? providers.find((p) => normalizeProviderId(p?.id) === providerId)
        : null;

      return {
        host,
        mode: providerRule.mode,
        families: provider?.family ? [provider.family] : fallback.families,
        scope: 'provider',
        providerId,
        matchedProviderIds
      };
    }
  }

  const sitePolicy = getSitePolicyForHost(host, state);
  if (sitePolicy) {
    return {
      host,
      mode: sitePolicy.mode || fallback.mode,
      families: sitePolicy.families.length ? sitePolicy.families : fallback.families,
      scope: 'site',
      providerId: '',
      matchedProviderIds
    };
  }

  return {
    host,
    ...fallback
  };
}

function isObserveOnlyFingerprintPolicy(policy) {
  if (!policy || typeof policy !== 'object') return false;
  return policy.mode === 'allow' || policy.mode === 'observe';
}

function shouldNeverBlockFingerprintForPage(policy, pageUrl = '') {
  const host = safeHost(pageUrl);
  if (!policy || typeof policy !== 'object') return false;

  const siteScopedAllow =
    policy.scope === 'site' &&
    (policy.mode === 'allow' || policy.mode === 'observe');

  if (siteScopedAllow) {
    console.log('[ExtScanAlert POLICY]', {
      decision: 'observe-only',
      reason: 'site fingerprint policy allows this page',
      host,
      scope: policy.scope,
      mode: policy.mode,
      family: policy.family || null,
      providerId: policy.providerId || null
    });
    return true;
  }

  return false;
}

function trimStack(stack) {
  if (!stack || typeof stack !== 'string') return '';

  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line !== 'Error' && !line.startsWith('Error:'))
    .filter((line) =>
      !line.includes('page-hook.js') &&
      !line.includes('content.js') &&
      !line.includes('chrome-extension://')
    )
    .slice(0, 3)
    .join(' | ');
}

async function loadProviderRules() {
  try {
    const url = chrome.runtime.getURL('providers.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('providers.json is not an array');

    PROVIDER_RULES = data;
  } catch (err) {
    console.error('Failed to load provider rules, using fallback list', err);
    PROVIDER_RULES = FALLBACK_PROVIDER_RULES;
  }
}




async function loadSiteWhitelistRules() {
  try {
    const url = chrome.runtime.getURL('whitelist.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('whitelist.json is not an array');

    SITE_WHITELIST_RULES = data;

    debugKeep('Loaded whitelist.json', {
      count: SITE_WHITELIST_RULES.length,
      keepEntries: SITE_WHITELIST_RULES.filter((entry) => isKeepHost(entry?.host))
    });
  } catch (err) {
    console.warn('Failed to load whitelist.json, using empty site whitelist', err);
    SITE_WHITELIST_RULES = [];
    debugKeep('whitelist.json failed to load');
  }
}

function getSiteWhitelistHosts(flags = {}) {
  const hosts = new Set();

  const wantFingerprintProtectionBypass = !!flags.fingerprintProtectionBypass;
  const wantContentHooksBypass = !!flags.contentHooksBypass;

  for (const entry of SITE_WHITELIST_RULES) {
    if (!entry || !entry.host) continue;

    const host = normalizeHost(entry.host);
    if (!host) continue;

    if (wantFingerprintProtectionBypass && entry.fingerprintProtectionBypass) {
      hosts.add(host);
      hosts.add(`www.${host}`.replace(/^www\.www\./, 'www.'));
      continue;
    }

    if (wantContentHooksBypass && entry.contentHooksBypass) {
      hosts.add(host);
      hosts.add(`www.${host}`.replace(/^www\.www\./, 'www.'));
    }
  }

  debugKeep('Whitelist-derived hosts', {
    flags,
    hosts: Array.from(hosts)
  });

  return Array.from(hosts);
}

function hasFingerprintProtectionBypass(host) {
  if (!host) return false;
  const normalized = normalizeHost(host);

  return SITE_WHITELIST_RULES.some((entry) => {
    const entryHost = normalizeHost(entry.host || '');
    return entryHost === normalized && !!entry.fingerprintProtectionBypass;
  });
}

function getSiteWhitelistAssociatedDomains(host) {
  if (!host) return [];
  const normalized = normalizeHost(host);

  const entry = SITE_WHITELIST_RULES.find((rule) => {
    return normalizeHost(rule.host || '') === normalized;
  });

  if (!entry || !Array.isArray(entry.whitelistassociateddomains)) {
    return [];
  }

  const domains = entry.whitelistassociateddomains
    .map((d) => String(d).trim().toLowerCase())
    .filter(Boolean);

  debugKeep('Whitelist-associated domains', {
    host: normalized,
    domains
  });

  return domains;
}


function getFingerprintProtectionDomains(families = []) {
  const wanted = new Set(families);
  const domains = new Set();

  for (const provider of PROVIDER_RULES) {
    if (!wanted.has(provider.family)) continue;
    for (const domain of provider.domains || []) {
      if (domain) domains.add(domain);
    }
  }

  return Array.from(domains);
}

function getProviderById(providerId) {
  const id = normalizeProviderId(providerId);
  if (!id) return null;
  return PROVIDER_RULES.find((p) => normalizeProviderId(p?.id) === id) || null;
}

function getProviderDomainsById(providerId) {
  const provider = getProviderById(providerId);
  if (!provider) return [];
  return Array.isArray(provider.domains)
    ? provider.domains.map(String).filter(Boolean)
    : [];
}

// DNR EXEMPTION HELPERS
// Determines which initiator hosts are excluded from fingerprint-protection blocking.
// Sources:
// - sitePolicies allow/observe for matching families
// - providerPolicies allow/observe for matching providers
// - whitelist.json per-site fingerprintProtectionBypass entries


function getFingerprintPolicyExemptHosts(state, target = {}) {
  const exemptHosts = new Set();

  const targetFamilies = Array.isArray(target.families)
    ? target.families.map(String).filter(Boolean)
    : [];
  const wantedFamilies = new Set(targetFamilies);

  const targetProviderId = normalizeProviderId(target.providerId || '');

  const sitePolicies = state.sitePolicies || {};
  for (const [host, policy] of Object.entries(sitePolicies)) {
    if (!policy || !host) continue;

    const mode = policy.mode || 'observe';
    if (mode !== 'allow' && mode !== 'observe') continue;

    const policyFamilies =
      Array.isArray(policy.families) && policy.families.length
        ? policy.families.map(String)
        : [];

    const familyMatch =
      wantedFamilies.size === 0 ||
      policyFamilies.some((f) => wantedFamilies.has(f));

    if (!familyMatch) continue;

    exemptHosts.add(host);
    exemptHosts.add(`www.${host}`.replace(/^www\.www\./, 'www.'));
  }

  if (targetProviderId) {
    const providerPolicies = state.providerPolicies || {};

    for (const [host, hostPolicies] of Object.entries(providerPolicies)) {
      if (!host || !hostPolicies || typeof hostPolicies !== 'object') continue;

      const providerRule = hostPolicies[targetProviderId];
      if (!providerRule || typeof providerRule !== 'object') continue;

      const mode = providerRule.mode || 'observe';
      if (mode !== 'allow' && mode !== 'observe') continue;

      exemptHosts.add(host);
      exemptHosts.add(`www.${host}`.replace(/^www\.www\./, 'www.'));
    }
  }

  for (const host of getSiteWhitelistHosts({ fingerprintProtectionBypass: true })) {
    exemptHosts.add(host);
  }

  // Extend exemptHosts to include associated domains from whitelist.json
  const hostsToProcess = Array.from(exemptHosts);
  for (const host of hostsToProcess) {
    const associated = getSiteWhitelistAssociatedDomains(host);
    for (const domain of associated) {
      const normalizedAssoc = normalizeHost(domain);
      if (normalizedAssoc) {
        exemptHosts.add(normalizedAssoc);
        exemptHosts.add(`www.${normalizedAssoc}`.replace(/^www\.www\./, 'www.'));
      }
    }
  }

  const result = Array.from(exemptHosts);

  if (result.some(isKeepHost) || isKeepHost(target.host) || targetProviderId) {
    debugKeep('Computed exemptHosts', {
      targetProviderId,
      targetFamilies,
      exemptHosts: result.filter((host) => isKeepHost(host) || host.endsWith('.google.com'))
    });
  }

  return result;
}

function buildFingerprintProtectionRules(ruleSpecs = [], baseId = 30000) {
  return ruleSpecs.map((spec, index) => ({
    id: baseId + index,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `||${spec.domain}^`,
      resourceTypes: ['script', 'sub_frame'],
      excludedInitiatorDomains: spec.exemptHosts || []
    }
  }));
}

// MAIN FINGERPRINT PROTECTION REBUILD
// Recomputes all dynamic fingerprint-protection DNR rules from:
// - providers.json
// - enabled families
// - site/provider policy exemptions
// - whitelist.json site-specific bypasses

async function applyFingerprintProtectionRules(enabled, families = ['anti-bot / fraud']) {
  if (!chrome.declarativeNetRequest) return;

  const state = await getState();
  const selectedFamilies =
    Array.isArray(families) && families.length
      ? families.map(String)
      : ['anti-bot / fraud'];
  const wantedFamilies = new Set(selectedFamilies);

  const ruleSpecs = [];

  debugKeep('Starting DNR rebuild', {
    enabled,
    selectedFamilies,
    fingerprintProtectionEnabled: !!state.fingerprintProtectionEnabled,
    sitePolicies: state.sitePolicies || {},
    providerPolicies: state.providerPolicies || {}
  });

  if (enabled) {
    for (const provider of PROVIDER_RULES) {
      if (!provider || !wantedFamilies.has(provider.family)) continue;

      const providerId = normalizeProviderId(provider.id);
      const domains = Array.isArray(provider.domains)
        ? provider.domains.map(String).filter(Boolean)
        : [];

      if (!domains.length) continue;

      const exemptHosts = getFingerprintPolicyExemptHosts(state, {
        providerId,
        families: [provider.family]
      });

      const interestingDomains = domains.filter((domain) =>
        domain.includes('googleapis.com') ||
        domain.includes('gstatic.com') ||
        domain.includes('clients6.google.com') ||
        domain.includes('google.com')
      );

      if (interestingDomains.length || exemptHosts.some(isKeepHost)) {
        debugKeep('Provider rule candidate', {
          providerId,
          providerName: provider.name,
          family: provider.family,
          interestingDomains,
          exemptHosts: exemptHosts.filter((host) => isKeepHost(host) || host.endsWith('.google.com'))
        });
      }

      for (const domain of domains) {
        ruleSpecs.push({
          providerId,
          family: provider.family,
          domain,
          exemptHosts
        });
      }
    }
  }

  const newRules = buildFingerprintProtectionRules(ruleSpecs);

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingFingerprintRuleIds = existingRules
    .map((r) => r.id)
    .filter((id) => id >= 30000 && id < 40000);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingFingerprintRuleIds,
    addRules: newRules
  });

  const finalRules = await chrome.declarativeNetRequest.getDynamicRules();
  const fingerprintRules = finalRules.filter((r) => r.id >= 30000 && r.id < 40000);

  debugKeep('Finished DNR rebuild', {
    addedRuleCount: newRules.length,
    finalFingerprintRuleCount: fingerprintRules.length,
    keepRelevantRules: fingerprintRules.filter((rule) => {
      const urlFilter = String(rule.condition?.urlFilter || '');
      return urlFilter.includes('googleapis.com') || urlFilter.includes('gstatic.com') || urlFilter.includes('clients6.google.com');
    }).map((rule) => ({
      id: rule.id,
      urlFilter: rule.condition?.urlFilter,
      excludedInitiatorDomains: rule.condition?.excludedInitiatorDomains || []
    }))
  });

  const exemptHostsUnion = new Set();
  for (const spec of ruleSpecs) {
    for (const host of spec.exemptHosts || []) {
      exemptHostsUnion.add(host);
    }
  }

  await appendLog({
    type: 'fingerprint-protection',
    message: enabled
      ? `Fingerprint protection enabled for ${selectedFamilies.join(', ')} (${ruleSpecs.length} domains, ${exemptHostsUnion.size} exempt initiators)`
      : 'Fingerprint protection disabled',
    time: Date.now()
  });
}

function detectProviders(msg, recentScripts = []) {
  const haystacks = [
    msg.stack || '',
    msg.stackSummary || '',
    ...recentScripts.map((s) => s.url || '')
  ].join('\n').toLowerCase();

  const matches = [];

  for (const rule of PROVIDER_RULES) {
    const matchedPattern = (rule.patterns || []).find((p) =>
      haystacks.includes(String(p).toLowerCase())
    );

    if (matchedPattern) {
      matches.push({
        id: rule.id,
        name: rule.name,
        family: rule.family,
        category: rule.category,
        scoreBoost: rule.scoreBoost || 0,
        matchedPattern,
        actionMode: String(rule.actionMode || '').trim().toLowerCase() || 'normal',
        uiNote: String(rule.uiNote || '').trim(),
        note: String(rule.uiNote || rule._note || '').trim(),
        hasDomains: Array.isArray(rule.domains) && rule.domains.length > 0
      });
    }
  }

  return matches;
}

function summarizeFingerprint(msg, recentScripts = []) {
  const bits = [];
  if (msg.subtype) bits.push(msg.subtype);
  if (msg.target) bits.push(msg.target);

  const stack = trimStack(msg.stack);
  if (stack) bits.push(stack);

  if (recentScripts.length) {
    const first = recentScripts[0];
    bits.push(`script: ${first.url}`);
  }

  return bits.join(' · ');
}

function scoreFingerprintEvent(msg, recentScripts = []) {
  let score = 0;

  switch (msg.subtype) {
    case 'canvas.getContext':
    case 'canvas.getImageData':
    case 'canvas.toDataURL':
      score += 2;
      break;
    case 'offscreen.getContext':
    case 'offscreen.convertToBlob':
      score += 2;
      break;
    case 'webgl.getParameter':
      score += 3;
      break;
    default:
      score += 1;
  }

  if (msg.target && msg.target.includes('WebGLRenderingContext')) {
    score += 2;
  }

  for (const s of recentScripts) {
    if (!s.isThirdParty) continue;
    if (s.ageMs <= 5000) score += 2;
    else if (s.ageMs <= 15000) score += 1;
  }

  const providerMatches = detectProviders(msg, recentScripts);
  for (const provider of providerMatches) {
    score += provider.scoreBoost || 0;
  }

  if (score < 0) score = 0;
  if (score > 20) score = 20;

  return score;
}

async function updateProviderUsageFromFingerprintLog(log) {
  const pageHost = log.host || (log.page ? new URL(log.page).hostname : '');
  if (!pageHost) return;

  const recentScripts = Array.isArray(log.recentScripts) ? log.recentScripts : [];
  if (!recentScripts.length) return;

  const providerMap = getProviderMapFromRules(PROVIDER_RULES);
  const state = await getState();
  const unknown = { ...(state.unknownProviders || {}) };
  const interestingKnown = { ...(state.interestingKnownProviders || {}) };
  const now = Date.now();

  for (const script of recentScripts) {
    if (!script || !script.host) continue;
    if (!script.isThirdParty) continue;
    if (script.host === pageHost) continue;
    if (script.url && script.url.startsWith('chrome-extension://')) continue;

    const scriptHost = script.host;
    const normalizedHost = scriptHost.toLowerCase();

    // Try to associate this script host with a known provider
    let provider = null;

    // 1) Match by providerId if the log.providers includes it
    if (Array.isArray(log.providers) && log.providers.length) {
      const matched = log.providers.find((p) =>
        providerMap.has(normalizeProviderId(p.id))
      );
      if (matched) {
        provider = providerMap.get(normalizeProviderId(matched.id));
      }
    }

    // 2) If not found, try matching by domains/patterns
    if (!provider) {
      for (const rule of PROVIDER_RULES) {
        const domains = Array.isArray(rule.domains) ? rule.domains : [];
        const patterns = Array.isArray(rule.patterns) ? rule.patterns : [];

        const hitDomain = domains.some((d) => {
          const nd = String(d).toLowerCase();
          return normalizedHost === nd || normalizedHost.endsWith('.' + nd);
        });

        const hitPattern = patterns.some((p) =>
          normalizedHost.includes(String(p).toLowerCase())
        );

        if (hitDomain || hitPattern) {
          provider = rule;
          break;
        }
      }
    }

    const isKnown = !!provider;
    const providerId = provider ? normalizeProviderId(provider.id) : undefined;
    const classification = log.classification || log.label || '';

    // Decide which map to update
    let target = unknown;
    if (isKnown) {
      if (providerId && PROVIDER_IGNORE_SET.has(providerId)) {
        // Known but noisy, don't persist as "interesting"
        continue;
      }
      target = interestingKnown;
    }

    const existing = target[scriptHost];
    const sites = new Set(existing?.sites || []);
    sites.add(pageHost);

    const baseDomain = getBaseDomain(scriptHost);
    const noise = isNoiseHost(scriptHost);

    const entry = {
      host: scriptHost,
      baseDomain,
      isNoise: noise,
      providerId,
      sampleUrl: existing?.sampleUrl || script.url || '',
      firstSeen: existing?.firstSeen || now,
      lastSeen: now,
      eventCount: (existing?.eventCount || 0) + 1,
      siteCount: sites.size,
      sites: Array.from(sites).slice(-MAX_CANDIDATE_SITES),
      lastClassification: classification || existing?.lastClassification || ''
    };

    // For known providers, require minimum siteCount to consider interesting
    if (isKnown && entry.siteCount < 3) {
      continue;
    }

    target[scriptHost] = entry;
  }

  // Trim by eventCount to keep storage bounded
  function trimByEventCount(map, maxEntries) {
    const entries = Object.values(map);
    if (entries.length <= maxEntries) return map;
    entries.sort((a, b) => b.eventCount - a.eventCount);
    const keep = new Set(entries.slice(0, maxEntries).map((e) => e.host));
    const trimmed = {};
    for (const [host, entry] of Object.entries(map)) {
      if (keep.has(host)) trimmed[host] = entry;
    }
    return trimmed;
  }

  const trimmedUnknown = trimByEventCount(unknown, MAX_UNKNOWN_PROVIDERS);
  const trimmedKnown = trimByEventCount(interestingKnown, MAX_INTERESTING_KNOWN);

  await savePartial({
    unknownProviders: trimmedUnknown,
    interestingKnownProviders: trimmedKnown
  });
}

function classifyFingerprintEvent(msg, recentScripts = []) {
  const providerMatches = detectProviders(msg, recentScripts);
  const score = scoreFingerprintEvent(msg, recentScripts);

  const subtype = String(msg.subtype || '').toLowerCase();
  let label = 'unclassified';

  if (providerMatches.length) {
    const top = providerMatches[0];
    label = score >= 8
      ? `likely ${top.name} (${top.category})`
      : `possible ${top.name} (${top.category})`;
  } else if (subtype === 'webgl.getparameter' && score >= 6) {
    label = 'likely WebGL-based fingerprinting';
  } else if (subtype.startsWith('canvas.') && score >= 5) {
    label = 'canvas-based fingerprinting';
  } else if (subtype === 'navigator.hardware' && score >= 5) {
    label = 'hardware-based fingerprinting';
  } else if (
    (subtype === 'storage.localstorage.setitem' ||
     subtype === 'storage.sessionstorage.setitem') &&
    score >= 8
  ) {
	label = 'storage maybe used in fingerprint context';
  } else if (subtype === 'geolocation.getcurrentposition' && score >= 4) {
    label = 'geolocation-based fingerprinting';
  } else if (score >= 8) {
    label = 'high-confidence fingerprinting';
  } else if (score >= 4) {
    label = 'medium-confidence fingerprinting';
  }

  return {
    score,
    label,
    providers: providerMatches
  };
}

function recordRecentScript(tabId, url, initiator, timeStamp) {
  if (typeof tabId !== 'number' || tabId < 0 || !url) return;

  const list = recentScriptsByTab.get(tabId) || [];
  const now = Date.now();

  list.push({
    url,
    host: safeHost(url),
    initiator: initiator || '',
    time: typeof timeStamp === 'number' ? Math.round(timeStamp) : now
  });

  const trimmed = list
    .filter((item) => now - item.time <= RECENT_SCRIPT_WINDOW_MS)
    .slice(-MAX_RECENT_SCRIPTS_PER_TAB);

  recentScriptsByTab.set(tabId, trimmed);
}

function getRecentScriptsForTab(tabId, pageUrl, eventTime) {
  if (typeof tabId !== 'number' || tabId < 0) return [];

  const pageHost = safeHost(pageUrl);
  const list = recentScriptsByTab.get(tabId) || [];
  const now = eventTime || Date.now();

  return list
    .filter((item) => now - item.time <= RECENT_SCRIPT_WINDOW_MS)
    .filter((item) => item.url)
    .map((item) => ({
      ...item,
      isThirdParty: !!item.host && !!pageHost && item.host !== pageHost,
      ageMs: Math.max(0, now - item.time)
    }))
    .sort((a, b) => a.ageMs - b.ageMs)
    .slice(0, 5);
}

async function setBadge(count) {
  await chrome.action.setBadgeBackgroundColor({ color: '#b91c1c' });
  await chrome.action.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : '' });
}

async function updateBadgeForTab(tabId, pageUrl) {
  try {
    const state = await getState();
    const host = safeHost(pageUrl);
    const count = host ? (state.perHostCounts[host] || 0) : 0;
    await setBadge(count);
  } catch (err) {
    console.warn('Failed to update badge', err);
  }
}

async function appendLog(entry) {
  const state = await getState();
  const logs = [entry, ...state.logs].slice(0, MAX_LOGS);
  await savePartial({ logs });
}

async function incrementHost(host) {
  const state = await getState();
  const perHostCounts = {
    ...state.perHostCounts,
    [host]: (state.perHostCounts[host] || 0) + 1
  };
  await savePartial({ perHostCounts });
  return perHostCounts[host];
}

async function resetHostNotice(host) {
  if (!host) return;
  const state = await getState();
  const notifiedHosts = { ...state.notifiedHosts };
  delete notifiedHosts[host];
  await savePartial({ notifiedHosts });
}

async function maybeNotify(host, count) {
  const state = await getState();
  if (!state.notificationsEnabled || !host) return;
  if (state.notifiedHosts[host]) return;

  await chrome.notifications.create(`probe-${host}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: 'ExtScanAlert',
    message: `Blocked suspicious extension-probe activity on ${host}${count ? ` (${count})` : ''}.`,
    priority: 0
  });

  const notifiedHosts = { ...state.notifiedHosts, [host]: true };
  await savePartial({ notifiedHosts });
}

async function maybeNotifyFingerprint(host, details = {}) {
  const state = await getState();
  if (!state.fingerprintNotificationsEnabled || !host) return;
  if (state.fingerprintNotifiedHosts?.[host]) return;

  const provider = details.provider || 'unknown';
  const classification = details.classification || 'fingerprinting detected';

  await chrome.notifications.create(`fingerprint-${host}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: 'ExtScanAlert',
    message: `Detected ${classification} on ${host}${provider && provider !== 'unknown' ? ` (${provider})` : ''}.`,
    priority: 0
  });

  const fingerprintNotifiedHosts = {
    ...(state.fingerprintNotifiedHosts || {}),
    [host]: true
  };

  await savePartial({ fingerprintNotifiedHosts });
}

async function loadSlowPageRules() {
  try {
    const url = chrome.runtime.getURL('slow-rules.json');
    const res = await fetch(url);
    SLOW_PAGE_RULES = await res.json();
  } catch (err) {
    console.error('Failed to load slow-page rules', err);
    SLOW_PAGE_RULES = [];
  }
}

function getSlowPageHosts() {
  const hosts = new Set();
  for (const rule of SLOW_PAGE_RULES) {
    const cond = rule.condition || {};
    const inits = cond.initiatorDomains || [];
    for (const d of inits) hosts.add(d);
  }
  return Array.from(hosts);
}

async function applyDnrSlowPageRules(enabled) {
  if (!chrome.declarativeNetRequest) return;

  if (!SLOW_PAGE_RULES.length) {
    await loadSlowPageRules();
  }

  const ruleIds = SLOW_PAGE_RULES.map((r) => r.id);
  const addRules = enabled
    ? SLOW_PAGE_RULES.map((r) => ({
        id: r.id,
        priority: 1,
        action: { type: 'block' },
        condition: r.condition
      }))
    : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules,
    removeRuleIds: ruleIds
  });

  const hosts = getSlowPageHosts();
  await appendLog({
    type: 'slowPageRules',
    message: enabled
      ? `Slow-page protection enabled for: ${hosts.join(', ')}`
      : 'Slow-page protection disabled',
    time: Date.now()
  });

  if (enabled) {
    for (const rule of SLOW_PAGE_RULES) {
      await appendLog({
        type: 'slow-page',
        source: 'slow-page-protection',
        ruleId: rule.id,
        rule: rule.description,
        host: (rule.condition?.initiatorDomains || []).join(', '),
        time: Date.now()
      });
    }
  }
}

function shouldLogFingerprint(msg) {
  const host = safeHost(msg.page);
  const key = JSON.stringify({
    host,
    page: msg.page || '',
    subtype: msg.subtype || '',
    target: msg.target || '',
    param: msg.meta?.param ?? null
  });

  const now = Date.now();
  const last = fingerprintSeen.get(key) || 0;

  if (now - last < FINGERPRINT_DEDUPE_MS) {
    return false;
  }

  fingerprintSeen.set(key, now);

  if (fingerprintSeen.size > 500) {
    for (const [k, ts] of fingerprintSeen) {
      if (now - ts > FINGERPRINT_DEDUPE_MS * 10) {
        fingerprintSeen.delete(k);
      }
    }
  }

  return true;
}

function shouldNotifyFingerprint(score, providers = []) {
  if (typeof score === 'number' && score >= 8) return true;
  return providers.some((p) => p.family === 'anti-bot / fraud');
}

function inferFingerprintTechniques(entry) {
  const techniques = [];
  const meta = entry.meta || {};
  const stack = String(entry.stackSummary || entry.stack || '').toLowerCase();
  const subtype = String(entry.subtype || '').toLowerCase();

  // Canvas/WebGL (optional, if you want explicit tags)
  if (subtype.startsWith('canvas.')) {
    techniques.push('canvas');
  }
  if (subtype === 'webgl.getparameter' || subtype.startsWith('offscreen.')) {
    techniques.push('webgl');
  }

  // Navigator hardware fingerprinting
  if (subtype === 'navigator.hardware') {
    techniques.push('hardware');
  }

  // Storage-based fingerprinting
  if (
    subtype === 'storage.localstorage.setitem' ||
    subtype === 'storage.sessionstorage.setitem'
  ) {
    techniques.push('storage');
  }

  // Geolocation
  if (subtype === 'geolocation.getcurrentposition') {
    techniques.push('geolocation');
  }

  // Clipboard (dangerous-copy, already logged separately)
  if (entry.type === 'dangerous-copy' || subtype.startsWith('clipboard')) {
    techniques.push('clipboard');
  }

  // Fallback regexes for any future signals
  if (
    /hardwareconcurrency|devicememory|maxtouchpoints/.test(stack) &&
    !techniques.includes('hardware')
  ) {
    techniques.push('hardware');
  }
  if (
    /localstorage\.setitem|sessionstorage/.test(stack) &&
    !techniques.includes('storage')
  ) {
    techniques.push('storage');
  }
  if (
    /indexeddb\.databases/.test(stack) &&
    !techniques.includes('indexeddb')
  ) {
    techniques.push('indexeddb');
  }

  return techniques;
}

(async () => {
  try {
    const state = await getState();
    await loadProviderRules();
	await loadSiteWhitelistRules();

    await applyFingerprintProtectionRules(
      !!state.fingerprintProtectionEnabled,
      state.fingerprintProtectionFamilies || ['anti-bot / fraud']
    );

    await applyDnrSlowPageRules(!!state.slowPageProtection);
	await loadNoiseDomains(); // << here
  } catch (err) {
    console.error('Initial service worker sync failed', err);
  }
})();

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type !== 'script') return;
    recordRecentScript(details.tabId, details.url, details.initiator, details.timeStamp);
  },
  { urls: ['<all_urls>'] }
);

chrome.tabs.onRemoved.addListener((tabId) => {
  recentScriptsByTab.delete(tabId);
});

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  await loadProviderRules();
  await loadSiteWhitelistRules();
  await savePartial({
    status: {
      initialized: true,
      lastInit: Date.now(),
      installs: (state.status?.installs || 0) + 1
    }
  });

  await applyFingerprintProtectionRules(
    !!state.fingerprintProtectionEnabled,
    state.fingerprintProtectionFamilies || ['anti-bot / fraud']
  );

  await appendLog({
    type: 'lifecycle',
    message: 'Extension installed/updated',
    time: Date.now()
  });
});

chrome.runtime.onStartup?.addListener(async () => {
  const state = await getState();
  await loadProviderRules();
  await loadSiteWhitelistRules();
  await savePartial({
    status: {
      initialized: true,
      lastInit: Date.now(),
      installs: state.status?.installs || 1
    }
  });

  await applyFingerprintProtectionRules(
    !!state.fingerprintProtectionEnabled,
    state.fingerprintProtectionFamilies || ['anti-bot / fraud']
  );

  await applyDnrSlowPageRules(!!state.slowPageProtection);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await updateBadgeForTab(activeInfo.tabId, tab.url);

    const host = safeHost(tab.url);
    const normalizedHost = normalizeHost(host);

    if (hasFingerprintProtectionBypass(normalizedHost)) {
      const state = await getState();
      const sitePolicies = state.sitePolicies || {};
      const existing = sitePolicies[normalizedHost];

      const alreadyAllow =
        existing &&
        existing.mode === 'allow' &&
        Array.isArray(existing.families) &&
        existing.families.includes('anti-bot / fraud');

      if (!alreadyAllow) {
        const mode = 'allow';
        const families = ['anti-bot / fraud'];

        const newSitePolicies = {
          ...sitePolicies,
          [normalizedHost]: { mode, families }
        };

        await savePartial({ sitePolicies: newSitePolicies });

        await applyFingerprintProtectionRules(
          !!state.fingerprintProtectionEnabled,
          state.fingerprintProtectionFamilies || ['anti-bot / fraud']
        );

        await appendLog({
          type: 'policy',
          action: 'auto-set-site-policy',
          host: normalizedHost,
          mode,
          families,
          message: `Auto-set site policy for ${normalizedHost}: ${mode} (${families.join(', ')})`,
          time: Date.now()
        });
      }
    }
  } catch (err) {
    console.warn('tabs.onActivated failed', err);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    await updateBadgeForTab(tabId, tab.url || changeInfo.url || '');
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'heartbeat') {
      await appendLog({
        type: 'heartbeat',
        message: `Content script active on ${msg.page}`,
        page: msg.page,
        time: Date.now()
      });
      await updateBadgeForTab(sender.tab?.id, msg.page);
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'getSettings') {
      const state = await getState();
sendResponse({
  mode: state.mode,
  notificationsEnabled: state.notificationsEnabled,
  slowPageProtection: !!state.slowPageProtection,
  fingerprintProtectionEnabled: !!state.fingerprintProtectionEnabled,
  sitePolicies: state.sitePolicies || {},
  providerPolicies: state.providerPolicies || {},
  perHostCounts: state.perHostCounts,
  logs: state.logs,
  status: state.status,
  theme: state.theme || 'dark',
      dangerousCopyEnabled: !!state.dangerousCopyEnabled,
    dangerousCopyBlockMode: !!state.dangerousCopyBlockMode
});
      return;
    }
	
	
// Check here down to	

if (msg?.type === 'dangerous-copy') {
  const state = await getState();
  const host = safeHost(msg.page || '') || '';
  const preview = String(msg.preview || '').trim();
  const length = typeof msg.length === 'number' ? msg.length : preview.length;

  const enabled = !!state.dangerousCopyEnabled;
  const blockMode = !!state.dangerousCopyBlockMode;

  if (!host || !preview || !enabled) {
    // Explicitly say "allow" so front end knows not to block.
    sendResponse({ ok: true, action: 'allow' });
    return;
  }

  const entry = {
    type: 'dangerous-copy',
    action: blockMode ? 'block' : 'observe-only',
    classification: 'likely system-command copy',
    host,
    page: msg.page || '',
    meta: { preview, length },
    policyFamilies: ['clipboard / command safety'],
    policyMode: blockMode ? 'block' : 'observe',
    policyScope: 'global',
    providers: [],
    recentScripts: [],
    score: 5,
    stack: '',
    stackSummary: '',
    subtype: 'command',
    summary: `copy · clipboard · preview: ${preview.slice(0, 80)}`,
    target: 'clipboard',
    time: Date.now()
  };

  await appendLog(entry);

  if (state.fingerprintNotificationsEnabled) {
    await chrome.notifications.create(`dangerous-copy-${host}-${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'ExtScanAlert',
      message:
        `You just copied a system command from ${host}. ` +
        `If you didn’t expect to run commands from this site, ` +
        `consider cancelling before pasting into a terminal or PowerShell.`,
      priority: 0
    });
  }

  // This is the crucial part: return 'block' vs 'allow'.
  sendResponse({ ok: true, action: blockMode ? 'block' : 'allow' });
  return;
}

if (msg?.type === 'setTheme') {
  const theme = msg.theme === 'light' ? 'light' : 'dark';
  await savePartial({ theme });
  sendResponse({ ok: true });
  return;
}
	
	if (msg?.type === 'saveProviderPolicy') {
  const host = normalizeHost(msg.host || msg.page || '');
  const providerId = normalizeProviderId(msg.providerId || '');

  if (!host) {
    sendResponse({ ok: false, error: 'invalid host' });
    return;
  }

  if (!providerId) {
    sendResponse({ ok: false, error: 'invalid providerId' });
    return;
  }
  


  
  const provider = getProviderById(providerId);
if (!provider) {
  sendResponse({ ok: false, error: 'unknown providerId' });
  return;
}

let mode =
  msg.mode === 'allow'
    ? 'allow'
    : msg.mode === 'block'
    ? 'block'
    : 'observe';

const actionMode = String(provider.actionMode || '').trim().toLowerCase();
if (actionMode === 'observe-only' && mode !== 'observe') {
  mode = 'observe';
}

  const state = await getState();
  const providerPolicies = {
    ...(state.providerPolicies || {}),
    [host]: {
      ...((state.providerPolicies || {})[host] || {}),
      [providerId]: { mode }
    }
  };
  
// down to here?  

  await savePartial({ providerPolicies });

  await applyFingerprintProtectionRules(
    !!state.fingerprintProtectionEnabled,
    state.fingerprintProtectionFamilies || ['anti-bot / fraud']
  );

  await appendLog({
    type: 'policy',
    action: 'save-provider-policy',
    host,
    providerId,
    mode,
    message: `Saved provider policy for ${host}: ${providerId} -> ${mode}`,
    time: Date.now()
  });

  sendResponse({ ok: true });
  return;
}

if (msg?.type === 'deleteProviderPolicy') {
  const host = normalizeHost(msg.host || msg.page || '');
  const providerId = normalizeProviderId(msg.providerId || '');

  if (!host) {
    sendResponse({ ok: false, error: 'invalid host' });
    return;
  }

  if (!providerId) {
    sendResponse({ ok: false, error: 'invalid providerId' });
    return;
  }

  const state = await getState();
  const providerPolicies = { ...(state.providerPolicies || {}) };
  const hostPolicies = { ...(providerPolicies[host] || {}) };

  delete hostPolicies[providerId];

  if (Object.keys(hostPolicies).length) {
    providerPolicies[host] = hostPolicies;
  } else {
    delete providerPolicies[host];
  }

  await savePartial({ providerPolicies });

  await applyFingerprintProtectionRules(
    !!state.fingerprintProtectionEnabled,
    state.fingerprintProtectionFamilies || ['anti-bot / fraud']
  );

  await appendLog({
    type: 'policy',
    action: 'delete-provider-policy',
    host,
    providerId,
    message: `Deleted provider policy for ${host}: ${providerId}`,
    time: Date.now()
  });

  sendResponse({ ok: true });
  return;
}

if (msg?.type === 'exportFingerprintLogs') {
  const state = await getState();
  const logs = Array.isArray(state.logs) ? state.logs : [];

  const fingerprintLogs = logs.filter((entry) => entry.type === 'fingerprint');

sendResponse({
  ok: true,
  data: {
    version: 1,
    exportedAt: new Date().toISOString(),
    description: "Heuristic detection of fingerprint-like signals and anti-bot/fraud vendors. Events may be benign features in a fingerprinting context.",
    schema: {
      score: "0–20 heuristic confidence; higher = more suspicious",
      classification: "label summarizing techniques and/or vendor",
      providers: "matched anti-bot/fraud/analytics vendors (best-effort)",
      techniques: "APIs used (canvas, WebGL, storage, etc.), not proof of tracking"
    },
    logs: fingerprintLogs
  }
});
  return;
}  

if (msg?.type === 'exportFingerprintSummary') {
  const state = await getState();
  const logs = Array.isArray(state.logs) ? state.logs : [];
  const fingerprintLogs = logs.filter(entry => entry.type === 'fingerprint');

  const summaryByHost = {};

  for (const entry of fingerprintLogs) {
    const host = entry.host || '';
    if (!host) continue;

    const s = summaryByHost[host] || {
      count: 0,
      maxScore: 0,
      techniques: new Set(),
      providers: new Set(),
      examples: []  // store up to a few short examples
    };

    s.count += 1;

    if (typeof entry.score === 'number' && entry.score > s.maxScore) {
      s.maxScore = entry.score;
    }

    // Collect techniques
    (entry.techniques || []).forEach(t => s.techniques.add(t));

    // Collect provider names
    (entry.providers || []).forEach(p => {
      if (p && p.name) s.providers.add(p.name);
    });

    // Collect a few example labels/summaries
    if (s.examples.length < 3) {
      s.examples.push({
        score: entry.score,
        classification: entry.classification || entry.label || '',
        summary: entry.summary || '',
        subtype: entry.subtype || ''
      });
    }

    summaryByHost[host] = s;
  }

  // Convert Sets to arrays for JSON
  const jsonSummary = {};
  for (const [host, s] of Object.entries(summaryByHost)) {
    jsonSummary[host] = {
      count: s.count,
      maxScore: s.maxScore,
      techniques: Array.from(s.techniques),
      providers: Array.from(s.providers),
      examples: s.examples
    };
  }

  sendResponse({
    ok: true,
    data: {
      version: 1,
      exportedAt: new Date().toISOString(),
      description: "Per-host summary of fingerprint-like events",
      hosts: jsonSummary
    }
  });
  return;
}

if (msg?.type === 'getUnknownProviders') {
  const state = await getState();
  const unknown = state.unknownProviders || {};
  sendResponse({ ok: true, unknownProviders: unknown });
  return;
}

if (msg?.type === 'getInterestingKnownProviders') {
  const state = await getState();
  const known = state.interestingKnownProviders || {};
  sendResponse({ ok: true, interestingKnownProviders: known });
  return;
}

if (msg?.type === 'clearUnknownProvider') {
  const host = String(msg.host || '').trim().toLowerCase();
  const state = await getState();
  const unknown = { ...(state.unknownProviders || {}) };
  if (host && unknown[host]) {
    delete unknown[host];
    await savePartial({ unknownProviders: unknown });
  }
  sendResponse({ ok: true });
  return;
}

if (msg?.type === 'clearAllUnknownProviders') {
  await savePartial({ unknownProviders: {} });
  sendResponse({ ok: true });
  return;
}

    if (msg?.type === 'setFingerprintProtection') {
      const enabled = !!msg.enabled;
      const state = await getState();
      const families = state.fingerprintProtectionFamilies || ['anti-bot / fraud'];

      await savePartial({ fingerprintProtectionEnabled: enabled });
      await applyFingerprintProtectionRules(enabled, families);

      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'setFingerprintProtectionFamilies') {
      const families = Array.isArray(msg.families) ? msg.families : ['anti-bot / fraud'];
      const state = await getState();

      await savePartial({ fingerprintProtectionFamilies: families });
      await applyFingerprintProtectionRules(!!state.fingerprintProtectionEnabled, families);

      sendResponse({ ok: true });
      return;
    }
	
	if (msg?.type === 'getSitePolicies') {
  const state = await getState();
  sendResponse({
    ok: true,
    sitePolicies: state.sitePolicies || {},
    fingerprintProtectionEnabled: !!state.fingerprintProtectionEnabled,
    fingerprintProtectionFamilies: state.fingerprintProtectionFamilies || ['anti-bot / fraud']
  });
  return;
}

if (msg?.type === 'saveSitePolicy') {
  const host = normalizeHost(msg.host || '');
  if (!host) {
    sendResponse({ ok: false, error: 'invalid host' });
    return;
  }

  const mode =
    msg.mode === 'allow' ? 'allow' :
    msg.mode === 'block' ? 'block' :
    'observe';

  const families = Array.isArray(msg.families) && msg.families.length
    ? msg.families
    : ['anti-bot / fraud'];

  const state = await getState();
  const sitePolicies = {
    ...(state.sitePolicies || {}),
    [host]: { mode, families }
  };

  await savePartial({ sitePolicies });

  await applyFingerprintProtectionRules(
    !!state.fingerprintProtectionEnabled,
    state.fingerprintProtectionFamilies || ['anti-bot / fraud']
  );

  await appendLog({
    type: 'policy',
    action: 'save-site-policy',
    host,
    mode,
    families,
    message: `Saved site policy for ${host}: ${mode} (${families.join(', ')})`,
    time: Date.now()
  });

  sendResponse({ ok: true });
  return;
}

if (msg?.type === 'deleteSitePolicy') {
  const host = normalizeHost(msg.host || '');
  if (!host) {
    sendResponse({ ok: false, error: 'invalid host' });
    return;
  }

  const state = await getState();
  const sitePolicies = { ...(state.sitePolicies || {}) };
  delete sitePolicies[host];

  await savePartial({ sitePolicies });

  await applyFingerprintProtectionRules(
    !!state.fingerprintProtectionEnabled,
    state.fingerprintProtectionFamilies || ['anti-bot / fraud']
  );

  await appendLog({
    type: 'policy',
    action: 'delete-site-policy',
    host,
    message: `Deleted site policy for ${host}`,
    time: Date.now()
  });

  sendResponse({ ok: true });
  return;
}

if (msg?.type === 'exportSitePolicies') {
  const state = await getState();
  sendResponse({
    ok: true,
    data: {
      version: 1,
      exportedAt: new Date().toISOString(),
      sitePolicies: state.sitePolicies || {}
    }
  });
  return;
}

if (msg?.type === 'exportProviderPolicies') {
  const state = await getState();
  sendResponse({
    ok: true,
    data: {
      version: 1,
      exportedAt: new Date().toISOString(),
      providerPolicies: state.providerPolicies || {}
    }
  });
  return;
}

if (msg?.type === 'importProviderPolicies') {
  const imported = msg.data;
  if (!imported || typeof imported !== 'object' || typeof imported.providerPolicies !== 'object') {
    sendResponse({ ok: false, error: 'invalid import format' });
    return;
  }

  const cleaned = {};

  for (const [rawHost, hostPolicies] of Object.entries(imported.providerPolicies)) {
    const host = normalizeHost(rawHost);
    if (!host || !hostPolicies || typeof hostPolicies !== 'object') continue;

    const cleanedHostPolicies = {};

    for (const [rawProviderId, rule] of Object.entries(hostPolicies)) {
      const providerId = normalizeProviderId(rawProviderId);
      if (!providerId || !rule || typeof rule !== 'object') continue;

      const provider = getProviderById(providerId);
      if (!provider) continue;

      let mode =
        rule.mode === 'allow'
          ? 'allow'
          : rule.mode === 'block'
          ? 'block'
          : 'observe';

      const actionMode = String(provider.actionMode || '').trim().toLowerCase();
      if (actionMode === 'observe-only' && mode !== 'observe') {
        mode = 'observe';
      }

      cleanedHostPolicies[providerId] = { mode };
    }

    if (Object.keys(cleanedHostPolicies).length) {
      cleaned[host] = cleanedHostPolicies;
    }
  }

const state = await getState();
let providerPolicies;

if (msg.replace) {
  providerPolicies = cleaned;
} else {
  providerPolicies = { ...(state.providerPolicies || {}) };

  for (const [host, hostPolicies] of Object.entries(cleaned)) {
    providerPolicies[host] = {
      ...(providerPolicies[host] || {}),
      ...hostPolicies
    };
  }
}

  await savePartial({ providerPolicies });

  await applyFingerprintProtectionRules(
    !!state.fingerprintProtectionEnabled,
    state.fingerprintProtectionFamilies || ['anti-bot / fraud']
  );

    const importedRuleCount = Object.values(cleaned)
  .reduce((sum, hostPolicies) => sum + Object.keys(hostPolicies).length, 0);

  await appendLog({
    type: 'policy',
    action: 'import-provider-policies',

  message: `Imported ${importedRuleCount} provider policies across ${Object.keys(cleaned).length} hosts`,
    time: Date.now()
  });

  sendResponse({
  ok: true,
  count: importedRuleCount,
  hosts: Object.keys(cleaned).length
});
  return;
}

if (msg?.type === 'importSitePolicies') {
  const imported = msg.data;
  if (!imported || typeof imported !== 'object' || typeof imported.sitePolicies !== 'object') {
    sendResponse({ ok: false, error: 'invalid import format' });
    return;
  }

  const cleaned = {};
  for (const [rawHost, policy] of Object.entries(imported.sitePolicies)) {
    const host = normalizeHost(rawHost);
    if (!host || !policy || typeof policy !== 'object') continue;

    const mode =
      policy.mode === 'allow' ? 'allow' :
      policy.mode === 'block' ? 'block' :
      'observe';

    const families = Array.isArray(policy.families) && policy.families.length
      ? policy.families.map(String)
      : ['anti-bot / fraud'];

    cleaned[host] = { mode, families };
  }

  const state = await getState();
  const sitePolicies = msg.replace
    ? cleaned
    : { ...(state.sitePolicies || {}), ...cleaned };

  await savePartial({ sitePolicies });

  await applyFingerprintProtectionRules(
    !!state.fingerprintProtectionEnabled,
    state.fingerprintProtectionFamilies || ['anti-bot / fraud']
  );

  await appendLog({
    type: 'policy',
    action: 'import-site-policies',
    message: `Imported ${Object.keys(cleaned).length} site policies`,
    time: Date.now()
  });

  sendResponse({ ok: true, count: Object.keys(cleaned).length });
  return;
}	  

    if (msg?.type === 'setSitePolicy') {
      const host = normalizeHost(msg.host || msg.page || '');
      if (!host) {
        sendResponse({ ok: false, error: 'invalid host' });
        return;
      }
	  


      const mode = msg.mode === 'allow'
        ? 'allow'
        : msg.mode === 'block'
          ? 'block'
          : 'observe';

      const families = Array.isArray(msg.families) && msg.families.length
        ? msg.families
        : ['anti-bot / fraud'];

      const state = await getState();
      const sitePolicies = {
        ...(state.sitePolicies || {}),
        [host]: { mode, families }
      };

      await savePartial({ sitePolicies });

      await applyFingerprintProtectionRules(
        !!state.fingerprintProtectionEnabled,
        state.fingerprintProtectionFamilies || ['anti-bot / fraud']
      );

      await appendLog({
        type: 'policy',
        action: 'set-site-policy',
        host,
        mode,
        families,
        message: `Site policy set for ${host}: ${mode} (${families.join(', ')})`,
        time: Date.now()
      });

      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'clearSitePolicy') {
      const host = normalizeHost(msg.host || msg.page || '');
      if (!host) {
        sendResponse({ ok: false, error: 'invalid host' });
        return;
      }

      const state = await getState();
      const sitePolicies = { ...(state.sitePolicies || {}) };
      delete sitePolicies[host];

      await savePartial({ sitePolicies });

      await applyFingerprintProtectionRules(
        !!state.fingerprintProtectionEnabled,
        state.fingerprintProtectionFamilies || ['anti-bot / fraud']
      );

      await appendLog({
        type: 'policy',
        action: 'clear-site-policy',
        host,
        message: `Cleared site policy for ${host}`,
        time: Date.now()
      });

      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'setMode') {
      await savePartial({ mode: msg.mode });
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'setNotifications') {
      await savePartial({ notificationsEnabled: !!msg.enabled });
      sendResponse({ ok: true });
      return;
    }
	
	if (msg?.type === 'setDangerousCopyEnabled') {
  await savePartial({ dangerousCopyEnabled: !!msg.enabled });
  sendResponse({ ok: true });
  return;
}

if (msg?.type === 'setDangerousCopyBlockMode') {
  await savePartial({ dangerousCopyBlockMode: !!msg.enabled });
  sendResponse({ ok: true });
  return;
}

    if (msg?.type === 'setSlowPageProtection') {
      const enabled = !!msg.enabled;
      await savePartial({ slowPageProtection: enabled });
      await applyDnrSlowPageRules(enabled);
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'clearLogs') {
      await savePartial({
        logs: [],
        perHostCounts: {},
        notifiedHosts: {},
        fingerprintNotifiedHosts: {}
      });
      fingerprintSeen.clear();
      recentScriptsByTab.clear();
      await setBadge(0);
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'resetHostNotice') {
      await resetHostNotice(msg.host);
      sendResponse({ ok: true });
      return;
    }


// find this again.
    if (msg?.source === 'extscanalert' && msg.kind === 'extension-probe') {
      const state = await getState();
      const host = safeHost(msg.page);

      let action = 'allow';
      if (state.mode === 'block') action = 'block';
      if (state.mode === 'log') action = 'allow';
      if (state.mode === 'allow') action = 'allow';

      const entry = {
        type: 'probe',
        action,
        method: msg.subtype,
        subtype: msg.subtype,
        url: msg.url,
        page: msg.page,
        host,
        time: Date.now()
      };

      await appendLog(entry);

      if (action === 'block' && host) {
        const count = await incrementHost(host);
        await maybeNotify(host, count);
        await updateBadgeForTab(sender.tab?.id, msg.page);
      }

      sendResponse({ action });
      return;
    }

    if (msg?.source === 'extscanalert' && msg.kind === 'fingerprint-api') {
      if (!shouldLogFingerprint(msg)) {
        sendResponse({ ok: true, deduped: true });
        return;
      }

      const eventTime = msg.time || Date.now();
      const host = safeHost(msg.page);
      const tabId = sender.tab?.id;
      const recentScripts = getRecentScriptsForTab(tabId, msg.page, eventTime);
      const stackSummary = trimStack(msg.stack);
      const { score, label, providers } = classifyFingerprintEvent(msg, recentScripts);
      const state = await getState();
      const policy = getEffectiveFingerprintPolicy(msg.page, state, providers);


	  
	  
  const entry = {
    type: 'fingerprint',
    action: policy.mode === 'block' ? 'block-vendor' : policy.mode === 'allow' ? 'allow' : 'observe',
    policyMode: policy.mode,
    policyFamilies: policy.families,
    policyScope: policy.scope,
    policyProviderId: policy.providerId || '',
    subtype: msg.subtype,
    target: msg.target || '',
    page: msg.page,
    host,
    meta: msg.meta || {},
    stack: msg.stack || '',
    stackSummary,
    recentScripts,
    score,
    classification: label,
    providers,
    summary: summarizeFingerprint(msg, recentScripts),
    time: eventTime
  };

      // NEW: infer techniques and enrich summary (purely informational)
      const techniques = inferFingerprintTechniques(entry);
	  console.log('fingerprint techniques', techniques);
      if (techniques.length) {
        entry.techniques = techniques;
        entry.summary = `${entry.summary} · techniques: ${techniques.join(', ')}`;
      }

await updateProviderUsageFromFingerprintLog(entry);

// TEMP: sanity check
const stateAfter = await getState();
// console.log('unknownProviders sample', stateAfter.unknownProviders);
// console.log('interestingKnownProviders sample', stateAfter.interestingKnownProviders);

await appendLog(entry);

      if (host && policy.mode !== 'allow' && shouldNotifyFingerprint(score, providers)) {
        const topProvider = Array.isArray(providers) && providers.length
          ? providers[0].name
          : '';

        await maybeNotifyFingerprint(host, {
          provider: topProvider,
          classification: label
        });
      }

      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, ignored: true });
  })().catch((err) => {
    console.error('onMessage handler failed', err);
    sendResponse({ ok: false, error: String(err) });
  });

  return true;
});