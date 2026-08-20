import { useCallback, useRef, useState } from 'react';
import { ToastState } from '../components/Toast';

export type ToastFn = (msg: string, isError?: boolean) => void;

export function useToastMessage(): { toastState: ToastState | null; toast: ToastFn } {
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback<ToastFn>((msg, isError) => {
    setToastState({ msg, isError: !!isError, key: Date.now() });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastState(null), isError ? 6000 : 3000);
  }, []);

  return { toastState, toast };
}
