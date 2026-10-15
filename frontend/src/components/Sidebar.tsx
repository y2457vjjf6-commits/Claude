import { ReactElement } from 'react';
import { FileText, Handshake, Settings2, Plus, Sun, Moon, BarChart3, FileSpreadsheet, Table2, Factory, LogOut
} from 'lucide-react';
import { ViewName, UserAccount } from '../types';
import { OPISY_STANOWISK, wolno } from '../lib/auth';

interface Props {
  view: ViewName;
  /** Ile wysłanych ofert czeka na decyzję klienta — licznik przy zakładce */
  offersAwaiting: number;
  /** Ile zleceń jest po terminie albo kończy się dziś */
  ordersOverdue: number;
  /** Zalogowana osoba; null = program bez kont, wszystko widoczne */
  user: UserAccount | null;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onNavigate: (view: ViewName) => void;
  onNewDoc: () => void;
  onNewOffer: () => void;
  onToggleTheme: () => void;
}

function Monogram() {
  return (
    <svg className="lr-mark" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="0" y="0" width="48" height="48" rx="12" fill="var(--accent-solid)" />
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fontFamily="'Archivo Variable', sans-serif"
        fontWeight="700"
        fontStretch="112%"
        fontSize="21"
        letterSpacing="0.5"
        fill="var(--accent-fg)"
      >
        LR
      </text>
    </svg>
  );
}

export default function Sidebar({
  view,
  theme,
  onNavigate,
  onNewDoc,
  onToggleTheme,
  onNewOffer,
  offersAwaiting,
  ordersOverdue,
  user,
  onLogout
}: Props) {
  // W zakładce ofert główny przycisk zakłada ofertę, nie WZ
  const wOfertach = view === 'offers' || view === 'offerEdit';

  // Stanowisko decyduje, co w ogóle widać w menu: warsztatowi nie pokazujemy
  // zakładek, w które i tak nie wejdzie — pusta zakładka myli bardziej niż jej brak.
  const widoczna = (key: ViewName): boolean => {
    if (!user) return true;
    if (key === 'offers') return wolno(user, 'oferty');
    if (key === 'list' || key === 'contractors') return wolno(user, 'dokumenty');
    if (key === 'prices') return wolno(user, 'cennik');
    if (key === 'reports') return wolno(user, 'zestawienia');
    if (key === 'settings') return wolno(user, 'ustawienia');
    return true;
  };

  const navItems: { key: ViewName; label: string; icon: ReactElement }[] = [
    { key: 'list', label: 'Dokumenty WZ', icon: <FileText className="icon" /> },
    { key: 'offers', label: 'Oferty cenowe', icon: <FileSpreadsheet className="icon" /> },
    { key: 'orders', label: 'Zlecenia', icon: <Factory className="icon" /> },
    { key: 'contractors', label: 'Kontrahenci', icon: <Handshake className="icon" /> },
    { key: 'prices', label: 'Cennik', icon: <Table2 className="icon" /> },
    { key: 'reports', label: 'Zestawienia', icon: <BarChart3 className="icon" /> },
    { key: 'settings', label: 'Ustawienia', icon: <Settings2 className="icon" /> }
  ];

  const widoczne = navItems.filter((i) => widoczna(i.key));

  /** Ekran edycji należy do swojej listy — podświetlenie zostaje na zakładce,
   *  z której się tam weszło. */
  const rodzic = (v: ViewName): ViewName =>
    v === 'edit' ? 'list' : v === 'offerEdit' ? 'offers' : v === 'orderEdit' || v === 'board' ? 'orders' : v;

  // Podświetlenie jedzie po LIŚCIE WIDOCZNYCH pozycji, a nie po stałej liście
  // nazw: inaczej po dołożeniu zakładki albo po ukryciu jej przed warsztatem
  // wskazywałoby sąsiada zamiast właściwej.
  const aktywnaPozycja = Math.max(0, widoczne.findIndex((i) => i.key === rodzic(view)));

  return (
    <aside className="sidebar" data-testid="sidebar">
      <div className="brand">
        <Monogram />
        <div className="brand-text">
          <div className="brand-logo">LECHROL</div>
          <div className="brand-sub">Oferty i produkcja</div>
        </div>
      </div>

      <nav className="nav">
        <span className="nav-marker" aria-hidden="true" style={{ ['--nav-i' as string]: aktywnaPozycja }} />
        {widoczne.map((item) => (
          <button
            key={item.key}
            className={'nav-btn' + (rodzic(view) === item.key ? ' active' : '')}
            data-testid={`nav-${item.key}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.icon}
            {item.label}
            {item.key === 'orders' && ordersOverdue > 0 && (
              <span className="nav-badge" data-testid="nav-orders-badge" title="Zlecenia po terminie albo na dziś">
                {ordersOverdue}
              </span>
            )}
            {item.key === 'offers' && offersAwaiting > 0 && (
              <span className="nav-badge" data-testid="nav-offers-badge" title="Wysłane oferty bez decyzji klienta">
                {offersAwaiting}
              </span>
            )}
          </button>
        ))}
      </nav>

      {user && (
        <div className="sidebar-user" data-testid="sidebar-user">
          <span>
            <span className="sidebar-user-name">{user.name || user.login}</span>
            <br />
            {OPISY_STANOWISK[user.role]}
          </span>
          <span className="spacer" />
          <button className="btn btn-small btn-light" data-testid="logout-btn" title="Wyloguj" onClick={onLogout}>
            <LogOut className="icon" />
          </button>
        </div>
      )}

      <div className="sidebar-footer">
        <button
          className="btn btn-ghost theme-toggle"
          data-testid="theme-toggle"
          aria-label="Przełącz jasny/ciemny motyw"
          title="Jasny / ciemny motyw"
          onClick={onToggleTheme}
        >
          {theme === 'light' ? <Moon className="icon" /> : <Sun className="icon" />}
          {theme === 'light' ? 'Ciemny motyw' : 'Jasny motyw'}
        </button>
        {wOfertach ? (
          <button className="btn btn-new-doc" data-testid="sidebar-new-offer-btn" title="Ctrl+N" onClick={onNewOffer}>
            <Plus className="icon" />
            Nowa oferta
          </button>
        ) : (
          <button className="btn btn-new-doc" data-testid="sidebar-new-doc-btn" title="Ctrl+N" onClick={onNewDoc}>
            <Plus className="icon" />
            Nowa WZ
          </button>
        )}
      </div>
    </aside>
  );
}
