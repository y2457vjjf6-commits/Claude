import { useCallback, useEffect, useState } from 'react';
import { AppState, ViewName, WZDocument } from './types';
import { loadState, persistState } from './lib/storage';
import { printDocument, savePdfDocument, emailDocument } from './lib/printing';
import { useToastMessage } from './hooks/useToastMessage';
import { useConfirm } from './hooks/useConfirm';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import PreviewModal from './components/PreviewModal';
import DocumentsView from './views/DocumentsView';
import EditorView from './views/EditorView';
import ContractorsView from './views/ContractorsView';
import SettingsView from './views/SettingsView';

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [view, setView] = useState<ViewName>('list');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<WZDocument | null>(null);
  const { toastState, toast } = useToastMessage();
  const { confirmReq, askConfirm, closeConfirm } = useConfirm();

  const persist = useCallback(async (next: AppState): Promise<void> => {
    setState(next);
    await persistState(next);
  }, []);

  const emailConfirm = useCallback(
    (message: string): Promise<boolean> => askConfirm(message, { confirmLabel: 'Wyślij', danger: false }),
    [askConfirm]
  );

  useEffect(() => {
    loadState().then(setState);
  }, []);

  const theme = state?.settings.theme === 'dark' ? 'dark' : 'light';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const openEditor = useCallback((id: string | null): void => {
    setEditingDocId(id);
    setView('edit');
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent): void => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'n') {
        ev.preventDefault();
        openEditor(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openEditor]);

  if (!state) return null;

  const toggleTheme = (): void => {
    const next = structuredClone(state);
    next.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light';
    persist(next);
  };

  const deleteDocument = async (doc: WZDocument, backToList: boolean): Promise<void> => {
    if (!(await askConfirm(`Usunąć dokument ${doc.number}? Tej operacji nie można cofnąć.`))) return;
    const next: AppState = { ...state, documents: state.documents.filter((d) => d.id !== doc.id) };
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
            onPreview={(doc) => setPreviewDoc(doc)}
            onPrint={(doc) => printDocument(doc, state.settings, toast)}
            onPdf={(doc) => savePdfDocument(doc, state.settings, toast)}
            onEmail={(doc) => emailDocument(doc, state.settings, toast, emailConfirm)}
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
            emailConfirm={emailConfirm}
          />
        )}
        {view === 'contractors' && (
          <ContractorsView state={state} onPersist={persist} toast={toast} askConfirm={askConfirm} />
        )}
        {view === 'settings' && (
          <SettingsView state={state} onPersist={persist} toast={toast} />
        )}
      </main>
      <Toast toast={toastState} />
      {confirmReq && <ConfirmDialog request={confirmReq} onClose={closeConfirm} />}
      {previewDoc && (
        <PreviewModal
          doc={previewDoc}
          settings={state.settings}
          onClose={() => setPreviewDoc(null)}
          onPrint={(doc) => printDocument(doc, state.settings, toast)}
          onPdf={(doc) => savePdfDocument(doc, state.settings, toast)}
        />
      )}
    </div>
  );
}
