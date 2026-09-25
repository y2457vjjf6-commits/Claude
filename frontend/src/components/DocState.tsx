import { formatDateTimePl } from '../lib/printing';

interface Props {
  printedAt?: string;
  emailedAt?: string;
  emailedTo?: string;
}

/** Stan dokumentu słowem, nie zagadką: dwie identyczne szare ikonki nie mówią
 *  nic, dopóki się na nie nie najedzie. Szczegóły zostają w podpowiedzi. */
export default function DocState({ printedAt, emailedAt, emailedTo }: Props) {
  if (emailedAt) {
    const opis = [
      `Wysłano ${formatDateTimePl(emailedAt)}${emailedTo ? ' na ' + emailedTo : ''}`,
      printedAt ? `Wydrukowano ${formatDateTimePl(printedAt)}` : ''
    ]
      .filter(Boolean)
      .join('\n');
    return (
      <span className="state-pill state-sent" title={opis} data-testid="state-sent">
        <span className="status-dot" aria-hidden="true" />
        Wysłano
      </span>
    );
  }
  if (printedAt) {
    return (
      <span className="state-pill state-printed" title={`Wydrukowano ${formatDateTimePl(printedAt)}`} data-testid="state-printed">
        <span className="status-dot" aria-hidden="true" />
        Wydruk
      </span>
    );
  }
  return <span className="muted" data-testid="state-none">—</span>;
}
