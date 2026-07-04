import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useConfirmationDialog } from '../../components';
import { RightSidebar } from '../../components/RightSidebar';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { Project, WorkspaceProjectMeta } from '../../types';
import { parseProjectImport } from '../../utils/projectImport';

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
      {project.thumbnailDataUrl ? (
        <img
          src={project.thumbnailDataUrl}
          alt=""
          className="h-32 w-full rounded-md bg-parchment-100 object-cover"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-md bg-parchment-100 text-sm font-medium text-ink-600">
          No thumbnail
        </div>
      )}
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
  onUpdateThumbnail: (projectId: string, thumbnail: string | null) => void;
}

function ProjectSettingsSidebar({
  project,
  onClose,
  onDelete,
  onRename,
  onUpdateThumbnail,
}: ProjectSettingsSidebarProps) {
  const { confirm, confirmationDialog } = useConfirmationDialog();
  const [draftName, setDraftName] = useState(project?.name ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const isOpen = Boolean(project);

  useEffect(() => {
    setDraftName(project?.name ?? '');

    if (!project?.id) {
      return;
    }

    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [project?.id, project?.name]);

  const saveRename = () => {
    if (!project) {
      return;
    }

    onRename(project.id, draftName);
  };

  const deleteProject = async () => {
    if (!project) {
      return;
    }

    const shouldDelete = await confirm({
      title: 'Delete Project',
      message: `Delete "${project.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
    });

    if (!shouldDelete) {
      return;
    }

    onDelete(project.id);
  };

  const updateThumbnail = (file: File | undefined) => {
    if (!project || !file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      onUpdateThumbnail(project.id, reader.result);
    };

    reader.readAsDataURL(file);
  };

  const removeThumbnail = () => {
    if (!project) {
      return;
    }

    onUpdateThumbnail(project.id, null);
  };

  return (
    <RightSidebar
      open={isOpen}
      title="Project Settings"
      subtitle={project?.name}
      closeLabel="Close project settings"
      onClose={onClose}
      footer={
        project ? (
          <section className="border-t border-red-900/60 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-red-200">
              Delete Project
            </div>
            <button
              type="button"
              onClick={() => void deleteProject()}
              className="mt-3 rounded bg-red-950 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-900"
            >
              Delete Project
            </button>
          </section>
        ) : null
      }
    >
      {project ? (
        <>
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
            {project.thumbnailDataUrl ? (
              <img
                src={project.thumbnailDataUrl}
                alt=""
                className="mt-3 h-32 w-full rounded-md border border-gray-700 bg-gray-950 object-cover"
              />
            ) : (
              <div className="mt-3 flex h-32 items-center justify-center rounded-md border border-dashed border-gray-700 bg-gray-950 text-sm text-gray-500">
                No thumbnail
              </div>
            )}
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => {
                updateThumbnail(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              className="mt-3 rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-700"
            >
              Upload Thumbnail
            </button>
            {project.thumbnailDataUrl ? (
              <button
                type="button"
                onClick={removeThumbnail}
                className="ml-2 rounded px-2 py-1 text-xs font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100"
              >
                Remove Thumbnail
              </button>
            ) : null}
          </section>
        </>
      ) : null}
      {confirmationDialog}
    </RightSidebar>
  );
}

export function MyProjectsScreen() {
  const projects = useWorkspaceStore((state) => state.projects);
  const createProjectWithUnsavedCheck = useWorkspaceStore((state) => state.createProjectWithUnsavedCheck);
  const importProject = useWorkspaceStore((state) => state.importProject);
  const openProjectFile = useWorkspaceStore((state) => state.openProjectFile);
  const openRecentProject = useWorkspaceStore((state) => state.openRecentProject);
  const openProjectWithUnsavedCheck = useWorkspaceStore((state) => state.openProjectWithUnsavedCheck);
  const canUseProjectFiles = useWorkspaceStore((state) => state.canUseProjectFiles);
  const projectFileError = useWorkspaceStore((state) => state.projectFileError);
  const recentProjects = useWorkspaceStore((state) => state.recentProjects);
  const lastOpenedProject = useWorkspaceStore((state) => state.lastOpenedProject);
  const renameProject = useWorkspaceStore((state) => state.renameProject);
  const updateProjectThumbnail = useWorkspaceStore((state) => state.updateProjectThumbnail);
  const deleteProject = useWorkspaceStore((state) => state.deleteProject);
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const settingsProject = projects.find((project) => project.id === settingsProjectId) ?? null;

  const importJson = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    let project: Project | null = null;

    try {
      project = parseProjectImport(await file.text());
    } catch {
      project = null;
    }

    if (!project) {
      setImportError('Invalid Narrium project file.');
      return;
    }

    setImportError(null);
    importProject(project);
  };

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink-950">My Projects</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
            Local project workspace for branching visual novels.
          </p>
          {importError ? (
            <p className="mt-2 text-sm font-medium text-red-700">{importError}</p>
          ) : null}
          {projectFileError ? (
            <p className="mt-2 text-sm font-medium text-red-700">{projectFileError}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              void importJson(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="rounded-md border border-ink-950/10 bg-white px-4 py-2 text-sm font-semibold text-ink-800 shadow-sm transition hover:border-accent-500/40 hover:text-ink-950"
          >
            Import JSON
          </button>
          {canUseProjectFiles ? (
            <button
              type="button"
              onClick={() => void openProjectFile()}
              className="rounded-md border border-ink-950/10 bg-white px-4 py-2 text-sm font-semibold text-ink-800 shadow-sm transition hover:border-accent-500/40 hover:text-ink-950"
            >
              Open Project File
            </button>
          ) : null}
          <button
            type="button"
            data-testid="create-project-button"
            onClick={() => void createProjectWithUnsavedCheck()}
            className="rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
          >
            Create Project
          </button>
        </div>
      </div>

      {canUseProjectFiles && lastOpenedProject ? (
        <section className="mb-6 rounded-md border border-accent-500/30 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink-950">Reopen last project</h2>
              <p className="mt-1 truncate text-sm text-ink-600">
                {lastOpenedProject.name} - {lastOpenedProject.filePath}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void openRecentProject(lastOpenedProject.filePath)}
              className="shrink-0 rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
            >
              Reopen
            </button>
          </div>
        </section>
      ) : null}

      {canUseProjectFiles && recentProjects.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">Recent Projects</h2>
          <div className="mt-3 divide-y divide-ink-950/10 rounded-md border border-ink-950/10 bg-white">
            {recentProjects.map((project) => (
              <button
                key={project.filePath}
                type="button"
                onClick={() => void openRecentProject(project.filePath)}
                className="block w-full px-4 py-3 text-left hover:bg-parchment-100"
              >
                <span className="block truncate text-sm font-semibold text-ink-950">{project.name}</span>
                <span className="mt-1 block truncate text-xs text-ink-600">{project.filePath}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {projects.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-md border border-dashed border-ink-950/20 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-ink-950">No projects yet</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-600">
            Create an unsaved draft, then use Save As when you are ready to create a .narrium file.
          </p>
          <button
            type="button"
            data-testid="empty-create-project-button"
            onClick={() => void createProjectWithUnsavedCheck()}
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
              onOpen={() => void openProjectWithUnsavedCheck(project.id)}
              onOpenSettings={() => setSettingsProjectId(project.id)}
            />
          ))}
        </div>
      )}
      <ProjectSettingsSidebar
        project={settingsProject}
        onClose={() => setSettingsProjectId(null)}
        onRename={renameProject}
        onUpdateThumbnail={updateProjectThumbnail}
        onDelete={(projectId) => {
          deleteProject(projectId);
          setSettingsProjectId(null);
        }}
      />
    </section>
  );
}
