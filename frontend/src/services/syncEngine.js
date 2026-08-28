import { apiRequest } from './api';
import { initLocalDB, setSyncMeta, getSyncMeta } from './db';

export async function performSync(userId) {
  if (!userId || !navigator.onLine) {
    return { success: false, reason: 'offline_or_unauthenticated' };
  }

  try {
    const db = await initLocalDB();
    const lastSyncTimestamp = (await getSyncMeta(`lastSync_${userId}`)) || 0;

    // Obtener todos los elementos locales (incluyendo tombstones is_deleted)
    const localFolders = await db.getAll('folders');
    const localNotes = await db.getAll('notes');

    const userFolders = localFolders.filter(f => f.user_id === userId);
    const userNotes = localNotes.filter(n => n.user_id === userId);

    // Enviar a la API de sincronización
    const syncResult = await apiRequest('/api/sync', 'POST', {
      lastSyncTimestamp,
      localFolders: userFolders,
      localNotes: userNotes
    });

    const { syncTimestamp, serverFolders, serverNotes } = syncResult;

    // Actualizar IndexedDB con la respuesta del servidor
    const tx = db.transaction(['folders', 'notes'], 'readwrite');
    const folderStore = tx.objectStore('folders');
    const noteStore = tx.objectStore('notes');

    for (const folder of serverFolders) {
      await folderStore.put(folder);
    }

    for (const note of serverNotes) {
      await noteStore.put(note);
    }

    await tx.done;

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
