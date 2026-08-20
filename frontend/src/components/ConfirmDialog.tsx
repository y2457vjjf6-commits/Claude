import { useEffect } from 'react';

export interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (value: boolean) => void;
}

interface Props {
  request: ConfirmRequest;
  onClose: (value: boolean) => void;
}

export default function ConfirmDialog({ request, onClose }: Props) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose(false);
      if (ev.key === 'Enter') onClose(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" data-testid="confirm-overlay" onClick={() => onClose(false)}>
      <div className="modal-card" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <p className="modal-message" data-testid="confirm-message">
          {request.message}
        </p>
        <div className="modal-actions">
          <button className="btn btn-light" data-testid="confirm-cancel-btn" onClick={() => onClose(false)}>
            Anuluj
          </button>
          <button
            className={'btn ' + (request.danger ? 'btn-danger-solid' : 'btn-primary')}
            data-testid="confirm-accept-btn"
            autoFocus
            onClick={() => onClose(true)}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
