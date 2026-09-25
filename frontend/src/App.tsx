import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AskConfirm, Offer, ViewName, WZDocument } from './types';
import { loadState, persistState, DEFAULT_STATE } from './lib/storage';
import { printDocument, savePdfDocument, emailDocument, buildPrintHtml } from './lib/printing';
import { printOffer, savePdfOffer, emailOffer } from './lib/offerActions';
import { buildOfferHtml } from './lib/printingOffer';
import { offerFileName, offersAwaitingReply, parseNumber } from './lib/offers';
import { wzPrefillFromOffer, WzPrefill } from './lib/offerToWz';
import { emailMany, opiszWysylke, printManyDocs, printManyOffers } from './lib/bulk';
import { wzPrintable } from './lib/printing';
import { offerPrintable } from './lib/offerActions';
import OffersView from './views/OffersView';
import OfferEditorView from './views/OfferEditorView';
import { backupInBackground } from './lib/backup';
import ReportsView from './views/ReportsView';
import Sidebar from './components/Sidebar';
import Toast, { ToastState } from './components/Toast';
import ConfirmDialog, { ConfirmRequest } from './components/ConfirmDialog';
import PreviewModal from './components/PreviewModal';
import CommandPalette from './components/CommandPalette';
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
  const [previewDoc, setPreviewDoc] = useState<{ lista: WZDocument[]; idx: number } | null>(null);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [previewOffer, setPreviewOffer] = useState<{ lista: Offer[]; idx: number } | null>(null);
  // Dane przeniesione z oferty do nowej WZ. Licznik zmienia klucz edytora, więc
  // każde przeniesienie otwiera świeży formularz, a zwykła „Nowa WZ” go czyści.
  const [wzPrefill, setWzPrefill] = useState<WzPrefill | null>(null);
  const [wzPrefillSeq, setWzPrefillSeq] = useState(0);
  const [paletaOtwarta, setPaletaOtwarta] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string, isError?: boolean, action?: { label: string; run: () => void }) => {
    const zamknij = () => setToastState(null);
    const opakowane = action ? { label: action.label, run: () => { action.run(); zamknij(); } } : undefined;
    setToastState({ msg, isError: !!isError, key: Date.now(), action: opakowane });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    // na cofnięcie trzeba dać czas: 9 sekund zamiast 3
    toastTimer.current = setTimeout(zamknij, action ? 9000 : isError ? 6000 : 3000);
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

  const markOffer = useCallback(async (offer: Offer, patch: Partial<Offer>) => {
    setState((biezacy) => {
      if (!biezacy) return biezacy;
      const next = {
        ...biezacy,
        offers: biezacy.offers.map((o) => (o.id === offer.id ? { ...o, ...patch } : o))
      };
      persistState(next).then(() => backupInBackground(next));
      return next;
    });
  }, []);

  const openOfferEditor = useCallback((id: string | null) => {
    setEditingOfferId(id);
    setView('offerEdit');
  }, []);

  const openEditor = useCallback((id: string | null) => {
    setWzPrefill(null);
    setEditingDocId(id);
    setView('edit');
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
        ev.preventDefault();
        setPaletaOtwarta((o) => !o);
        return;
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'n') {
        ev.preventDefault();
        // Ctrl+N zakłada to, co pasuje do miejsca, w którym jesteś
        if (view === 'offers' || view === 'offerEdit') openOfferEditor(null);
        else openEditor(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openEditor, openOfferEditor, view]);

  if (!state) return null;

  const toggleTheme = () => {
    const next = structuredClone(state);
    next.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light';
    persist(next);
  };

  // Usunięcie działa od razu, a przez 9 sekund można je cofnąć — szybciej
  // niż potwierdzanie i bezpieczniej, bo ratuje też odruchowe „tak”.
  const deleteOffer = async (offer: Offer, backToList: boolean) => {
    const kopia = structuredClone(offer);
    const next = { ...state, offers: state.offers.filter((o) => o.id !== offer.id) };
    await persist(next);
    if (backToList) setView('offers');
    toast(`Usunięto ofertę dla „${kopia.client}”.`, false, {
      label: 'Cofnij',
      run: () =>
        setState((biezacy) => {
          if (!biezacy || biezacy.offers.some((o) => o.id === kopia.id)) return biezacy;
          const przywrocone = { ...biezacy, offers: [...biezacy.offers, kopia] };
          persistState(przywrocone).then(() => backupInBackground(przywrocone));
          return przywrocone;
        })
    });
  };

  // Przepisanie oferty na nową WZ — pozycje i odbiorca gotowe do sprawdzenia
  const issueWzFromOffer = async (offer: Offer) => {
    if (offer.wzDocumentIds?.length) {
      const ok = await askConfirm(
        `Z tej oferty wystawiono już dokument WZ. Wystawić kolejny dla „${offer.client}”?`,
        { confirmLabel: 'Wystaw kolejną', danger: false }
      );
      if (!ok) return;
    } else if (offer.status !== 'zaakceptowana') {
      const ok = await askConfirm(
        `Oferta dla „${offer.client}” nie jest jeszcze oznaczona jako zaakceptowana. Wystawić z niej WZ?`,
        { confirmLabel: 'Wystaw WZ', danger: false }
      );
      if (!ok) return;
    }
    setWzPrefill(wzPrefillFromOffer(offer, state.contractors));
    setWzPrefillSeq((n) => n + 1);
    setEditingDocId(null);
    setView('edit');
  };

  /* ----------------------- działania na zaznaczonych ----------------------- */

  const printManyDocuments = async (docs: WZDocument[]) => {
    if (await printManyDocs(docs, state.settings, toast)) {
      const kiedy = new Date().toISOString();
      docs.forEach((d) => markDocument(d, { printedAt: kiedy }));
      toast(`Wysłano do drukarki: ${docs.length} dokumentów.`);
    }
  };

  const emailManyDocuments = async (docs: WZDocument[]) => {
    const adresaci = docs.map((d) => d.contractor?.email).filter(Boolean);
    const potwierdzone = await emailConfirm(
      `Wysłać ${docs.length} dokumentów osobnymi wiadomościami?\nAdresaci: ${adresaci.join(', ') || 'brak adresów'}`
    );
    if (!potwierdzone) return;
    const wynik = await emailMany(
      docs,
      state.settings,
      toast,
      (d) => ({ printable: wzPrintable(d, state.settings), nazwa: d.number }),
      (d) => markDocument(d, { emailedAt: new Date().toISOString(), emailedTo: d.contractor?.email || '' })
    );
    const { tekst, blad } = opiszWysylke(wynik);
    toast(tekst, blad);
  };

  const deleteManyDocuments = async (docs: WZDocument[]) => {
    const kopie = docs.map((d) => structuredClone(d));
    const doUsuniecia = new Set(kopie.map((d) => d.id));
    await persist({ ...state, documents: state.documents.filter((d) => !doUsuniecia.has(d.id)) });
    toast(`Usunięto ${kopie.length} dokumentów.`, false, {
      label: 'Cofnij',
      run: () =>
        setState((biezacy) => {
          if (!biezacy) return biezacy;
          const brakujace = kopie.filter((k) => !biezacy.documents.some((d) => d.id === k.id));
          const przywrocone = { ...biezacy, documents: [...biezacy.documents, ...brakujace] };
          persistState(przywrocone).then(() => backupInBackground(przywrocone));
          return przywrocone;
        })
    });
  };

  const printManyOffersFn = async (oferty: Offer[]) => {
    if (await printManyOffers(oferty, state.settings, toast)) {
      const kiedy = new Date().toISOString();
      oferty.forEach((o) => markOffer(o, { printedAt: kiedy }));
      toast(`Wysłano do drukarki: ${oferty.length} ofert.`);
    }
  };

  const emailManyOffers = async (oferty: Offer[]) => {
    const adresaci = oferty.map((o) => o.clientEmail).filter(Boolean);
    const potwierdzone = await emailConfirm(
      `Wysłać ${oferty.length} ofert osobnymi wiadomościami?\nAdresaci: ${adresaci.join(', ') || 'brak adresów'}`
    );
    if (!potwierdzone) return;
    const wynik = await emailMany(
      oferty,
      state.settings,
      toast,
      (o) => ({ printable: offerPrintable(o, state.settings), nazwa: o.client }),
      (o) =>
        markOffer(o, {
          emailedAt: new Date().toISOString(),
          emailedTo: o.clientEmail,
          status: o.status === 'szkic' ? 'wyslana' : o.status
        })
    );
    const { tekst, blad } = opiszWysylke(wynik);
    toast(tekst, blad);
  };

  const deleteManyOffers = async (oferty: Offer[]) => {
    const kopie = oferty.map((o) => structuredClone(o));
    const doUsuniecia = new Set(kopie.map((o) => o.id));
    await persist({ ...state, offers: state.offers.filter((o) => !doUsuniecia.has(o.id)) });
    toast(`Usunięto ${kopie.length} ofert.`, false, {
      label: 'Cofnij',
      run: () =>
        setState((biezacy) => {
          if (!biezacy) return biezacy;
          const brakujace = kopie.filter((k) => !biezacy.offers.some((o) => o.id === k.id));
          const przywrocone = { ...biezacy, offers: [...biezacy.offers, ...brakujace] };
          persistState(przywrocone).then(() => backupInBackground(przywrocone));
          return przywrocone;
        })
    });
  };

  const deleteDocument = async (doc: WZDocument, backToList: boolean) => {
    const kopia = structuredClone(doc);
    const next = { ...state, documents: state.documents.filter((d) => d.id !== doc.id) };
    await persist(next);
    if (backToList) setView('list');
    toast(`Usunięto dokument ${kopia.number}.`, false, {
      label: 'Cofnij',
      run: () =>
        setState((biezacy) => {
          if (!biezacy || biezacy.documents.some((d) => d.id === kopia.id)) return biezacy;
          const przywrocone = { ...biezacy, documents: [...biezacy.documents, kopia] };
          persistState(przywrocone).then(() => backupInBackground(przywrocone));
          return przywrocone;
        })
    });
  };

  return (
    <div className="app-shell" data-testid="app-shell">
      <Sidebar
        view={view}
        theme={state.settings.theme}
        offersAwaiting={offersAwaitingReply(state.offers, parseNumber(state.settings.offerFollowUpDays)).length}
        onNavigate={(v) => setView(v)}
        onNewDoc={() => openEditor(null)}
        onNewOffer={() => openOfferEditor(null)}
        onToggleTheme={toggleTheme}
      />
      <main className="content">
        {view === 'list' && (
          <DocumentsView
            documents={state.documents}
            onEdit={(id) => openEditor(id)}
            onNewDoc={() => openEditor(null)}
            onPreview={(doc, lista) => setPreviewDoc({ lista, idx: lista.indexOf(doc) })}
            onPrintMany={printManyDocuments}
            onEmailMany={emailManyDocuments}
            onDeleteMany={deleteManyDocuments}
            onPrint={async (doc) => {
              if (await printDocument(doc, state.settings, toast)) {
                markDocument(doc, { printedAt: new Date().toISOString() });
              }
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
            key={editingDocId || (wzPrefill ? `z-oferty-${wzPrefillSeq}` : 'nowa')}
            state={state}
            editingDocId={editingDocId}
            prefill={wzPrefill}
            onPersist={persist}
            onSaved={(id) => setEditingDocId(id)}
            onBack={() => setView('list')}
            onDelete={(doc) => deleteDocument(doc, true)}
            toast={toast}
            emailConfirm={emailConfirm}
            onMark={markDocument}
            askConfirm={askConfirm}
          />
        )}
        {view === 'contractors' && (
          <ContractorsView state={state} onPersist={persist} toast={toast} />
        )}
        {view === 'offers' && (
          <OffersView
            offers={state.offers}
            followUpDays={parseNumber(state.settings.offerFollowUpDays)}
            showCosts={state.settings.showCosts !== false}
            onIssueWz={issueWzFromOffer}
            onEdit={(id) => openOfferEditor(id)}
            onNewOffer={() => openOfferEditor(null)}
            onPreview={(offer, lista) => setPreviewOffer({ lista, idx: lista.indexOf(offer) })}
            onPrint={async (offer) => {
              if (await printOffer(offer, state.settings, toast)) {
                markOffer(offer, { printedAt: new Date().toISOString() });
              }
            }}
            onPdf={(offer) => savePdfOffer(offer, state.settings, toast)}
            onPrintMany={printManyOffersFn}
            onEmailMany={emailManyOffers}
            onDeleteMany={deleteManyOffers}
            onEmail={async (offer) => {
              if (await emailOffer(offer, state.settings, toast, emailConfirm)) {
                markOffer(offer, {
                  emailedAt: new Date().toISOString(),
                  emailedTo: offer.clientEmail,
                  status: offer.status === 'szkic' ? 'wyslana' : offer.status
                });
              }
            }}
            onDelete={(offer) => deleteOffer(offer, false)}
            onStatusChange={(offer, status) => markOffer(offer, { status })}
          />
        )}
        {view === 'offerEdit' && (
          <OfferEditorView
            state={state}
            editingOfferId={editingOfferId}
            onPersist={persist}
            onSaved={(id) => setEditingOfferId(id)}
            onBack={() => setView('offers')}
            onDelete={(offer) => deleteOffer(offer, true)}
            onIssueWz={issueWzFromOffer}
            toast={toast}
            emailConfirm={emailConfirm}
            onMark={markOffer}
            askConfirm={askConfirm}
          />
        )}
        {view === 'reports' && <ReportsView state={state} />}
        {view === 'settings' && (
          <SettingsView state={state} onPersist={persist} toast={toast} askConfirm={askConfirm} />
        )}
      </main>
      {paletaOtwarta && (
        <CommandPalette
          state={state}
          onClose={() => setPaletaOtwarta(false)}
          handlers={{
            otworzDokument: (id) => openEditor(id),
            otworzOferte: (id) => openOfferEditor(id),
            idzDo: (v) => setView(v),
            nowaWz: () => openEditor(null),
            nowaOferta: () => openOfferEditor(null)
          }}
        />
      )}
      <Toast toast={toastState} />
      {confirmReq && <ConfirmDialog request={confirmReq} onClose={closeConfirm} />}
      {previewDoc && previewDoc.lista[previewDoc.idx] && (
        <PreviewModal
          title={`Podgląd WZ ${previewDoc.lista[previewDoc.idx].number}`}
          html={buildPrintHtml(previewDoc.lista[previewDoc.idx], state.settings)}
          licznik={`${previewDoc.idx + 1} z ${previewDoc.lista.length}`}
          onClose={() => setPreviewDoc(null)}
          onPrev={previewDoc.idx > 0 ? () => setPreviewDoc((p) => (p ? { ...p, idx: p.idx - 1 } : p)) : undefined}
          onNext={
            previewDoc.idx < previewDoc.lista.length - 1
              ? () => setPreviewDoc((p) => (p ? { ...p, idx: p.idx + 1 } : p))
              : undefined
          }
          onEdit={() => {
            const dok = previewDoc.lista[previewDoc.idx];
            setPreviewDoc(null);
            openEditor(dok.id);
          }}
          onPrint={async () => {
            const dok = previewDoc.lista[previewDoc.idx];
            if (await printDocument(dok, state.settings, toast)) {
              markDocument(dok, { printedAt: new Date().toISOString() });
            }
          }}
          onPdf={() => savePdfDocument(previewDoc.lista[previewDoc.idx], state.settings, toast)}
        />
      )}
      {previewOffer && previewOffer.lista[previewOffer.idx] && (
        <PreviewModal
          title={`Podgląd oferty — ${previewOffer.lista[previewOffer.idx].client}`}
          html={buildOfferHtml(previewOffer.lista[previewOffer.idx], state.settings)}
          licznik={`${previewOffer.idx + 1} z ${previewOffer.lista.length}`}
          onClose={() => setPreviewOffer(null)}
          onPrev={previewOffer.idx > 0 ? () => setPreviewOffer((p) => (p ? { ...p, idx: p.idx - 1 } : p)) : undefined}
          onNext={
            previewOffer.idx < previewOffer.lista.length - 1
              ? () => setPreviewOffer((p) => (p ? { ...p, idx: p.idx + 1 } : p))
              : undefined
          }
          onEdit={() => {
            const of = previewOffer.lista[previewOffer.idx];
            setPreviewOffer(null);
            openOfferEditor(of.id);
          }}
          onPrint={async () => {
            const of = previewOffer.lista[previewOffer.idx];
            if (await printOffer(of, state.settings, toast)) {
              markOffer(of, { printedAt: new Date().toISOString() });
            }
          }}
          onPdf={() => savePdfOffer(previewOffer.lista[previewOffer.idx], state.settings, toast)}
        />
      )}
    </div>
  );
}

export { DEFAULT_STATE };
