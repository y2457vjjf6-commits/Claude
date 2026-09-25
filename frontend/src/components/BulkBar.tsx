import { Printer, Mail, Trash2, X } from 'lucide-react';

interface Props {
  ile: number;
  onPrint: () => void;
  onEmail: () => void;
  onDelete: () => void;
  onClear: () => void;
  rzeczownik: (n: number) => string;
}

/** Pasek działań na zaznaczonych wierszach — pojawia się dopiero, gdy jest co robić. */
export default function BulkBar({ ile, onPrint, onEmail, onDelete, onClear, rzeczownik }: Props) {
  return (
    <div className="bulk-bar" role="region" aria-label="Działania na zaznaczonych" data-testid="bulk-bar">
      <strong data-testid="bulk-count">
        Zaznaczono {ile} {rzeczownik(ile)}
      </strong>
      <span className="spacer" />
      <button className="btn btn-small btn-light" data-testid="bulk-print" onClick={onPrint}>
        <Printer className="icon" />
        Drukuj razem
      </button>
      <button className="btn btn-small btn-light" data-testid="bulk-email" onClick={onEmail}>
        <Mail className="icon" />
        Wyślij e-mailem
      </button>
      <button className="btn btn-small btn-danger" data-testid="bulk-delete" onClick={onDelete}>
        <Trash2 className="icon" />
        Usuń
      </button>
      <button className="btn btn-small btn-ghost" data-testid="bulk-clear" aria-label="Wyczyść zaznaczenie" title="Wyczyść zaznaczenie" onClick={onClear}>
        <X className="icon" />
      </button>
    </div>
  );
}
