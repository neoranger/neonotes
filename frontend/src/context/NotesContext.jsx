import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getLocalFolders, saveLocalFolder, getLocalNotes, saveLocalNote, initLocalDB } from '../services/db';
import { performSync } from '../services/syncEngine';
import { generateUUID } from '../utils/uuid';

const NotesContext = createContext();
const GUEST_USER_ID = 'guest_local_user';

export function NotesProvider({ children }) {
  const { user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');

  const activeNoteIdRef = useRef(activeNoteId);
  useEffect(() => {
    activeNoteIdRef.current = activeNoteId;
  }, [activeNoteId]);

  const currentUserId = user ? user.id : GUEST_USER_ID;

  // Monitor de estado de conexión a red
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (user) triggerSync();
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
    const targetId = user ? user.id : GUEST_USER_ID;

    // Adopción segura: solo datos huérfanos o del modo invitado se asignan al usuario actual.
    // Nunca se adoptan registros pertenecientes a otra cuenta real en este navegador.
    if (user) {
      const db = await initLocalDB();
      const allFolders = await db.getAll('folders');
      const allNotes = await db.getAll('notes');

      const isOrphan = (item) =>
        !item.user_id || item.user_id === GUEST_USER_ID || item.user_id === 'undefined' || item.user_id === 'null';

      for (const gf of allFolders) {
        if (isOrphan(gf)) {
          await saveLocalFolder({ ...gf, user_id: user.id, updated_at: Date.now() });
        }
      }
      for (const gn of allNotes) {
        if (isOrphan(gn)) {
          await saveLocalNote({ ...gn, user_id: user.id, updated_at: Date.now() });
        }
      }
    }

    const localF = await getLocalFolders(targetId);
    const localN = await getLocalNotes(targetId);
    setFolders(localF);
    setNotes(localN);

    if (localN.length > 0) {
      const currentActiveId = activeNoteIdRef.current;
      const activeExists = localN.some(n => n.id === currentActiveId);
      if (!activeExists) {
        setActiveNoteId(localN[0].id);
      }
    } else {
      setActiveNoteId(null);
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
      if (user && navigator.onLine) {
        triggerSync();
      }
    });
  }, [user, loadLocalData, triggerSync]);

  // Operaciones de Carpetas
  const createFolder = async (name, parentId = null, color = '#6366f1') => {
    const newFolder = {
      id: generateUUID(),
      user_id: currentUserId,
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

    if (user && navigator.onLine) triggerSync();
  };

  const deleteFolder = async (folderId) => {
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

    if (user && navigator.onLine) triggerSync();
  };

  // Operaciones de Notas
  const createNote = async (title = 'Nueva Nota', content = '', folderId = activeFolderId) => {
    const newNote = {
      id: generateUUID(),
      user_id: currentUserId,
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

    if (user && navigator.onLine) triggerSync();
    return newNote;
  };

  // Timer para diferir la sincronización de red en segundo plano
  const debouncedSyncRef = useRef(null);
  const scheduleSync = useCallback(() => {
    if (!user || !navigator.onLine) return;
    if (debouncedSyncRef.current) clearTimeout(debouncedSyncRef.current);
    debouncedSyncRef.current = setTimeout(() => {
      triggerSync();
    }, 2500);
  }, [user, triggerSync]);

  const updateNote = async (noteId, updates) => {
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
    const existing = notes.find(n => n.id === noteId);
    if (!existing) return;

    const updatedNote = { ...existing, is_deleted: true, updated_at: Date.now() };
    await saveLocalNote(updatedNote);

    const remainingNotes = notes.filter(n => n.id !== noteId);
    setNotes(remainingNotes);

    if (activeNoteId === noteId) {
      setActiveNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
    }

    if (user && navigator.onLine) triggerSync();
  };

  // Filtrado de Notas por carpeta y búsqueda (fijadas primero, luego por actualización)
  const filteredNotes = notes
    .filter(note => {
      if (note.is_deleted) return false;
      const matchesFolder = activeFolderId === null || note.folder_id === activeFolderId;
      const matchesSearch = searchQuery === '' ||
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFolder && matchesSearch;
    })
    .sort((a, b) => {
      if (b.is_pinned !== a.is_pinned) return b.is_pinned - a.is_pinned;
      return b.updated_at - a.updated_at;
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
