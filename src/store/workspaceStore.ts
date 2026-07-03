import { create } from 'zustand';
import { getProjectStorage } from '../services/project-storage';
import type { Project, WorkspaceProjectMeta, WorkspaceState } from '../types';
import {
  createEmptyProjectHistory,
  pushProjectSnapshot,
  redoProjectHistory,
  undoProjectHistory,
  type ProjectHistoryState,
} from './projectHistory';
import { normalizeProject } from './projectMigrations';

const projectStorage = getProjectStorage();

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

const initialWorkspace = projectStorage.loadWorkspace();

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  ...initialWorkspace,
  activeProject: projectStorage.loadProject(initialWorkspace.activeProjectId),
  projectHistory: createEmptyProjectHistory(initialWorkspace.activeProjectId),
  createProject: () => {
    const projectMeta = createProjectMeta();
    const project = createEmptyProject(projectMeta);
    projectStorage.saveProject(project);

    set((state) => {
      const nextWorkspace = {
        projects: [...state.projects, projectMeta],
        activeProjectId: projectMeta.id,
      };

      projectStorage.saveWorkspace(nextWorkspace);

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

    projectStorage.saveProject(importedProject);

    set((state) => {
      const nextWorkspace = {
        projects: [...state.projects, projectMeta],
        activeProjectId: id,
      };

      projectStorage.saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: importedProject,
        projectHistory: createEmptyProjectHistory(importedProject.id),
      };
    });

    return projectMeta;
  },
  openProject: (projectId) => {
    const project = projectStorage.loadProject(projectId);

    if (!project) {
      return;
    }

    set((state) => {
      const nextWorkspace = {
        projects: state.projects,
        activeProjectId: projectId,
      };

      projectStorage.saveWorkspace(nextWorkspace);

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

      projectStorage.saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: null,
        projectHistory: createEmptyProjectHistory(),
      };
    });
  },
  renameProject: (projectId, newName) => {
    set((state) => {
      const project =
        projectStorage.loadProject(projectId) ?? (state.activeProject?.id === projectId ? state.activeProject : null);

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

      projectStorage.saveProject(nextProject);
      projectStorage.saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: state.activeProject?.id === projectId ? nextProject : state.activeProject,
      };
    });
  },
  updateProjectThumbnail: (projectId, thumbnail) => {
    set((state) => {
      const project =
        projectStorage.loadProject(projectId) ?? (state.activeProject?.id === projectId ? state.activeProject : null);

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

      projectStorage.saveProject(nextProject);
      projectStorage.saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: state.activeProject?.id === projectId ? nextProject : state.activeProject,
      };
    });
  },
  deleteProject: (projectId) => {
    set((state) => {
      projectStorage.deleteProject(projectId);

      const nextWorkspace = {
        projects: state.projects.filter((project) => project.id !== projectId),
        activeProjectId: state.activeProjectId === projectId ? null : state.activeProjectId,
      };

      projectStorage.saveWorkspace(nextWorkspace);

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

      projectStorage.saveProject(nextProject);
      projectStorage.saveWorkspace(nextWorkspace);

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

      projectStorage.saveProject(nextProject);
      projectStorage.saveWorkspace(nextWorkspace);

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

      projectStorage.saveProject(nextProject);
      projectStorage.saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: nextProject,
        projectHistory: result.history,
      };
    });

    return didRedo;
  },
}));
