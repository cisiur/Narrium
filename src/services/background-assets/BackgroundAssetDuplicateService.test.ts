import { describe, expect, it, vi } from 'vitest';
import type { AssetLibraryItem, Project } from '../../types';
import type { PlatformService } from '../platform';
import { BackgroundAssetDuplicateService } from './BackgroundAssetDuplicateService';
import type { FingerprintedBackgroundFile } from './BackgroundAssetDuplicatePlanner';

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

function fingerprinted(relativePath: string, contentHash = 'hash-a'): FingerprintedBackgroundFile {
  return {
    relativePath,
    fileName: relativePath.split('/').pop() ?? relativePath,
    fileSize: 10,
    contentHash,
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

describe('BackgroundAssetDuplicateService', () => {
  it('does not invoke the desktop fingerprint API in browser mode', async () => {
    const platform = createPlatform({
      isDesktop: vi.fn(() => false),
      fingerprintLocalBackgroundFiles: vi.fn(() =>
        Promise.resolve([fingerprinted('assets/backgrounds/forest.png')]),
      ),
    });
    const service = new BackgroundAssetDuplicateService(platform);

    await expect(
      service.scanDuplicateLocalBackgroundFiles(createProject(), 'C:/Stories/Story.narrium'),
    ).rejects.toThrow('only available');

    expect(platform.fingerprintLocalBackgroundFiles).not.toHaveBeenCalled();
  });

  it('does not invoke filesystem APIs for unsaved desktop drafts', async () => {
    const platform = createPlatform({
      fingerprintLocalBackgroundFiles: vi.fn(() =>
        Promise.resolve([fingerprinted('assets/backgrounds/forest.png')]),
      ),
    });
    const service = new BackgroundAssetDuplicateService(platform);

    await expect(service.scanDuplicateLocalBackgroundFiles(createProject(), null)).rejects.toThrow(
      'saved desktop .narrium',
    );

    expect(platform.fingerprintLocalBackgroundFiles).not.toHaveBeenCalled();
  });

  it('does not mutate the Project while scanning', async () => {
    const project = createProject([createAsset()]);
    const before = JSON.stringify(project);
    const platform = createPlatform({
      fingerprintLocalBackgroundFiles: vi.fn(() =>
        Promise.resolve([
          fingerprinted('assets/backgrounds/forest.png'),
          fingerprinted('assets/backgrounds/copy.png'),
        ]),
      ),
    });
    const service = new BackgroundAssetDuplicateService(platform);

    await service.scanDuplicateLocalBackgroundFiles(project, 'C:/Stories/Story.narrium');

    expect(JSON.stringify(project)).toBe(before);
  });

  it('returns duplicate reports without marking dirty through store callbacks', async () => {
    let isDirty = false;
    const platform = createPlatform({
      fingerprintLocalBackgroundFiles: vi.fn(() =>
        Promise.resolve([
          fingerprinted('assets/backgrounds/forest.png'),
          fingerprinted('assets/backgrounds/copy.png'),
        ]),
      ),
    });
    const service = new BackgroundAssetDuplicateService(platform);

    await service.scanDuplicateLocalBackgroundFiles(createProject(), 'C:/Stories/Story.narrium');

    expect(isDirty).toBe(false);
  });
});
