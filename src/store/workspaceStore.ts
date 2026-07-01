import { create } from 'zustand';
import type { Project, WorkspaceProjectMeta, WorkspaceState } from '../types';
import {
  createEmptyProjectHistory,
  pushProjectSnapshot,
  redoProjectHistory,
  undoProjectHistory,
  type ProjectHistoryState,
} from './projectHistory';
import { normalizeProject } from './projectMigrations';

const WORKSPACE_STORAGE_KEY = 'narrium_workspace';
const PROJECT_STORAGE_PREFIX = 'narrium_project_';

interface WorkspaceStore extends WorkspaceState {
  activeProject: Project | null;
  projectHistory: ProjectHistoryState;
  createProject: () => WorkspaceProjectMeta;
  importProject: (project: Project) => WorkspaceProjectMeta;
  openProject: (projectId: string) => void;
  closeProject: () => void;
  renameProject: (projectId: string, newName: string) => void;
  updateProjectThumbnail: (projectId: string, thumbnail: string | null) => void;
  deleteProject: (projectId: string) => void;
  updateActiveProject: (updater: (project: Project) => Project) => void;
  undoActiveProject: () => boolean;
  redoActiveProject: () => boolean;
}

function createProjectMeta(): WorkspaceProjectMeta {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  return {
    id,
    name: 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    thumbnailDataUrl: null,
  };
}

export function createEmptyProject(meta: WorkspaceProjectMeta): Project {
  return {
    id: meta.id,
    name: meta.name,
    thumbnail: meta.thumbnailDataUrl,
    startSceneId: '',
    scenes: [],
    characters: [],
    resources: [],
    variables: [],
    groups: [],
    assetLibrary: [],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };
}

function loadWorkspace(): WorkspaceState {
  if (typeof window === 'undefined') {
    return { projects: [], activeProjectId: null };
  }

  const rawWorkspace = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);

  if (!rawWorkspace) {
    return { projects: [], activeProjectId: null };
  }

  try {
    const parsedWorkspace = JSON.parse(rawWorkspace) as WorkspaceState;

    return {
      projects: Array.isArray(parsedWorkspace.projects)
        ? parsedWorkspace.projects.map((project) => ({
            ...project,
            thumbnailDataUrl: project.thumbnailDataUrl ?? null,
          }))
        : [],
      activeProjectId: parsedWorkspace.activeProjectId ?? null,
    };
  } catch {
    return { projects: [], activeProjectId: null };
  }
}

function saveWorkspace(workspace: WorkspaceState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}

function getProjectStorageKey(projectId: string) {
  return `${PROJECT_STORAGE_PREFIX}${projectId}`;
}

function loadProject(projectId: string | null): Project | null {
  if (typeof window === 'undefined' || !projectId) {
    return null;
  }

  const rawProject = window.localStorage.getItem(getProjectStorageKey(projectId));

  if (!rawProject) {
    return null;
  }

  try {
    const parsedProject = JSON.parse(rawProject) as Project;
    const normalizedProject = normalizeProject(parsedProject);

    if (normalizedProject.changed) {
      saveProject(normalizedProject.project);
    }

    return normalizedProject.project;
  } catch {
    return null;
  }
}

function saveProject(project: Project) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getProjectStorageKey(project.id), JSON.stringify(project));
}

function deleteStoredProject(projectId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getProjectStorageKey(projectId));
}

function stampProjectUpdatedAt(project: Project): Project {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
  };
}

function createWorkspaceForProject(state: WorkspaceStore, project: Project) {
  return {
    projects: state.projects.map((projectMeta) =>
      projectMeta.id === project.id
        ? {
            ...projectMeta,
            name: project.name,
            thumbnailDataUrl: project.thumbnail,
            updatedAt: project.updatedAt,
          }
        : projectMeta,
    ),
    activeProjectId: state.activeProjectId,
  };
}

