import { describe, expect, it, vi } from 'vitest';
import type { AssetLibraryItem, Project } from '../../types';
import { PerformanceInstrumentationService, type MonotonicClock } from '../performance';
import type { PlatformService } from '../platform';
import { BackgroundAssetCleanupService } from './BackgroundAssetCleanupService';
import type { PhysicalBackgroundFile } from './BackgroundAssetCleanupPlanner';

function createAsset(overrides: Partial<AssetLibraryItem> = {}): AssetLibraryItem {
  return {
    id: 'asset-local',
    kind: 'background',
    name: 'Forest',
    storageType: 'local',
    source: 'assets/backgrounds/forest.png',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createProject(assetLibrary: AssetLibraryItem[] = []): Project {
  return {
    id: 'project-1',
    name: 'Project',
    thumbnail: null,
    startSceneId: '',
    scenes: [],
    characters: [],
    resources: [],
    variables: [],
    groups: [],
    assetLibrary,
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function physical(relativePath: string, fileSize = 10): PhysicalBackgroundFile {
  return {
    relativePath,
    fileName: relativePath.split('/').pop() ?? relativePath,
    fileSize,
  };
}

function createPlatform(overrides: Partial<PlatformService> = {}): PlatformService {
  return {
    isBrowser: vi.fn(() => false),
    isDesktop: vi.fn(() => true),
    platformName: vi.fn(() => 'desktop' as const),
    selectProjectFileToOpen: vi.fn(),
    selectProjectFilePathForSaveAs: vi.fn(),
    trustExistingProjectFile: vi.fn(),
    readProjectFile: vi.fn(),
    writeProjectFile: vi.fn(),
    importBackgroundAssetFile: vi.fn(),
    resolveLocalAssetDisplaySource: vi.fn(),
    copyLocalAssetForProjectSaveAs: vi.fn(),
    materializeEmbeddedBackgroundAssets: vi.fn(),
    listLocalBackgroundFiles: vi.fn(() => Promise.resolve([])),
    fingerprintLocalBackgroundFiles: vi.fn(() => Promise.resolve([])),
    deleteLocalBackgroundFiles: vi.fn(() =>
      Promise.resolve({
        deleted: [],
        skipped: [],
        failed: [],
      }),
    ),
    readAppPreferences: vi.fn(),
    writeAppPreferences: vi.fn(),
    confirmUnsavedChanges: vi.fn(),
    onCloseRequested: vi.fn(),
    ...overrides,
  };
}

class ManualClock implements MonotonicClock {
  private current = 0;

  now(): number {
    return this.current;
  }

  advance(ms: number): void {
    this.current += ms;
  }
}

describe('BackgroundAssetCleanupService', () => {
  it('does not invoke desktop cleanup APIs in browser mode', async () => {
    const platform = createPlatform({
      isDesktop: vi.fn(() => false),
      listLocalBackgroundFiles: vi.fn(() => Promise.resolve([physical('assets/backgrounds/orphan.png')])),
    });
    const service = new BackgroundAssetCleanupService(platform);

    await expect(
      service.scanLocalBackgroundFiles(createProject(), 'C:/Stories/Story.narrium'),
    ).rejects.toThrow('only available');

    expect(platform.listLocalBackgroundFiles).not.toHaveBeenCalled();
  });

  it('does not invoke filesystem cleanup for unsaved desktop drafts', async () => {
    const platform = createPlatform({
      listLocalBackgroundFiles: vi.fn(() => Promise.resolve([physical('assets/backgrounds/orphan.png')])),
    });
    const service = new BackgroundAssetCleanupService(platform);

    await expect(service.scanLocalBackgroundFiles(createProject(), null)).rejects.toThrow(
      'saved desktop .narrium',
    );

    expect(platform.listLocalBackgroundFiles).not.toHaveBeenCalled();
  });

  it('does not mutate the Project while scanning or deleting', async () => {
    const project = createProject();
    const before = JSON.stringify(project);
    const platform = createPlatform({
      listLocalBackgroundFiles: vi.fn(() => Promise.resolve([physical('assets/backgrounds/orphan.png')])),
      deleteLocalBackgroundFiles: vi.fn(() =>
        Promise.resolve({
          deleted: [{ relativePath: 'assets/backgrounds/orphan.png', fileSize: 10 }],
          skipped: [],
          failed: [],
        }),
      ),
    });
    const service = new BackgroundAssetCleanupService(platform);
    const report = await service.scanLocalBackgroundFiles(project, 'C:/Stories/Story.narrium');

    await service.deleteOrphanedLocalBackgroundFiles({
      projectFilePath: 'C:/Stories/Story.narrium',
      orphanCandidates: report.orphanedFiles,
      getLatestProject: () => project,
    });

    expect(JSON.stringify(project)).toBe(before);
  });

  it('records cleanup scan metrics internally', async () => {
    const clock = new ManualClock();
    const instrumentation = new PerformanceInstrumentationService(clock);
    const project = createProject();
    const platform = createPlatform({
      listLocalBackgroundFiles: vi.fn(() => {
        clock.advance(9);
        return Promise.resolve([physical('assets/backgrounds/orphan.png')]);
      }),
    });
    const service = new BackgroundAssetCleanupService(platform, instrumentation);

    await service.scanLocalBackgroundFiles(project, 'C:/Stories/Story.narrium');

    expect(instrumentation.getSnapshot().cleanups[0]).toMatchObject({
      projectId: project.id,
      projectFilePath: 'C:/Stories/Story.narrium',
      scanDurationMs: 9,
      deletionDurationMs: 0,
      scannedFileCount: 1,
      deletedFileCount: 0,
    });
  });

  it('skips a file that becomes referenced after scan but before deletion', async () => {
    const platform = createPlatform();
    const service = new BackgroundAssetCleanupService(platform);

    const result = await service.deleteOrphanedLocalBackgroundFiles({
      projectFilePath: 'C:/Stories/Story.narrium',
      orphanCandidates: [physical('assets/backgrounds/orphan.png')],
      getLatestProject: () =>
        createProject([
          createAsset({
            id: 'asset-new',
            source: 'assets/backgrounds/orphan.png',
          }),
        ]),
    });

    expect(platform.deleteLocalBackgroundFiles).not.toHaveBeenCalled();
    expect(result.deleted).toEqual([]);
    expect(result.skipped).toEqual([
      {
        relativePath: 'assets/backgrounds/orphan.png',
        reason: 'File became referenced before deletion.',
      },
    ]);
  });

  it('returns a zero-orphan scan result', async () => {
    const platform = createPlatform({
      listLocalBackgroundFiles: vi.fn(() => Promise.resolve([physical('assets/backgrounds/forest.png')])),
    });
    const service = new BackgroundAssetCleanupService(platform);

    const report = await service.scanLocalBackgroundFiles(
      createProject([createAsset()]),
      'C:/Stories/Story.narrium',
    );

    expect(report.orphanedFiles).toEqual([]);
    expect(report.referencedFiles).toHaveLength(1);
    expect(report.projectId).toBe('project-1');
    expect(report.projectFilePath).toBe('C:/Stories/Story.narrium');
  });

  it('uses case-insensitive protection during race revalidation', async () => {
    const platform = createPlatform();
    const service = new BackgroundAssetCleanupService(platform);

    const result = await service.deleteOrphanedLocalBackgroundFiles({
      projectFilePath: 'C:/Stories/Story.narrium',
      orphanCandidates: [physical('assets/backgrounds/forest.png')],
      getLatestProject: () =>
        createProject([
          createAsset({
            id: 'asset-new',
            source: 'assets/backgrounds/Forest.png',
          }),
        ]),
    });

    expect(platform.deleteLocalBackgroundFiles).not.toHaveBeenCalled();
    expect(result.deleted).toEqual([]);
    expect(result.skipped).toEqual([
      {
        relativePath: 'assets/backgrounds/forest.png',
        reason: 'File became referenced before deletion.',
      },
    ]);
  });

  it('returns successful batch cleanup results with reclaimed size', async () => {
    const platform = createPlatform({
      deleteLocalBackgroundFiles: vi.fn(() =>
        Promise.resolve({
          deleted: [
            { relativePath: 'assets/backgrounds/one.png', fileSize: 10 },
            { relativePath: 'assets/backgrounds/two.jpg', fileSize: 20 },
          ],
          skipped: [],
          failed: [],
        }),
      ),
    });
    const service = new BackgroundAssetCleanupService(platform);
    const result = await service.deleteOrphanedLocalBackgroundFiles({
      projectFilePath: 'C:/Stories/Story.narrium',
      orphanCandidates: [physical('assets/backgrounds/one.png', 10), physical('assets/backgrounds/two.jpg', 20)],
      getLatestProject: () => createProject(),
    });

    expect(platform.deleteLocalBackgroundFiles).toHaveBeenCalledWith(
      'C:/Stories/Story.narrium',
      ['assets/backgrounds/one.png', 'assets/backgrounds/two.jpg'],
      [],
    );
    expect(result.deleted).toHaveLength(2);
    expect(result.reclaimedBytes).toBe(30);
  });

  it('records cleanup deletion metrics internally', async () => {
    const clock = new ManualClock();
    const instrumentation = new PerformanceInstrumentationService(clock);
    const project = createProject();
    const platform = createPlatform({
      deleteLocalBackgroundFiles: vi.fn(() => {
        clock.advance(6);
        return Promise.resolve({
          deleted: [{ relativePath: 'assets/backgrounds/orphan.png', fileSize: 10 }],
          skipped: [],
          failed: [],
        });
      }),
    });
    const service = new BackgroundAssetCleanupService(platform, instrumentation);

    await service.deleteOrphanedLocalBackgroundFiles({
      projectFilePath: 'C:/Stories/Story.narrium',
      orphanCandidates: [physical('assets/backgrounds/orphan.png', 10)],
      getLatestProject: () => project,
    });

    expect(instrumentation.getSnapshot().cleanups[0]).toMatchObject({
      projectId: project.id,
      projectFilePath: 'C:/Stories/Story.narrium',
      scanDurationMs: 0,
      deletionDurationMs: 6,
      scannedFileCount: 1,
      deletedFileCount: 1,
    });
  });

  it('surfaces partial deletion failures accurately', async () => {
    const platform = createPlatform({
      deleteLocalBackgroundFiles: vi.fn(() =>
        Promise.resolve({
          deleted: [{ relativePath: 'assets/backgrounds/one.png', fileSize: 10 }],
          skipped: [],
          failed: [{ relativePath: 'assets/backgrounds/two.jpg', error: 'Access denied.' }],
        }),
      ),
    });
    const service = new BackgroundAssetCleanupService(platform);
    const result = await service.deleteOrphanedLocalBackgroundFiles({
      projectFilePath: 'C:/Stories/Story.narrium',
      orphanCandidates: [physical('assets/backgrounds/one.png', 10), physical('assets/backgrounds/two.jpg', 20)],
      getLatestProject: () => createProject(),
    });

    expect(result.deleted).toHaveLength(1);
    expect(result.failed).toEqual([
      { relativePath: 'assets/backgrounds/two.jpg', error: 'Access denied.' },
    ]);
    expect(result.reclaimedBytes).toBe(10);
  });
});
