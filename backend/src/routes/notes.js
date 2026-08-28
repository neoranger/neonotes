import express from 'express';
import crypto from 'crypto';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Obtener todas las notas del usuario
router.get('/', (req, res) => {
  const notes = db.prepare('SELECT * FROM notes WHERE user_id = ? AND is_deleted = 0 ORDER BY is_pinned DESC, updated_at DESC').all(req.user.id);
  // Parse tags JSON string to array
  const formattedNotes = notes.map(note => ({
    ...note,
    tags: JSON.parse(note.tags || '[]'),
    is_pinned: Boolean(note.is_pinned)
  }));
  res.json({ notes: formattedNotes });
});

// Obtener nota por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ? AND is_deleted = 0').get(id, req.user.id);
  if (!note) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }
  res.json({
    note: {
      ...note,
      tags: JSON.parse(note.tags || '[]'),
      is_pinned: Boolean(note.is_pinned)
    }
  });
});

// Crear o actualizar nota (soporta client-provided ID para offline sync)
router.post('/', (req, res) => {
  const { id: clientProvidedId, folder_id, title, content, tags, is_pinned } = req.body;
  const id = clientProvidedId || crypto.randomUUID();
  const now = Date.now();
  const tagsStr = JSON.stringify(tags || []);

  try {
    const existing = db.prepare('SELECT user_id FROM notes WHERE id = ?').get(id);
    if (existing && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta nota' });
    }

    db.prepare(`
      INSERT INTO notes (id, user_id, folder_id, title, content, tags, is_pinned, created_at, updated_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        folder_id = excluded.folder_id,
        title = excluded.title,
        content = excluded.content,
        tags = excluded.tags,
        is_pinned = excluded.is_pinned,
        updated_at = excluded.updated_at,
        is_deleted = 0
    `).run(
      id,
      req.user.id,
      folder_id || null,
      title || 'Sin título',
      content || '',
      tagsStr,
      is_pinned ? 1 : 0,
      now,
      now
    );

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.status(201).json({
      note: {
        ...note,
        tags: JSON.parse(note.tags || '[]'),
        is_pinned: Boolean(note.is_pinned)
      }
    });
  } catch (err) {
    console.error('Error al guardar nota:', err);
    res.status(500).json({ error: 'Error al guardar nota' });
  }
});

// Actualizar nota por ID
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { folder_id, title, content, tags, is_pinned } = req.body;
  const now = Date.now();

  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!note) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  const updatedFolder = folder_id !== undefined ? folder_id : note.folder_id;
  const updatedTitle = title !== undefined ? title : note.title;
  const updatedContent = content !== undefined ? content : note.content;
  const updatedTags = tags !== undefined ? JSON.stringify(tags) : note.tags;
  const updatedPinned = is_pinned !== undefined ? (is_pinned ? 1 : 0) : note.is_pinned;

  db.prepare(`
    UPDATE notes
    SET folder_id = ?, title = ?, content = ?, tags = ?, is_pinned = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(updatedFolder, updatedTitle, updatedContent, updatedTags, updatedPinned, now, id, req.user.id);

  const updatedNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  res.json({
    note: {
      ...updatedNote,
      tags: JSON.parse(updatedNote.tags || '[]'),
      is_pinned: Boolean(updatedNote.is_pinned)
    }
  });
});

// Eliminar nota (Soft delete)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const now = Date.now();

  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!note) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  db.prepare('UPDATE notes SET is_deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?').run(now, id, req.user.id);
  res.json({ message: 'Nota eliminada', id });
});

export default router;
