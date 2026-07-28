const DEFAULT_BUILTIN_ENGINES = {
  google: { name: 'Google', searchUrl: 'https://www.google.com/search?q=%s', builtin: true },
  googleNoAI: { name: 'Google NoAI', searchUrl: 'https://www.google.com/search?q=%s&udm=14', builtin: true },
  duckduckgo: { name: 'DuckDuckGo', searchUrl: 'https://duckduckgo.com/?q=%s', builtin: true },
  duckduckgoNoAI: { name: 'DuckDuckGo NoAI', searchUrl: 'https://noai.duckduckgo.com/?q=%s&noai=1', builtin: true },
  qwant: { name: 'Qwant', searchUrl: 'https://www.qwant.com/?q=%s', builtin: true },
  bing: { name: 'Bing', searchUrl: 'https://www.bing.com/search?q=%s', builtin: true },
  startpage: { name: 'Startpage', searchUrl: 'https://www.startpage.com/sp/search?query=%s', builtin: true },
  brave: { name: 'Brave', searchUrl: 'https://search.brave.com/search?q=%s', builtin: true },
  youtube: { name: 'youtube', searchUrl: 'https://www.youtube.com/results?search_query=%s', builtin: true }
};

const DEFAULT_QUICK_LINKS = [
  { name: 'Boards', url: 'https://www.boards.ie/' },
  { name: 'Reddit', url: 'https://www.reddit.com/' },
  { name: 'BlueSky', url: 'https://bsky.app/' },
  { name: 'GitHub', url: 'https://github.com/' }
];

const STORAGE_DEFAULTS = {
  engine: 'duckduckgo',
  customEngines: [],
  quickLinks: DEFAULT_QUICK_LINKS,
  theme: 'system',
  notes: []
};

function extApi() {
  return typeof browser !== 'undefined' ? browser : chrome;
}

function storageGet(defaults) {
  return extApi().storage.sync.get(defaults);
}

function storageSet(values) {
  return extApi().storage.sync.set(values);
}

function createEngineId(name) {
  return 'custom-' + name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function createNoteId() {
  return 'note-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidTemplate(template) {
  if (!template.includes('%s')) return false;
  return isValidUrl(template.replace('%s', 'test'));
}

function getAllEngines(customEngines = []) {
  const merged = { ...DEFAULT_BUILTIN_ENGINES };

  for (const item of customEngines) {
    if (!item?.id || !item?.name || !item?.searchUrl) continue;
    merged[item.id] = { ...item, builtin: false };
  }

  return merged;
}

function moveItem(array, from, to) {
  if (from < 0 || to < 0 || from >= array.length || to >= array.length) return array;
  const clone = [...array];
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
}

function normalizeTheme(theme) {
  return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system';
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getEffectiveTheme(themeSetting) {
  const normalized = normalizeTheme(themeSetting);
  return normalized === 'system' ? getSystemTheme() : normalized;
}

function applyTheme(themeSetting) {
  const normalized = normalizeTheme(themeSetting);
  const effective = getEffectiveTheme(normalized);
  document.documentElement.setAttribute('data-theme', effective);
  document.documentElement.setAttribute('data-theme-setting', normalized);
  return effective;
}

function watchSystemTheme(themeSetting, callback) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = () => {
    if (normalizeTheme(themeSetting) !== 'system') return;
    const effective = applyTheme('system');
    if (typeof callback === 'function') {
      callback(effective);
    }
  };

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }

  if (typeof media.addListener === 'function') {
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }

  return () => {};
}

function sanitizeQuickLinks(rawQuickLinks) {
  return Array.isArray(rawQuickLinks)
    ? rawQuickLinks
        .filter((item) => item && typeof item.name === 'string' && isValidUrl(item.url))
        .map((item) => ({
          name: item.name.trim() || 'Untitled',
          url: item.url.trim()
        }))
    : [...DEFAULT_QUICK_LINKS];
}

function sanitizeCustomEngines(rawCustomEngines) {
  return Array.isArray(rawCustomEngines)
    ? rawCustomEngines
        .filter((item) => item && typeof item.name === 'string' && typeof item.searchUrl === 'string' && isValidTemplate(item.searchUrl))
        .map((item) => ({
          id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : createEngineId(item.name),
          name: item.name.trim() || 'Custom engine',
          searchUrl: item.searchUrl.trim()
        }))
    : [];
}

function sanitizeNote(raw, fallbackIndex = 0) {
  if (!raw || typeof raw !== 'object') return null;

  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const sourceTitle = typeof raw.sourceTitle === 'string' ? raw.sourceTitle.trim() : '';
  const sourceUrl = typeof raw.sourceUrl === 'string' && isValidUrl(raw.sourceUrl) ? raw.sourceUrl.trim() : '';
  const capturedText = typeof raw.capturedText === 'string' ? raw.capturedText.trim() : '';
  const originType = typeof raw.originType === 'string' && raw.originType.trim() ? raw.originType.trim() : 'manual';
  const createdAt = typeof raw.createdAt === 'string' && raw.createdAt.trim() ? raw.createdAt.trim() : new Date().toISOString();
  const updatedAt = typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt.trim() : createdAt;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `note-import-${Date.now()}-${fallbackIndex}`;

  if (!text && !title && !capturedText && !sourceTitle && !sourceUrl) {
    return null;
  }

  return {
    id,
    title: title || sourceTitle || 'Untitled note',
    text,
    sourceTitle,
    sourceUrl,
    capturedText,
    originType,
    createdAt,
    updatedAt
  };
}

