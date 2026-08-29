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

function LoginScreen({ offline, onRetry }) {
  return (
    <div className="auth-screen">
      {offline && (
        <div className="offline-banner">
          <span>Sin conexión con el servidor. Esta aplicación requiere estar en línea.</span>
          <button className="btn-primary" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      )}
      <AuthModal isOpen onClose={() => {}} />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="app-loading">
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