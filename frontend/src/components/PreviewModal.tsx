import { useEffect } from 'react';
import { X, Printer, FileDown } from 'lucide-react';

interface Props {
  /** Tytuł okna, np. „Podgląd WZ 1001/RS/2026” */
  title: string;
  /** Gotowy dokument w HTML (szablon wydruku) */
  html: string;
  onClose: () => void;
  onPrint: () => void;
  onPdf: () => void;
}

export default function PreviewModal({ title, html, onClose, onPrint, onPdf }: Props) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" data-testid="preview-overlay" onClick={onClose}>
      <div className="preview-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="preview-toolbar">
          <h2 className="preview-title" data-testid="preview-title">
            {title}
          </h2>
          <button className="btn" data-testid="preview-print-btn" onClick={onPrint}>
            <Printer className="icon" />
            Drukuj
          </button>
          <button className="btn" data-testid="preview-pdf-btn" onClick={onPdf}>
            <FileDown className="icon" />
            Zapisz PDF
          </button>
          <button className="btn btn-ghost" data-testid="preview-close-btn" aria-label="Zamknij" title="Zamknij" onClick={onClose}>
            <X className="icon" />
          </button>
        </div>
        <div className="preview-scroll">
          <div className="preview-page" data-testid="preview-page" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  );
}
