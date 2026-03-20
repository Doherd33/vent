// ── INDEXEDDB MEDIA STORE ──
const MEDIA_DB_NAME = 'vent_media';
const MEDIA_DB_VER  = 1;
const MEDIA_STORE   = 'files';
let mediaDB = null;

function openMediaDB() {
  return new Promise((resolve, reject) => {
    if (mediaDB) return resolve(mediaDB);
    const req = indexedDB.open(MEDIA_DB_NAME, MEDIA_DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        const store = db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
        store.createIndex('stepId', 'stepId', { unique: false });
        store.createIndex('docId', 'docId', { unique: false });
      }
    };
    req.onsuccess = e => { mediaDB = e.target.result; resolve(mediaDB); };
    req.onerror = e => reject(e.target.error);
  });
}

async function saveMedia(mediaEntry) {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    tx.objectStore(MEDIA_STORE).put(mediaEntry);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

async function getMediaForStep(docId, stepId) {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readonly');
    const store = tx.objectStore(MEDIA_STORE);
    const idx = store.index('stepId');
    const req = idx.getAll(stepId);
    req.onsuccess = () => {
      resolve((req.result || []).filter(m => m.docId === docId));
    };
    req.onerror = e => reject(e.target.error);
  });
}

async function getMediaForDoc(docId) {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readonly');
    const idx = tx.objectStore(MEDIA_STORE).index('docId');
    const req = idx.getAll(docId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = e => reject(e.target.error);
  });
}

async function deleteMedia(mediaId) {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    tx.objectStore(MEDIA_STORE).delete(mediaId);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

async function deleteMediaForDoc(docId) {
  const items = await getMediaForDoc(docId);
  for (const m of items) await deleteMedia(m.id);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function getMediaType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}

// Hidden file input for uploads
const _fileInput = document.createElement('input');
_fileInput.type = 'file';
_fileInput.multiple = true;
_fileInput.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
_fileInput.style.display = 'none';
document.body.appendChild(_fileInput);
let _fileInputCallback = null;
_fileInput.addEventListener('change', () => {
  if (_fileInputCallback) _fileInputCallback(_fileInput.files);
  _fileInput.value = '';
});

// ── DOCUMENT STORE (server-first with localStorage fallback) ──
const STORE_KEY = 'vent_builder_docs';

function loadDocsLocal() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}
function saveDocsLocal(docs) {
  localStorage.setItem(STORE_KEY, JSON.stringify(docs));
}

async function loadDocs() {
  try {
    const resp = await authFetch(SERVER + '/docs/documents');
    if (resp.ok) {
      const rows = await resp.json();
      const docs = rows.map(r => ({
        id: r.client_id,
        title: r.title,
        area: r.area,
        description: r.description || '',
        status: r.status || 'draft',
        created: r.created_at,
        updated: r.updated_at,
        steps: r.steps || [],
        versions: r.versions || [],
        source: r.source || null
      }));
      saveDocsLocal(docs);
      return docs;
    }
  } catch (e) { console.warn('[DOCS] Server load failed, using localStorage:', e.message); }
  return loadDocsLocal();
}

function saveDocs(docs, changedDocId) {
  saveDocsLocal(docs);
  if (changedDocId) {
    saveDocToServer(changedDocId);
  }
}

// Save status indicator
function showSaveStatus(msg, isError) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? 'var(--red, #e74c3c)' : 'var(--dim)';
  if (!isError) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000);
}

// Debounced server sync — 1.5s delay per document
const _docSaveTimers = {};
function saveDocToServer(docId) {
  clearTimeout(_docSaveTimers[docId]);
  _docSaveTimers[docId] = setTimeout(() => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    showSaveStatus('Saving…');
    authFetch(SERVER + '/docs/documents/' + encodeURIComponent(docId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: doc.title,
        area: doc.area,
        description: doc.description,
        status: doc.status,
        steps: doc.steps,
        versions: doc.versions,
        signoffs: doc.signoffs || []
      })
    }).then(r => {
      if (r.ok) showSaveStatus('Saved');
      else showSaveStatus('Save failed — using local backup', true);
    }).catch(e => {
      console.warn('[DOCS] Server save failed:', e.message);
      showSaveStatus('Offline — saved locally', true);
    });
  }, 1500);
}

function createDocOnServer(doc) {
  authFetch(SERVER + '/docs/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: doc.id,
      title: doc.title,
      area: doc.area,
      description: doc.description,
      status: doc.status,
      steps: doc.steps,
      versions: doc.versions,
      signoffs: doc.signoffs || [],
      source: doc.source || null
    })
  }).then(r => {
    if (!r.ok) showSaveStatus('Sync failed — saved locally', true);
  }).catch(e => {
    console.warn('[DOCS] Server create failed:', e.message);
    showSaveStatus('Offline — saved locally', true);
  });
}

function deleteDocFromServer(docId) {
  authFetch(SERVER + '/docs/documents/' + encodeURIComponent(docId), {
    method: 'DELETE'
  }).catch(e => {
    console.warn('[DOCS] Server delete failed:', e.message);
    showSaveStatus('Delete not synced — offline', true);
  });
}

let documents = [];
let activeDocId = null;
let activeRightTab = 'edit';
let openTabs = []; // array of doc ids

