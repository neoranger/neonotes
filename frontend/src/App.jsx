import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotesProvider } from './context/NotesContext';

import Sidebar from './components/Sidebar';
import NotesList from './components/NotesList';
import Editor from './components/Editor';
import AuthModal from './components/AuthModal';
import FolderModal from './components/FolderModal';
import MobileTabBar from './components/MobileTabBar';

function BrandMark() {
  return (
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
  );
}

function LoginScreen({ offline, onRetry }) {
  return (
    <div className="auth-screen">
      <div className="auth-decoration" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>

      {offline && (
        <div className="offline-banner">
          <span>Sin conexión con el servidor. Esta aplicación requiere estar en línea.</span>
          <button className="btn-primary" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      )}

      <div className="auth-brand">
        <BrandMark />
        <h1>NeoNotes</h1>
        <p>Notas Markdown · Sync en tiempo real · Modo offline</p>
      </div>

      <AuthModal isOpen onClose={() => {}} />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="app-loading">
      <BrandMark />
      <div className="spinner" />
      <span>Cargando...</span>
    </div>
  );
}

function MainLayout() {
  const { user, loading, offline, retryAuth } = useAuth();
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('notes');

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen offline={offline} onRetry={retryAuth} />;
  }

  return (
    <>
      <div className={`app-container mobile-tab-${mobileTab}`}>
        <Sidebar onOpenNewFolder={() => setIsFolderOpen(true)} />
        <NotesList onOpenNote={() => setMobileTab('editor')} />
        <Editor />
        <FolderModal isOpen={isFolderOpen} onClose={() => setIsFolderOpen(false)} />
      </div>
      <MobileTabBar active={mobileTab} onChange={setMobileTab} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotesProvider>
          <MainLayout />
        </NotesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}