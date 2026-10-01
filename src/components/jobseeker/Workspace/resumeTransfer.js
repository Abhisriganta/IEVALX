// ============================================================================
// resumeTransfer.js  (NEW)
//
// Cross-tab File handoff for the Resume Builder.
//
// WHY THIS EXISTS
// ───────────────
// The Workspace opens the builder in a NEW browser tab so users can work
// on multiple resumes in parallel. A File object cannot cross tabs via
// router state or URL — but IndexedDB is shared across same-origin tabs
// and stores File/Blob natively. So:
//
//   Workspace tab:  putTransfer(file)  → key   → window.open(url?rbTransfer=key)
//   Builder tab:    takeTransfer(key)  → File  → auto-upload pipeline
//
// takeTransfer is CONSUME-ONCE: it reads and deletes atomically-ish, so a
// refresh of the builder tab can't re-upload, and React StrictMode's
// double-mount gets null on the second call (callers must not overwrite
// an already-captured file with null).
//
// Records carry a timestamp; anything older than TTL_MS is swept on every
// open so abandoned handoffs (blocked popups, closed tabs) don't pile up.
//
// Location: src/components/jobseeker/Workspace/resumeTransfer.js
// ============================================================================

const DB_NAME    = 'ievalx_rb_transfer';
const DB_VERSION = 1;
const STORE      = 'files';
const TTL_MS     = 10 * 60 * 1000; // 10 minutes

const openDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });

/** Sweep records older than TTL. Best-effort; never throws. */
const sweep = (db) => {
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const cutoff = Date.now() - TTL_MS;
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      if ((cursor.value?.ts || 0) < cutoff) cursor.delete();
      cursor.continue();
    };
  } catch { /* non-fatal */ }
};

/** Generate a transfer key synchronously (usable before the write lands). */
export const genTransferKey = () =>
  `t_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Store a File under a pre-generated key.
 * @param {string} key
 * @param {File} file
 */
export const putTransferWithKey = async (key, file) => {
  const db = await openDb();
  sweep(db);
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key, file, name: file.name, ts: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
  db.close();
};

/**
 * Store a File for pickup by another tab.
 * @param {File} file
 * @returns {Promise<string>} one-time transfer key
 */
export const putTransfer = async (file) => {
  const key = genTransferKey();
  await putTransferWithKey(key, file);
  return key;
};

/** Single read+delete attempt. */
const takeOnce = async (key) => {
  const db = await openDb();
  const file = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const rec = getReq.result;
      if (rec) store.delete(key);
      resolve(rec?.file || null);
    };
    getReq.onerror = () => reject(getReq.error);
  });
  db.close();
  return file;
};

/**
 * Claim (read + delete) a transferred File. Consume-once.
 *
 * POLLS briefly: the workspace tab opens this tab in the SAME click
 * gesture (popup-blocker safety) and finishes the IndexedDB write in
 * parallel — so this tab can arrive before the record lands. Retry
 * every 150ms for up to ~3s before giving up.
 *
 * @param {string} key
 * @returns {Promise<File|null>} the File, or null if missing/claimed
 */
export const takeTransfer = async (key) => {
  if (!key) return null;
  const DEADLINE = Date.now() + 3000;
  for (;;) {
    let file = null;
    try { file = await takeOnce(key); } catch { return null; }
    if (file) return file;
    if (Date.now() > DEADLINE) return null;
    await new Promise((r) => setTimeout(r, 150));
  }
};