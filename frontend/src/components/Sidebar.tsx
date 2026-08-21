import { ReactElement } from 'react';
import { FileText, Handshake, Settings2, Plus, Sun, Moon, BarChart3 } from 'lucide-react';
import { ViewName } from '../types';

interface Props {
  view: ViewName;
  theme: 'light' | 'dark';
  onNavigate: (view: ViewName) => void;
  onNewDoc: () => void;
  onToggleTheme: () => void;
}

function Monogram() {
  return (
    <svg className="lr-mark" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="0" y="0" width="48" height="48" rx="12" fill="var(--primary)" />
      <text
        x="24"
        y="33.5"
        textAnchor="middle"
        fontFamily="'Geist Sans', sans-serif"
        fontWeight="800"
        fontSize="24"
        letterSpacing="-1"
        fill="#FBF4E8"
      >
        LR
      </text>
      <g fill="var(--primary)">
        {[13, 17, 21, 25, 29, 33].map((y) => (
          <rect key={y} x="8" y={y} width="32" height="1.6" />
        ))}
      </g>
    </svg>
  );
}

export default function Sidebar({ view, theme, onNavigate, onNewDoc, onToggleTheme }: Props) {
  const navItems: { key: ViewName; label: string; icon: ReactElement }[] = [
    { key: 'list', label: 'Dokumenty WZ', icon: <FileText className="icon" /> },
    { key: 'contractors', label: 'Kontrahenci', icon: <Handshake className="icon" /> },
    { key: 'reports', label: 'Zestawienia', icon: <BarChart3 className="icon" /> },
    { key: 'settings', label: 'Ustawienia', icon: <Settings2 className="icon" /> }
  ];

  return (
    <aside className="sidebar" data-testid="sidebar">
      <div className="brand">
        <Monogram />
        <div className="brand-text">
          <div className="brand-logo">LECHROL</div>
          <div className="brand-sub">Wydania zewnętrzne (WZ)</div>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={'nav-btn' + (view === item.key || (item.key === 'list' && view === 'edit') ? ' active' : '')}
            data-testid={`nav-${item.key}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

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
        <button className="btn btn-primary btn-new-doc" data-testid="sidebar-new-doc-btn" title="Ctrl+N" onClick={onNewDoc}>
          <Plus className="icon" />
          Nowa WZ
        </button>
        <div className="slat-texture" aria-hidden="true" />
      </div>
    </aside>
  );
}
