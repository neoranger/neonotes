import React from 'react';
import { useNotes } from '../context/NotesContext';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Pin, FileText } from 'lucide-react';

export default function NotesList({ onOpenAuth }) {
  const { user } = useAuth();
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
    if (!user) {
      onOpenAuth();
      return;
    }
    createNote('Nueva Nota Markdown', '# Título de la nota\n\nComienza a escribir en Markdown aquí...', activeFolderId);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="notes-sidebar">
      <div className="notes-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>{folderTitle}</h2>
          <button className="btn-primary" onClick={handleCreateNote} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
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
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <FileText size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>No se encontraron notas.</p>
          </div>
        ) : (
          notes.map((note) => {
            const isActive = activeNoteId === note.id;
            return (
              <div
                key={note.id}
                className={`note-card ${isActive ? 'active' : ''}`}
                onClick={() => setActiveNoteId(note.id)}
              >
                <div className="note-card-title">
                  <span>{note.title || 'Sin título'}</span>
                  {note.is_pinned && <Pin size={14} style={{ color: 'var(--accent-primary)', transform: 'rotate(45deg)' }} />}
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
