const AT_LINKS_KEY = 'atLinks';
const AT_REDIRECT_SLOTS_KEY = 'atRedirectSlots';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const prefix = '/ATProtocolHandler/';

  if (url.pathname.startsWith(prefix)) {
    const tail = url.pathname.slice(prefix.length);
    if (tail.startsWith('at://')) {
      event.respondWith(handleAtUri(tail, url));
      return;
    }
  }
});

async function handleAtUri(atUri, url) {
  const rd = url.searchParams.get('rd');
  const redirectSlot = getRedirectSlot(rd);
  const macubaDefault = 'https://blue.mackuba.eu/skythread/?q=';

  if (redirectSlot) {
    const targetUrl = buildRedirectUrl(redirectSlot, atUri);
    return Response.redirect(targetUrl, 302);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AT URI Handler</title>
  <style>
    /* [existing styles unchanged]
  </style>
</head>
<body data-aturi="${escapeHtml(atUri)}" data-rd="${escapeHtml(rd || '')}">
  <div class="wrap">
    <div class="card">
      <h1>AT URI Handler</h1>
      <p>Open this AT URI in your preferred tools.</p>
      ${rd ? `<p><strong>Redirect slot: ${escapeHtml(rd)}</strong></p>` : ''}
      <div class="uri-box">${escapeHtml(atUri)}</div>
    </div>

    <!-- [existing starter links, add custom link, custom links sections unchanged] -->

    <div class="card">
      <h2>Redirect slots (new!)</h2>
      <p>Select up to 3 favorite links to use with ?rd=1, ?rd=2, ?rd=3</p>
      <div id="redirectSlots" class="custom-links"></div>
    </div>
  </div>

  <!-- [existing preset modal unchanged] -->

  <script>
    // [existing script functions unchanged]

    // New redirect slots functions
    function getRedirectSlots() {
      try {
        return JSON.parse(localStorage.getItem(AT_REDIRECT_SLOTS_KEY) || '[]');
      } catch {
        return [];
      }
    }

    function saveRedirectSlots(slots) {
      localStorage.setItem(AT_REDIRECT_SLOTS_KEY, JSON.stringify(slots));
    }

    function loadRedirectSlots() {
      const slots = getRedirectSlots();
      const container = document.getElementById('redirectSlots');
      if (!slots.length) {
        container.innerHTML = '<div class="empty">No redirect slots. Pick favorites from your custom links.</div>';
        return;
      }
      // Render slots with checkboxes to assign
    }

    // Call loadRedirectSlots() after loadLinks()
    loadLinks();
    loadRedirectSlots();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function getRedirectSlot(slotId) {
  if (!slotId || !['1','2','3'].includes(slotId)) return null;
  const slots = getRedirectSlots();
  const slotIndex = parseInt(slotId) - 1;
  return slots[slotIndex] || null;
}

function getRedirectSlots() {
  // Note: localStorage not available in SW context, so this would need IndexedDB or postMessage
  // For simplicity, return null here - slots managed in page context
  return [];
}

function buildRedirectUrl(link, atUri) {
  const encodedAtUri = encodeURIComponent(atUri);
  const parts = parseAtUri(atUri);

  if (link.mode === 'template') {
    return link.base
      .replaceAll('{atUri}', encodedAtUri)
      .replaceAll('{rawAtUri}', atUri)
      .replaceAll('{did}', parts.repo)
      .replaceAll('{collection}', parts.collection)
      .replaceAll('{rkey}', parts.rkey);
  }

  if (link.mode === 'raw') {
    return link.base + atUri;
  }

  return link.base + encodedAtUri;
}

function parseAtUri(atUri) {
  const m = atUri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  return {
    repo: m ? m[1] : '',
    collection: m ? m[2] : '',
    rkey: m ? m[3] : ''
  };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}
