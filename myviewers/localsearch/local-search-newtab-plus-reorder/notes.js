const noteTitleEl = document.getElementById('noteTitle');
const noteSourceTitleEl = document.getElementById('noteSourceTitle');
const noteSourceUrlEl = document.getElementById('noteSourceUrl');
const noteCapturedTextEl = document.getElementById('noteCapturedText');
const noteTextEl = document.getElementById('noteText');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const newNoteBtn = document.getElementById('newNoteBtn');
const deleteNoteBtn = document.getElementById('deleteNoteBtn');
const exportSingleJsonBtn = document.getElementById('exportSingleJsonBtn');
const exportSingleTxtBtn = document.getElementById('exportSingleTxtBtn');
const openSourceLinkEl = document.getElementById('openSourceLink');
const openSourceHintEl = document.getElementById('openSourceHint');
const notesListEl = document.getElementById('notesList');
const notesStatusEl = document.getElementById('notesStatus');

let settings;
let selectedNoteId = '';

function setStatus(message) {
  notesStatusEl.textContent = message;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function updateSourceLinkUi(sourceUrl, sourceTitle) {
  const valid = typeof sourceUrl === 'string' && isValidUrl(sourceUrl.trim());
  if (!valid) {
    openSourceLinkEl.hidden = true;
    openSourceLinkEl.href = '#';
    openSourceHintEl.textContent = 'No source link on the selected note.';
    return;
  }

  openSourceLinkEl.hidden = false;
  openSourceLinkEl.href = sourceUrl.trim();
  openSourceLinkEl.textContent = sourceTitle?.trim()
    ? `Open source: ${sourceTitle.trim()}`
    : 'Open source link';
  openSourceHintEl.textContent = sourceUrl.trim();
}

function clearEditor() {
  selectedNoteId = '';
  noteTitleEl.value = '';
  noteSourceTitleEl.value = '';
  noteSourceUrlEl.value = '';
  noteCapturedTextEl.value = '';
  noteTextEl.value = '';
  updateSourceLinkUi('', '');
}

function fillEditor(note) {
  selectedNoteId = note.id;
  noteTitleEl.value = note.title || '';
  noteSourceTitleEl.value = note.sourceTitle || '';
  noteSourceUrlEl.value = note.sourceUrl || '';
  noteCapturedTextEl.value = note.capturedText || '';
  noteTextEl.value = note.text || '';
  updateSourceLinkUi(note.sourceUrl || '', note.sourceTitle || '');
}

function renderNotesList() {
  notesListEl.innerHTML = '';

  if (!settings.notes.length) {
    const empty = document.createElement('div');
    empty.className = 'note-card';
    empty.textContent = 'No notes saved yet.';
    notesListEl.appendChild(empty);
    return;
  }

  settings.notes.forEach((note) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'note-card';
    card.dataset.noteId = note.id;

    const top = document.createElement('div');
    top.className = 'note-card-top';

    const titleWrap = document.createElement('div');

    const title = document.createElement('strong');
    title.textContent = note.title || 'Untitled note';

    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = note.updatedAt ? new Date(note.updatedAt).toLocaleString() : '';

    titleWrap.appendChild(title);
    titleWrap.appendChild(meta);

    const origin = document.createElement('div');
    origin.className = 'muted';
    origin.textContent = note.originType || 'manual';

    top.appendChild(titleWrap);
    top.appendChild(origin);

    const text = document.createElement('div');
    text.className = 'note-card-text';
    text.textContent = note.text || note.capturedText || note.sourceUrl || 'Saved note';

    card.appendChild(top);
    card.appendChild(text);

    if (note.sourceUrl) {
      const source = document.createElement('div');
      source.className = 'muted';
      source.textContent = note.sourceTitle ? `${note.sourceTitle} — ${note.sourceUrl}` : note.sourceUrl;
      card.appendChild(source);
    }

	
card.addEventListener('click', () => {
  fillEditor(note);
  noteTitleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setStatus('Loaded note: ' + (note.title || 'Untitled note'));
});	

    notesListEl.appendChild(card);
  });
}

async function reloadSettings() {
  settings = await readSettings();
  applyTheme(settings.theme);
  renderNotesList();
}

saveNoteBtn.addEventListener('click', async () => {
  const note = await saveNote({
    id: selectedNoteId || undefined,
    title: noteTitleEl.value.trim(),
    sourceTitle: noteSourceTitleEl.value.trim(),
    sourceUrl: noteSourceUrlEl.value.trim(),
    capturedText: noteCapturedTextEl.value.trim(),
    text: noteTextEl.value.trim(),
    originType: selectedNoteId ? 'edited' : 'manual'
  });

  selectedNoteId = note.id;
  await reloadSettings();
  fillEditor(note);
  setStatus('Saved note: ' + (note.title || 'Untitled note'));
});

newNoteBtn.addEventListener('click', () => {
  clearEditor();
  noteTitleEl.focus();
  setStatus('Ready for a new note.');
});

deleteNoteBtn.addEventListener('click', async () => {
  if (!selectedNoteId) {
    setStatus('Select a note first.');
    return;
  }

  await deleteNote(selectedNoteId);
  clearEditor();
  await reloadSettings();
  setStatus('Deleted selected note.');
});

exportSingleJsonBtn.addEventListener('click', () => {
  if (!selectedNoteId) {
    setStatus('Select a note first.');
    return;
  }

  const note = settings.notes.find((item) => item.id === selectedNoteId);
  if (!note) {
    setStatus('Selected note could not be found.');
    return;
  }

  downloadFile(
    (note.title || 'note').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.json',
    JSON.stringify({ note }, null, 2),
    'application/json'
  );
  setStatus('Exported selected note as JSON.');
});

exportSingleTxtBtn.addEventListener('click', () => {
  if (!selectedNoteId) {
    setStatus('Select a note first.');
    return;
  }

  const note = settings.notes.find((item) => item.id === selectedNoteId);
  if (!note) {
    setStatus('Selected note could not be found.');
    return;
  }

  downloadFile(
    (note.title || 'note').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.txt',
    buildPlainTextNoteExport(note),
    'text/plain'
  );
  setStatus('Exported selected note as text.');
});

reloadSettings().then(() => {
  clearEditor();
  setStatus('Notes loaded.');
}).catch((error) => {
  console.error('Notes init failed', error);
  setStatus('Could not load notes.');
});