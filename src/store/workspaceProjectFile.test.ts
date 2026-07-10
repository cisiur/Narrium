import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, WorkspaceState } from '../types';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    thumbnail: null,
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('workspace project file workflow', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function loadStoreWithProjectFileMocks(projectFilePath = 'C:/Stories/Test Project.narrium') {
    const project = createProject();
    const workspace: WorkspaceState = {
      projects: [],
      activeProjectId: null,
    };
    const projectStorage = {
      loadWorkspace: vi.fn(() => workspace),
      saveWorkspace: vi.fn(),
      loadProject: vi.fn(() => null),
      saveProject: vi.fn(),
      deleteProject: vi.fn(),
    };
    const appPreferencesService = {
      loadPreferences: vi.fn(() => ({
        recentProjects: [],
        lastOpenedProjectFilePath: null,
      })),
      savePreferences: vi.fn(),
      recordRecentProject: vi.fn(() => ({
        recentProjects: [
          {
            projectId: project.id,
            name: project.name,
            filePath: projectFilePath,
            lastOpenedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        lastOpenedProjectFilePath: projectFilePath,
      })),
      clearLastOpenedProject: vi.fn(() => ({
        recentProjects: [],
        lastOpenedProjectFilePath: null,
      })),
    };
    const projectFileService = {
      canUseProjectFiles: vi.fn(() => true),
      openProjectFile: vi.fn(() => Promise.resolve({ project, filePath: projectFilePath })),
      openProjectFileAt: vi.fn(() => Promise.resolve({ project, filePath: projectFilePath })),
      saveProject: vi.fn((_project: Project, filePath: string) => Promise.resolve({ project: _project, filePath })),
      saveProjectAs: vi.fn((_project: Project) => Promise.resolve({ project: _project, filePath: projectFilePath })),
    };
    const platformService = {
      isDesktop: vi.fn(() => false),
      isBrowser: vi.fn(() => true),
      platformName: vi.fn(() => 'browser'),
      confirmUnsavedChanges: vi.fn(),
      onCloseRequested: vi.fn(() => Promise.resolve(() => undefined)),
      selectProjectFileToOpen: vi.fn(),
      selectProjectFilePathForSaveAs: vi.fn(),
      readProjectFile: vi.fn(),
      writeProjectFile: vi.fn(),
    };

    vi.doMock('../services/project-storage', () => ({
      getProjectStorage: () => projectStorage,
    }));
    vi.doMock('../services/app-preferences', () => ({
      getAppPreferencesService: () => appPreferencesService,
    }));
    vi.doMock('../services/project-file', () => ({
      getProjectFileService: () => projectFileService,
    }));
    vi.doMock('../services/platform', () => ({
      getPlatformService: () => platformService,
    }));

    const { useWorkspaceStore } = await import('./workspaceStore');

    return { useWorkspaceStore, project, projectFileService, appPreferencesService };
  }

  it('sets the active project file path after opening a project file', async () => {
    const { useWorkspaceStore, project, projectFileService, appPreferencesService } =
      await loadStoreWithProjectFileMocks();

    await useWorkspaceStore.getState().openProjectFile();

    expect(projectFileService.openProjectFile).toHaveBeenCalled();
    expect(appPreferencesService.recordRecentProject).toHaveBeenCalledWith({
      projectId: project.id,
      name: project.name,
      filePath: 'C:/Stories/Test Project.narrium',
    });
    expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('C:/Stories/Test Project.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('sets the active project file path after opening a recent project', async () => {
    const { useWorkspaceStore, projectFileService } = await loadStoreWithProjectFileMocks();

    await useWorkspaceStore.getState().openRecentProject('C:/Stories/Test Project.narrium');

    expect(projectFileService.openProjectFileAt).toHaveBeenCalledWith('C:/Stories/Test Project.narrium');
    expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('C:/Stories/Test Project.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('sets the active project file path after Save As', async () => {
    const { useWorkspaceStore, project } = await loadStoreWithProjectFileMocks();

    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      activeProjectFilePath: null,
      activeProjectDirty: true,
    });

    await useWorkspaceStore.getState().saveActiveProjectAsFile();

    expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('C:/Stories/Test Project.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });
});
