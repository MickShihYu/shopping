import { useCallback, useRef, useState } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  // Keep a stable ref so the modal unmount doesn't lose the resolver
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, resolve });
    });
  }, []);

  const handleChoice = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    setState(null);
  }, []);

  const modal = state ? (
    <div className="confirm-overlay" onClick={() => handleChoice(false)}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        {state.title && (
          <h3 id="confirm-title" className="confirm-title">
            {state.title}
          </h3>
        )}
        <p id="confirm-message" className="confirm-message">
          {state.message}
        </p>
        <div className="confirm-actions">
          <button
            className="btn btn-ghost"
            onClick={() => handleChoice(false)}
            autoFocus
          >
            {state.cancelLabel ?? 'Cancel'}
          </button>
          <button
            className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => handleChoice(true)}
          >
            {state.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, modal };
}
