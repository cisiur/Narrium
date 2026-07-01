import type { ReactNode } from 'react';
import type { ProjectView } from '../store/useProjectViewStore';

interface AppShellProps {
  children: ReactNode;
  isProjectOpen?: boolean;
  projectName?: string;
  activeProjectView?: ProjectView;
  rightPanel?: ReactNode;
  onAddScene?: () => void;
  onGroupSelectedScenes?: () => void;
  onUngroupSelectedGroup?: () => void;
  onBackToProjects?: () => void;
  onExportHtml?: () => void;
  onExportProject?: () => void;
  onEnterPreview?: () => void;
  onProjectViewChange?: (view: ProjectView) => void;
}

export function AppShell({
  children,
  isProjectOpen = false,
  projectName,
  activeProjectView = 'canvas',
  rightPanel,
  onAddScene,
  onGroupSelectedScenes,
  onUngroupSelectedGroup,
  onBackToProjects,
  onExportHtml,
  onExportProject,
  onEnterPreview,
  onProjectViewChange,
}: AppShellProps) {
  const projectNavItems: { view: ProjectView; label: string; title: string }[] = [
    { view: 'canvas', label: 'C', title: 'Canvas' },
    { view: 'characters', label: 'Ch', title: 'Characters' },
    { view: 'resources', label: 'R', title: 'Resources' },
    { view: 'variables', label: 'V', title: 'Variables' },
  ];

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
            {isProjectOpen && projectName ? (
              <>
                <span className="mx-2 text-gray-600">/</span>
                <span className="normal-case tracking-normal text-gray-300">{projectName}</span>
              </>
            ) : null}
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
                disabled={activeProjectView !== 'canvas'}
                className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
              >
                + Add Scene
              </button>
              {onGroupSelectedScenes ? (
                <button
                  type="button"
                  onClick={onGroupSelectedScenes}
                  className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
                >
                  Group selected scenes
                </button>
              ) : null}
              {onUngroupSelectedGroup ? (
                <button
                  type="button"
                  onClick={onUngroupSelectedGroup}
                  className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
                >
                  Ungroup
                </button>
              ) : null}
              <button
                type="button"
                onClick={onEnterPreview}
                className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={onExportProject}
                className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={onExportHtml}
                className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
              >
                Export HTML
              </button>
            </>
          ) : (
            null
          )}
        </div>
      </header>

      {isProjectOpen ? (
        <div
          className={
            rightPanel
              ? 'grid min-h-[calc(100vh-3.5rem)] grid-cols-[3rem_minmax(0,1fr)_360px] overflow-hidden'
              : 'grid min-h-[calc(100vh-3.5rem)] grid-cols-[3rem_minmax(0,1fr)] overflow-hidden'
          }
        >
          <nav className="flex flex-col items-center gap-3 border-r border-gray-800 bg-gray-900 py-3">
            {projectNavItems.map((item) => {
              const isActive = item.view === activeProjectView;

              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => onProjectViewChange?.(item.view)}
                  className={
                    isActive
                      ? 'flex h-9 w-9 items-center justify-center rounded bg-blue-500 text-xs font-semibold text-white shadow-sm shadow-blue-950/40'
                      : 'flex h-9 w-9 items-center justify-center rounded bg-gray-800 text-xs font-semibold text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                  aria-label={item.title}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.title}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <main className="min-w-0">{children}</main>

          {rightPanel ? <div className="overflow-hidden bg-gray-950">{rightPanel}</div> : null}
        </div>
      ) : (
        <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-[14rem_minmax(0,1fr)]">
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
        </div>
      )}
    </div>
  );
}
