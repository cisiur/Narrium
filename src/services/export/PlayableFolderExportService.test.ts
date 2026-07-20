import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../types';
import type { PlatformService } from '../platform';
import { PlayableFolderExportService } from './PlayableFolderExportService';

function createProject(): Project {
  return {
    id: 'project-1',
    name: 'Test Story',
    thumbnail: null,
    startSceneId: 'scene-1',
    scenes: [
      {
        id: 'scene-1',
        name: 'Scene 1',
        background: {
          mode: 'asset',
          assetId: 'asset-1',
          sourceSceneId: null,
          url: '',
        },
        position: { x: 0, y: 0 },
        dialoguePages: [{ id: 'page-1', speakerId: null, text: 'Hello' }],
        choices: [],
        groupId: null,
      },
    ],
    characters: [],
    resources: [],
    variables: [],
    groups: [],
    assetLibrary: [
      {
        id: 'asset-1',
        kind: 'background',
        name: 'Forest',
        storageType: 'local',
        source: 'assets/backgrounds/forest.png',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createPlatform(overrides: Partial<PlatformService> = {}): PlatformService {
  return {
    isBrowser: () => false,
    isDesktop: () => true,
    platformName: () => 'desktop',
    selectProjectFileToOpen: vi.fn(),
    selectProjectFilePathForSaveAs: vi.fn(),
    trustExistingProjectFile: vi.fn(),
    readProjectFile: vi.fn(),
    writeProjectFile: vi.fn(),
    importBackgroundAssetFile: vi.fn(),
    resolveLocalAssetDisplaySource: vi.fn(),
    copyLocalAssetForProjectSaveAs: vi.fn(),
    materializeEmbeddedBackgroundAssets: vi.fn(),
    listLocalBackgroundFiles: vi.fn(),
    fingerprintLocalBackgroundFiles: vi.fn(),
    deleteLocalBackgroundFiles: vi.fn(),
    selectPlayableFolderExportDestination: vi.fn(() => Promise.resolve('D:/Exports')),
    writePlayableFolderExport: vi.fn(() =>
      Promise.resolve({
        outputDirectory: 'D:/Exports/test-story',
        indexHtmlPath: 'D:/Exports/test-story/index.html',
        copiedAssetCount: 1,
      }),
    ),
    readAppPreferences: vi.fn(),
    writeAppPreferences: vi.fn(),
    confirmUnsavedChanges: vi.fn(),
    onCloseRequested: vi.fn(),
    ...overrides,
  };
}

describe('PlayableFolderExportService', () => {
  it('treats destination cancellation as a normal no-op', async () => {
    const platform = createPlatform({
      selectPlayableFolderExportDestination: vi.fn(() => Promise.resolve(null)),
    });
    const service = new PlayableFolderExportService(platform);

    await expect(service.exportProject(createProject(), 'D:/Stories/Test.narrium')).resolves.toEqual({
      status: 'canceled',
    });
    expect(platform.writePlayableFolderExport).not.toHaveBeenCalled();
  });

  it('orchestrates a successful staged folder export', async () => {
    const platform = createPlatform();
    const project = createProject();
    const service = new PlayableFolderExportService(platform);
    const result = await service.exportProject(project, 'D:/Stories/Test.narrium');

    expect(result.status).toBe('success');
    expect(platform.selectPlayableFolderExportDestination).toHaveBeenCalledWith({
      title: 'Choose Playable Folder Export Destination',
      defaultFolderName: 'test-story',
    });
    expect(platform.writePlayableFolderExport).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceProjectFilePath: 'D:/Stories/Test.narrium',
        destinationParentDirectory: 'D:/Exports',
        folderName: 'test-story',
        localAssetCopies: [
          {
            sourceRelativePath: 'assets/backgrounds/forest.png',
            destinationRelativePath: 'assets/backgrounds/forest.png',
          },
        ],
      }),
    );
    const request = vi.mocked(platform.writePlayableFolderExport).mock.calls[0][0];
    expect(request.indexHtml).toContain('const standaloneOptions = {"resolveLocalAssetSources":true};');
    expect(request.indexHtml).toContain('"source":"assets/backgrounds/forest.png"');
    expect(JSON.stringify(project)).toContain('"source":"assets/backgrounds/forest.png"');
  });

  it('rejects browser mode as unavailable', async () => {
    const platform = createPlatform({
      isDesktop: () => false,
      isBrowser: () => true,
      platformName: () => 'browser',
    });
    const service = new PlayableFolderExportService(platform);

    expect(service.canExportPlayableFolder()).toBe(false);
    await expect(service.exportProject(createProject(), 'D:/Stories/Test.narrium')).rejects.toThrow(
      'only available in the desktop app',
    );
  });

  it('requires a file-backed project path before export', async () => {
    const service = new PlayableFolderExportService(createPlatform());

    await expect(service.exportProject(createProject(), null)).rejects.toThrow(
      'Save this project as a .narrium file',
    );
  });

  it('propagates copy write and finalization failures without mutating the project', async () => {
    const platform = createPlatform({
      writePlayableFolderExport: vi.fn(() => Promise.reject(new Error('copy failed'))),
    });
    const project = createProject();
    const serializedBefore = JSON.stringify(project);
    const service = new PlayableFolderExportService(platform);

    await expect(service.exportProject(project, 'D:/Stories/Test.narrium')).rejects.toThrow('copy failed');
    expect(JSON.stringify(project)).toBe(serializedBefore);
  });
});

