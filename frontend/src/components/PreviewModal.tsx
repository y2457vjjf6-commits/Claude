import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Printer, FileDown, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  /** Tytuł okna, np. „Podgląd WZ 1001/RS/2026” */
  title: string;
  /** Gotowy dokument w HTML (szablon wydruku) */
  html: string;
  onClose: () => void;
  onPrint: () => void;
  onPdf: () => void;
  /** Przejście do edycji oglądanego dokumentu */
  onEdit?: () => void;
  /** Sąsiednie dokumenty z tej samej listy */
  onPrev?: () => void;
  onNext?: () => void;
  /** np. „3 z 15” */
  licznik?: string;
}

export default function PreviewModal({ title, html, onClose, onPrint, onPdf, onEdit, onPrev, onNext, licznik }: Props) {
  // z której strony wjeżdża kolejna kartka — ruch niesie kierunek wędrówki po liście
  const [kierunek, setKierunek] = useState<'dalej' | 'wstecz' | null>(null);
  const poprzedniTytul = useRef(title);

  const dalej = useCallback(() => {
    setKierunek('dalej');
    onNext?.();
  }, [onNext]);

  const wstecz = useCallback(() => {
    setKierunek('wstecz');
    onPrev?.();
  }, [onPrev]);

  useEffect(() => {
    poprzedniTytul.current = title;
  }, [title]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
      // strzałki kartkują listę bez zamykania podglądu
      if (ev.key === 'ArrowRight' && onNext) {
        ev.preventDefault();
        dalej();
      }
      if (ev.key === 'ArrowLeft' && onPrev) {
        ev.preventDefault();
        wstecz();
      }
      if (ev.key === 'Enter' && onEdit) {
        ev.preventDefault();
        onEdit();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrev, onEdit, dalej, wstecz]);

  return (
    <div className="modal-overlay" data-testid="preview-overlay" onClick={onClose}>
      <div className="preview-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="preview-toolbar">
          <h2 className="preview-title" data-testid="preview-title">
            {title}
          </h2>

          {licznik && (
            <div className="preview-nav">
              <button
                className="btn btn-small btn-light"
                data-testid="preview-prev"
                aria-label="Poprzedni dokument"
                title="Poprzedni (←)"
                disabled={!onPrev}
                onClick={wstecz}
              >
                <ChevronLeft className="icon" />
              </button>
              <span className="preview-counter num" data-testid="preview-counter">
                {licznik}
              </span>
              <button
                className="btn btn-small btn-light"
                data-testid="preview-next"
                aria-label="Następny dokument"
                title="Następny (→)"
                disabled={!onNext}
                onClick={dalej}
              >
                <ChevronRight className="icon" />
              </button>
            </div>
          )}

          {onEdit && (
            <button className="btn" data-testid="preview-edit-btn" onClick={onEdit} title="Edytuj (Enter)">
              <Pencil className="icon" />
              Edytuj
            </button>
          )}
          <button className="btn" data-testid="preview-print-btn" onClick={onPrint}>
            <Printer className="icon" />
            Drukuj
          </button>
          <button className="btn" data-testid="preview-pdf-btn" onClick={onPdf}>
            <FileDown className="icon" />
            Zapisz PDF
          </button>
          <button className="btn btn-ghost" data-testid="preview-close-btn" aria-label="Zamknij" title="Zamknij (Esc)" onClick={onClose}>
            <X className="icon" />
          </button>
        </div>
        <div className="preview-scroll">
          <div
            key={title}
            className="preview-page"
            data-kierunek={kierunek || undefined}
            data-testid="preview-page"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
