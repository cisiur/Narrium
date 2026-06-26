import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-parchment-50 text-ink-950">
      <header className="flex h-14 items-center justify-between border-b border-ink-950/10 bg-white px-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">Narrium</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-ink-950/10 px-3 py-1.5 text-sm font-medium text-ink-600"
          >
            Preview
          </button>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-[14rem_1fr_18rem]">
        <nav className="border-r border-ink-950/10 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-600">Workspace</p>
          <button
            type="button"
            className="w-full rounded-md bg-accent-500 px-3 py-2 text-left text-sm font-semibold text-white"
          >
            My Projects
          </button>
        </nav>

        <main className="min-w-0 p-6">{children}</main>

        <aside className="border-l border-ink-950/10 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">Inspector</p>
          <div className="mt-4 rounded-md border border-dashed border-ink-950/20 p-4 text-sm text-ink-600">
            Right sidebar placeholder
          </div>
        </aside>
      </div>
    </div>
  );
}
