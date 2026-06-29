import { useEffect, type ReactNode } from 'react';

interface RightSidebarProps {
  open: boolean;
  title: string;
  subtitle?: string;
  closeLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

export function RightSidebar({
  open,
  title,
  subtitle,
  closeLabel = 'Close sidebar',
  children,
  footer,
  onClose,
}: RightSidebarProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={[
        'fixed inset-0 z-40 transition',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      ].join(' ')}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={onClose}
        className={[
          'absolute inset-0 cursor-default bg-ink-950/20 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        aria-label={closeLabel}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className={[
          'absolute right-0 top-0 flex h-full w-[360px] flex-col border-l border-gray-800 bg-gray-900 text-gray-100 shadow-2xl transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex items-center justify-between gap-2 border-b border-gray-800 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-100">{title}</h2>
            {subtitle ? <p className="truncate text-xs text-gray-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-gray-800 px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100"
            aria-label={closeLabel}
          >
            X
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer}
      </aside>
    </div>
  );
}
