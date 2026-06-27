import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { WorkspaceProjectMeta } from '../../types';

interface ProjectCardProps {
  project: WorkspaceProjectMeta;
  isEditing: boolean;
  onCancelRename: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  onStartRename: () => void;
}

function ProjectCard({
  project,
  isEditing,
  onCancelRename,
  onOpen,
  onRename,
  onStartRename,
}: ProjectCardProps) {
  const [draftName, setDraftName] = useState(project.name);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isCancellingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftName(project.name);
      return;
    }

    setDraftName(project.name);
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [isEditing, project.name]);

  const saveRename = () => {
    if (isCancellingRef.current) {
      isCancellingRef.current = false;
      return;
    }

    onRename(draftName);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isEditing) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  const handleRenameClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onStartRename();
  };

  return (
    <article
      role="button"
      tabIndex={isEditing ? -1 : 0}
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
        {isEditing ? (
          <input
            ref={inputRef}
            value={draftName}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={saveRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                saveRename();
              }

              if (event.key === 'Escape') {
                event.preventDefault();
                isCancellingRef.current = true;
                setDraftName(project.name);
                onCancelRename();
              }
            }}
            className="min-w-0 flex-1 rounded border border-accent-500/50 px-2 py-1 text-lg font-semibold text-ink-950 outline-none focus:ring-2 focus:ring-accent-500/30"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-lg font-semibold text-ink-950">
            {project.name}
          </span>
        )}
        <button
          type="button"
          onClick={handleRenameClick}
          className="rounded px-2 py-1 text-xs font-medium text-ink-600 hover:bg-parchment-100 hover:text-ink-950 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        >
          Rename
        </button>
      </div>
      <span className="mt-1 block text-xs text-ink-600">
        Updated {new Date(project.updatedAt).toLocaleDateString()}
      </span>
    </article>
  );
}

export function MyProjectsScreen() {
  const projects = useWorkspaceStore((state) => state.projects);
  const createProject = useWorkspaceStore((state) => state.createProject);
  const openProject = useWorkspaceStore((state) => state.openProject);
  const renameProject = useWorkspaceStore((state) => state.renameProject);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

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
              isEditing={editingProjectId === project.id}
              onCancelRename={() => setEditingProjectId(null)}
              onOpen={() => openProject(project.id)}
              onRename={(name) => {
                renameProject(project.id, name);
                setEditingProjectId(null);
              }}
              onStartRename={() => setEditingProjectId(project.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
