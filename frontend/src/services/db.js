import { openDB } from 'idb';

const DB_NAME = 'neonotes_local_db';
const DB_VERSION = 1;

export async function initLocalDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store de carpetas
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
        folderStore.createIndex('user_id', 'user_id');
        folderStore.createIndex('updated_at', 'updated_at');
      }

      // Store de notas
      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('user_id', 'user_id');
        noteStore.createIndex('folder_id', 'folder_id');
        noteStore.createIndex('updated_at', 'updated_at');
      }

      // Metadata de sincronización
      if (!db.objectStoreNames.contains('sync_meta')) {
        db.createObjectStore('sync_meta', { keyPath: 'key' });
      }
    }
  });
}

export async function getLocalFolders(userId) {
  const db = await initLocalDB();
  const allFolders = await db.getAll('folders');
  return allFolders.filter(f => f.user_id === userId && !f.is_deleted);
}

export async function saveLocalFolder(folder) {
  const db = await initLocalDB();
  await db.put('folders', folder);
}

export async function getLocalNotes(userId) {
  const db = await initLocalDB();
  const allNotes = await db.getAll('notes');
  return allNotes.filter(n => n.user_id === userId && !n.is_deleted);
}

export async function saveLocalNote(note) {
  const db = await initLocalDB();
  await db.put('notes', note);
}

export async function setSyncMeta(key, value) {
  const db = await initLocalDB();
  await db.put('sync_meta', { key, value });
}

export async function getSyncMeta(key) {
  const db = await initLocalDB();
  const item = await db.get('sync_meta', key);
  return item ? item.value : null;
}
