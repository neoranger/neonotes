import React, { useState } from 'react';
import { useNotes } from '../context/NotesContext';
import { X, FolderPlus } from 'lucide-react';

const COLOR_OPTIONS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'];

export default function FolderModal({ isOpen, onClose }) {
  const { createFolder, folders } = useNotes();
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    createFolder(folderName.trim(), null, selectedColor);
    setFolderName('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <FolderPlus size={20} style={{ color: selectedColor }} />
            <span>Nueva Carpeta</span>
          </h2>
          <button className="toolbar-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-field">
            <label className="form-label">
              Nombre de la Carpeta
            </label>
            <input
              type="text"
              required
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ej: Proyectos, Personal, Apuntes..."
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              Color Distintivo
            </label>
            <div className="color-swatches">
              {COLOR_OPTIONS.map((c) => (
                <div
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`color-swatch ${selectedColor === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Crear Carpeta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
