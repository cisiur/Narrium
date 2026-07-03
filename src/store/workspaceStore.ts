import { create } from 'zustand';
import { getAppPreferencesService, type RecentProject } from '../services/app-preferences';
import { getProjectAssetService, type ProjectAssetUrlMap } from '../services/assets';
import { getPlatformService, type UnsavedChangesAction } from '../services/platform';
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
const projectAssetService = getProjectAssetService();
const appPreferencesService = getAppPreferencesService();
const platformService = getPlatformService();
const initialAppPreferences = appPreferencesService.loadPreferences();
let desktopLifecycleInitialized = false;

interface WorkspaceStore extends WorkspaceState {
  activeProject: Project | null;
  projectHistory: ProjectHistoryState;
  activeProjectFolderPath: string | null;
  activeProjectFilePath: string | null;
  activeProjectDirty: boolean;
  projectAssetUrls: ProjectAssetUrlMap;
  projectFolderError: string | null;
  canUseProjectFolders: boolean;
  recentProjects: RecentProject[];
  lastOpenedProject: RecentProject | null;
  createProject: () => WorkspaceProjectMeta;
  createProjectWithUnsavedCheck: () => Promise<WorkspaceProjectMeta | null>;
  createProjectFolder: () => Promise<void>;
  importProject: (project: Project) => WorkspaceProjectMeta;
  openProjectFolder: () => Promise<void>;
  openRecentProject: (folderPath: string) => Promise<void>;
  openProject: (projectId: string) => void;
  openProjectWithUnsavedCheck: (projectId: string) => Promise<void>;
  closeProject: () => void;
  saveActiveProjectToFolder: () => Promise<boolean>;
  saveActiveProjectAsFolder: () => Promise<boolean>;
  importBackgroundImageToProject: () => Promise<{ name: string; url: string } | null>;
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

function getLastOpenedProject(recentProjects: RecentProject[], folderPath: string | null): RecentProject | null {
  if (!folderPath) {
    return null;
  }

  return recentProjects.find((project) => project.folderPath === folderPath) ?? null;
}

function recordOpenedProject(project: Project, folderPath: string) {
  return appPreferencesService.recordRecentProject({
    name: project.name,
    folderPath,
  });
}

const initialWorkspace = projectStorage.loadWorkspace();

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  ...initialWorkspace,
  activeProject: projectStorage.loadProject(initialWorkspace.activeProjectId),
  projectHistory: createEmptyProjectHistory(initialWorkspace.activeProjectId),
  activeProjectFolderPath: null,
  activeProjectFilePath: null,
  activeProjectDirty: false,
  projectAssetUrls: {},
  projectFolderError: null,
  canUseProjectFolders: projectFolderService.canUseProjectFolders(),
  recentProjects: initialAppPreferences.recentProjects,
  lastOpenedProject: getLastOpenedProject(
    initialAppPreferences.recentProjects,
    initialAppPreferences.lastOpenedProjectFolderPath,
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
        activeProjectFolderPath: null,
        activeProjectFilePath: null,
        activeProjectDirty: false,
        projectAssetUrls: {},
        projectFolderError: null,
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
  createProjectFolder: async () => {
    if (!(await get().ensureCanLeaveActiveProject())) {
      return;
    }

    const projectMeta = createProjectMeta();
    const project = createEmptyProject(projectMeta);

    try {
      const projectFolder = await projectFolderService.createProjectFolder(project);

      if (!projectFolder) {
        return;
      }

      projectStorage.saveProject(projectFolder.project);
      const preferences = recordOpenedProject(projectFolder.project, projectFolder.folderPath);
      const projectAssetUrls = await projectAssetService.resolveProjectAssetUrls(
        projectFolder.project,
        projectFolder.folderPath,
      );

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
          activeProjectDirty: false,
          projectAssetUrls,
          projectFolderError: null,
          recentProjects: preferences.recentProjects,
          lastOpenedProject: getLastOpenedProject(
            preferences.recentProjects,
            preferences.lastOpenedProjectFolderPath,
          ),
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
        activeProjectDirty: false,
        projectAssetUrls: {},
        projectFolderError: null,
      };
    });

