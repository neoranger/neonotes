import React, { useState } from 'react';
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
  LogIn,
  RefreshCw,
  Trash2,
  Cloud,
  CloudOff
} from 'lucide-react';

export default function Sidebar({ onOpenAuth, onOpenNewFolder }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    folders,
    activeFolderId,
    setActiveFolderId,
    deleteFolder,
    isOnline,
    syncStatus,
    triggerSync
  } = useNotes();

  return (
    <aside className="sidebar">
      {/* Header del Sidebar con Logo */}
      <div className="sidebar-header">
        <div className="brand-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#grad)" stroke="none" />
            <path d="M7 8h10M7 12h8M7 16h6" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
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

      {/* Árbol de Carpetas */}
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
          {/* Opción Todas las notas */}
          <div
            className={`folder-item ${activeFolderId === null ? 'active' : ''}`}
            onClick={() => setActiveFolderId(null)}
          >
            <div className="folder-item-content">
              <FileText size={18} />
              <span>Todas las Notas</span>
            </div>
          </div>

          {/* Lista de Carpetas del Usuario */}
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

      {/* Footer del Sidebar (Sync & User Controls) */}
      <div className="sidebar-footer">
        {/* Badge de Estado de Sincronización */}
        <div className="sync-badge">
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span>{isOnline ? (syncStatus === 'syncing' ? 'Sincronizando...' : 'Online') : 'Offline (Modo local)'}</span>
          {isOnline && user && (
            <button
              className="toolbar-btn"
              onClick={triggerSync}
              title="Sincronizar ahora"
              style={{ padding: 2, marginLeft: 'auto' }}
            >
              <RefreshCw size={14} className={syncStatus === 'syncing' ? 'spin' : ''} />
            </button>
          )}
        </div>

        {/* Usuario / Sesión */}
        {user ? (
          <div className="user-badge">
            <div className="user-info">
              <div className="avatar">
                {user.username ? user.username[0].toUpperCase() : 'U'}
              </div>
              <div className="user-name">{user.username}</div>
            </div>
            <button className="toolbar-btn" onClick={logout} title="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={onOpenAuth} style={{ width: '100%' }}>
            <LogIn size={16} />
            <span>Iniciar Sesión</span>
          </button>
        )}
      </div>
    </aside>
  );
}
