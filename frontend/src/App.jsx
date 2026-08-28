import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotesProvider } from './context/NotesContext';

import Sidebar from './components/Sidebar';
import NotesList from './components/NotesList';
import Editor from './components/Editor';
import AuthModal from './components/AuthModal';
import FolderModal from './components/FolderModal';

function MainLayout() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenNewFolder={() => setIsFolderOpen(true)}
      />
      <NotesList onOpenAuth={() => setIsAuthOpen(true)} />
      <Editor />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <FolderModal isOpen={isFolderOpen} onClose={() => setIsFolderOpen(false)} />
    </div>
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