    return projectMeta;
  },
  openProjectFolder: async () => {
    if (!(await get().ensureCanLeaveActiveProject())) {
      return;
    }

    try {
      const projectFolder = await projectFolderService.openProjectFolder();

      if (!projectFolder) {
        return;
      }

      projectStorage.saveProject(projectFolder.project);
      const preferences = recordOpenedProject(projectFolder.project, projectFolder.folderPath);
      const projectAssetUrls = await projectAssetService.resolveProjectAssetUrls(
        projectFolder.project,
        projectFolder.folderPath,
      );

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
          activeProjectDirty: false,
          projectAssetUrls,
          projectFolderError: null,
          recentProjects: preferences.recentProjects,
          lastOpenedProject: getLastOpenedProject(
            preferences.recentProjects,
            preferences.lastOpenedProjectFolderPath,
          ),
        };
      });
    } catch (error) {
      set({
        projectFolderError: error instanceof Error ? error.message : 'Could not open project folder.',
      });
    }
  },
  openRecentProject: async (folderPath) => {
    if (!(await get().ensureCanLeaveActiveProject())) {
      return;
    }

    try {
      const projectFolder = await projectFolderService.openProjectFolderAt(folderPath);

      projectStorage.saveProject(projectFolder.project);
      const preferences = recordOpenedProject(projectFolder.project, projectFolder.folderPath);
      const projectAssetUrls = await projectAssetService.resolveProjectAssetUrls(
        projectFolder.project,
        projectFolder.folderPath,
      );

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
          activeProjectDirty: false,
          projectAssetUrls,
          projectFolderError: null,
          recentProjects: preferences.recentProjects,
          lastOpenedProject: getLastOpenedProject(
            preferences.recentProjects,
            preferences.lastOpenedProjectFolderPath,
          ),
        };
      });
    } catch (error) {
      const preferences = appPreferencesService.clearLastOpenedProject();

      set({
        projectFolderError: error instanceof Error ? error.message : 'Could not open recent project.',
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
        activeProjectFolderPath: null,
        activeProjectFilePath: null,
        activeProjectDirty: false,
        projectAssetUrls: {},
        projectFolderError: null,
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
        activeProjectFolderPath: null,
        activeProjectFilePath: null,
        activeProjectDirty: false,
        projectAssetUrls: {},
        projectFolderError: null,
      };
    });
  },
  saveActiveProjectToFolder: async () => {
    const { activeProject, activeProjectFolderPath } = get();

    if (!activeProject) {
      return false;
    }

    if (!activeProjectFolderPath) {
      return get().saveActiveProjectAsFolder();
    }

    try {
      const projectFolder = await projectFolderService.saveProject(activeProject, activeProjectFolderPath);

      projectStorage.saveProject(projectFolder.project);
      const preferences = recordOpenedProject(projectFolder.project, projectFolder.folderPath);
      const projectAssetUrls = await projectAssetService.resolveProjectAssetUrls(
        projectFolder.project,
        projectFolder.folderPath,
      );

      set((state) => {
        const nextWorkspace = createWorkspaceForProject(state, projectFolder.project);

        projectStorage.saveWorkspace(nextWorkspace);

        return {
          ...nextWorkspace,
          activeProject: projectFolder.project,
          activeProjectFolderPath: projectFolder.folderPath,
          activeProjectFilePath: projectFolder.filePath,
          activeProjectDirty: false,
          projectAssetUrls,
          projectFolderError: null,
          recentProjects: preferences.recentProjects,
          lastOpenedProject: getLastOpenedProject(
            preferences.recentProjects,
            preferences.lastOpenedProjectFolderPath,
          ),
        };
      });

      return true;
    } catch (error) {
      set({
        projectFolderError: error instanceof Error ? error.message : 'Could not save project.',
      });

      return false;
    }
  },
  saveActiveProjectAsFolder: async () => {
    const { activeProject } = get();

    if (!activeProject) {
      return false;
    }

    try {
      const projectFolder = await projectFolderService.saveProjectAs(activeProject);

      if (!projectFolder) {
        return false;
      }

      projectStorage.saveProject(projectFolder.project);
      const preferences = recordOpenedProject(projectFolder.project, projectFolder.folderPath);
      const projectAssetUrls = await projectAssetService.resolveProjectAssetUrls(
        projectFolder.project,
        projectFolder.folderPath,
      );

      set((state) => {
        const nextWorkspace = createWorkspaceForProject(state, projectFolder.project);

        projectStorage.saveWorkspace(nextWorkspace);

        return {
          ...nextWorkspace,
          activeProject: projectFolder.project,
          activeProjectFolderPath: projectFolder.folderPath,
          activeProjectFilePath: projectFolder.filePath,
          activeProjectDirty: false,
          projectAssetUrls,
          projectFolderError: null,
          recentProjects: preferences.recentProjects,
          lastOpenedProject: getLastOpenedProject(
            preferences.recentProjects,
            preferences.lastOpenedProjectFolderPath,
          ),
        };
      });

      return true;
    } catch (error) {
      set({
        projectFolderError: error instanceof Error ? error.message : 'Could not save project as.',
      });

      return false;
    }
  },
  importBackgroundImageToProject: async () => {
    const { activeProjectFolderPath } = get();

    if (!activeProjectFolderPath || !projectAssetService.canImportLocalBackgrounds()) {
      return null;
    }

    try {
      const backgroundAsset = await projectAssetService.importBackgroundImage(activeProjectFolderPath);

      if (!backgroundAsset) {
        return null;
      }

      set((state) => ({
        projectAssetUrls: {
          ...state.projectAssetUrls,
          [backgroundAsset.relativePath]: backgroundAsset.renderUrl,
        },
        projectFolderError: null,
      }));

      return {
        name: backgroundAsset.fileName,
        url: backgroundAsset.relativePath,
      };
    } catch (error) {
      set({
        projectFolderError:
          error instanceof Error ? error.message : 'Could not import background image.',
      });

      return null;
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

      projectStorage.saveProject(nextProject);
      projectStorage.saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: state.activeProject?.id === projectId ? nextProject : state.activeProject,
        activeProjectDirty: state.activeProject?.id === projectId ? true : state.activeProjectDirty,
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
        activeProjectDirty: state.activeProject?.id === projectId ? true : state.activeProjectDirty,
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

      projectStorage.saveProject(nextProject);
      projectStorage.saveWorkspace(nextWorkspace);

      return {
        ...nextWorkspace,
        activeProject: nextProject,
        projectHistory: pushProjectSnapshot(state.projectHistory, state.activeProject),
        activeProjectDirty: true,
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
        activeProjectDirty: true,
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
        activeProjectDirty: true,
      };
    });

    return didRedo;
  },
  ensureCanLeaveActiveProject: async () => {
    const { activeProject, activeProjectDirty } = get();

    if (!activeProject || !activeProjectDirty) {
      return true;
    }

    const action: UnsavedChangesAction = await platformService.confirmUnsavedChanges(activeProject.name);

    if (action === 'cancel') {
      return false;
    }

    if (action === 'discard') {
      set({ activeProjectDirty: false });
      return true;
    }

    return get().saveActiveProjectToFolder();
  },
}));
