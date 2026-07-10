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

    return { useWorkspaceStore, project, projectStorage, projectFileService, appPreferencesService };
  }

  it('sets the active project file path after opening a project file', async () => {
    const { useWorkspaceStore, project, projectStorage, projectFileService, appPreferencesService } =
      await loadStoreWithProjectFileMocks();

    await useWorkspaceStore.getState().openProjectFile();

    expect(projectFileService.openProjectFile).toHaveBeenCalled();
    expect(projectStorage.saveProject).not.toHaveBeenCalled();
    expect(projectStorage.saveWorkspace).toHaveBeenCalledWith({
      projects: [expect.objectContaining({ id: project.id, name: project.name })],
      activeProjectId: project.id,
    });
    expect(appPreferencesService.recordRecentProject).toHaveBeenCalledWith({
      projectId: project.id,
      name: project.name,
      filePath: 'C:/Stories/Test Project.narrium',
    });
    expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('C:/Stories/Test Project.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('sets the active project file path after opening a recent project', async () => {
    const { useWorkspaceStore, projectStorage, projectFileService } = await loadStoreWithProjectFileMocks();

    await useWorkspaceStore.getState().openRecentProject('C:/Stories/Test Project.narrium');

    expect(projectFileService.openProjectFileAt).toHaveBeenCalledWith('C:/Stories/Test Project.narrium');
    expect(projectStorage.saveProject).not.toHaveBeenCalled();
    expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('C:/Stories/Test Project.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('sets the active project file path after Save As', async () => {
    const { useWorkspaceStore, project, projectStorage, projectFileService } = await loadStoreWithProjectFileMocks();

    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      activeProjectFilePath: null,
      activeProjectDirty: true,
    });

    await useWorkspaceStore.getState().saveActiveProjectAsFile();

    expect(projectFileService.saveProjectAs).toHaveBeenCalledWith(project);
    expect(projectStorage.saveProject).not.toHaveBeenCalled();
    expect(projectStorage.deleteProject).toHaveBeenCalledWith(project.id);
    expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('C:/Stories/Test Project.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('keeps desktop file-backed edits in memory without saving full Project JSON to BrowserProjectStorage', async () => {
    const { useWorkspaceStore, project, projectStorage } = await loadStoreWithProjectFileMocks();

    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [
        {
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          thumbnailDataUrl: project.thumbnail,
        },
      ],
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: false,
    });
    projectStorage.saveProject.mockClear();
    projectStorage.saveWorkspace.mockClear();

    useWorkspaceStore.getState().updateActiveProject((currentProject) => ({
      ...currentProject,
      name: 'Edited File Project',
    }));

    expect(projectStorage.saveProject).not.toHaveBeenCalled();
    expect(projectStorage.saveWorkspace).toHaveBeenCalledWith({
      projects: [expect.objectContaining({ id: project.id, name: 'Edited File Project' })],
      activeProjectId: project.id,
    });
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(true);
  });

  it('still saves full Project JSON for browser and local draft workflows', async () => {
    const { useWorkspaceStore, project, projectStorage } = await loadStoreWithProjectFileMocks();

    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [
        {
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          thumbnailDataUrl: project.thumbnail,
        },
      ],
      activeProjectFilePath: null,
      activeProjectDirty: false,
    });
    projectStorage.saveProject.mockClear();

    useWorkspaceStore.getState().updateActiveProject((currentProject) => ({
      ...currentProject,
      name: 'Edited Draft',
    }));

    expect(projectStorage.saveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: project.id,
        name: 'Edited Draft',
      }),
    );
  });

  it('writes Save only through the .narrium project file service', async () => {
    const { useWorkspaceStore, project, projectStorage, projectFileService } =
      await loadStoreWithProjectFileMocks();

    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: true,
    });

    const didSave = await useWorkspaceStore.getState().saveActiveProjectToFile();

    expect(didSave).toBe(true);
    expect(projectFileService.saveProject).toHaveBeenCalledWith(project, 'C:/Stories/Test Project.narrium');
    expect(projectStorage.saveProject).not.toHaveBeenCalled();
    expect(projectStorage.saveWorkspace).toHaveBeenCalled();
  });

  it('surfaces browser draft quota errors instead of silently failing', async () => {
    const { useWorkspaceStore, project, projectStorage } = await loadStoreWithProjectFileMocks();
    const quotaError = new DOMException('Storage quota exceeded', 'QuotaExceededError');

    projectStorage.saveProject.mockImplementation(() => {
      throw quotaError;
    });
    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: null,
      activeProjectDirty: false,
      projectFileError: null,
    });

    useWorkspaceStore.getState().updateActiveProject((currentProject) => ({
      ...currentProject,
      name: 'Too Large Draft',
    }));

    expect(useWorkspaceStore.getState().projectFileError).toBe(
      'Could not save project draft because browser storage is full. Use Save As for a .narrium file or remove large embedded assets from drafts.',
    );
    expect(useWorkspaceStore.getState().activeProject?.name).toBe(project.name);
  });

  it('allows repeated embedded asset edits for file-backed projects without localStorage Project writes', async () => {
    const { useWorkspaceStore, project, projectStorage } = await loadStoreWithProjectFileMocks();

    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: false,
    });
    projectStorage.saveProject.mockClear();

    for (let index = 0; index < 5; index += 1) {
      useWorkspaceStore.getState().updateActiveProject((currentProject) => ({
        ...currentProject,
        assetLibrary: [
          ...currentProject.assetLibrary,
          {
            id: `asset-${index}`,
            kind: 'background',
            name: `Background ${index}`,
            storageType: 'embedded',
            source: `data:image/png;base64,${index}`,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }));
    }

    expect(useWorkspaceStore.getState().activeProject?.assetLibrary).toHaveLength(5);
    expect(projectStorage.saveProject).not.toHaveBeenCalled();
    expect(useWorkspaceStore.getState().projectFileError).toBeNull();
  });
});

function createProjectMeta(project: Project) {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    thumbnailDataUrl: project.thumbnail,
  };
}
