import { useCallback, useState } from 'react';
import { AskConfirm } from '../types';
import { ConfirmRequest } from '../components/ConfirmDialog';

export function useConfirm(): {
  confirmReq: ConfirmRequest | null;
  askConfirm: AskConfirm;
  closeConfirm: (value: boolean) => void;
} {
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  const askConfirm = useCallback<AskConfirm>(
    (message, opts) =>
      new Promise<boolean>((resolve) =>
        setConfirmReq({
          message,
          confirmLabel: opts?.confirmLabel || 'Usuń',
          danger: opts?.danger ?? true,
          resolve
        })
      ),
    []
  );

  const closeConfirm = useCallback((value: boolean): void => {
    setConfirmReq((req) => {
      req?.resolve(value);
      return null;
    });
  }, []);

  return { confirmReq, askConfirm, closeConfirm };
}