const initialWorkspace = loadWorkspace();

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  ...initialWorkspace,
  activeProject: loadProject(initialWorkspace.activeProjectId),
  projectHistory: createEmptyProjectHistory(initialWorkspace.activeProjectId),
  createProject: () => {
    const projectMeta = createProjectMeta();
    const project = createEmptyProject(projectMeta);
    saveProject(project);

    set((state) => {
      const nextWorkspace = {
        projects: [...state.projects, projectMeta],
        activeProjectId: projectMeta.id,
      };

      saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: project,
        projectHistory: createEmptyProjectHistory(project.id),
      };
    });

    return projectMeta;
  },
  importProject: (project) => {
    const normalizedProject = normalizeProject(project).project;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const importedProject = {
      ...normalizedProject,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const projectMeta: WorkspaceProjectMeta = {
      id,
      name: importedProject.name,
      createdAt: now,
      updatedAt: now,
      thumbnailDataUrl: importedProject.thumbnail,
    };

    saveProject(importedProject);

    set((state) => {
      const nextWorkspace = {
        projects: [...state.projects, projectMeta],
        activeProjectId: id,
      };

      saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: importedProject,
        projectHistory: createEmptyProjectHistory(importedProject.id),
      };
    });

    return projectMeta;
  },
  openProject: (projectId) => {
    const project = loadProject(projectId);

    if (!project) {
      return;
    }

    set((state) => {
      const nextWorkspace = {
        projects: state.projects,
        activeProjectId: projectId,
      };

      saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: project,
        projectHistory: createEmptyProjectHistory(project.id),
      };
    });
  },
  closeProject: () => {
    set((state) => {
      const nextWorkspace = {
        projects: state.projects,
        activeProjectId: null,
      };

      saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: null,
        projectHistory: createEmptyProjectHistory(),
      };
    });
  },
  renameProject: (projectId, newName) => {
    set((state) => {
      const project = loadProject(projectId) ?? (state.activeProject?.id === projectId ? state.activeProject : null);

      if (!project) {
        return state;
      }

      const now = new Date().toISOString();
      const name = newName.trim() || 'Untitled Project';
      const nextProject = {
        ...project,
        name,
        updatedAt: now,
      };
      const nextWorkspace = {
        projects: state.projects.map((projectMeta) =>
          projectMeta.id === projectId
            ? {
                ...projectMeta,
                name,
                updatedAt: now,
              }
            : projectMeta,
        ),
        activeProjectId: state.activeProjectId,
      };

      saveProject(nextProject);
      saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: state.activeProject?.id === projectId ? nextProject : state.activeProject,
      };
    });
  },
  updateProjectThumbnail: (projectId, thumbnail) => {
    set((state) => {
      const project = loadProject(projectId) ?? (state.activeProject?.id === projectId ? state.activeProject : null);

      if (!project) {
        return state;
      }

      const now = new Date().toISOString();
      const nextProject = {
        ...project,
        thumbnail,
        updatedAt: now,
      };
      const nextWorkspace = {
        projects: state.projects.map((projectMeta) =>
          projectMeta.id === projectId
            ? {
                ...projectMeta,
                thumbnailDataUrl: thumbnail,
                updatedAt: now,
              }
            : projectMeta,
        ),
        activeProjectId: state.activeProjectId,
      };

      saveProject(nextProject);
      saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: state.activeProject?.id === projectId ? nextProject : state.activeProject,
      };
    });
  },
  deleteProject: (projectId) => {
    set((state) => {
      deleteStoredProject(projectId);

      const nextWorkspace = {
        projects: state.projects.filter((project) => project.id !== projectId),
        activeProjectId: state.activeProjectId === projectId ? null : state.activeProjectId,
      };

      saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: state.activeProject?.id === projectId ? null : state.activeProject,
        projectHistory:
          state.activeProject?.id === projectId ? createEmptyProjectHistory() : state.projectHistory,
      };
    });
  },
  updateActiveProject: (updater) => {
    set((state) => {
      if (!state.activeProject) {
        return state;
      }

      const updatedProject = updater(state.activeProject);
      const nextProject = stampProjectUpdatedAt(updatedProject);
      const nextWorkspace = createWorkspaceForProject(state, nextProject);

      saveProject(nextProject);
      saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: nextProject,
        projectHistory: pushProjectSnapshot(state.projectHistory, state.activeProject),
      };
    });
  },
  undoActiveProject: () => {
    let didUndo = false;

    set((state) => {
      const result = undoProjectHistory(state.projectHistory, state.activeProject);

      if (!result.project) {
        return state;
      }

      didUndo = true;

      const nextProject = stampProjectUpdatedAt(result.project);
      const nextWorkspace = createWorkspaceForProject(state, nextProject);

      saveProject(nextProject);
      saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: nextProject,
        projectHistory: result.history,
      };
    });

    return didUndo;
  },
  redoActiveProject: () => {
    let didRedo = false;

    set((state) => {
      const result = redoProjectHistory(state.projectHistory, state.activeProject);

      if (!result.project) {
        return state;
      }

      didRedo = true;

      const nextProject = stampProjectUpdatedAt(result.project);
      const nextWorkspace = createWorkspaceForProject(state, nextProject);

      saveProject(nextProject);
      saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: nextProject,
        projectHistory: result.history,
      };
    });

    return didRedo;
  },
}));
