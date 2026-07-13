import { describe, expect, it, vi } from 'vitest';
import type { AssetLibraryItem, Project, Scene } from '../../types';
import { shouldProceedWithStandaloneHtmlExport, validateStandaloneHtmlExport } from './exportPreflight';

function createAsset(overrides: Partial<AssetLibraryItem> = {}): AssetLibraryItem {
  return {
    id: 'asset-1',
    kind: 'background',
    name: 'Background',
    storageType: 'embedded',
    source: 'data:image/png;base64,abc',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createScene(id: string, assetId: string | null = null, overrides: Partial<Scene> = {}): Scene {
  return {
    id,
    name: id,
    background: {
      mode: assetId ? 'asset' : 'none',
      assetId,
      sourceSceneId: null,
      url: '',
    },
    position: { x: 0, y: 0 },
    dialoguePages: [],
    choices: [],
    groupId: null,
    ...overrides,
  };
}

function createProject(assetLibrary: AssetLibraryItem[] = [], scenes: Scene[] = []): Project {
  return {
    id: 'project-1',
    name: 'Project',
    thumbnail: null,
    startSceneId: '',
    scenes,
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

describe('validateStandaloneHtmlExport', () => {
  it('allows export with no local assets', async () => {
    const platformService = {
      resolveLocalAssetDisplaySource: vi.fn(),
    };

    await expect(validateStandaloneHtmlExport(createProject(), null, platformService)).resolves.toEqual({
      status: 'safe',
      localAssets: [],
    });
    expect(platformService.resolveLocalAssetDisplaySource).not.toHaveBeenCalled();
  });

  it('allows embedded assets without warnings', async () => {
    const platformService = {
      resolveLocalAssetDisplaySource: vi.fn(),
    };

    await expect(
      validateStandaloneHtmlExport(createProject([createAsset()]), null, platformService),
    ).resolves.toEqual({
      status: 'safe',
      localAssets: [],
    });
  });

  it('ignores missing unused local assets', async () => {
    const unusedLocalAsset = createAsset({
      storageType: 'local',
      source: 'assets/backgrounds/missing-unused.png',
    });
    const platformService = {
      resolveLocalAssetDisplaySource: vi.fn(),
    };

    await expect(validateStandaloneHtmlExport(createProject([unusedLocalAsset]), null, platformService)).resolves.toEqual({
      status: 'safe',
      localAssets: [],
    });
    expect(platformService.resolveLocalAssetDisplaySource).not.toHaveBeenCalled();
  });

  it('ignores existing unused local assets', async () => {
    const unusedLocalAsset = createAsset({
      storageType: 'local',
      source: 'assets/backgrounds/unused.png',
    });
    const platformService = {
      resolveLocalAssetDisplaySource: vi.fn(() => Promise.resolve('http://asset.localhost/unused.png')),
    };

    await expect(
      validateStandaloneHtmlExport(createProject([unusedLocalAsset]), 'C:/Stories/Project.narrium', platformService),
    ).resolves.toEqual({
      status: 'safe',
      localAssets: [],
    });
    expect(platformService.resolveLocalAssetDisplaySource).not.toHaveBeenCalled();
  });

  it('warns when referenced local assets are present and resolvable', async () => {
    const localAsset = createAsset({
      storageType: 'local',
      source: 'assets/backgrounds/forest.png',
    });
    const platformService = {
      resolveLocalAssetDisplaySource: vi.fn(() => Promise.resolve('http://asset.localhost/forest.png')),
    };

    await expect(
      validateStandaloneHtmlExport(
        createProject([localAsset], [createScene('scene-1', localAsset.id)]),
        'C:/Stories/Project.narrium',
        platformService,
      ),
    ).resolves.toEqual({
      status: 'warning',
      localAssets: [localAsset],
    });
    expect(platformService.resolveLocalAssetDisplaySource).toHaveBeenCalledWith(
      'C:/Stories/Project.narrium',
      'assets/backgrounds/forest.png',
    );
  });

  it('blocks export when referenced local assets cannot be resolved', async () => {
    const localAsset = createAsset({
      name: 'Missing Forest',
      storageType: 'local',
      source: 'assets/backgrounds/missing.png',
    });
    const platformService = {
      resolveLocalAssetDisplaySource: vi.fn(() => Promise.resolve(null)),
    };

    const result = await validateStandaloneHtmlExport(
      createProject([localAsset], [createScene('scene-1', localAsset.id)]),
      'C:/Stories/Project.narrium',
      platformService,
    );

    expect(result.status).toBe('blocked');
    expect(result.localAssets).toEqual([localAsset]);
    expect(result.status === 'blocked' ? result.missingLocalAssets : []).toEqual([localAsset]);
  });

  it('blocks export when local asset resolution fails', async () => {
    const localAsset = createAsset({
      name: 'Broken Forest',
      storageType: 'local',
      source: 'assets/backgrounds/broken.png',
    });
    const platformService = {
      resolveLocalAssetDisplaySource: vi.fn(() => Promise.reject(new Error('resolver failed'))),
    };

    const result = await validateStandaloneHtmlExport(
      createProject([localAsset], [createScene('scene-1', localAsset.id)]),
      'C:/Stories/Project.narrium',
      platformService,
    );

    expect(result.status).toBe('blocked');
    expect(result.status === 'blocked' ? result.missingLocalAssets : []).toEqual([localAsset]);
  });

  it('blocks browser or draft exports when referenced local assets cannot be resolved from a project file path', async () => {
    const localAsset = createAsset({
      storageType: 'local',
      source: 'assets/backgrounds/forest.png',
    });
    const platformService = {
      resolveLocalAssetDisplaySource: vi.fn(),
    };

    const result = await validateStandaloneHtmlExport(
      createProject([localAsset], [createScene('scene-1', localAsset.id)]),
      null,
      platformService,
    );

    expect(result.status).toBe('blocked');
    expect(platformService.resolveLocalAssetDisplaySource).not.toHaveBeenCalled();
  });

  it('validates an asset referenced multiple times only once', async () => {
    const localAsset = createAsset({
      storageType: 'local',
      source: 'assets/backgrounds/forest.png',
    });
    const platformService = {
      resolveLocalAssetDisplaySource: vi.fn(() => Promise.resolve('http://asset.localhost/forest.png')),
    };

    const result = await validateStandaloneHtmlExport(
      createProject([localAsset], [createScene('scene-1', localAsset.id), createScene('scene-2', localAsset.id)]),
      'C:/Stories/Project.narrium',
      platformService,
    );

    expect(result.status).toBe('warning');
    expect(platformService.resolveLocalAssetDisplaySource).toHaveBeenCalledTimes(1);
  });

  it('validates local assets used through scene background references', async () => {
    const localAsset = createAsset({
      storageType: 'local',
      source: 'assets/backgrounds/forest.png',
    });
    const referencedScene = createScene('referenced-scene', localAsset.id);
    const referenceScene = createScene('reference-scene', null, {
      background: {
        mode: 'scene_reference',
        assetId: null,
        sourceSceneId: referencedScene.id,
        url: '',
      },
    });
    const platformService = {
      resolveLocalAssetDisplaySource: vi.fn(() => Promise.resolve('http://asset.localhost/forest.png')),
    };

    const result = await validateStandaloneHtmlExport(
      createProject([localAsset], [referencedScene, referenceScene]),
      'C:/Stories/Project.narrium',
      platformService,
    );

    expect(result.status).toBe('warning');
    expect(platformService.resolveLocalAssetDisplaySource).toHaveBeenCalledWith(
      'C:/Stories/Project.narrium',
      'assets/backgrounds/forest.png',
    );
  });
});

describe('shouldProceedWithStandaloneHtmlExport', () => {
  it('continues immediately when export is safe', async () => {
    const ui = {
      confirmLocalAssetWarning: vi.fn(),
      showBlockedExportError: vi.fn(),
    };

    await expect(
      shouldProceedWithStandaloneHtmlExport(
        {
          status: 'safe',
          localAssets: [],
        },
        ui,
      ),
    ).resolves.toBe(true);
    expect(ui.confirmLocalAssetWarning).not.toHaveBeenCalled();
    expect(ui.showBlockedExportError).not.toHaveBeenCalled();
  });

  it('cancels export after a local asset warning', async () => {
    const localAsset = createAsset({ storageType: 'local' });
    const ui = {
      confirmLocalAssetWarning: vi.fn(() => Promise.resolve(false)),
      showBlockedExportError: vi.fn(),
    };

    await expect(
      shouldProceedWithStandaloneHtmlExport(
        {
          status: 'warning',
          localAssets: [localAsset],
        },
        ui,
      ),
    ).resolves.toBe(false);
    expect(ui.confirmLocalAssetWarning).toHaveBeenCalledWith([localAsset]);
  });

  it('continues export after a local asset warning when confirmed', async () => {
    const localAsset = createAsset({ storageType: 'local' });
    const ui = {
      confirmLocalAssetWarning: vi.fn(() => Promise.resolve(true)),
      showBlockedExportError: vi.fn(),
    };

    await expect(
      shouldProceedWithStandaloneHtmlExport(
        {
          status: 'warning',
          localAssets: [localAsset],
        },
        ui,
      ),
    ).resolves.toBe(true);
  });

  it('blocks export and surfaces missing local assets', async () => {
    const localAsset = createAsset({ storageType: 'local' });
    const ui = {
      confirmLocalAssetWarning: vi.fn(),
      showBlockedExportError: vi.fn(),
    };

    await expect(
      shouldProceedWithStandaloneHtmlExport(
        {
          status: 'blocked',
          localAssets: [localAsset],
          missingLocalAssets: [localAsset],
          message: 'Missing assets.',
        },
        ui,
      ),
    ).resolves.toBe(false);
    expect(ui.showBlockedExportError).toHaveBeenCalledWith('Missing assets.', [localAsset]);
  });
});
