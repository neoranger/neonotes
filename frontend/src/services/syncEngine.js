import { apiRequest } from './api';
import { initLocalDB, setSyncMeta, getSyncMeta } from './db';

const GUEST_USER_ID = 'guest_local_user';

export async function performSync(userId) {
  if (!userId || !navigator.onLine) {
    return { success: false, reason: 'offline_or_unauthenticated' };
  }

  try {
    const db = await initLocalDB();
    const lastSyncTimestamp = (await getSyncMeta(`lastSync_${userId}`)) || 0;

    // 1. Obtener todos los elementos locales de IndexedDB
    let localFolders = await db.getAll('folders');
    let localNotes = await db.getAll('notes');

    // 2. Reasignar automáticamente notas/carpetas locales huérfanas o de invitado al usuario actual
    const adoptTx = db.transaction(['folders', 'notes'], 'readwrite');
    const folderStore = adoptTx.objectStore('folders');
    const noteStore = adoptTx.objectStore('notes');
    let updatedAny = false;

    for (const f of localFolders) {
      if (!f.user_id || f.user_id === GUEST_USER_ID || f.user_id === 'undefined' || f.user_id === 'null') {
        f.user_id = userId;
        f.updated_at = Date.now();
        await folderStore.put(f);
        updatedAny = true;
      }
    }

    for (const n of localNotes) {
      if (!n.user_id || n.user_id === GUEST_USER_ID || n.user_id === 'undefined' || n.user_id === 'null') {
        n.user_id = userId;
        n.updated_at = Date.now();
        await noteStore.put(n);
        updatedAny = true;
      }
    }

    await adoptTx.done;

    if (updatedAny) {
      localFolders = await db.getAll('folders');
      localNotes = await db.getAll('notes');
    }

    const userFolders = localFolders.filter(f => f.user_id === userId);
    const userNotes = localNotes.filter(n => n.user_id === userId);

    // 3. Enviar a la API de sincronización
    const syncResult = await apiRequest('/api/sync', 'POST', {
      lastSyncTimestamp,
      localFolders: userFolders,
      localNotes: userNotes
    });

    const { syncTimestamp, serverFolders, serverNotes } = syncResult;

    // 4. Actualizar IndexedDB con los datos retornados por el servidor
    const updateTx = db.transaction(['folders', 'notes'], 'readwrite');
    const fStore = updateTx.objectStore('folders');
    const nStore = updateTx.objectStore('notes');

    for (const folder of serverFolders) {
      await fStore.put(folder);
    }

    for (const note of serverNotes) {
      await nStore.put(note);
    }

    await updateTx.done;

    // Guardar nueva marca de tiempo de sincronización
    await setSyncMeta(`lastSync_${userId}`, syncTimestamp);

    return {
      success: true,
      syncTimestamp,
      foldersCount: serverFolders.length,
      notesCount: serverNotes.length
    };
  } catch (error) {
    console.error('Sincronización fallida:', error);
    return { success: false, error: error.message };
  }
}
