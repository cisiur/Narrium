import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { WorkspaceProjectMeta } from '../../types';

interface ProjectCardProps {
  project: WorkspaceProjectMeta;
  onOpen: () => void;
  onOpenSettings: () => void;
}

function ProjectCard({
  project,
  onOpen,
  onOpenSettings,
}: ProjectCardProps) {
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      data-testid="project-card"
      onClick={onOpen}
      onKeyDown={handleCardKeyDown}
      className="rounded-md border border-ink-950/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent-500/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-500/40"
      aria-label={`Open ${project.name}`}
    >
      <div className="flex h-32 items-center justify-center rounded-md bg-parchment-100 text-sm font-medium text-ink-600">
        No thumbnail
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-lg font-semibold text-ink-950">
          {project.name}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenSettings();
          }}
          className="rounded px-2 py-1 text-lg font-semibold leading-none text-ink-600 hover:bg-parchment-100 hover:text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          aria-label={`Open settings for ${project.name}`}
        >
          ...
        </button>
      </div>
      <span className="mt-1 block text-xs text-ink-600">
        Updated {new Date(project.updatedAt).toLocaleDateString()}
      </span>
    </article>
  );
}

interface ProjectSettingsSidebarProps {
  project: WorkspaceProjectMeta | null;
  onClose: () => void;
  onDelete: (projectId: string) => void;
  onRename: (projectId: string, name: string) => void;
}

function ProjectSettingsSidebar({
  project,
  onClose,
  onDelete,
  onRename,
}: ProjectSettingsSidebarProps) {
  const [draftName, setDraftName] = useState(project?.name ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isOpen = Boolean(project);

  useEffect(() => {
    setDraftName(project?.name ?? '');

    if (!project) {
      return;
    }

    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [project]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const saveRename = () => {
    if (!project) {
      return;
    }

    onRename(project.id, draftName);
  };

  const deleteProject = () => {
    if (!project) {
      return;
    }

    const shouldDelete = window.confirm(`Delete "${project.name}"? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    onDelete(project.id);
  };

  return (
    <div
      className={[
        'fixed inset-0 z-40 transition',
        isOpen ? 'pointer-events-auto' : 'pointer-events-none',
      ].join(' ')}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={onClose}
        className={[
          'absolute inset-0 cursor-default bg-ink-950/20 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        aria-label="Close project settings"
        tabIndex={isOpen ? 0 : -1}
      />
      <aside
        className={[
          'absolute right-0 top-0 flex h-full w-[360px] flex-col border-l border-gray-800 bg-gray-900 text-gray-100 shadow-2xl transition-transform duration-200',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {project ? (
          <>
            <header className="flex items-center justify-between gap-2 border-b border-gray-800 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-gray-100">Project Settings</h2>
                <p className="truncate text-xs text-gray-500">{project.name}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded bg-gray-800 px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                aria-label="Close project settings"
              >
                X
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <section>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-300">
                  Project Name
                  <input
                    ref={inputRef}
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onBlur={saveRename}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        saveRename();
                      }
                    }}
                    className="mt-2 w-full rounded bg-gray-950 px-2 py-2 text-sm font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
                  />
                </label>
              </section>

              <section className="mt-6 border-t border-gray-700 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                  Thumbnail
                </div>
                <div className="mt-3 flex h-32 items-center justify-center rounded-md border border-dashed border-gray-700 bg-gray-950 text-sm text-gray-500">
                  No thumbnail
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-3 rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Upload Thumbnail
                </button>
              </section>
            </div>

            <section className="border-t border-red-900/60 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-red-200">
                Delete Project
              </div>
              <button
                type="button"
                onClick={deleteProject}
                className="mt-3 rounded bg-red-950 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-900"
              >
                Delete Project
              </button>
            </section>
          </>
        ) : null}
      </aside>
    </div>
  );
}

export function MyProjectsScreen() {
  const projects = useWorkspaceStore((state) => state.projects);
  const createProject = useWorkspaceStore((state) => state.createProject);
  const openProject = useWorkspaceStore((state) => state.openProject);
  const renameProject = useWorkspaceStore((state) => state.renameProject);
  const deleteProject = useWorkspaceStore((state) => state.deleteProject);
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);
  const settingsProject = projects.find((project) => project.id === settingsProjectId) ?? null;

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink-950">My Projects</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
            Local project workspace for branching visual novels.
          </p>
        </div>
        <button
          type="button"
          data-testid="create-project-button"
          onClick={() => createProject()}
          className="rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
        >
          Create Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-md border border-dashed border-ink-950/20 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-ink-950">No projects yet</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-600">
            Create a local mock project to start shaping the Narrium workspace foundation.
          </p>
          <button
            type="button"
            data-testid="empty-create-project-button"
            onClick={() => createProject()}
            className="mt-6 rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => openProject(project.id)}
              onOpenSettings={() => setSettingsProjectId(project.id)}
            />
          ))}
        </div>
      )}
      <ProjectSettingsSidebar
        project={settingsProject}
        onClose={() => setSettingsProjectId(null)}
        onRename={renameProject}
        onDelete={(projectId) => {
          deleteProject(projectId);
          setSettingsProjectId(null);
        }}
      />
    </section>
  );
}
