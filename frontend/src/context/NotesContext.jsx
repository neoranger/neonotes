import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest, getAuthToken } from '../services/api';
import { runLegacyImport } from '../services/migrateLegacy';

const NotesContext = createContext();

const sortNotes = (list) =>
  [...list].sort((a, b) => {
    const pa = a.is_pinned ? 1 : 0;
    const pb = b.is_pinned ? 1 : 0;
    if (pb !== pa) return pb - pa;
    return (b.updated_at || 0) - (a.updated_at || 0);
  });

export function NotesProvider({ children }) {
  const { user, logout } = useAuth();
  const [folders, setFolders] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [externallyUpdatedNoteId, setExternallyUpdatedNoteId] = useState(null);

  const activeNoteIdRef = useRef(activeNoteId);
  useEffect(() => {
    activeNoteIdRef.current = activeNoteId;
  }, [activeNoteId]);

  const allNotesRef = useRef([]);
  const fetchInFlightRef = useRef(false);
  const lastLocalMutationRef = useRef(0);

  const commitAllNotes = useCallback((compute) => {
    const next = typeof compute === 'function' ? compute(allNotesRef.current) : compute;
    const sorted = sortNotes(next);
    allNotesRef.current = sorted;
    setAllNotes(sorted);
  }, []);

  const handleError = useCallback((err) => {
    if (err.status === 401 || err.status === 403) {
      logout();
      return;
    }
    if (!err.status) {
      setIsOnline(false);
    }
    setSyncStatus('error');
    setTimeout(() => setSyncStatus((s) => (s === 'error' ? 'idle' : s)), 4000);
  }, [logout]);

  const fetchData = useCallback(async () => {
    if (!user || fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    setLoading(true);
    try {
      const [fRes, nRes] = await Promise.all([
        apiRequest('/folders'),
        apiRequest('/notes')
      ]);
      setIsOnline(true);
      const serverFolders = fRes.folders || [];
      const serverNotes = nRes.notes || [];
      setFolders(serverFolders);

      const activeId = activeNoteIdRef.current;
      const isLocal = Date.now() - lastLocalMutationRef.current < 1500;
      if (activeId && !isLocal) {
        const prevActive = allNotesRef.current.find((n) => n.id === activeId);
        const newActive = serverNotes.find((n) => n.id === activeId);
        if (prevActive && newActive && (
          Number(prevActive.updated_at) !== Number(newActive.updated_at) ||
          prevActive.title !== newActive.title ||
          prevActive.content !== newActive.content
        )) {
          setExternallyUpdatedNoteId(activeId);
        }
      }

      commitAllNotes(serverNotes);

      setActiveFolderId((prev) => (serverFolders.some((f) => f.id === prev) ? prev : null));
      const currentActiveId = activeNoteIdRef.current;
      const activeExists = serverNotes.some((n) => n.id === currentActiveId);
      if (serverNotes.length > 0 && !activeExists) {
        setActiveNoteId(serverNotes[0].id);
      } else if (serverNotes.length === 0) {
        setActiveNoteId(null);
      }
    } catch (err) {
      handleError(err);
    } finally {
      fetchInFlightRef.current = false;
      setLoading(false);
    }
  }, [user, handleError, commitAllNotes]);

  // Carga inicial + migración única al cambiar de usuario
  useEffect(() => {
    if (!user) {
      setFolders([]);
      commitAllNotes([]);
      setActiveNoteId(null);
      setActiveFolderId(null);
      setExternallyUpdatedNoteId(null);
      setSyncStatus('idle');
      return;
    }
    (async () => {
      setLoading(true);
      if (!localStorage.getItem('neonotes_legacy_imported_v1')) {
        try {
          const importedOk = await runLegacyImport(user.id);
          if (importedOk) {
            localStorage.setItem('neonotes_legacy_imported_v1', '1');
          }
        } catch (e) {
          console.warn('Import de datos locales falló, se reintentará en el próximo inicio de sesión:', e.message);
        }
      }
      await fetchData();
      setLoading(false);
    })();
  }, [user]);

  // Estado online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (user) fetchData();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, fetchData]);

  // Sincronización automática en tiempo real (SSE) + polling de respaldo
  useEffect(() => {
    if (!user) return;
    const token = getAuthToken();

    const refreshIfStale = () => {
      if (!navigator.onLine) return;
      if (Date.now() - lastLocalMutationRef.current < 1500) return;
      if (fetchInFlightRef.current) return;
      fetchData();
    };

    let es = null;
    if (token && typeof EventSource !== 'undefined') {
      es = new EventSource('/api/events?token=' + encodeURIComponent(token));
      es.addEventListener('data_changed', refreshIfStale);
      es.onerror = () => {
        if (!getAuthToken()) es.close();
      };
    }

    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshIfStale();
    }, 60000);

    const onVisible = () => {
      if (!document.hidden) refreshIfStale();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      if (es) es.close();
      clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [user, fetchData]);

  const createFolder = async (name, parentId = null, color = '#6366f1') => {
    if (!user) return null;
    lastLocalMutationRef.current = Date.now();
    setSyncStatus('syncing');
    try {
      const res = await apiRequest('/folders', 'POST', { name, parent_id: parentId, color });
      const folder = res.folder;
      setFolders((prev) => [...prev, folder]);
      setActiveFolderId(folder.id);
      setSyncStatus('idle');
      return folder;
    } catch (err) {
      handleError(err);
      return null;
    }
  };

  const deleteFolder = async (folderId) => {
    if (!user) return;
    lastLocalMutationRef.current = Date.now();
    setSyncStatus('syncing');
    try {
      await apiRequest(`/folders/${folderId}`, 'DELETE');
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      commitAllNotes((prev) => prev.map((n) => (n.folder_id === folderId ? { ...n, folder_id: null } : n)));
      if (activeFolderId === folderId) setActiveFolderId(null);
      setSyncStatus('idle');
    } catch (err) {
      handleError(err);
    }
  };

  const createNote = async (title = 'Nueva Nota', content = '', folderId = activeFolderId) => {
    if (!user) return null;
    lastLocalMutationRef.current = Date.now();
    setSyncStatus('syncing');
    try {
      const res = await apiRequest('/notes', 'POST', {
        title,
        content,
        folder_id: folderId || null,
        tags: [],
        is_pinned: false
      });
      const note = res.note;
      commitAllNotes((prev) => [note, ...prev]);
      setActiveNoteId(note.id);
      setExternallyUpdatedNoteId(null);
      setSyncStatus('idle');
      return note;
    } catch (err) {
      handleError(err);
      return null;
    }
  };

  const updateNote = async (noteId, updates) => {
    if (!user) return;
    const existing = allNotesRef.current.find((n) => n.id === noteId);
    if (!existing) return;

    const optimistic = { ...existing, ...updates, updated_at: Date.now() };
    commitAllNotes((prev) => prev.map((n) => (n.id === noteId ? optimistic : n)));
    setSyncStatus('syncing');
    lastLocalMutationRef.current = Date.now();

    try {
      const res = await apiRequest(`/notes/${noteId}`, 'PUT', updates);
      const serverNote = res.note;
      commitAllNotes((prev) => prev.map((n) => (n.id === noteId ? serverNote : n)));
      setSyncStatus('idle');
    } catch (err) {
      commitAllNotes((prev) => prev.map((n) => (n.id === noteId ? existing : n)));
      handleError(err);
    }
  };

  const deleteNote = async (noteId) => {
    if (!user) return;
    lastLocalMutationRef.current = Date.now();
    const existing = allNotesRef.current.find((n) => n.id === noteId);
    const remaining = allNotesRef.current.filter((n) => n.id !== noteId);
    commitAllNotes(remaining);
    if (activeNoteId === noteId) {
      setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
    }
    setSyncStatus('syncing');
    try {
      await apiRequest(`/notes/${noteId}`, 'DELETE');
      setSyncStatus('idle');
    } catch (err) {
      if (existing) commitAllNotes((prev) => [existing, ...prev]);
      handleError(err);
    }
  };

  const filteredNotes = allNotes
    .filter((note) => {
      const matchesFolder = activeFolderId === null || note.folder_id === activeFolderId;
      const q = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q);
      return matchesFolder && matchesSearch;
    })
    .sort((a, b) => {
      const pa = a.is_pinned ? 1 : 0;
      const pb = b.is_pinned ? 1 : 0;
      if (pb !== pa) return pb - pa;
      return (b.updated_at || 0) - (a.updated_at || 0);
    });

  const activeNote = allNotes.find((n) => n.id === activeNoteId);

  return (
    <NotesContext.Provider value={{
      folders,
      notes: filteredNotes,
      loading,
      activeFolderId,
      setActiveFolderId,
      activeNoteId,
      setActiveNoteId,
      activeNote,
      searchQuery,
      setSearchQuery,
      isOnline,
      syncStatus,
      externallyUpdatedNoteId,
      clearExternalUpdate: () => setExternallyUpdatedNoteId(null),
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