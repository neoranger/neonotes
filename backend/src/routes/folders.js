import express from 'express';
import crypto from 'crypto';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Obtener todas las carpetas del usuario
router.get('/', (req, res) => {
  const folders = db.prepare('SELECT * FROM folders WHERE user_id = ? AND is_deleted = 0 ORDER BY name ASC').all(req.user.id);
  res.json({ folders });
});

// Crear nueva carpeta
router.post('/', (req, res) => {
  const { name, parent_id, color, id: clientProvidedId } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la carpeta es requerido' });
  }

  const id = clientProvidedId || crypto.randomUUID();
  const now = Date.now();

  try {
    db.prepare(`
      INSERT INTO folders (id, user_id, name, parent_id, color, created_at, updated_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        parent_id = excluded.parent_id,
        color = excluded.color,
        updated_at = excluded.updated_at,
        is_deleted = 0
    `).run(id, req.user.id, name.trim(), parent_id || null, color || null, now, now);

    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    res.status(201).json({ folder });
  } catch (err) {
    console.error('Error al crear/actualizar carpeta:', err);
    res.status(500).json({ error: 'Error al crear carpeta' });
  }
});

// Actualizar carpeta (renombrar/mover)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, parent_id, color } = req.body;
  const now = Date.now();

  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!folder) {
    return res.status(404).json({ error: 'Carpeta no encontrada' });
  }

  const newName = name !== undefined ? name.trim() : folder.name;
  const newParent = parent_id !== undefined ? parent_id : folder.parent_id;
  const newColor = color !== undefined ? color : folder.color;

  db.prepare(`
    UPDATE folders
    SET name = ?, parent_id = ?, color = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(newName, newParent, newColor, now, id, req.user.id);

  const updatedFolder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  res.json({ folder: updatedFolder });
});

// Eliminar carpeta (Soft delete)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const now = Date.now();

  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!folder) {
    return res.status(404).json({ error: 'Carpeta no encontrada' });
  }

  // Soft delete folder and move contained notes to root or soft delete
  db.transaction(() => {
    db.prepare('UPDATE folders SET is_deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?').run(now, id, req.user.id);
    db.prepare('UPDATE notes SET folder_id = NULL, updated_at = ? WHERE folder_id = ? AND user_id = ?').run(now, id, req.user.id);
  })();

  res.json({ message: 'Carpeta eliminada', id });
});

export default router;
