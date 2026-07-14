import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../types';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'File-backed Draft',
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

describe('App JSON export', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports JSON without changing workspace file path, dirty state, project name, or recent metadata', async () => {
    const activeProject = createProject();
    const exportProject = vi.fn(() => Promise.resolve());
    const saveActiveProjectToFile = vi.fn(() => Promise.resolve(true));
    const saveActiveProjectAsFile = vi.fn(() => Promise.resolve(true));
    const recentProjects = [
      {
        projectId: activeProject.id,
        name: activeProject.name,
        filePath: 'C:/Stories/File-backed Draft.narrium',
        lastOpenedAt: '2026-07-14T00:00:00.000Z',
      },
    ];
    const workspaceState = {
      activeProject,
      activeProjectFilePath: 'C:/Stories/File-backed Draft.narrium',
      activeProjectDirty: true,
      canUseProjectFiles: true,
      recentProjects,
      closeProject: vi.fn(),
      saveActiveProjectToFile,
      saveActiveProjectAsFile,
      initializeDesktopLifecycle: vi.fn(() => Promise.resolve()),
    };
    const canvasState = {
      addScene: vi.fn(),
      groupSelectedScenes: vi.fn(),
      assignSelectedScenesToGroup: vi.fn(),
      ungroupSelectedScenes: vi.fn(),
      ungroupSelectedGroup: vi.fn(),
      selectedSceneIds: [],
      selectedGroupId: null,
    };
    const projectViewState = {
      activeProjectView: 'canvas',
      setActiveProjectView: vi.fn(),
    };
    let onExportProject: (() => void) | undefined;

    vi.doMock('../components/AppShell', () => ({
      AppShell: ({ children, onExportProject: exportHandler }: { children: unknown; onExportProject?: () => void }) => {
        onExportProject = exportHandler;
        return <div>{children as never}</div>;
      },
    }));
    vi.doMock('../components', () => ({
      useConfirmationDialog: () => ({
        confirm: vi.fn(() => Promise.resolve(true)),
        confirmationDialog: null,
      }),
    }));
    vi.doMock('../features/canvas/SceneCanvas', () => ({ SceneCanvas: () => <div /> }));
    vi.doMock('../features/characters/CharactersScreen', () => ({ CharactersScreen: () => <div /> }));
    vi.doMock('../features/editor/SceneEditorPanel', () => ({ SceneEditorPanel: () => <div /> }));
    vi.doMock('../features/player/StoryPlayer', () => ({ StoryPlayer: () => <div /> }));
    vi.doMock('../features/resources/ResourcesScreen', () => ({ ResourcesScreen: () => <div /> }));
    vi.doMock('../features/variables/VariablesScreen', () => ({ VariablesScreen: () => <div /> }));
    vi.doMock('../features/workspace/MyProjectsScreen', () => ({ MyProjectsScreen: () => <div /> }));
    vi.doMock('../store/workspaceStore', () => ({
      useWorkspaceStore: (selector: (state: typeof workspaceState) => unknown) => selector(workspaceState),
    }));
    vi.doMock('../store/useCanvasStore', () => ({
      useCanvasStore: (selector: (state: typeof canvasState) => unknown) => selector(canvasState),
    }));
    vi.doMock('../store/useProjectViewStore', () => ({
      useProjectViewStore: (selector: (state: typeof projectViewState) => unknown) =>
        selector(projectViewState),
    }));
    vi.doMock('../services/json-export', () => ({
      getJsonExportService: () => ({
        exportProject,
      }),
    }));
    vi.doMock('../services/platform', () => ({
      getPlatformService: () => ({ isDesktop: () => false }),
    }));

    const { App } = await import('./App');

    renderToStaticMarkup(<App />);
    onExportProject?.();
    await Promise.resolve();

    expect(exportProject).toHaveBeenCalledWith(activeProject);
    expect(saveActiveProjectToFile).not.toHaveBeenCalled();
    expect(saveActiveProjectAsFile).not.toHaveBeenCalled();
    expect(workspaceState.activeProjectFilePath).toBe('C:/Stories/File-backed Draft.narrium');
    expect(workspaceState.activeProjectDirty).toBe(true);
    expect(activeProject.name).toBe('File-backed Draft');
    expect(workspaceState.recentProjects).toBe(recentProjects);
  });
});
