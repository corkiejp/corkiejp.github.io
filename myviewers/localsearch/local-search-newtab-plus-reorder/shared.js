const DEFAULT_BUILTIN_ENGINES = {
  google: { name: 'Google', searchUrl: 'https://www.google.com/search?q=%s', builtin: true },
  duckduckgo: { name: 'DuckDuckGo', searchUrl: 'https://duckduckgo.com/?q=%s', builtin: true },
  qwant: { name: 'Qwant', searchUrl: 'https://www.qwant.com/?q=%s', builtin: true },
  bing: { name: 'Bing', searchUrl: 'https://www.bing.com/search?q=%s', builtin: true },
  startpage: { name: 'Startpage', searchUrl: 'https://www.startpage.com/sp/search?query=%s', builtin: true },
  brave: { name: 'Brave', searchUrl: 'https://search.brave.com/search?q=%s', builtin: true }
};
const DEFAULT_QUICK_LINKS = [
  { name: 'Boards', url: 'https://www.boards.ie/' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/' },
  { name: 'RTÉ Guide', url: 'https://www.rte.ie/entertainment/listings/television/' },
  { name: 'GitHub', url: 'https://github.com/' }
];
const STORAGE_DEFAULTS = { engine: 'duckduckgo', customEngines: [], quickLinks: DEFAULT_QUICK_LINKS };
function extApi(){ return typeof browser !== 'undefined' ? browser : chrome; }
function storageGet(defaults){ return extApi().storage.sync.get(defaults); }
function storageSet(values){ return extApi().storage.sync.set(values); }
function createEngineId(name){ return 'custom-' + name.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40); }
function isValidUrl(url){ try { const parsed = new URL(url); return parsed.protocol === 'http:' || parsed.protocol === 'https:'; } catch { return false; } }
function isValidTemplate(template){ if (!template.includes('%s')) return false; return isValidUrl(template.replace('%s','test')); }
function getAllEngines(customEngines=[]){ const merged = { ...DEFAULT_BUILTIN_ENGINES }; for (const item of customEngines){ if (!item?.id || !item?.name || !item?.searchUrl) continue; merged[item.id] = { ...item, builtin:false }; } return merged; }
function moveItem(array, from, to){ if (from < 0 || to < 0 || from >= array.length || to >= array.length) return array; const clone = [...array]; const [item] = clone.splice(from,1); clone.splice(to,0,item); return clone; }
async function readSettings(){ const data = await storageGet(STORAGE_DEFAULTS); return { engine: data.engine || STORAGE_DEFAULTS.engine, customEngines: Array.isArray(data.customEngines) ? data.customEngines : [], quickLinks: Array.isArray(data.quickLinks) ? data.quickLinks : [...DEFAULT_QUICK_LINKS] }; }
