import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ViewName, WZDocument } from './types';
import { loadState, persistState, DEFAULT_STATE } from './lib/storage';
import { printDocument, savePdfDocument, emailDocument } from './lib/printing';
import Sidebar from './components/Sidebar';
import Toast, { ToastState } from './components/Toast';
import DocumentsView from './views/DocumentsView';
import EditorView from './views/EditorView';
import ContractorsView from './views/ContractorsView';
import SettingsView from './views/SettingsView';

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [view, setView] = useState<ViewName>('list');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string, isError?: boolean) => {
    setToastState({ msg, isError: !!isError, key: Date.now() });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState(null), isError ? 6000 : 3000);
  }, []);

  const persist = useCallback(async (next: AppState) => {
    setState(next);
    await persistState(next);
  }, []);

  useEffect(() => {
    loadState().then(setState);
  }, []);

  useEffect(() => {
    const theme = state?.settings.theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
  }, [state?.settings.theme]);

  const openEditor = useCallback((id: string | null) => {
    setEditingDocId(id);
    setView('edit');
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'n') {
        ev.preventDefault();
        openEditor(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openEditor]);

  if (!state) return null;

  const toggleTheme = () => {
    const next = structuredClone(state);
    next.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light';
    persist(next);
  };

  const deleteDocument = async (doc: WZDocument, backToList: boolean) => {
    if (!window.confirm(`Usunąć dokument ${doc.number}? Tej operacji nie można cofnąć.`)) return;
    const next = { ...state, documents: state.documents.filter((d) => d.id !== doc.id) };
    await persist(next);
    if (backToList) setView('list');
    toast(`Usunięto dokument ${doc.number}.`);
  };

  return (
    <div className="app-shell" data-testid="app-shell">
      <Sidebar
        view={view}
        theme={state.settings.theme}
        onNavigate={(v) => setView(v)}
        onNewDoc={() => openEditor(null)}
        onToggleTheme={toggleTheme}
      />
      <main className="content">
        {view === 'list' && (
          <DocumentsView
            documents={state.documents}
            onEdit={(id) => openEditor(id)}
            onNewDoc={() => openEditor(null)}
            onPrint={(doc) => printDocument(doc, state.settings, toast)}
            onPdf={(doc) => savePdfDocument(doc, state.settings, toast)}
            onEmail={(doc) => emailDocument(doc, state.settings, toast)}
            onDelete={(doc) => deleteDocument(doc, false)}
          />
        )}
        {view === 'edit' && (
          <EditorView
            state={state}
            editingDocId={editingDocId}
            onPersist={persist}
            onSaved={(id) => setEditingDocId(id)}
            onBack={() => setView('list')}
            onDelete={(doc) => deleteDocument(doc, true)}
            toast={toast}
          />
        )}
        {view === 'contractors' && (
          <ContractorsView state={state} onPersist={persist} toast={toast} />
        )}
        {view === 'settings' && (
          <SettingsView state={state} onPersist={persist} toast={toast} />
        )}
      </main>
      <Toast toast={toastState} />
    </div>
  );
}

export { DEFAULT_STATE };