function sanitizeNotes(rawNotes) {
  if (!Array.isArray(rawNotes)) return [];
  const notes = rawNotes
    .map((item, index) => sanitizeNote(item, index))
    .filter(Boolean);

  notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return notes;
}

function mergeNotes(existingNotes, incomingNotes) {
  const map = new Map();

  for (const note of sanitizeNotes(existingNotes)) {
    map.set(note.id, note);
  }

  for (const note of sanitizeNotes(incomingNotes)) {
    const current = map.get(note.id);
    if (!current) {
      map.set(note.id, note);
      continue;
    }

    const currentTime = new Date(current.updatedAt).getTime();
    const incomingTime = new Date(note.updatedAt).getTime();
    map.set(note.id, incomingTime >= currentTime ? note : current);
  }

  return [...map.values()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function buildSettingsExportPayload(settings) {
  return {
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    engine: settings.engine,
    quickLinks: settings.quickLinks,
    customEngines: settings.customEngines,
    theme: normalizeTheme(settings.theme),
    notes: sanitizeNotes(settings.notes)
  };
}

function buildNotesExportPayload(notes) {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    notes: sanitizeNotes(notes)
  };
}

function sanitizeImportedSettings(raw) {
  const quickLinks = sanitizeQuickLinks(raw.quickLinks);
  const customEngines = sanitizeCustomEngines(raw.customEngines);
  const allEngines = getAllEngines(customEngines);
  const engine = typeof raw.engine === 'string' && allEngines[raw.engine] ? raw.engine : STORAGE_DEFAULTS.engine;
  const theme = normalizeTheme(raw.theme);
  const notes = sanitizeNotes(raw.notes);

  return { engine, quickLinks, customEngines, theme, notes };
}

function getSanitizedSettingsPayload(settings) {
  return {
    engine: settings.engine,
    customEngines: sanitizeCustomEngines(settings.customEngines),
    quickLinks: sanitizeQuickLinks(settings.quickLinks),
    theme: normalizeTheme(settings.theme),
    notes: sanitizeNotes(settings.notes)
  };
}

async function writeSettings(settings) {
  await storageSet(getSanitizedSettingsPayload(settings));
}

async function readSettings() {
  const data = await storageGet(STORAGE_DEFAULTS);

  return {
    engine: data.engine || STORAGE_DEFAULTS.engine,
    customEngines: sanitizeCustomEngines(data.customEngines),
    quickLinks: sanitizeQuickLinks(data.quickLinks),
    theme: normalizeTheme(data.theme),
    notes: sanitizeNotes(data.notes)
  };
}

async function saveNote(noteInput) {
  const settings = await readSettings();
  const now = new Date().toISOString();

  const note = sanitizeNote({
    id: noteInput?.id || createNoteId(),
    title: noteInput?.title || '',
    text: noteInput?.text || '',
    sourceTitle: noteInput?.sourceTitle || '',
    sourceUrl: noteInput?.sourceUrl || '',
    capturedText: noteInput?.capturedText || '',
    originType: noteInput?.originType || 'manual',
    createdAt: noteInput?.createdAt || now,
    updatedAt: now
  });

  if (!note) {
    throw new Error('Cannot save an empty note.');
  }

  const existingIndex = settings.notes.findIndex((item) => item.id === note.id);
  if (existingIndex >= 0) {
    note.createdAt = settings.notes[existingIndex].createdAt || note.createdAt;
    settings.notes[existingIndex] = note;
  } else {
    settings.notes.unshift(note);
  }

  settings.notes = sanitizeNotes(settings.notes);
  await storageSet({ notes: settings.notes });
  return note;
}

async function deleteNote(noteId) {
  const settings = await readSettings();
  const notes = settings.notes.filter((item) => item.id !== noteId);
  await storageSet({ notes });
  return notes;
}

function buildPlainTextNoteExport(note) {
  const lines = [];

  lines.push(note.title || 'Untitled note');
  lines.push('');

  if (note.text) {
    lines.push(note.text);
    lines.push('');
  }

  if (note.capturedText) {
    lines.push('Captured text:');
    lines.push(note.capturedText);
    lines.push('');
  }

  if (note.sourceTitle) {
    lines.push('Source title: ' + note.sourceTitle);
  }

  if (note.sourceUrl) {
    lines.push('Source URL: ' + note.sourceUrl);
  }

  lines.push('Origin: ' + (note.originType || 'manual'));
  lines.push('Created: ' + (note.createdAt || ''));
  lines.push('Updated: ' + (note.updatedAt || ''));

  return lines.join('\n').trim() + '\n';
}