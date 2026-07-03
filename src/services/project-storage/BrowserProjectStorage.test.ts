import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, WorkspaceState } from '../../types';
import {
  BrowserProjectStorage,
  WORKSPACE_STORAGE_KEY,
  getProjectStorageKey,
} from './BrowserProjectStorage';

function createLocalStorageMock() {
  const values = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    clear: vi.fn(() => {
      values.clear();
    }),
  };
}

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

describe('BrowserProjectStorage', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;
  let storage: BrowserProjectStorage;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('window', {
      localStorage: localStorageMock,
    });
    storage = new BrowserProjectStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and saves workspace metadata using the existing workspace key', () => {
    const workspace: WorkspaceState = {
      projects: [
        {
          id: 'project-1',
          name: 'Test Project',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          thumbnailDataUrl: null,
        },
      ],
      activeProjectId: 'project-1',
    };

    storage.saveWorkspace(workspace);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    expect(storage.loadWorkspace()).toEqual(workspace);
  });

  it('loads and saves projects using the existing project key prefix', () => {
    const project = createProject();

    storage.saveProject(project);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      getProjectStorageKey(project.id),
      JSON.stringify(project),
    );
    expect(storage.loadProject(project.id)).toEqual(project);
  });

  it('deletes only the project payload and preserves workspace metadata', () => {
    const workspace: WorkspaceState = {
      projects: [
        {
          id: 'project-1',
          name: 'Test Project',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          thumbnailDataUrl: null,
        },
      ],
      activeProjectId: 'project-1',
    };
    const project = createProject();

    storage.saveWorkspace(workspace);
    storage.saveProject(project);
    storage.deleteProject(project.id);

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(getProjectStorageKey(project.id));
    expect(storage.loadProject(project.id)).toBeNull();
    expect(storage.loadWorkspace()).toEqual(workspace);
  });

  it('returns an empty workspace for missing or corrupt workspace data', () => {
    expect(storage.loadWorkspace()).toEqual({ projects: [], activeProjectId: null });

    localStorageMock.setItem(WORKSPACE_STORAGE_KEY, '{not-json');

    expect(storage.loadWorkspace()).toEqual({ projects: [], activeProjectId: null });
  });

  it('returns null for missing or corrupt project data', () => {
    expect(storage.loadProject('project-1')).toBeNull();

    localStorageMock.setItem(getProjectStorageKey('project-1'), '{not-json');

    expect(storage.loadProject('project-1')).toBeNull();
  });

  it('normalizes loaded project data and saves it back under the same key', () => {
    const legacyProject = createProject({
      variables: undefined as unknown as Project['variables'],
    });

    localStorageMock.setItem(getProjectStorageKey(legacyProject.id), JSON.stringify(legacyProject));

    const loadedProject = storage.loadProject(legacyProject.id);

    expect(loadedProject?.variables).toEqual([]);
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
      getProjectStorageKey(legacyProject.id),
      JSON.stringify(loadedProject),
    );
  });
});
