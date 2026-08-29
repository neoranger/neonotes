import { openDB } from 'idb';
import { apiRequest } from './api';

const DB_NAME = 'neonotes_local_db';
const DB_VERSION = 1;
const GUEST_USER_ID = 'guest_local_user';

const isOrphan = (item) =>
  !item || !item.user_id || item.user_id === GUEST_USER_ID ||
  item.user_id === 'undefined' || item.user_id === 'null';

function dbExists() {
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME);
    } catch (e) {
      resolve(false);
      return;
    }
    req.onupgradeneeded = () => resolve(false);
    req.onsuccess = () => {
      const db = req.result;
      const exists = db.objectStoreNames.length > 0;
      db.close();
      resolve(exists);
    };
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
  });
}

function deleteDatabase() {
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.deleteDatabase(DB_NAME);
    } catch (e) {
      resolve();
      return;
    }
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

export async function runLegacyImport(userId) {
  if (typeof indexedDB === 'undefined') return true;

  const exists = await dbExists();
  if (!exists) {
    return true;
  }

  const db = await openDB(DB_NAME, DB_VERSION);

  let allFolders = [];
  let allNotes = [];
  try {
    allFolders = (await db.getAll('folders')) || [];
    allNotes = (await db.getAll('notes')) || [];
  } catch (e) {
    console.warn('No se pudo leer el almacenamiento local:', e.message);
  }

  const belongs = (item) => isOrphan(item) || item.user_id === userId;
  const myFolders = allFolders.filter((f) => belongs(f) && !f.is_deleted);
  const myNotes = allNotes.filter((n) => belongs(n) && !n.is_deleted);

  const keepFolderIds = new Set();
  for (const f of myFolders) {
    await apiRequest('/folders', 'POST', {
      id: f.id,
      name: f.name || 'Sin nombre',
      parent_id: f.parent_id || null,
      color: f.color || undefined,
      created_at: Number.isFinite(f.created_at) ? f.created_at : undefined,
      updated_at: Number.isFinite(f.updated_at) ? f.updated_at : undefined
    });
    keepFolderIds.add(f.id);
  }

  for (const n of myNotes) {
    const folderId = n.folder_id && keepFolderIds.has(n.folder_id) ? n.folder_id : null;
    await apiRequest('/notes', 'POST', {
      id: n.id,
      folder_id: folderId,
      title: n.title || 'Sin título',
      content: n.content || '',
      tags: Array.isArray(n.tags) ? n.tags : [],
      is_pinned: Boolean(n.is_pinned),
      created_at: Number.isFinite(n.created_at) ? n.created_at : undefined,
      updated_at: Number.isFinite(n.updated_at) ? n.updated_at : undefined
    });
  }

  await deleteDatabase();
  return true;
}