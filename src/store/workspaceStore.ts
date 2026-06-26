import { create } from 'zustand';
import type { Project, WorkspaceProjectMeta, WorkspaceState } from '../types';

const WORKSPACE_STORAGE_KEY = 'narrium_workspace';
const PROJECT_STORAGE_PREFIX = 'narrium_project_';

interface WorkspaceStore extends WorkspaceState {
  activeProject: Project | null;
  createProject: () => WorkspaceProjectMeta;
  openProject: (projectId: string) => void;
  updateActiveProject: (updater: (project: Project) => Project) => void;
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

function createEmptyProject(meta: WorkspaceProjectMeta): Project {
  return {
    id: meta.id,
    name: meta.name,
    startSceneId: '',
    scenes: [],
    characters: [],
    resources: [],
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
      projects: Array.isArray(parsedWorkspace.projects) ? parsedWorkspace.projects : [],
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
    return JSON.parse(rawProject) as Project;
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

const initialWorkspace = loadWorkspace();

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  ...initialWorkspace,
  activeProject: loadProject(initialWorkspace.activeProjectId),
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
      };
    });
  },
  updateActiveProject: (updater) => {
    set((state) => {
      if (!state.activeProject) {
        return state;
      }

      const updatedProject = updater(state.activeProject);
      const nextProject = {
        ...updatedProject,
        updatedAt: new Date().toISOString(),
      };
      const nextWorkspace = {
        projects: state.projects.map((project) =>
          project.id === nextProject.id
            ? {
                ...project,
                name: nextProject.name,
                updatedAt: nextProject.updatedAt,
              }
            : project,
        ),
        activeProjectId: state.activeProjectId,
      };

      saveProject(nextProject);
      saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: nextProject,
      };
    });
  },
}));
