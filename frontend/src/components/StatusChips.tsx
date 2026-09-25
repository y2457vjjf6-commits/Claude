import { Printer, Mail } from 'lucide-react';
import { formatDateTimePl } from '../lib/printing';

interface Props {
  printedAt?: string;
  emailedAt?: string;
  emailedTo?: string;
}

/** Ślad po wydrukowaniu i wysłaniu dokumentu — z datą w podpowiedzi. */
export default function StatusChips({ printedAt, emailedAt, emailedTo }: Props) {
  if (!printedAt && !emailedAt) return <span className="muted">—</span>;
  return (
    <div className="doc-status">
      {printedAt && (
        <span className="status-chip" title={`Wydrukowano ${formatDateTimePl(printedAt)}`}>
          <Printer className="icon" />
        </span>
      )}
      {emailedAt && (
        <span
          className="status-chip"
          title={`Wysłano ${formatDateTimePl(emailedAt)}${emailedTo ? ' na ' + emailedTo : ''}`}
        >
          <Mail className="icon" />
        </span>
      )}
    </div>
  );
}
