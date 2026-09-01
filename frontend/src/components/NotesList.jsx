import React from 'react';
import { useNotes } from '../context/NotesContext';
import { Search, Plus, Pin, FileText } from 'lucide-react';

export default function NotesList({ onOpenNote }) {
  const {
    notes,
    activeFolderId,
    folders,
    activeNoteId,
    setActiveNoteId,
    searchQuery,
    setSearchQuery,
    createNote
  } = useNotes();

  const currentFolder = folders.find(f => f.id === activeFolderId);
  const folderTitle = currentFolder ? currentFolder.name : 'Todas las Notas';

  const handleCreateNote = () => {
    createNote('Nueva Nota Markdown', '# Título de la nota\n\nComienza a escribir en Markdown aquí...', activeFolderId)
      .then(() => { if (onOpenNote) onOpenNote(); })
      .catch(() => {});
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="notes-sidebar">
      <div className="notes-header">
        <div className="notes-header-row">
          <div className="notes-title-wrap">
            <h2 className="notes-title">{folderTitle}</h2>
            <span className="notes-count">{notes.length}</span>
          </div>
          <button className="btn-primary" onClick={handleCreateNote}>
            <Plus size={16} />
            <span>Nota</span>
          </button>
        </div>

        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="notes-list">
        {notes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={26} />
            </div>
            <p>No se encontraron notas.</p>
            <button className="btn-primary" onClick={handleCreateNote}>
              <Plus size={15} />
              Crear nota
            </button>
          </div>
        ) : (
          notes.map((note) => {
            const isActive = activeNoteId === note.id;
            return (
              <div
                key={note.id}
                className={`note-card ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveNoteId(note.id);
                  if (onOpenNote) onOpenNote();
                }}
              >
                <div className="note-card-title">
                  <span>{note.title || 'Sin título'}</span>
                  {note.is_pinned && <Pin size={14} className="pin-icon" />}
                </div>
                <div className="note-card-snippet">
                  {note.content.replace(/[#*`_~]/g, '') || 'Nota vacía...'}
                </div>
                <div className="note-card-meta">
                  <span>{formatDate(note.updated_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}