import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AskConfirm, Offer, OfferSpecRow, ProductionOrder, StageEvent, UserAccount, ViewName, WZDocument } from './types';
import { loadState, persistState, uid, DEFAULT_STATE } from './lib/storage';
import { printDocument, savePdfDocument, emailDocument, buildPrintHtml } from './lib/printing';
import { printOffer, savePdfOffer, emailOffer } from './lib/offerActions';
import { buildOfferHtml } from './lib/printingOffer';
import { offerFileName, offersAwaitingReply, parseNumber } from './lib/offers';
import { wzPrefillFromOffer, WzPrefill } from './lib/offerToWz';
import { duplicateOffer } from './lib/offerCopy';
import { todayStr } from './lib/dates';
import { emailMany, opiszWysylke, printManyDocs, printManyOffers } from './lib/bulk';
import { wzPrintable } from './lib/printing';
import { offerPrintable } from './lib/offerActions';
import OffersView from './views/OffersView';
import OfferEditorView from './views/OfferEditorView';
import OrdersView from './views/OrdersView';
import OrderEditorView from './views/OrderEditorView';
import BoardView from './views/BoardView';
import { emptyOrder, etapy, orderFromOffer, overdueOrders, stageEvent } from './lib/production';
import { printOrder } from './lib/orderActions';
import { computeOrderNumberFor } from './lib/numbering';
import LoginView from './views/LoginView';
import { podpis, wolno, wymagaLogowania } from './lib/auth';
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
import PricesView from './views/PricesView';
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
  // Oferta skopiowana do nowej — ta sama sztuczka z licznikiem co przy WZ.
  const [offerPrefill, setOfferPrefill] = useState<Offer | null>(null);
  const [offerPrefillSeq, setOfferPrefillSeq] = useState(0);
  // Schowek na specyfikację. Siedzi tutaj, a nie w edytorze, bo edytor znika
  // przy wyjściu do listy — a skopiowaną specyfikację chce się wkleić także
  // w zupełnie innej ofercie.
  const [schowekSpec, setSchowekSpec] = useState<OfferSpecRow[] | null>(null);
  // Zlecenie otwarte w edytorze. Trzymamy całe, a nie samo id, bo zlecenie
  // zakładane z oferty nie istnieje jeszcze w danych.
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);
  const [paletaOtwarta, setPaletaOtwarta] = useState(false);
  // Kto jest zalogowany. Tylko w pamięci — zamknięcie programu wylogowuje,
  // bo „zostaw mnie zalogowanego" na wspólnym komputerze znosi sens haseł.
  const [zalogowany, setZalogowany] = useState<UserAccount | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Zapis zlecenia bywa wołany z opóźnieniem (autozapis) — musi sięgnąć po
  // dane aktualne w chwili zapisu, a nie te sprzed półtorej sekundy.
  const stateRef = useRef<AppState | null>(null);
  stateRef.current = state;
  const uzytkownikRef = useRef<UserAccount | null>(null);
  // Czy ta sesja ma być za hasłem. Rozstrzygamy raz, przy wczytaniu danych:
  // kto założył pierwsze konto w trakcie pracy, nie zostaje wyrzucony z
  // programu w pół zdania — zamek działa od następnego uruchomienia.
  const bramkaRef = useRef<boolean | null>(null);
  uzytkownikRef.current = zalogowany;

  const toast = useCallback((msg: string, isError?: boolean, action?: { label: string; run: () => void }) => {
    // wygaszenie przez klasę, żeby zdążyło zniknąć płynnie zamiast zgasnąć
    const zamknij = () => {
      setToastState((t) => (t ? { ...t, closing: true } : t));
      setTimeout(() => setToastState(null), 140);
    };
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
    setOfferPrefill(null);
    setEditingOfferId(id);
    setView('offerEdit');
  }, []);

  /* ----------------------------- Produkcja ----------------------------- */

  /** Zapisuje zlecenie i — gdy jest — dopisuje wpis dziennika. Jedna droga dla
   *  obu, żeby zmiana etapu i autozapis tekstu nie wyścigały się o plik.
   *  Zwraca zapisane zlecenie, bo przy pierwszym zapisie dostaje ono numer. */
  const saveOrder = useCallback(
    async (order: ProductionOrder, event?: StageEvent): Promise<ProductionOrder> => {
      const biezacy = stateRef.current;
      if (!biezacy) return order;
      const orders = biezacy.orders || [];
      const nowIso = new Date().toISOString();
      const id = order.id || uid();
      const numer = order.number
        ? { seq: order.seq as number, number: order.number }
        : computeOrderNumberFor(orders, null, order.date);
      const zapisane: ProductionOrder = {
        ...order,
        id,
        seq: numer.seq,
        number: numer.number,
        createdAt: order.createdAt || nowIso,
        updatedAt: nowIso
      };
      const idx = orders.findIndex((o) => o.id === id);
      const nowe = idx >= 0 ? orders.map((o) => (o.id === id ? zapisane : o)) : [...orders, zapisane];
      // Dziennik tylko się dopisuje — stąd bierze się historia i stąd
      // weźmie się bezkolizyjna synchronizacja, gdy przyjdzie jej czas.
      const dziennik = event
        ? [...(biezacy.stageEvents || []), { ...event, orderId: id }]
        : biezacy.stageEvents || [];
      await persist({ ...biezacy, orders: nowe, stageEvents: dziennik });
      return zapisane;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const openOrder = useCallback((order: ProductionOrder) => {
    setEditingOrder(order);
    setView('orderEdit');
  }, []);

  const openOrderById = useCallback((id: string) => {
    const z = stateRef.current?.orders?.find((o) => o.id === id);
    if (z) openOrder(z);
  }, [openOrder]);

  /** Zlecenie z oferty — to samo kliknięcie co „Wystaw WZ", tylko w drugą stronę. */
  const orderFromOfferFn = useCallback(
    (offer: Offer) => {
      const st = stateRef.current;
      if (!st) return;
      openOrder(orderFromOffer(offer, st.settings.stages, todayStr()));
    },
    [openOrder]
  );

  /** Przestawienie etapu z tablicy — zapis natychmiastowy, bez otwierania zlecenia. */
  const advanceOnBoard = useCallback(
    async (order: ProductionOrder, itemId: string, stageId: string) => {
      const it = order.items.find((x) => x.id === itemId);
      if (!it) return;
      const kto = podpis(uzytkownikRef.current, stateRef.current?.settings.issuers?.[0] || '');
      const wpis = stageEvent(order, it, stageId, kto, it.note);
      await saveOrder(
        { ...order, items: order.items.map((x) => (x.id === itemId ? { ...x, stageId } : x)) },
        wpis
      );
    },
    [saveOrder]
  );

  /** Kopiuje ofertę do nowej: ta sama treść, własny numer przy zapisie.
   *  Nic nie zapisujemy od razu — dopóki użytkownik nie kliknie „Zapisz",
   *  w danych jest tylko oferta źródłowa, nietknięta. */
  const copyOfferToNew = useCallback((zrodlo: Offer) => {
    setOfferPrefill(duplicateOffer(zrodlo, todayStr()));
    setOfferPrefillSeq((n) => n + 1);
    setEditingOfferId(null);
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
        if (!wolno(uzytkownikRef.current, 'oferty') && !wolno(uzytkownikRef.current, 'dokumenty')) return;
        if (view === 'offers' || view === 'offerEdit') openOfferEditor(null);
        else openEditor(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openEditor, openOfferEditor, view]);

  if (!state) return null;
  if (bramkaRef.current === null) bramkaRef.current = wymagaLogowania(state);

  // Bramka logowania. Program bez kont działa jak dotąd — zamek pojawia się
  // dopiero wtedy, gdy ktoś założy pierwsze konto.
  const widokDozwolony = (v: ViewName): boolean => {
    if (!zalogowany) return true;
    if (v === 'offers' || v === 'offerEdit') return wolno(zalogowany, 'oferty');
    if (v === 'list' || v === 'edit' || v === 'contractors') return wolno(zalogowany, 'dokumenty');
    if (v === 'prices') return wolno(zalogowany, 'cennik');
    if (v === 'reports') return wolno(zalogowany, 'zestawienia');
    if (v === 'settings') return wolno(zalogowany, 'ustawienia');
    return true;
  };

  // Gdy ktoś trafi na ekran, na który nie ma prawa — skrótem klawiszowym albo
  // paletą poleceń — pokazujemy zlecenia, a nie pustą stronę.
  const widok: ViewName = widokDozwolony(view) ? view : 'orders';

  if (bramkaRef.current && !zalogowany) {
    return (
      <>
        <LoginView
          state={state}
          onLogin={(u) => {
            setZalogowany(u);
            // Ostatnie logowanie zapisujemy, żeby było widać konta nieużywane
            void persist({
              ...state,
              users: (state.users || []).map((x) =>
                x.id === u.id ? { ...x, lastLoginAt: new Date().toISOString() } : x
              )
            });
            if (!wolno(u, 'oferty')) setView('orders');
          }}
          onCreateOwner={async (u) => {
            await persist({ ...state, users: [...(state.users || []), u] });
            setZalogowany(u);
          }}
        />
        <Toast toast={toastState} />
      </>
    );
  }

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
        ordersOverdue={overdueOrders(state.orders || [], state.settings.stages, todayStr()).length}
        user={zalogowany}
        onLogout={() => {
          setZalogowany(null);
          setView('list');
        }}
        onNavigate={(v) => setView(v)}
        onNewDoc={() => openEditor(null)}
        onNewOffer={() => openOfferEditor(null)}
        onToggleTheme={toggleTheme}
      />
      <main className="content">
        <div className="view-swap" key={widok}>
        {widok === 'list' && (
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
        {widok === 'edit' && (
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
        {widok === 'contractors' && (
          <ContractorsView state={state} onPersist={persist} toast={toast} />
        )}
        {widok === 'prices' && <PricesView state={state} />}
        {widok === 'offers' && (
          <OffersView
            offers={state.offers}
            followUpDays={parseNumber(state.settings.offerFollowUpDays)}
            showCosts={state.settings.showCosts !== false}
            onIssueWz={issueWzFromOffer}
            onEdit={(id) => openOfferEditor(id)}
            onNewOffer={() => openOfferEditor(null)}
            onCopy={copyOfferToNew}
            onProduce={orderFromOfferFn}
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
        {widok === 'offerEdit' && (
          <OfferEditorView
            key={editingOfferId || (offerPrefill ? `kopia-${offerPrefillSeq}` : 'nowa')}
            state={state}
            editingOfferId={editingOfferId}
            prefill={offerPrefill}
            specClipboard={schowekSpec}
            onSpecClipboard={setSchowekSpec}
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
        {widok === 'orders' && (
          <OrdersView
            orders={state.orders || []}
            stages={etapy(state.settings.stages)}
            events={state.stageEvents || []}
            onEdit={openOrderById}
            canEdit={wolno(zalogowany, 'zlecenia-edycja')}
            onNew={() => openOrder(emptyOrder(state.settings.stages, todayStr()))}
            onBoard={() => setView('board')}
            onPrint={(o) => void printOrder(o, state.settings, toast)}
            onDelete={async (o) => {
              const ok = await askConfirm(
                `Usunąć zlecenie ${o.number || ''} dla: ${o.client}? Historia etapów zniknie razem z nim.`,
                { confirmLabel: 'Usuń', danger: true }
              );
              if (!ok) return;
              await persist({
                ...state,
                orders: (state.orders || []).filter((x) => x.id !== o.id),
                stageEvents: (state.stageEvents || []).filter((e) => e.orderId !== o.id)
              });
              toast('Zlecenie usunięte.');
            }}
          />
        )}
        {widok === 'orderEdit' && editingOrder && (
          <OrderEditorView
            key={editingOrder.id || 'nowe'}
            state={state}
            order={editingOrder}
            onSave={saveOrder}
            onBack={() => setView('orders')}
            onPrint={(o) => void printOrder(o, state.settings, toast)}
            toast={toast}
            readOnly={!wolno(zalogowany, 'zlecenia-edycja')}
          />
        )}
        {widok === 'board' && (
          <BoardView
            orders={state.orders || []}
            stages={etapy(state.settings.stages)}
            onBack={() => setView('orders')}
            onOpen={(id) => openOrderById(id)}
            onAdvance={(o, itemId, stageId) => void advanceOnBoard(o, itemId, stageId)}
          />
        )}
        {widok === 'reports' && <ReportsView state={state} />}
        {widok === 'settings' && (
          <SettingsView
            state={state}
            currentUser={zalogowany}
            onPersist={persist}
            toast={toast}
            askConfirm={askConfirm}
          />
        )}
        </div>
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
