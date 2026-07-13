import { create } from 'zustand';
import { getAppPreferencesService, type RecentProject } from '../services/app-preferences';
import { getPlatformService, type UnsavedChangesAction } from '../services/platform';
import { getProjectFileService } from '../services/project-file';
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
const projectFileService = getProjectFileService();
const appPreferencesService = getAppPreferencesService();
const platformService = getPlatformService();
const initialAppPreferences = appPreferencesService.loadPreferences();
let desktopLifecycleInitialized = false;

interface WorkspaceStore extends WorkspaceState {
  activeProject: Project | null;
  projectHistory: ProjectHistoryState;
  activeProjectFilePath: string | null;
  activeProjectDirty: boolean;
  projectFileError: string | null;
  canUseProjectFiles: boolean;
  recentProjects: RecentProject[];
  lastOpenedProject: RecentProject | null;
  createProject: () => WorkspaceProjectMeta;
  createProjectWithUnsavedCheck: () => Promise<WorkspaceProjectMeta | null>;
  importProject: (project: Project) => WorkspaceProjectMeta;
  openProjectFile: () => Promise<void>;
  openRecentProject: (filePath: string) => Promise<void>;
  openProject: (projectId: string) => void;
  openProjectWithUnsavedCheck: (projectId: string) => Promise<void>;
  closeProject: () => void;
  saveActiveProjectToFile: () => Promise<boolean>;
  saveActiveProjectAsFile: () => Promise<boolean>;
  initializeDesktopLifecycle: () => Promise<void>;
  ensureCanLeaveActiveProject: () => Promise<boolean>;
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

function getLastOpenedProject(recentProjects: RecentProject[], filePath: string | null): RecentProject | null {
  if (!filePath) {
    return null;
  }

  return recentProjects.find((project) => project.filePath === filePath) ?? null;
}

function recordOpenedProject(project: Project, filePath: string) {
  return appPreferencesService.recordRecentProject({
    projectId: project.id,
    name: project.name,
    filePath,
  });
}

function isActiveFileBackedProject(state: Pick<WorkspaceStore, 'activeProject' | 'activeProjectFilePath'>, projectId: string) {
  return state.activeProject?.id === projectId && state.activeProjectFilePath !== null;
}

function saveProjectIfLocalDraft(state: Pick<WorkspaceStore, 'activeProject' | 'activeProjectFilePath'>, project: Project) {
  if (isActiveFileBackedProject(state, project.id)) {
    return;
  }

  projectStorage.saveProject(project);
}

function getStorageErrorMessage(error: unknown): string {
  if (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'QuotaExceededError'
  ) {
    return 'Could not save project draft because browser storage is full. Use Save As for a .narrium file or remove large embedded assets from drafts.';
  }

  return error instanceof Error ? error.message : 'Could not save project draft.';
}

const initialWorkspace = projectStorage.loadWorkspace();

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  ...initialWorkspace,
  activeProject: projectStorage.loadProject(initialWorkspace.activeProjectId),
  projectHistory: createEmptyProjectHistory(initialWorkspace.activeProjectId),
  activeProjectFilePath: null,
  activeProjectDirty: false,
  projectFileError: null,
  canUseProjectFiles: projectFileService.canUseProjectFiles(),
  recentProjects: initialAppPreferences.recentProjects,
  lastOpenedProject: getLastOpenedProject(
    initialAppPreferences.recentProjects,
    initialAppPreferences.lastOpenedProjectFilePath,
  ),
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
        activeProjectFilePath: null,
        activeProjectDirty: false,
        projectFileError: null,
      };
    });

    return projectMeta;
  },
  createProjectWithUnsavedCheck: async () => {
    if (!(await get().ensureCanLeaveActiveProject())) {
      return null;
    }

    return get().createProject();
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
        activeProjectFilePath: null,
        activeProjectDirty: false,
        projectFileError: null,
      };
    });

    return projectMeta;
  },
  openProjectFile: async () => {
    if (!(await get().ensureCanLeaveActiveProject())) {
      return;
    }

    try {
      const projectFile = await projectFileService.openProjectFile();

      if (!projectFile) {
        return;
      }

      projectStorage.deleteProject(projectFile.project.id);
      const preferences = recordOpenedProject(projectFile.project, projectFile.filePath);

      set((state) => {
        const nextWorkspace = {
          projects: [
            ...state.projects.filter((project) => project.id !== projectFile.project.id),
            createProjectMetaFromProject(projectFile.project),
          ],
          activeProjectId: projectFile.project.id,
        };

        projectStorage.saveWorkspace(nextWorkspace);

        return {
          ...nextWorkspace,
          activeProject: projectFile.project,
          projectHistory: createEmptyProjectHistory(projectFile.project.id),
          activeProjectFilePath: projectFile.filePath,
          activeProjectDirty: false,
          projectFileError: null,
          recentProjects: preferences.recentProjects,
          lastOpenedProject: getLastOpenedProject(
            preferences.recentProjects,
            preferences.lastOpenedProjectFilePath,
          ),
        };
      });
    } catch (error) {
      set({
        projectFileError: error instanceof Error ? error.message : 'Could not open project file.',
      });
    }
  },
  openRecentProject: async (filePath) => {
    if (!(await get().ensureCanLeaveActiveProject())) {
      return;
    }

    try {
      const projectFile = await projectFileService.openProjectFileAt(filePath);

      projectStorage.deleteProject(projectFile.project.id);
      const preferences = recordOpenedProject(projectFile.project, projectFile.filePath);

      set((state) => {
        const nextWorkspace = {
          projects: [
            ...state.projects.filter((project) => project.id !== projectFile.project.id),
            createProjectMetaFromProject(projectFile.project),
          ],
          activeProjectId: projectFile.project.id,
        };

        projectStorage.saveWorkspace(nextWorkspace);

        return {
          ...nextWorkspace,
          activeProject: projectFile.project,
          projectHistory: createEmptyProjectHistory(projectFile.project.id),
          activeProjectFilePath: projectFile.filePath,
          activeProjectDirty: false,
          projectFileError: null,
          recentProjects: preferences.recentProjects,
          lastOpenedProject: getLastOpenedProject(
            preferences.recentProjects,
            preferences.lastOpenedProjectFilePath,
          ),
        };
      });
    } catch (error) {
      const preferences = appPreferencesService.clearLastOpenedProject();

      set({
        projectFileError: error instanceof Error ? error.message : 'Could not open recent project.',
        recentProjects: preferences.recentProjects,
        lastOpenedProject: null,
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
        activeProjectFilePath: null,
        activeProjectDirty: false,
        projectFileError: null,
      };
    });
  },
  openProjectWithUnsavedCheck: async (projectId) => {
    if (!(await get().ensureCanLeaveActiveProject())) {
      return;
    }

    get().openProject(projectId);
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
        activeProjectFilePath: null,
        activeProjectDirty: false,
        projectFileError: null,
      };
    });
  },
  saveActiveProjectToFile: async () => {
    const { activeProject, activeProjectFilePath } = get();

    if (!activeProject) {
      return false;
    }

    if (!activeProjectFilePath) {
      return get().saveActiveProjectAsFile();
    }

    try {
      const projectFile = await projectFileService.saveProject(activeProject, activeProjectFilePath);

      const preferences = recordOpenedProject(projectFile.project, projectFile.filePath);

      set((state) => {
        const nextWorkspace = createWorkspaceForProject(state, projectFile.project);

        projectStorage.saveWorkspace(nextWorkspace);

        return {
          ...nextWorkspace,
          activeProject: projectFile.project,
          activeProjectFilePath: projectFile.filePath,
          activeProjectDirty: false,
          projectFileError: null,
          recentProjects: preferences.recentProjects,
          lastOpenedProject: getLastOpenedProject(
            preferences.recentProjects,
            preferences.lastOpenedProjectFilePath,
          ),
        };
      });

      return true;
    } catch (error) {
      set({
        projectFileError: error instanceof Error ? error.message : 'Could not save project.',
      });

      return false;
    }
  },
  saveActiveProjectAsFile: async () => {
    const { activeProject } = get();

    if (!activeProject) {
      return false;
    }

    try {
      const projectFile = await projectFileService.saveProjectAs(activeProject, get().activeProjectFilePath);

      if (!projectFile) {
        return false;
      }

      projectStorage.deleteProject(projectFile.project.id);
      const preferences = recordOpenedProject(projectFile.project, projectFile.filePath);

      set((state) => {
        const nextWorkspace = createWorkspaceForProject(state, projectFile.project);

        projectStorage.saveWorkspace(nextWorkspace);

        return {
          ...nextWorkspace,
          activeProject: projectFile.project,
          activeProjectFilePath: projectFile.filePath,
          activeProjectDirty: false,
          projectFileError: null,
          recentProjects: preferences.recentProjects,
          lastOpenedProject: getLastOpenedProject(
            preferences.recentProjects,
            preferences.lastOpenedProjectFilePath,
          ),
        };
      });

      return true;
    } catch (error) {
      set({
        projectFileError: error instanceof Error ? error.message : 'Could not save project as.',
      });

      return false;
    }
  },
  initializeDesktopLifecycle: async () => {
    if (!platformService.isDesktop() || desktopLifecycleInitialized) {
      return;
    }

    desktopLifecycleInitialized = true;
    await platformService.onCloseRequested(() => get().ensureCanLeaveActiveProject());
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

      try {
        saveProjectIfLocalDraft(state, nextProject);
        projectStorage.saveWorkspace(nextWorkspace);
      } catch (error) {
        return {
          ...state,
          projectFileError: getStorageErrorMessage(error),
        };
      }

      return {
        ...nextWorkspace,
        activeProject: state.activeProject?.id === projectId ? nextProject : state.activeProject,
        activeProjectDirty: state.activeProject?.id === projectId ? true : state.activeProjectDirty,
        projectFileError: null,
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

      try {
        saveProjectIfLocalDraft(state, nextProject);
        projectStorage.saveWorkspace(nextWorkspace);
      } catch (error) {
        return {
          ...state,
          projectFileError: getStorageErrorMessage(error),
        };
      }

      return {
        ...nextWorkspace,
        activeProject: state.activeProject?.id === projectId ? nextProject : state.activeProject,
        activeProjectDirty: state.activeProject?.id === projectId ? true : state.activeProjectDirty,
        projectFileError: null,
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
        activeProjectDirty:
          state.activeProject?.id === projectId ? false : state.activeProjectDirty,
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

      try {
        saveProjectIfLocalDraft(state, nextProject);
        projectStorage.saveWorkspace(nextWorkspace);
      } catch (error) {
        return {
          ...state,
          projectFileError: getStorageErrorMessage(error),
        };
      }

      return {
        ...nextWorkspace,
        activeProject: nextProject,
        projectHistory: pushProjectSnapshot(state.projectHistory, state.activeProject),
        activeProjectDirty: true,
        projectFileError: null,
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

      try {
        saveProjectIfLocalDraft(state, nextProject);
        projectStorage.saveWorkspace(nextWorkspace);
      } catch (error) {
        return {
          ...state,
          projectFileError: getStorageErrorMessage(error),
        };
      }

      return {
        ...nextWorkspace,
        activeProject: nextProject,
        projectHistory: result.history,
        activeProjectDirty: true,
        projectFileError: null,
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

      try {
        saveProjectIfLocalDraft(state, nextProject);
        projectStorage.saveWorkspace(nextWorkspace);
      } catch (error) {
        return {
          ...state,
          projectFileError: getStorageErrorMessage(error),
        };
      }

      return {
        ...nextWorkspace,
        activeProject: nextProject,
        projectHistory: result.history,
        activeProjectDirty: true,
        projectFileError: null,
      };
    });

    return didRedo;
  },
  ensureCanLeaveActiveProject: async () => {
    const { activeProject, activeProjectDirty } = get();

    if (!activeProject || !activeProjectDirty) {
      return true;
    }

    let action: UnsavedChangesAction;

    try {
      action = await platformService.confirmUnsavedChanges(activeProject.name);
    } catch (error) {
      set({
        projectFileError: error instanceof Error ? error.message : 'Could not confirm unsaved changes.',
      });

      return false;
    }

    if (action === 'cancel') {
      return false;
    }

    if (action === 'discard') {
      set({ activeProjectDirty: false });
      return true;
    }

    return get().saveActiveProjectToFile();
  },
}));
