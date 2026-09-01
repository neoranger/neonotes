import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotes } from '../context/NotesContext';
import { useTheme } from '../context/ThemeContext';
import {
  Folder,
  FolderPlus,
  FolderOpen,
  FileText,
  Sun,
  Moon,
  LogOut,
  Trash2
} from 'lucide-react';

export default function Sidebar({ onOpenNewFolder }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    folders,
    activeFolderId,
    setActiveFolderId,
    deleteFolder,
    isOnline,
    syncStatus
  } = useNotes();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-logo">
          <svg className="brand-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <defs>
              <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="55%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <rect x="3" y="3" width="18" height="18" rx="5" fill="url(#brand-grad)" stroke="none" />
            <path d="M7 8h10M7 12h8M7 16h6" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="16.5" cy="15.5" r="2" fill="#38bdf8" stroke="none" />
          </svg>
          <span>NeoNotes</span>
        </div>
        <button
          className="toolbar-btn"
          onClick={toggleTheme}
          title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <span>Carpetas</span>
          <button
            className="toolbar-btn"
            onClick={onOpenNewFolder}
            title="Nueva Carpeta"
          >
            <FolderPlus size={16} />
          </button>
        </div>

        <div className="folder-tree">
          <div
            className={`folder-item ${activeFolderId === null ? 'active' : ''}`}
            onClick={() => setActiveFolderId(null)}
          >
            <div className="folder-item-content">
              <FileText size={18} />
              <span>Todas las Notas</span>
            </div>
          </div>

          {folders.map((folder) => {
            const isActive = activeFolderId === folder.id;
            return (
              <div
                key={folder.id}
                className={`folder-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveFolderId(folder.id)}
              >
                <div className="folder-item-content">
                  {isActive ? <FolderOpen size={18} style={{ color: folder.color }} /> : <Folder size={18} style={{ color: folder.color }} />}
                  <span>{folder.name}</span>
                </div>
                {isActive && (
                  <button
                    className="toolbar-btn"
                    style={{ padding: 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar la carpeta "${folder.name}"?`)) {
                        deleteFolder(folder.id);
                      }
                    }}
                    title="Eliminar carpeta"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="sync-badge">
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span>
            {!isOnline ? 'Sin conexión' : syncStatus === 'syncing' ? 'Guardando...' : 'En línea'}
          </span>
        </div>

        <div className="user-badge">
          <div className="user-info">
            <div className="avatar">
              {user && user.username ? user.username[0].toUpperCase() : 'U'}
            </div>
            <div className="user-name">{user ? user.username : ''}</div>
          </div>
          <button className="toolbar-btn" onClick={logout} title="Cerrar sesión">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}