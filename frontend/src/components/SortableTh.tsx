import { CSSProperties } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { SortState } from '../lib/listing';

interface Props {
  label: string;
  /** Klucz kolumny — ten sam, którego używa funkcja odczytu wartości */
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  className?: string;
  style?: CSSProperties;
  testId?: string;
}

/** Nagłówek kolumny, po którym można sortować. Strzałka pokazuje kierunek,
 *  a czytnik ekranu dostaje aria-sort. */
export default function SortableTh({ label, sortKey, sort, onSort, className, style, testId }: Props) {
  const aktywna = sort.key === sortKey;
  const kierunek = aktywna ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const Strzalka = aktywna ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <th className={className} style={style} aria-sort={kierunek}>
      <button
        type="button"
        className={'th-sort' + (aktywna ? ' active' : '')}
        data-testid={testId || `sort-${sortKey}`}
        onClick={() => onSort(sortKey)}
        title={`Sortuj: ${label}`}
      >
        <span>{label}</span>
        <Strzalka className="icon th-sort-icon" aria-hidden="true" />
      </button>
    </th>
  );
}
