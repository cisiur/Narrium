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

  async function loadStoreWithProjectFileMocks(
    projectFilePath = 'C:/Stories/Test Project.narrium',
    options: {
      isDesktop?: boolean;
      appPreferences?: {
        recentProjects: Array<{ projectId?: string; name: string; filePath: string; lastOpenedAt: string }>;
        lastOpenedProjectFilePath: string | null;
      };
    } = {},
  ) {
    const project = createProject();
    let closeRequestedHandler: (() => Promise<boolean>) | null = null;
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
      initialize: vi.fn(() =>
        Promise.resolve(
          options.appPreferences ?? {
            recentProjects: [],
            lastOpenedProjectFilePath: null,
          },
        ),
      ),
      loadPreferences: vi.fn(() => ({
        recentProjects: [],
        lastOpenedProjectFilePath: null,
      })),
      savePreferences: vi.fn(),
      recordRecentProject: vi.fn((recentProject: { projectId: string; name: string; filePath: string }) => ({
        recentProjects: [
          {
            ...recentProject,
            lastOpenedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        lastOpenedProjectFilePath: recentProject.filePath,
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
      isDesktop: vi.fn(() => Boolean(options.isDesktop)),
      isBrowser: vi.fn(() => !options.isDesktop),
      platformName: vi.fn(() => (options.isDesktop ? 'desktop' : 'browser')),
      confirmUnsavedChanges: vi.fn(),
      onCloseRequested: vi.fn((handler: () => Promise<boolean>) => {
        closeRequestedHandler = handler;
        return Promise.resolve(() => {
          closeRequestedHandler = null;
        });
      }),
      selectProjectFileToOpen: vi.fn(),
      selectProjectFilePathForSaveAs: vi.fn(),
      trustExistingProjectFile: vi.fn(),
      readProjectFile: vi.fn(),
      writeProjectFile: vi.fn(),
      importBackgroundAssetFile: vi.fn(() => Promise.resolve(null)),
      resolveLocalAssetDisplaySource: vi.fn(() => Promise.resolve(null)),
      copyLocalAssetForProjectSaveAs: vi.fn(() => Promise.resolve()),
      materializeEmbeddedBackgroundAssets: vi.fn(() => Promise.reject(new Error('not implemented'))),
      listLocalBackgroundFiles: vi.fn(() => Promise.resolve([])),
      fingerprintLocalBackgroundFiles: vi.fn(() => Promise.resolve([])),
      deleteLocalBackgroundFiles: vi.fn(() => Promise.resolve({ deleted: [], skipped: [], failed: [] })),
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

    return {
      useWorkspaceStore,
      project,
      projectStorage,
      projectFileService,
      appPreferencesService,
      platformService,
      getCloseRequestedHandler: () => closeRequestedHandler,
    };
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

    expect(projectFileService.saveProjectAs).toHaveBeenCalledWith(project, null);
    expect(projectStorage.saveProject).not.toHaveBeenCalled();
    expect(projectStorage.deleteProject).toHaveBeenCalledWith(project.id);
    expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('C:/Stories/Test Project.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('updates active project, workspace metadata, and recent metadata with the Save As project name', async () => {
    const { useWorkspaceStore, project, projectStorage, projectFileService, appPreferencesService } =
      await loadStoreWithProjectFileMocks('C:/Stories/Szept.narrium');
    const renamedProject = {
      ...project,
      name: 'Szept',
    };
    projectFileService.saveProjectAs.mockResolvedValueOnce({
      project: renamedProject,
      filePath: 'C:/Stories/Szept.narrium',
    });

    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: null,
      activeProjectDirty: true,
    });

    const didSave = await useWorkspaceStore.getState().saveActiveProjectAsFile();

    expect(didSave).toBe(true);
    expect(useWorkspaceStore.getState().activeProject?.name).toBe('Szept');
    expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('C:/Stories/Szept.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
    expect(projectStorage.saveWorkspace).toHaveBeenLastCalledWith({
      projects: [expect.objectContaining({ id: project.id, name: 'Szept' })],
      activeProjectId: project.id,
    });
    expect(appPreferencesService.recordRecentProject).toHaveBeenCalledWith({
      projectId: project.id,
      name: 'Szept',
      filePath: 'C:/Stories/Szept.narrium',
    });
    expect(useWorkspaceStore.getState().recentProjects[0]).toEqual(
      expect.objectContaining({
        projectId: project.id,
        name: 'Szept',
        filePath: 'C:/Stories/Szept.narrium',
      }),
    );
  });

  it('preserves active project name and path when Save As fails', async () => {
    const { useWorkspaceStore, project, projectFileService } = await loadStoreWithProjectFileMocks();

    projectFileService.saveProjectAs.mockRejectedValueOnce(new Error('copy failed'));
    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: 'C:/Stories/Original.narrium',
      activeProjectDirty: true,
      projectFileError: null,
    });

    const didSave = await useWorkspaceStore.getState().saveActiveProjectAsFile();

    expect(didSave).toBe(false);
    expect(useWorkspaceStore.getState().activeProject?.name).toBe('Test Project');
    expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('C:/Stories/Original.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(true);
    expect(useWorkspaceStore.getState().projectFileError).toBe('copy failed');
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

  it('adopts the migrated project returned from desktop Save and clears dirty state', async () => {
    const { useWorkspaceStore, project, projectFileService } = await loadStoreWithProjectFileMocks();
    const embeddedProject = createProject({
      assetLibrary: [
        {
          id: 'asset-embedded',
          kind: 'background',
          name: 'Forest',
          storageType: 'embedded',
          source: 'data:image/png;base64,cG5n',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const migratedProject = {
      ...embeddedProject,
      assetLibrary: [
        {
          ...embeddedProject.assetLibrary[0],
          storageType: 'local' as const,
          source: 'assets/backgrounds/forest.png',
        },
      ],
    };
    projectFileService.saveProject.mockResolvedValueOnce({
      project: migratedProject,
      filePath: 'C:/Stories/Test Project.narrium',
    });

    useWorkspaceStore.setState({
      activeProject: embeddedProject,
      activeProjectId: project.id,
      projects: [createProjectMeta(embeddedProject)],
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: true,
    });

    const didSave = await useWorkspaceStore.getState().saveActiveProjectToFile();

    expect(didSave).toBe(true);
    expect(useWorkspaceStore.getState().activeProject).toBe(migratedProject);
    expect(useWorkspaceStore.getState().activeProject?.assetLibrary[0]).toMatchObject({
      storageType: 'local',
      source: 'assets/backgrounds/forest.png',
    });
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('keeps the active project and dirty state when desktop Save migration fails', async () => {
    const { useWorkspaceStore, project, projectFileService } = await loadStoreWithProjectFileMocks();

    projectFileService.saveProject.mockRejectedValueOnce(new Error('materialize failed'));
    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: true,
      projectFileError: null,
    });

    const didSave = await useWorkspaceStore.getState().saveActiveProjectToFile();

    expect(didSave).toBe(false);
    expect(useWorkspaceStore.getState().activeProject).toBe(project);
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(true);
    expect(useWorkspaceStore.getState().projectFileError).toBe('materialize failed');
  });

  it('adopts the migrated and renamed project returned from desktop Save As', async () => {
    const { useWorkspaceStore, project, projectFileService } = await loadStoreWithProjectFileMocks();
    const migratedProject = {
      ...project,
      name: 'Saved Story',
      assetLibrary: [
        {
          id: 'asset-embedded',
          kind: 'background' as const,
          name: 'Forest',
          storageType: 'local' as const,
          source: 'assets/backgrounds/forest.png',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    projectFileService.saveProjectAs.mockResolvedValueOnce({
      project: migratedProject,
      filePath: 'C:/Stories/Saved Story.narrium',
    });

    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: null,
      activeProjectDirty: true,
    });

    const didSave = await useWorkspaceStore.getState().saveActiveProjectAsFile();

    expect(didSave).toBe(true);
    expect(useWorkspaceStore.getState().activeProject).toBe(migratedProject);
    expect(useWorkspaceStore.getState().activeProject?.name).toBe('Saved Story');
    expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('C:/Stories/Saved Story.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
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

  it('lets clean desktop native close continue without prompting', async () => {
    const { useWorkspaceStore, project, platformService, getCloseRequestedHandler } =
      await loadStoreWithProjectFileMocks('C:/Stories/Test Project.narrium', { isDesktop: true });

    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: false,
    });

    await useWorkspaceStore.getState().initializeDesktopLifecycle();

    await expect(getCloseRequestedHandler()?.()).resolves.toBe(true);
    expect(platformService.confirmUnsavedChanges).not.toHaveBeenCalled();
  });

  it('hydrates desktop recent projects from native app preferences during startup', async () => {
    const nativePreferences = {
      recentProjects: [
        {
          projectId: 'project-99',
          name: 'Native Recent',
          filePath: 'C:/Stories/Native Recent.narrium',
          lastOpenedAt: '2026-07-13T00:00:00.000Z',
        },
      ],
      lastOpenedProjectFilePath: 'C:/Stories/Native Recent.narrium',
    };
    const { useWorkspaceStore, appPreferencesService, projectFileService, platformService } = await loadStoreWithProjectFileMocks(
      'C:/Stories/Test Project.narrium',
      {
        isDesktop: true,
        appPreferences: nativePreferences,
      },
    );

    expect(useWorkspaceStore.getState().recentProjects).toEqual([]);

    await useWorkspaceStore.getState().initializeDesktopLifecycle();

    expect(appPreferencesService.initialize).toHaveBeenCalledTimes(1);
    expect(projectFileService.openProjectFileAt).not.toHaveBeenCalled();
    expect(platformService.trustExistingProjectFile).not.toHaveBeenCalled();
    expect(useWorkspaceStore.getState().recentProjects).toEqual(nativePreferences.recentProjects);
    expect(useWorkspaceStore.getState().lastOpenedProject).toEqual(nativePreferences.recentProjects[0]);
  });

  it('saves dirty file-backed projects before desktop native close', async () => {
    const { useWorkspaceStore, project, projectFileService, platformService, getCloseRequestedHandler } =
      await loadStoreWithProjectFileMocks('C:/Stories/Test Project.narrium', { isDesktop: true });

    platformService.confirmUnsavedChanges.mockResolvedValueOnce('save');
    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: true,
    });

    await useWorkspaceStore.getState().initializeDesktopLifecycle();

    await expect(getCloseRequestedHandler()?.()).resolves.toBe(true);
    expect(projectFileService.saveProject).toHaveBeenCalledWith(project, 'C:/Stories/Test Project.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('runs Save As for dirty drafts before desktop native close', async () => {
    const { useWorkspaceStore, project, projectFileService, platformService, getCloseRequestedHandler } =
      await loadStoreWithProjectFileMocks('C:/Stories/Saved Draft.narrium', { isDesktop: true });

    platformService.confirmUnsavedChanges.mockResolvedValueOnce('save');
    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: null,
      activeProjectDirty: true,
    });

    await useWorkspaceStore.getState().initializeDesktopLifecycle();

    await expect(getCloseRequestedHandler()?.()).resolves.toBe(true);
    expect(projectFileService.saveProjectAs).toHaveBeenCalledWith(project, null);
    expect(useWorkspaceStore.getState().activeProjectFilePath).toBe('C:/Stories/Saved Draft.narrium');
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('keeps desktop native close open when draft Save As is canceled', async () => {
    const { useWorkspaceStore, project, projectFileService, platformService, getCloseRequestedHandler } =
      await loadStoreWithProjectFileMocks('C:/Stories/Saved Draft.narrium', { isDesktop: true });

    projectFileService.saveProjectAs.mockResolvedValueOnce(null as never);
    platformService.confirmUnsavedChanges.mockResolvedValueOnce('save');
    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: null,
      activeProjectDirty: true,
    });

    await useWorkspaceStore.getState().initializeDesktopLifecycle();

    await expect(getCloseRequestedHandler()?.()).resolves.toBe(false);
    expect(useWorkspaceStore.getState().activeProjectFilePath).toBeNull();
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(true);
  });

  it('keeps desktop native close open when saving fails', async () => {
    const { useWorkspaceStore, project, projectFileService, platformService, getCloseRequestedHandler } =
      await loadStoreWithProjectFileMocks('C:/Stories/Test Project.narrium', { isDesktop: true });

    projectFileService.saveProject.mockRejectedValueOnce(new Error('disk full'));
    platformService.confirmUnsavedChanges.mockResolvedValueOnce('save');
    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: true,
      projectFileError: null,
    });

    await useWorkspaceStore.getState().initializeDesktopLifecycle();

    await expect(getCloseRequestedHandler()?.()).resolves.toBe(false);
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(true);
    expect(useWorkspaceStore.getState().projectFileError).toBe('disk full');
  });

  it("lets desktop native close continue without saving when the author chooses Don't Save", async () => {
    const { useWorkspaceStore, project, projectFileService, platformService, getCloseRequestedHandler } =
      await loadStoreWithProjectFileMocks('C:/Stories/Test Project.narrium', { isDesktop: true });

    platformService.confirmUnsavedChanges.mockResolvedValueOnce('discard');
    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: true,
    });

    await useWorkspaceStore.getState().initializeDesktopLifecycle();

    await expect(getCloseRequestedHandler()?.()).resolves.toBe(true);
    expect(projectFileService.saveProject).not.toHaveBeenCalled();
    expect(projectFileService.saveProjectAs).not.toHaveBeenCalled();
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('keeps desktop native close open and dirty when the author cancels', async () => {
    const { useWorkspaceStore, project, platformService, getCloseRequestedHandler } =
      await loadStoreWithProjectFileMocks('C:/Stories/Test Project.narrium', { isDesktop: true });

    platformService.confirmUnsavedChanges.mockResolvedValueOnce('cancel');
    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: true,
    });

    await useWorkspaceStore.getState().initializeDesktopLifecycle();

    await expect(getCloseRequestedHandler()?.()).resolves.toBe(false);
    expect(useWorkspaceStore.getState().activeProject?.id).toBe(project.id);
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(true);
  });

  it('keeps desktop native close usable after the unsaved-changes dialog rejects', async () => {
    const { useWorkspaceStore, project, platformService, getCloseRequestedHandler } =
      await loadStoreWithProjectFileMocks('C:/Stories/Test Project.narrium', { isDesktop: true });

    platformService.confirmUnsavedChanges
      .mockRejectedValueOnce(new Error('Command plugin:dialog|confirm not allowed by ACL'))
      .mockResolvedValueOnce('discard');
    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: true,
      projectFileError: null,
    });

    await useWorkspaceStore.getState().initializeDesktopLifecycle();

    await expect(getCloseRequestedHandler()?.()).resolves.toBe(false);
    expect(useWorkspaceStore.getState().activeProject?.id).toBe(project.id);
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(true);
    expect(useWorkspaceStore.getState().projectFileError).toBe('Command plugin:dialog|confirm not allowed by ACL');

    await expect(getCloseRequestedHandler()?.()).resolves.toBe(true);
    expect(platformService.confirmUnsavedChanges).toHaveBeenCalledTimes(2);
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('keeps existing Create and Open Project File dirty guards working', async () => {
    const { useWorkspaceStore, project, projectFileService, platformService } =
      await loadStoreWithProjectFileMocks();

    platformService.confirmUnsavedChanges.mockResolvedValueOnce('cancel');
    useWorkspaceStore.setState({
      activeProject: project,
      activeProjectId: project.id,
      projects: [createProjectMeta(project)],
      activeProjectFilePath: 'C:/Stories/Test Project.narrium',
      activeProjectDirty: true,
    });

    await expect(useWorkspaceStore.getState().createProjectWithUnsavedCheck()).resolves.toBeNull();
    expect(useWorkspaceStore.getState().activeProject?.id).toBe(project.id);

    platformService.confirmUnsavedChanges.mockResolvedValueOnce('discard');
    await useWorkspaceStore.getState().openProjectFile();

    expect(projectFileService.openProjectFile).toHaveBeenCalledTimes(1);
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
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
