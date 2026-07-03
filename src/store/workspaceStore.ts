import { create } from 'zustand';
import { getProjectFolderService } from '../services/project-folder';
import { getProjectStorage } from '../services/project-storage';
import { normalizeProject } from '../domain/project';
import type { Project, WorkspaceProjectMeta, WorkspaceState } from '../types';
import {
  createEmptyProjectHistory,
  pushProjectSnapshot,
  redoProjectHistory,
  undoProjectHistory,
  type ProjectHistoryState,
} from './projectHistory';

const projectStorage = getProjectStorage();
const projectFolderService = getProjectFolderService();

interface WorkspaceStore extends WorkspaceState {
  activeProject: Project | null;
  projectHistory: ProjectHistoryState;
  activeProjectFolderPath: string | null;
  activeProjectFilePath: string | null;
  projectFolderError: string | null;
  canUseProjectFolders: boolean;
  createProject: () => WorkspaceProjectMeta;
  createProjectFolder: () => Promise<void>;
  importProject: (project: Project) => WorkspaceProjectMeta;
  openProjectFolder: () => Promise<void>;
  openProject: (projectId: string) => void;
  closeProject: () => void;
  saveActiveProjectToFolder: () => Promise<void>;
  saveActiveProjectAsFolder: () => Promise<void>;
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

function createProjectMetaFromProject(project: Project): WorkspaceProjectMeta {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    thumbnailDataUrl: project.thumbnail,
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
  activeProjectFolderPath: null,
  activeProjectFilePath: null,
  projectFolderError: null,
  canUseProjectFolders: projectFolderService.canUseProjectFolders(),
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
        activeProjectFolderPath: null,
        activeProjectFilePath: null,
        projectFolderError: null,
      };
    });

    return projectMeta;
  },
  createProjectFolder: async () => {
    const projectMeta = createProjectMeta();
    const project = createEmptyProject(projectMeta);

    try {
      const projectFolder = await projectFolderService.createProjectFolder(project);

      if (!projectFolder) {
        return;
      }

      projectStorage.saveProject(projectFolder.project);

      set((state) => {
        const nextWorkspace = {
          projects: [
            ...state.projects.filter((existingProject) => existingProject.id !== projectFolder.project.id),
            createProjectMetaFromProject(projectFolder.project),
          ],
          activeProjectId: projectFolder.project.id,
        };

        projectStorage.saveWorkspace(nextWorkspace);

        return {
          ...nextWorkspace,
          activeProject: projectFolder.project,
          projectHistory: createEmptyProjectHistory(projectFolder.project.id),
          activeProjectFolderPath: projectFolder.folderPath,
          activeProjectFilePath: projectFolder.filePath,
          projectFolderError: null,
        };
      });
    } catch (error) {
      set({
        projectFolderError: error instanceof Error ? error.message : 'Could not create project folder.',
      });
    }
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
        activeProjectFolderPath: null,
        activeProjectFilePath: null,
        projectFolderError: null,
      };
    });

    return projectMeta;
  },
  openProjectFolder: async () => {
    try {
      const projectFolder = await projectFolderService.openProjectFolder();

      if (!projectFolder) {
        return;
      }

      projectStorage.saveProject(projectFolder.project);

      set((state) => {
        const nextWorkspace = {
          projects: [
            ...state.projects.filter((project) => project.id !== projectFolder.project.id),
            createProjectMetaFromProject(projectFolder.project),
          ],
          activeProjectId: projectFolder.project.id,
        };

        projectStorage.saveWorkspace(nextWorkspace);

        return {
          ...nextWorkspace,
          activeProject: projectFolder.project,
          projectHistory: createEmptyProjectHistory(projectFolder.project.id),
          activeProjectFolderPath: projectFolder.folderPath,
          activeProjectFilePath: projectFolder.filePath,
          projectFolderError: null,
        };
      });
    } catch (error) {
      set({
        projectFolderError: error instanceof Error ? error.message : 'Could not open project folder.',
      });
    }
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
        activeProjectFolderPath: null,
        activeProjectFilePath: null,
        projectFolderError: null,
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
        activeProjectFolderPath: null,
        activeProjectFilePath: null,
        projectFolderError: null,
      };
    });
  },
  saveActiveProjectToFolder: async () => {
    const { activeProject, activeProjectFolderPath } = useWorkspaceStore.getState();

    if (!activeProject) {
      return;
    }

    if (!activeProjectFolderPath) {
      await useWorkspaceStore.getState().saveActiveProjectAsFolder();
      return;
    }

    try {
      const projectFolder = await projectFolderService.saveProject(activeProject, activeProjectFolderPath);

      projectStorage.saveProject(projectFolder.project);

      set((state) => {
        const nextWorkspace = createWorkspaceForProject(state, projectFolder.project);

        projectStorage.saveWorkspace(nextWorkspace);

        return {
          ...nextWorkspace,
          activeProject: projectFolder.project,
          activeProjectFolderPath: projectFolder.folderPath,
          activeProjectFilePath: projectFolder.filePath,
          projectFolderError: null,
        };
      });
    } catch (error) {
      set({
        projectFolderError: error instanceof Error ? error.message : 'Could not save project.',
      });
    }
  },
  saveActiveProjectAsFolder: async () => {
    const { activeProject } = useWorkspaceStore.getState();

    if (!activeProject) {
      return;
    }

    try {
      const projectFolder = await projectFolderService.saveProjectAs(activeProject);

      if (!projectFolder) {
        return;
      }

      projectStorage.saveProject(projectFolder.project);

      set((state) => {
        const nextWorkspace = createWorkspaceForProject(state, projectFolder.project);

        projectStorage.saveWorkspace(nextWorkspace);

        return {
          ...nextWorkspace,
          activeProject: projectFolder.project,
          activeProjectFolderPath: projectFolder.folderPath,
          activeProjectFilePath: projectFolder.filePath,
          projectFolderError: null,
        };
      });
    } catch (error) {
      set({
        projectFolderError: error instanceof Error ? error.message : 'Could not save project as.',
      });
    }
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
