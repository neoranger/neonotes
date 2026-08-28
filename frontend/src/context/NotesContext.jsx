import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getLocalFolders, saveLocalFolder, getLocalNotes, saveLocalNote } from '../services/db';
import { performSync } from '../services/syncEngine';

const NotesContext = createContext();

export function NotesProvider({ children }) {
  const { user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');

  // Monitor de estado de conexión a red
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Carga inicial de datos desde IndexedDB
  const loadLocalData = useCallback(async () => {
    if (!user) {
      setFolders([]);
      setNotes([]);
      setActiveNoteId(null);
      return;
    }
    const localF = await getLocalFolders(user.id);
    const localN = await getLocalNotes(user.id);
    setFolders(localF);
    setNotes(localN);

    if (localN.length > 0 && !activeNoteId) {
      setActiveNoteId(localN[0].id);
    }
  }, [user]);

  // Función de Sincronización
  const triggerSync = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    setSyncStatus('syncing');
    const result = await performSync(user.id);
    if (result.success) {
      setSyncStatus('success');
      await loadLocalData();
      setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  }, [user, loadLocalData]);

  // Inicializar datos cuando el usuario cambia
  useEffect(() => {
    loadLocalData().then(() => {
      if (navigator.onLine) {
        triggerSync();
      }
    });
  }, [user, loadLocalData, triggerSync]);

  // Operaciones de Carpetas
  const createFolder = async (name, parentId = null, color = '#6366f1') => {
    if (!user) return;
    const newFolder = {
      id: crypto.randomUUID(),
      user_id: user.id,
      name,
      parent_id: parentId,
      color,
      created_at: Date.now(),
      updated_at: Date.now(),
      is_deleted: false
    };

    await saveLocalFolder(newFolder);
    setFolders(prev => [...prev, newFolder]);
    setActiveFolderId(newFolder.id);

    if (navigator.onLine) triggerSync();
  };

  const deleteFolder = async (folderId) => {
    if (!user) return;
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const updatedFolder = { ...folder, is_deleted: true, updated_at: Date.now() };
    await saveLocalFolder(updatedFolder);

    // Mover notas de la carpeta eliminada a la raíz
    const affectedNotes = notes.filter(n => n.folder_id === folderId);
    for (const note of affectedNotes) {
      const updatedNote = { ...note, folder_id: null, updated_at: Date.now() };
      await saveLocalNote(updatedNote);
    }

    setFolders(prev => prev.filter(f => f.id !== folderId));
    setNotes(prev => prev.map(n => (n.folder_id === folderId ? { ...n, folder_id: null } : n)));
    if (activeFolderId === folderId) setActiveFolderId(null);

    if (navigator.onLine) triggerSync();
  };

  // Operaciones de Notas
  const createNote = async (title = 'Nueva Nota', content = '', folderId = activeFolderId) => {
    if (!user) return;
    const newNote = {
      id: crypto.randomUUID(),
      user_id: user.id,
      folder_id: folderId,
      title,
      content,
      tags: [],
      is_pinned: false,
      created_at: Date.now(),
      updated_at: Date.now(),
      is_deleted: false
    };

    await saveLocalNote(newNote);
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);

    if (navigator.onLine) triggerSync();
    return newNote;
  };

  // Timer para diferir la sincronización de red en segundo plano (2.5s después de dejar de escribir)
  const debouncedSyncRef = useRef(null);
  const scheduleSync = useCallback(() => {
    if (!navigator.onLine) return;
    if (debouncedSyncRef.current) clearTimeout(debouncedSyncRef.current);
    debouncedSyncRef.current = setTimeout(() => {
      triggerSync();
    }, 2500);
  }, [triggerSync]);

  const updateNote = async (noteId, updates) => {
    if (!user) return;
    const existing = notes.find(n => n.id === noteId);
    if (!existing) return;

    const updatedNote = {
      ...existing,
      ...updates,
      updated_at: Date.now()
    };

    await saveLocalNote(updatedNote);
    setNotes(prev => prev.map(n => (n.id === noteId ? updatedNote : n)));

    scheduleSync();
  };

  const deleteNote = async (noteId) => {
    if (!user) return;
    const existing = notes.find(n => n.id === noteId);
    if (!existing) return;

    const updatedNote = { ...existing, is_deleted: true, updated_at: Date.now() };
    await saveLocalNote(updatedNote);

    const remainingNotes = notes.filter(n => n.id !== noteId);
    setNotes(remainingNotes);

    if (activeNoteId === noteId) {
      setActiveNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
    }

    if (navigator.onLine) triggerSync();
  };

  // Filtrado de Notas por carpeta y búsqueda
  const filteredNotes = notes.filter(note => {
    if (note.is_deleted) return false;
    const matchesFolder = activeFolderId === null || note.folder_id === activeFolderId;
    const matchesSearch = searchQuery === '' ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const activeNote = notes.find(n => n.id === activeNoteId && !n.is_deleted);

  return (
    <NotesContext.Provider value={{
      folders,
      notes: filteredNotes,
      activeFolderId,
      setActiveFolderId,
      activeNoteId,
      setActiveNoteId,
      activeNote,
      searchQuery,
      setSearchQuery,
      isOnline,
      syncStatus,
      triggerSync,
      createFolder,
      deleteFolder,
      createNote,
      updateNote,
      deleteNote
    }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  return useContext(NotesContext);
}
