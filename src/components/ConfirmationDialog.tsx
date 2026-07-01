import { useEffect, useRef, useState, type ReactNode } from 'react';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'));
}

export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    return () => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/75 px-4 py-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        className="w-full max-w-md rounded-md border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl"
      >
        <div className="border-b border-gray-800 px-5 py-4">
          <h2 id="confirmation-dialog-title" className="text-base font-semibold text-white">
            {title}
          </h2>
        </div>
        <div className="px-5 py-4 text-sm leading-6 text-gray-300">
          {typeof message === 'string' ? <p className="whitespace-pre-line">{message}</p> : message}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-800 px-5 py-4">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-100 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-red-950 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500/40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmationRequest {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PendingConfirmation extends ConfirmationRequest {
  resolve: (confirmed: boolean) => void;
}

export function useConfirmationDialog() {
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const confirm = (request: ConfirmationRequest) =>
    new Promise<boolean>((resolve) => {
      setPendingConfirmation({
        ...request,
        resolve,
      });
    });

  const close = (confirmed: boolean) => {
    pendingConfirmation?.resolve(confirmed);
    setPendingConfirmation(null);
  };

  return {
    confirm,
    confirmationDialog: (
      <ConfirmationDialog
        open={Boolean(pendingConfirmation)}
        title={pendingConfirmation?.title ?? ''}
        message={pendingConfirmation?.message ?? ''}
        confirmLabel={pendingConfirmation?.confirmLabel}
        cancelLabel={pendingConfirmation?.cancelLabel}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    ),
  };
}
