import { useEffect } from 'react';
import { X, Printer, FileDown } from 'lucide-react';
import { Settings, WZDocument } from '../types';
import { buildPrintHtml } from '../lib/printing';

interface Props {
  doc: WZDocument;
  settings: Settings;
  onClose: () => void;
  onPrint: (doc: WZDocument) => void;
  onPdf: (doc: WZDocument) => void;
}

export default function PreviewModal({ doc, settings, onClose, onPrint, onPdf }: Props) {
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
            Podgląd WZ {doc.number}
          </h2>
          <button className="btn" data-testid="preview-print-btn" onClick={() => onPrint(doc)}>
            <Printer className="icon" />
            Drukuj
          </button>
          <button className="btn" data-testid="preview-pdf-btn" onClick={() => onPdf(doc)}>
            <FileDown className="icon" />
            Zapisz PDF
          </button>
          <button className="btn btn-ghost" data-testid="preview-close-btn" aria-label="Zamknij" title="Zamknij" onClick={onClose}>
            <X className="icon" />
          </button>
        </div>
        <div className="preview-scroll">
          <div
            className="preview-page"
            data-testid="preview-page"
            dangerouslySetInnerHTML={{ __html: buildPrintHtml(doc, settings) }}
          />
        </div>
      </div>
    </div>
  );
}
