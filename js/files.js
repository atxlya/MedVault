/* ============================================================
   files.js — original uploaded files, kept in IndexedDB
   Exposes globals: FileStore, attachOriginalFile, openOriginalFile

   Record text stays in localStorage (store.js). The original file is
   stored separately in IndexedDB under the record id, because
   localStorage is small (about 5 MB) and only holds text. Records from
   before this change simply have no stored file.
   ============================================================ */

const FileStore = {
  DB: 'medvault-files',
  STORE: 'files',
  MAX_BYTES: 10 * 1024 * 1024,

  available() { try { return typeof indexedDB !== 'undefined' && !!indexedDB; } catch (_) { return false; } },

  open() {
    return new Promise((resolve, reject) => {
      if (!this.available()) { reject(Object.assign(new Error('This browser cannot store files.'), { code: 'unavailable' })); return; }
      const req = indexedDB.open(this.DB, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(this.STORE)) req.result.createObjectStore(this.STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(Object.assign(new Error('File storage could not be opened.'), { code: 'unavailable' }));
      req.onblocked = () => reject(Object.assign(new Error('File storage is busy in another tab.'), { code: 'unavailable' }));
    });
  },

  async _tx(mode, fn) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      let result;
      const tx = db.transaction(this.STORE, mode);
      const req = fn(tx.objectStore(this.STORE));
      if (req) req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => { db.close(); resolve(result); };
      const fail = () => {
        db.close();
        const e = tx.error || (req && req.error);
        const quota = e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message || ''));
        reject(Object.assign(new Error(quota ? 'Browser storage is full.' : 'The file could not be stored.'), { code: quota ? 'quota' : 'failed' }));
      };
      tx.onerror = fail; tx.onabort = fail;
    });
  },

  async put(id, file) {
    if (!file) throw Object.assign(new Error('No file.'), { code: 'failed' });
    if (file.size > this.MAX_BYTES) throw Object.assign(new Error('The file is larger than 10 MB.'), { code: 'too-large' });
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        if (est.quota && est.usage !== undefined && est.quota - est.usage < file.size * 1.2) {
          throw Object.assign(new Error('Browser storage is full.'), { code: 'quota' });
        }
      } catch (e) { if (e.code === 'quota') throw e; }
    }
    const entry = { blob: file, name: file.name, type: file.type || 'application/octet-stream', size: file.size, savedAt: nowISO() };
    await this._tx('readwrite', s => s.put(entry, id));
    return entry;
  },

  get(id) { return this._tx('readonly', s => s.get(id)); },
  delete(id) { return this._tx('readwrite', s => s.delete(id)).catch(() => {}); },
  clear() { return this._tx('readwrite', s => s.clear()).catch(() => {}); }
};

/* Store the original file for a record that is already saved. Never throws:
   on failure the record keeps its text and is marked as having no file. */
async function attachOriginalFile(rec, file) {
  if (!file) return { ok: false, skipped: true };
  try {
    await FileStore.put(rec.id, file);
    rec.fileStored = true;
    rec.fileType = file.type || '';
    Store.save();
    return { ok: true };
  } catch (e) {
    rec.fileStored = false;
    Store.save();
    const why = e.code === 'too-large' ? 'The file is larger than 10 MB.'
      : e.code === 'quota' ? 'Browser storage is full.'
      : e.message || 'The file could not be stored.';
    Toast.warn('Original file not stored', why + ' The record and its text were saved.');
    return { ok: false, error: e };
  }
}

/* Open (or download) a record's stored original. */
async function openOriginalFile(rec, download) {
  if (!rec.fileStored) { Toast.info('No stored file', 'This record only has extracted text. Its original file was not uploaded to this device.'); return; }
  try {
    const entry = await FileStore.get(rec.id);
    if (!entry || !entry.blob) { Toast.error('File missing', 'The stored file could not be found in this browser.'); return; }
    const url = URL.createObjectURL(entry.blob);
    const a = document.createElement('a');
    a.href = url;
    if (download) a.download = entry.name || rec.fileName || 'medvault-record';
    else { a.target = '_blank'; a.rel = 'noopener'; }
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    Toast.error('Could not open file', e.message || 'File storage is unavailable.');
  }
}
