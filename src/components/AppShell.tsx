import type { ReactNode } from 'react';
import type { ProjectView } from '../store/useProjectViewStore';

interface SceneGroupOption {
  id: string;
  name: string;
}

interface AppShellProps {
  children: ReactNode;
  isProjectOpen?: boolean;
  projectName?: string;
  projectFilePath?: string | null;
  projectDirty?: boolean;
  activeProjectView?: ProjectView;
  rightPanel?: ReactNode;
  onAddScene?: () => void;
  onGroupSelectedScenes?: () => void;
  sceneGroupOptions?: SceneGroupOption[];
  onAddSelectedScenesToGroup?: (groupId: string) => void;
  onUngroupSelectedScenes?: () => void;
  onUngroupSelectedGroup?: () => void;
  onBackToProjects?: () => void;
  onSaveProject?: () => void;
  canSaveProject?: boolean;
  onSaveProjectAs?: () => void;
  onExportHtml?: () => void;
  onExportPlayableFolder?: () => void;
  onExportProject?: () => void;
  onEnterPreview?: () => void;
  onProjectViewChange?: (view: ProjectView) => void;
}

export function AppShell({
  children,
  isProjectOpen = false,
  projectName,
  projectFilePath = null,
  projectDirty = false,
  activeProjectView = 'canvas',
  rightPanel,
  onAddScene,
  onGroupSelectedScenes,
  sceneGroupOptions = [],
  onAddSelectedScenesToGroup,
  onUngroupSelectedScenes,
  onUngroupSelectedGroup,
  onBackToProjects,
  onSaveProject,
  canSaveProject = true,
  onSaveProjectAs,
  onExportHtml,
  onExportPlayableFolder,
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
                <span className="normal-case tracking-normal text-gray-300">
                  {projectName}
                  {projectDirty ? '*' : ''}
                </span>
              </>
            ) : null}
          </p>
          {isProjectOpen ? (
            <p className="mt-0.5 max-w-xl truncate text-xs normal-case tracking-normal text-gray-500">
              {projectFilePath ?? 'Unsaved draft - use Save As to create a .narrium file'}
            </p>
          ) : null}
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
                  New group from selection
                </button>
              ) : null}
              {onAddSelectedScenesToGroup && sceneGroupOptions.length > 0 ? (
                <select
                  aria-label="Add selected to group"
                  className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
                  defaultValue=""
                  onChange={(event) => {
                    const groupId = event.target.value;

                    if (groupId) {
                      onAddSelectedScenesToGroup(groupId);
                      event.target.value = '';
                    }
                  }}
                >
                  <option value="" disabled>
                    Add selected to group...
                  </option>
                  {sceneGroupOptions.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              ) : null}
              {onUngroupSelectedScenes ? (
                <button
                  type="button"
                  onClick={onUngroupSelectedScenes}
                  className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
                >
                  Ungroup selected scenes
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
              {onSaveProject ? (
                <button
                  type="button"
                  onClick={onSaveProject}
                  disabled={!canSaveProject}
                  title={!canSaveProject ? 'Use Save As to create a .narrium project file first.' : undefined}
                  className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save
                </button>
              ) : null}
              {onSaveProjectAs ? (
                <button
                  type="button"
                  onClick={onSaveProjectAs}
                  className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
                >
                  Save As
                </button>
              ) : null}
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
              {onExportPlayableFolder ? (
                <button
                  type="button"
                  onClick={onExportPlayableFolder}
                  className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
                >
                  Export Playable Folder
                </button>
              ) : null}
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
        <main className="min-h-[calc(100vh-3.5rem)] min-w-0 p-6">{children}</main>
      )}
    </div>
  );
}
