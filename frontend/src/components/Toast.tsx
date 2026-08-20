export interface ToastState {
  msg: string;
  isError: boolean;
  key: number;
}

export default function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div
      key={toast.key}
      className={'toast' + (toast.isError ? ' error' : '')}
      role="status"
      aria-live="polite"
      data-testid="toast"
    >
      {toast.msg}
    </div>
  );
}
