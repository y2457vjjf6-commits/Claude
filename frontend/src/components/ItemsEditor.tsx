import { KeyboardEvent, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { ItemRow } from '../types';

interface Props {
  rows: ItemRow[];
  onSetRow: (rowId: string, patch: Partial<ItemRow>) => void;
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
}

export default function ItemsEditor({ rows, onSetRow, onAddRow, onRemoveRow }: Props) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const focusLast = useRef<boolean>(false);

  useEffect(() => {
    if (!focusLast.current || !bodyRef.current) return;
    focusLast.current = false;
    const trs = bodyRef.current.querySelectorAll('tr');
    const input = trs[trs.length - 1]?.querySelector<HTMLInputElement>('.item-name');
    input?.focus();
  }, [rows.length]);

  const addRow = (): void => {
    focusLast.current = true;
    onAddRow();
  };

  const onKeyDown = (ev: KeyboardEvent<HTMLInputElement>, index: number): void => {
    if (ev.key !== 'Enter') return;
    if (index === rows.length - 1) {
      ev.preventDefault();
      addRow();
    }
  };

  return (
    <>
      <table className="table items-table">
        <thead>
          <tr>
            <th style={{ width: 44 }} className="th-num">Lp.</th>
            <th>Nazwa towaru / opis</th>
            <th style={{ width: 110 }}>Jedn.</th>
            <th style={{ width: 110 }} className="th-num">Ilość</th>
            <th style={{ width: 44 }}></th>
          </tr>
        </thead>
        <tbody ref={bodyRef} data-testid="items-body">
          {rows.map((row, i) => (
            <tr key={row.rowId}>
              <td className="item-lp num">{i + 1}</td>
              <td>
                <input
                  type="text"
                  className="input item-name"
                  data-testid={`item-name-${i}`}
                  aria-label="Nazwa towaru"
                  value={row.name}
                  onChange={(e) => onSetRow(row.rowId, { name: e.target.value })}
                  onKeyDown={(e) => onKeyDown(e, i)}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="input item-unit"
                  data-testid={`item-unit-${i}`}
                  aria-label="Jednostka"
                  value={row.unit}
                  onChange={(e) => onSetRow(row.rowId, { unit: e.target.value })}
                  onKeyDown={(e) => onKeyDown(e, i)}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="input item-qty num"
                  data-testid={`item-qty-${i}`}
                  aria-label="Ilość"
                  value={row.qty}
                  onChange={(e) => onSetRow(row.rowId, { qty: e.target.value })}
                  onKeyDown={(e) => onKeyDown(e, i)}
                />
              </td>
              <td>
                <button
                  className="btn btn-small btn-danger item-remove"
                  data-testid={`item-remove-${i}`}
                  aria-label="Usuń pozycję"
                  title="Usuń pozycję"
                  onClick={() => onRemoveRow(row.rowId)}
                >
                  <X className="icon" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-light" data-testid="add-item-btn" onClick={addRow}>
        <Plus className="icon" />
        Dodaj pozycję <span className="muted">(Enter w ostatnim wierszu)</span>
      </button>
    </>
  );
}
