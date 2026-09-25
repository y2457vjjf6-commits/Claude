import { ChevronDown } from 'lucide-react';
import { Offer } from '../types';
import { OFFER_STATUS_LABELS } from '../lib/offers';
import PopMenu from './PopMenu';

const STATUSY = Object.keys(OFFER_STATUS_LABELS) as Offer['status'][];

interface Props {
  status: Offer['status'];
  onChange: (status: Offer['status']) => void;
  testId: string;
}

/** Status oferty jako pastylka z kropką — kolor niesie stan, nazwa go nazywa. */
export default function StatusMenu({ status, onChange, testId }: Props) {
  return (
    <PopMenu
      testId={testId}
      label="Status oferty"
      className={`status-pill status-${status}`}
      trigger={
        <>
          <span className="status-dot" aria-hidden="true" />
          {OFFER_STATUS_LABELS[status]}
          <ChevronDown className="icon status-caret" aria-hidden="true" />
        </>
      }
      items={STATUSY.map((s) => ({
        key: s,
        label: OFFER_STATUS_LABELS[s],
        klasa: `status-${s}`,
        checked: s === status,
        ikona: <span className="status-dot" aria-hidden="true" />,
        onPick: () => onChange(s)
      }))}
    />
  );
}
