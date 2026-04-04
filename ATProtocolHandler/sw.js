const CACHE_NAME = 'at-handler-v1';
const AT_LINKS_KEY = 'atLinks';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const prefix = '/ATProtocolHandler/';

  if (url.pathname.startsWith(prefix)) {
    const tail = url.pathname.slice(prefix.length);

    if (tail.startsWith('at://')) {
      event.respondWith(handleAtUri(tail));
      return;
    }
  }
});

async function handleAtUri(atUri) {
	console.log('Handling AT URI:', atUri);  // Debug log
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AT URI Handler - ${atUri}</title>
  <meta name="viewport" content="width=device-width">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 1.5rem; line-height: 1.5; }
    .uri { background: #f0f8ff; padding: 0.75rem; border-radius: 6px; font-family: monospace; font-size: 0.9em; word-break: break-all; margin: 1rem 0; }
    .section { margin: 1.5rem 0; }
    .link { display: flex; justify-content: space-between; align-items: center; margin: 0.5rem 0; padding: 0.75rem 1rem; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; text-decoration: none; color: inherit; transition: all 0.2s; }
    .link:hover { background: #e9ecef; transform: translateX(4px); }
    .delete-btn { background: #dc3545; color: white; border: none; padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.85em; opacity: 0.8; }
    .delete-btn:hover { opacity: 1; background: #c82333; }
    form { background: #f0f8ff; padding: 1.5rem; border-radius: 12px; margin: 1.5rem 0; }
    input { width: 100%; padding: 0.75rem; margin: 0.5rem 0; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-size: 1rem; }
    button { background: #0074d9; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 1rem; width: 100%; margin-top: 0.5rem; }
    button:hover { background: #005ba3; }
    .flush-btn { background: #ffc107; color: #212529; margin-top: 1rem; }
    .flush-btn:hover { background: #e0a800; }
    h3 { margin-top: 0; color: #333; }
    .starter { border-left: 4px solid #0074d9; }
    .empty { color: #666; font-style: italic; text-align: center; padding: 2rem; }
    @media (prefers-color-scheme: dark) { 
      body { background: #1a1a1a; color: #e0e0e0; } 
      .uri { background: #2a2a2a; } 
      .link { background: #2d2d2d; border-color: #444; } 
      .link:hover { background: #404040; }
      form { background: #2a3a40; }
      .delete-btn { background: #bb2d3b; }
    }
  </style>
</head>
<body>
  <h1>🔗 AT URI Handler</h1>
  
  <div class="uri">
    <strong>URI:</strong> ${atUri}
  </div>
  
  <form id="addLink">
    <h3>➕ Add Custom Link</h3>
    <input id="name" placeholder="Site name (e.g. My Viewer)" required>
    <input id="base" placeholder="https://example.com/?uri=" required>
    <button type="submit">Add Link</button>
  </form>
  
  <div class="section">
    <h3>⭐ Your Custom Links</h3>
    <div id="customLinks"></div>
    <button id="flushLinks" class="flush-btn">🗑️ Clear All Custom Links</button>
  </div>
  
  <div class="section">
    <h3>⚡ Starter Links</h3>
    <div class="starter">
<a href="https://corkiejp.github.io/ATProtoViewer/?uri=${encodeURIComponent(atUri)}" class="link" target="_blank">
  👁️ ATProtoViewer 
</a>

<a href="https://atproto.at/viewer?uri=${encodeURIComponent(atUri)}" class="link" target="_blank">
  🔍 atproto.at
</a>

<a href="https://blue.mackuba.eu/skythread/?q=${encodeURIComponent(atUri)}" class="link" target="_blank">
  🧵 Skythread (Mackuba)
</a>
    </div>
  </div>
  
  <script>
    const AT_LINKS_KEY = '${AT_LINKS_KEY}';
    
    function loadLinks() {
      const links = JSON.parse(localStorage.getItem(AT_LINKS_KEY) || '[]');
      const container = document.getElementById('customLinks');
      if (links.length === 0) {
        container.innerHTML = '<div class="empty">No custom links yet. Add some above!</div>';
      } else {
        container.innerHTML = links.map((link, i) => 
          \`<div style="display: flex; gap: 0.5rem; align-items: center;">
            <a href="\${link.base}${encodeURIComponent('${atUri}')}" class="link" target="_blank" style="flex: 1;">
              \${link.name}
            </a>
            <button class="delete-btn" onclick="removeLink(\${i})">×</button>
          </div>\`
        ).join('');
      }
    }
    
    window.removeLink = function(index) {
      const links = JSON.parse(localStorage.getItem(AT_LINKS_KEY) || '[]');
      links.splice(index, 1);
      localStorage.setItem(AT_LINKS_KEY, JSON.stringify(links));
      loadLinks();
    }
    
    document.getElementById('addLink').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const base = document.getElementById('base').value.trim();
      if (!name || !base) return;
      
      const links = JSON.parse(localStorage.getItem(AT_LINKS_KEY) || '[]');
      links.push({ name, base });
      localStorage.setItem(AT_LINKS_KEY, JSON.stringify(links));
      
      document.getElementById('name').value = '';
      document.getElementById('base').value = '';
      loadLinks();
    });
    
    document.getElementById('flushLinks').addEventListener('click', () => {
      if (confirm('🗑️ Clear ALL custom links? This cannot be undone.')) {
        localStorage.removeItem(AT_LINKS_KEY);
        loadLinks();
      }
    });
    
    loadLinks();
  </script>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}