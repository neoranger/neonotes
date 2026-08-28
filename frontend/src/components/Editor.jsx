import React, { useState, useEffect, useRef } from 'react';
import { useNotes } from '../context/NotesContext';
import { marked } from 'marked';
import {
  Bold,
  Italic,
  Heading,
  Code,
  List,
  CheckSquare,
  Quote,
  Table,
  Link,
  Eye,
  Columns,
  Edit3,
  Pin,
  Trash2,
  Download,
  Folder
} from 'lucide-react';

export default function Editor() {
  const { activeNote, updateNote, deleteNote, folders } = useNotes();
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'edit' | 'preview'
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const textareaRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sincronizar estado local cuando cambia la nota activa
  useEffect(() => {
    if (activeNote) {
      setLocalTitle(activeNote.title || '');
      setLocalContent(activeNote.content || '');
    }
  }, [activeNote?.id]);

  // Actualización diferida (Debounce) para evitar re-renders masivos del árbol global mientras se escribe
  const scheduleUpdate = (title, content) => {
    if (!activeNote) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      updateNote(activeNote.id, { title, content });
    }, 400);
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    scheduleUpdate(newTitle, localContent);
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    scheduleUpdate(localTitle, newContent);
  };

  // Manejo de la tecla Tab en el editor para indentación limpia de código Markdown
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '  ';

      const updated = localContent.substring(0, start) + spaces + localContent.substring(end);
      setLocalContent(updated);
      scheduleUpdate(localTitle, updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  if (!activeNote) {
    return (
      <div className="editor-container" style={{ justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '1.1rem' }}>Selecciona o crea una nota para comenzar a editar</p>
      </div>
    );
  }

  // Insertar sintaxis Markdown en la posición del cursor
  const insertMarkdown = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = localContent.substring(start, end);
    const replacement = `${prefix}${selectedText || 'código'}${suffix}`;

    const newContent = localContent.substring(0, start) + replacement + localContent.substring(end);
    setLocalContent(newContent);
    scheduleUpdate(localTitle, newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 6));
    }, 50);
  };

  // Descargar nota en formato .md
  const handleExportMarkdown = () => {
    const filename = `${localTitle.replace(/[^a-z0-9_-]/gi, '_') || 'nota'}.md`;
    const blob = new Blob([localContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Renderizar sintaxis Markdown
  const getRenderedHTML = () => {
    try {
      return { __html: marked.parse(localContent || '') };
    } catch (e) {
      return { __html: '<p style="color:red">Error renderizando Markdown</p>' };
    }
  };

  return (
    <div className="editor-container">
      {/* Header del Editor */}
      <div className="editor-header">
        <input
          type="text"
          className="note-title-input"
          value={localTitle}
          onChange={handleTitleChange}
          placeholder="Título de la nota..."
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Selector de Carpeta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--bg-card)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <Folder size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={activeNote.folder_id || ''}
              onChange={(e) => updateNote(activeNote.id, { folder_id: e.target.value || null })}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.85rem' }}
            >
              <option value="">(Sin Carpeta)</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Botón Fijar Nota */}
          <button
            className={`toolbar-btn ${activeNote.is_pinned ? 'active' : ''}`}
            onClick={() => updateNote(activeNote.id, { is_pinned: !activeNote.is_pinned })}
            title={activeNote.is_pinned ? 'Desfijar nota' : 'Fijar nota arriba'}
          >
            <Pin size={16} style={{ transform: activeNote.is_pinned ? 'rotate(45deg)' : 'none' }} />
          </button>

          {/* Exportar MD */}
          <button className="toolbar-btn" onClick={handleExportMarkdown} title="Descargar nota en .md">
            <Download size={16} />
          </button>

          {/* Eliminar Nota */}
          <button
            className="toolbar-btn"
            onClick={() => {
              if (confirm('¿Eliminar esta nota?')) deleteNote(activeNote.id);
            }}
            title="Eliminar nota"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Barra de Herramientas de Edición Markdown */}
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => insertMarkdown('**', '**')} title="Negrita (**texto**)">
            <Bold size={15} />
          </button>
          <button className="toolbar-btn" onClick={() => insertMarkdown('*', '*')} title="Cursiva (*texto*)">
            <Italic size={15} />
          </button>
          <button className="toolbar-btn" onClick={() => insertMarkdown('# ')} title="Título 1 (# Título)">
            <Heading size={15} />
          </button>
          <button className="toolbar-btn" onClick={() => insertMarkdown('```js\n', '\n```')} title="Bloque de código (```)">
            <Code size={15} />
          </button>
          <button className="toolbar-btn" onClick={() => insertMarkdown('- ')} title="Lista (- elemento)">
            <List size={15} />
          </button>
          <button className="toolbar-btn" onClick={() => insertMarkdown('- [ ] ')} title="Lista de Tareas (- [ ] tarea)">
            <CheckSquare size={15} />
          </button>
          <button className="toolbar-btn" onClick={() => insertMarkdown('> ')} title="Cita (> cita)">
            <Quote size={15} />
          </button>
          <button
            className="toolbar-btn"
            onClick={() => insertMarkdown('| Columna 1 | Columna 2 |\n|---|---|\n| Dato 1 | Dato 2 |\n')}
            title="Insertar Tabla"
          >
            <Table size={15} />
          </button>
          <button className="toolbar-btn" onClick={() => insertMarkdown('[', '](https://)')} title="Enlace Markdown">
            <Link size={15} />
          </button>
        </div>

        {/* Toggle de Modo de Vista (Dividido / Edición / Vista Previa) */}
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${viewMode === 'edit' ? 'active' : ''}`}
            onClick={() => setViewMode('edit')}
            title="Solo Editor"
          >
            <Edit3 size={15} />
          </button>
          <button
            className={`toolbar-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
            title="Vista Dividida (Editor + Previsualización)"
          >
            <Columns size={15} />
          </button>
          <button
            className={`toolbar-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setViewMode('preview')}
            title="Solo Previsualización"
          >
            <Eye size={15} />
          </button>
        </div>
      </div>

      {/* Área de Trabajo */}
      <div className="editor-workspace">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <textarea
            ref={textareaRef}
            className="editor-pane"
            value={localContent}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe el contenido de tu nota en formato Markdown..."
          />
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className="preview-pane"
            dangerouslySetInnerHTML={getRenderedHTML()}
          />
        )}
      </div>
    </div>
  );
}
