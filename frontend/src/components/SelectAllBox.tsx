import { useEffect, useRef } from 'react';

interface Props {
  ileZaznaczonych: number;
  ileWszystkich: number;
  onToggle: () => void;
}

/** Pole „zaznacz wszystkie” z trzecim stanem, gdy zaznaczona jest część. */
export default function SelectAllBox({ ileZaznaczonych, ileWszystkich, onToggle }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const wszystkie = ileWszystkich > 0 && ileZaznaczonych === ileWszystkich;

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = ileZaznaczonych > 0 && !wszystkie;
  }, [ileZaznaczonych, wszystkie]);

  return (
    <label className="check-hit">
    <input
      ref={ref}
      type="checkbox"
      className="row-check"
      data-testid="select-all"
      aria-label={wszystkie ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
      checked={wszystkie}
      onChange={onToggle}
    />
    </label>
  );
}
