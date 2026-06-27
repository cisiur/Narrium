import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  isProjectOpen?: boolean;
  rightPanel?: ReactNode;
  onAddScene?: () => void;
  onBackToProjects?: () => void;
}

export function AppShell({
  children,
  isProjectOpen = false,
  rightPanel,
  onAddScene,
  onBackToProjects,
}: AppShellProps) {
  return (
    <div className={isProjectOpen ? 'min-h-screen bg-gray-950 text-gray-100' : 'min-h-screen bg-parchment-50 text-ink-950'}>
      <header
        className={
          isProjectOpen
            ? 'flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-5'
            : 'flex h-14 items-center justify-between border-b border-ink-950/10 bg-white px-5'
        }
      >
        <div>
          <p
            className={
              isProjectOpen
                ? 'text-sm font-semibold uppercase tracking-wide text-blue-300'
                : 'text-sm font-semibold uppercase tracking-wide text-accent-600'
            }
          >
            Narrium
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isProjectOpen ? (
            <>
              <button
                type="button"
                onClick={onBackToProjects}
                className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
              >
                My Projects
              </button>
              <button
                type="button"
                onClick={onAddScene}
                className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
              >
                + Add Scene
              </button>
            </>
          ) : (
            <button
              type="button"
              className="rounded-md border border-ink-950/10 px-3 py-1.5 text-sm font-medium text-ink-600"
            >
              Preview
            </button>
          )}
        </div>
      </header>

      {isProjectOpen ? (
        <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-[3rem_minmax(0,1fr)_360px] overflow-hidden">
          <nav className="flex flex-col items-center gap-3 border-r border-gray-800 bg-gray-900 py-3">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded bg-gray-800 text-xs font-semibold text-gray-200"
              aria-label="Canvas"
              title="Canvas"
            >
              C
            </button>
          </nav>

          <main className="min-w-0">{children}</main>

          <div className="overflow-hidden bg-gray-950">{rightPanel}</div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
