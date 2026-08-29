import express from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.post('/', (req, res) => {
  const userId = req.user.id;
  const { lastSyncTimestamp = 0, localFolders = [], localNotes = [] } = req.body;
  const currentSyncTimestamp = Date.now();

  try {
    db.transaction(() => {
      // 1. Sincronizar Carpetas recibidas del cliente
      const getFolderOwnerStmt = db.prepare('SELECT user_id FROM folders WHERE id = ?');
      const getNoteOwnerStmt = db.prepare('SELECT user_id FROM notes WHERE id = ?');
      const upsertFolderStmt = db.prepare(`
        INSERT INTO folders (id, user_id, name, parent_id, color, created_at, updated_at, is_deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          parent_id = excluded.parent_id,
          color = excluded.color,
          updated_at = excluded.updated_at,
          is_deleted = excluded.is_deleted
        WHERE excluded.updated_at > folders.updated_at
      `);

      for (const folder of localFolders) {
        if (!folder.id || !folder.name) continue;
        const folderOwner = getFolderOwnerStmt.get(folder.id);
        if (folderOwner && folderOwner.user_id !== userId) continue;
        upsertFolderStmt.run(
          folder.id,
          userId,
          folder.name,
          folder.parent_id || null,
          folder.color || null,
          folder.created_at || currentSyncTimestamp,
          folder.updated_at || currentSyncTimestamp,
          folder.is_deleted ? 1 : 0
        );
      }

      // 2. Sincronizar Notas recibidas del cliente
      const upsertNoteStmt = db.prepare(`
        INSERT INTO notes (id, user_id, folder_id, title, content, tags, is_pinned, created_at, updated_at, is_deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          folder_id = excluded.folder_id,
          title = excluded.title,
          content = excluded.content,
          tags = excluded.tags,
          is_pinned = excluded.is_pinned,
          updated_at = excluded.updated_at,
          is_deleted = excluded.is_deleted
        WHERE excluded.updated_at > notes.updated_at
      `);

      for (const note of localNotes) {
        if (!note.id) continue;
        const noteOwner = getNoteOwnerStmt.get(note.id);
        if (noteOwner && noteOwner.user_id !== userId) continue;
        const tagsStr = typeof note.tags === 'string' ? note.tags : JSON.stringify(note.tags || []);
        upsertNoteStmt.run(
          note.id,
          userId,
          note.folder_id || null,
          note.title || 'Sin título',
          note.content || '',
          tagsStr,
          note.is_pinned ? 1 : 0,
          note.created_at || currentSyncTimestamp,
          note.updated_at || currentSyncTimestamp,
          note.is_deleted ? 1 : 0
        );
      }
    })();

    // 3. Obtener cambios del servidor para el usuario.
    // Devuelve los registros actualizados desde `lastSyncTimestamp` y además los que el cliente
    // no tiene por ID, para que una nota creada en otro dispositivo llegue aunque su `updated_at`
    // (definido por el reloj del cliente) quede por debajo del `lastSyncTimestamp` local.
    const clientFolderIds = new Set(localFolders.filter(f => f.id).map(f => f.id));
    const clientNoteIds = new Set(localNotes.filter(n => n.id).map(n => n.id));

    const serverFolders = db.prepare('SELECT * FROM folders WHERE user_id = ?').all(userId)
      .filter(f => f.updated_at > lastSyncTimestamp || !clientFolderIds.has(f.id));

    const serverNotes = db.prepare('SELECT * FROM notes WHERE user_id = ?').all(userId)
      .filter(n => n.updated_at > lastSyncTimestamp || !clientNoteIds.has(n.id));

    const formattedServerNotes = serverNotes.map(n => ({
      ...n,
      tags: JSON.parse(n.tags || '[]'),
      is_pinned: Boolean(n.is_pinned),
      is_deleted: Boolean(n.is_deleted)
    }));

    const formattedServerFolders = serverFolders.map(f => ({
      ...f,
      is_deleted: Boolean(f.is_deleted)
    }));

    res.json({
      syncTimestamp: currentSyncTimestamp,
      serverFolders: formattedServerFolders,
      serverNotes: formattedServerNotes
    });
  } catch (error) {
    console.error('Error en sincronización:', error);
    res.status(500).json({ error: 'Error durante la sincronización' });
  }
});

export default router;
