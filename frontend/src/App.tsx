import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AskConfirm, ViewName, WZDocument } from './types';
import { loadState, persistState, DEFAULT_STATE } from './lib/storage';
import { printDocument, savePdfDocument, emailDocument } from './lib/printing';
import { backupInBackground } from './lib/backup';
import ReportsView from './views/ReportsView';
import Sidebar from './components/Sidebar';
import Toast, { ToastState } from './components/Toast';
import ConfirmDialog, { ConfirmRequest } from './components/ConfirmDialog';
import PreviewModal from './components/PreviewModal';
import DocumentsView from './views/DocumentsView';
import EditorView from './views/EditorView';
import ContractorsView from './views/ContractorsView';
import SettingsView from './views/SettingsView';

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [view, setView] = useState<ViewName>('list');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const [previewDoc, setPreviewDoc] = useState<WZDocument | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string, isError?: boolean) => {
    setToastState({ msg, isError: !!isError, key: Date.now() });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState(null), isError ? 6000 : 3000);
  }, []);

  const persist = useCallback(async (next: AppState) => {
    setState(next);
    await persistState(next);
    backupInBackground(next);
  }, []);

  // Odnotowanie, że dokument został wydrukowany albo wysłany — ślad widoczny na liście
  const markDocument = useCallback(
    async (doc: WZDocument, patch: Partial<WZDocument>) => {
      setState((biezacy) => {
        if (!biezacy) return biezacy;
        const next = {
          ...biezacy,
          documents: biezacy.documents.map((d) => (d.id === doc.id ? { ...d, ...patch } : d))
        };
        persistState(next).then(() => backupInBackground(next));
        return next;
      });
    },
    []
  );

  const askConfirm = useCallback<AskConfirm>(
    (message, opts) =>
      new Promise<boolean>((resolve) =>
        setConfirmReq({
          message,
          confirmLabel: opts?.confirmLabel || 'Usuń',
          danger: opts?.danger ?? true,
          resolve
        })
      ),
    []
  );

  const closeConfirm = useCallback((value: boolean) => {
    setConfirmReq((req) => {
      req?.resolve(value);
      return null;
    });
  }, []);

  const emailConfirm = useCallback(
    (message: string) => askConfirm(message, { confirmLabel: 'Wyślij', danger: false }),
    [askConfirm]
  );

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
    if (!(await askConfirm(`Usunąć dokument ${doc.number}? Tej operacji nie można cofnąć.`))) return;
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
            onPreview={(doc) => setPreviewDoc(doc)}
            onPrint={async (doc) => {
              await printDocument(doc, state.settings, toast);
              markDocument(doc, { printedAt: new Date().toISOString() });
            }}
            onPdf={(doc) => savePdfDocument(doc, state.settings, toast)}
            onEmail={async (doc) => {
              const wyslano = await emailDocument(doc, state.settings, toast, emailConfirm);
              if (wyslano) {
                markDocument(doc, { emailedAt: new Date().toISOString(), emailedTo: doc.contractor?.email || '' });
              }
            }}
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
            onMark={markDocument}
          />
        )}
        {view === 'contractors' && (
          <ContractorsView state={state} onPersist={persist} toast={toast} askConfirm={askConfirm} />
        )}
        {view === 'reports' && <ReportsView state={state} />}
        {view === 'settings' && (
          <SettingsView state={state} onPersist={persist} toast={toast} askConfirm={askConfirm} />
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

export { DEFAULT_STATE };
