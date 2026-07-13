import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BrowserAppPreferencesService,
  DesktopAppPreferencesService,
  normalizeRecentProjects,
  recordRecentProject,
  type AppPreferences,
  type RecentProject,
} from './AppPreferencesService';

function createRecentProject(index: number, overrides: Partial<RecentProject> = {}): RecentProject {
  return {
    name: `Project ${index}`,
    filePath: `C:/Stories/Project ${index}.narrium`,
    lastOpenedAt: `2026-01-${String(index).padStart(2, '0')}T00:00:00.000Z`,
    ...overrides,
  };
}

function createLocalStorageMock(initialEntries: Record<string, string> = {}) {
  const values = new Map(Object.entries(initialEntries));

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}

function createNativePreferencesMock(initialSource: string | null = null) {
  let source = initialSource;

  return {
    readAppPreferences: vi.fn(() => Promise.resolve(source)),
    writeAppPreferences: vi.fn((contents: string) => {
      source = contents;
      return Promise.resolve();
    }),
    getSource: () => source,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('app preferences recent projects', () => {
  it('orders recent projects by last opened time descending', () => {
    const recentProjects = normalizeRecentProjects([
      createRecentProject(1),
      createRecentProject(3),
      createRecentProject(2),
    ]);

    expect(recentProjects.map((project) => project.name)).toEqual(['Project 3', 'Project 2', 'Project 1']);
  });

  it('keeps only the 10 most recent projects', () => {
    const recentProjects = normalizeRecentProjects(
      Array.from({ length: 12 }, (_value, index) => createRecentProject(index + 1)),
    );

    expect(recentProjects).toHaveLength(10);
    expect(recentProjects[0].name).toBe('Project 12');
    expect(recentProjects[9].name).toBe('Project 3');
  });

  it('moves a reopened project to the top and updates last opened metadata', () => {
    const preferences: AppPreferences = {
      recentProjects: [createRecentProject(1), createRecentProject(2)],
      lastOpenedProjectFilePath: 'C:/Stories/Project 2.narrium',
    };

    const nextPreferences = recordRecentProject(
      preferences,
      {
        projectId: 'project-1',
        name: 'Project 1 Revised',
        filePath: 'C:/Stories/Project 1.narrium',
      },
      '2026-02-01T00:00:00.000Z',
    );

    expect(nextPreferences.recentProjects).toHaveLength(2);
    expect(nextPreferences.recentProjects[0]).toEqual({
      projectId: 'project-1',
      name: 'Project 1 Revised',
      filePath: 'C:/Stories/Project 1.narrium',
      lastOpenedAt: '2026-02-01T00:00:00.000Z',
    });
    expect(nextPreferences.lastOpenedProjectFilePath).toBe('C:/Stories/Project 1.narrium');
  });

  it('preserves project id metadata for file-backed project cards', () => {
    const nextPreferences = recordRecentProject(
      {
        recentProjects: [],
        lastOpenedProjectFilePath: null,
      },
      {
        projectId: 'project-42',
        name: 'Project 42',
        filePath: 'C:/Stories/Project 42.narrium',
      },
      '2026-02-01T00:00:00.000Z',
    );

    expect(nextPreferences.recentProjects[0].projectId).toBe('project-42');
  });
});

describe('browser app preferences backend', () => {
  it('continues using localStorage for browser preferences', async () => {
    const localStorage = createLocalStorageMock({
      browser_preferences: JSON.stringify({
        recentProjects: [createRecentProject(1)],
        lastOpenedProjectFilePath: 'C:/Stories/Project 1.narrium',
      }),
    });
    vi.stubGlobal('window', { localStorage });
    const service = new BrowserAppPreferencesService('browser_preferences');

    await expect(service.initialize()).resolves.toEqual({
      recentProjects: [createRecentProject(1)],
      lastOpenedProjectFilePath: 'C:/Stories/Project 1.narrium',
    });

    const nextPreferences = service.recordRecentProject({
      name: 'Project 2',
      filePath: 'C:/Stories/Project 2.narrium',
    });

    expect(localStorage.getItem).toHaveBeenCalledWith('browser_preferences');
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'browser_preferences',
      JSON.stringify(nextPreferences),
    );
  });
});

describe('desktop app preferences backend', () => {
  it('uses the native backend for desktop preferences', async () => {
    const nativePreferences = createNativePreferencesMock(
      JSON.stringify({
        recentProjects: [createRecentProject(2)],
        lastOpenedProjectFilePath: 'C:/Stories/Project 2.narrium',
      }),
    );
    const migrationSource = {
      loadPreferences: vi.fn(() => ({
        recentProjects: [createRecentProject(1)],
        lastOpenedProjectFilePath: 'C:/Stories/Project 1.narrium',
      })),
    };
    const service = new DesktopAppPreferencesService(nativePreferences, migrationSource);

    await expect(service.initialize()).resolves.toEqual({
      recentProjects: [createRecentProject(2)],
      lastOpenedProjectFilePath: 'C:/Stories/Project 2.narrium',
    });

    service.recordRecentProject({
      name: 'Project 3',
      filePath: 'C:/Stories/Project 3.narrium',
    });
    await vi.waitFor(() => expect(nativePreferences.writeAppPreferences).toHaveBeenCalledTimes(1));

    expect(migrationSource.loadPreferences).not.toHaveBeenCalled();
    expect(nativePreferences.getSource()).toContain('Project 3');
  });

  it('migrates localStorage preferences when native preferences do not exist', async () => {
    const nativePreferences = createNativePreferencesMock(null);
    const migrationSource = {
      loadPreferences: vi.fn(() => ({
        recentProjects: [createRecentProject(4)],
        lastOpenedProjectFilePath: 'C:/Stories/Project 4.narrium',
      })),
    };
    const service = new DesktopAppPreferencesService(nativePreferences, migrationSource);

    await expect(service.initialize()).resolves.toEqual({
      recentProjects: [createRecentProject(4)],
      lastOpenedProjectFilePath: 'C:/Stories/Project 4.narrium',
    });

    expect(migrationSource.loadPreferences).toHaveBeenCalledTimes(1);
    expect(nativePreferences.writeAppPreferences).toHaveBeenCalledTimes(1);
    expect(nativePreferences.getSource()).toContain('Project 4');
  });

  it('skips migration when native preferences already exist', async () => {
    const nativePreferences = createNativePreferencesMock(
      JSON.stringify({
        recentProjects: [createRecentProject(5)],
        lastOpenedProjectFilePath: 'C:/Stories/Project 5.narrium',
      }),
    );
    const migrationSource = {
      loadPreferences: vi.fn(() => ({
        recentProjects: [createRecentProject(6)],
        lastOpenedProjectFilePath: 'C:/Stories/Project 6.narrium',
      })),
    };
    const service = new DesktopAppPreferencesService(nativePreferences, migrationSource);

    await service.initialize();

    expect(migrationSource.loadPreferences).not.toHaveBeenCalled();
    expect(nativePreferences.writeAppPreferences).not.toHaveBeenCalled();
    expect(service.loadPreferences().lastOpenedProjectFilePath).toBe('C:/Stories/Project 5.narrium');
  });

  it('runs migration idempotently', async () => {
    const nativePreferences = createNativePreferencesMock(null);
    const migrationSource = {
      loadPreferences: vi.fn(() => ({
        recentProjects: [createRecentProject(7)],
        lastOpenedProjectFilePath: 'C:/Stories/Project 7.narrium',
      })),
    };
    const service = new DesktopAppPreferencesService(nativePreferences, migrationSource);

    await service.initialize();
    await service.initialize();

    expect(nativePreferences.readAppPreferences).toHaveBeenCalledTimes(1);
    expect(migrationSource.loadPreferences).toHaveBeenCalledTimes(1);
    expect(nativePreferences.writeAppPreferences).toHaveBeenCalledTimes(1);
  });

  it('persists recent projects and last-opened project natively', async () => {
    const nativePreferences = createNativePreferencesMock(null);
    const migrationSource = {
      loadPreferences: vi.fn(() => ({
        recentProjects: [],
        lastOpenedProjectFilePath: null,
      })),
    };
    const service = new DesktopAppPreferencesService(nativePreferences, migrationSource);

    await service.initialize();
    const nextPreferences = service.recordRecentProject({
      projectId: 'project-8',
      name: 'Project 8',
      filePath: 'C:/Stories/Project 8.narrium',
    });
    await vi.waitFor(() => expect(nativePreferences.writeAppPreferences).toHaveBeenCalledTimes(1));

    expect(nextPreferences.recentProjects[0]).toEqual(
      expect.objectContaining({
        projectId: 'project-8',
        name: 'Project 8',
        filePath: 'C:/Stories/Project 8.narrium',
      }),
    );
    expect(nextPreferences.lastOpenedProjectFilePath).toBe('C:/Stories/Project 8.narrium');
    expect(nativePreferences.getSource()).toContain('Project 8');
  });

  it('does not crash when the native backend fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const nativePreferences = {
      readAppPreferences: vi.fn(() => Promise.reject(new Error('read failed'))),
      writeAppPreferences: vi.fn(() => Promise.reject(new Error('write failed'))),
    };
    const migrationSource = {
      loadPreferences: vi.fn(() => ({
        recentProjects: [createRecentProject(9)],
        lastOpenedProjectFilePath: 'C:/Stories/Project 9.narrium',
      })),
    };
    const service = new DesktopAppPreferencesService(nativePreferences, migrationSource);

    await expect(service.initialize()).resolves.toEqual({
      recentProjects: [],
      lastOpenedProjectFilePath: null,
    });
    const nextPreferences = service.recordRecentProject({
      name: 'Project 10',
      filePath: 'C:/Stories/Project 10.narrium',
    });
    await vi.waitFor(() => expect(nativePreferences.writeAppPreferences).toHaveBeenCalledTimes(1));

    expect(nextPreferences.recentProjects[0].name).toBe('Project 10');
    expect(consoleError).toHaveBeenCalled();
  });
});
