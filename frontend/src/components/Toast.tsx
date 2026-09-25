import { Undo2 } from 'lucide-react';

export interface ToastState {
  msg: string;
  isError: boolean;
  key: number;
  /** trwa wygaszanie — wtedy leci krótsza animacja wyjścia */
  closing?: boolean;
  /** Działanie do cofnięcia — pokazywane jako przycisk obok treści */
  action?: { label: string; run: () => void };
}

export default function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div
      key={toast.key}
      className={'toast' + (toast.isError ? ' error' : '') + (toast.closing ? ' closing' : '')}
      role="status"
      aria-live="polite"
      data-testid="toast"
    >
      <span className="toast-msg">{toast.msg}</span>
      {toast.action && (
        <button className="btn btn-small toast-action" data-testid="toast-action" onClick={toast.action.run}>
          <Undo2 className="icon" />
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
