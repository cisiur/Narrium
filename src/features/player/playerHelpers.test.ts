import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetLibraryItem, Project, Scene } from '../../types';

vi.mock('../../services/background-assets', async () => {
  const actual = await vi.importActual<typeof import('../../services/background-assets')>(
    '../../services/background-assets',
  );

  return {
    ...actual,
    resolveBackgroundAssetDisplaySource: vi.fn(actual.resolveBackgroundAssetDisplaySource),
  };
});

import { resolveBackgroundAssetDisplaySource } from '../../services/background-assets';
import { resolveSceneBackgroundUrl } from './playerHelpers';

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

function createScene(assetId: string): Scene {
  return {
    id: 'scene-1',
    name: 'Scene 1',
    background: {
      mode: 'asset',
      assetId,
      sourceSceneId: null,
      url: '',
    },
    position: { x: 0, y: 0 },
    dialoguePages: [],
    choices: [],
    groupId: null,
  };
}

function createProject(asset: AssetLibraryItem): Project {
  const scene = createScene(asset.id);

  return {
    id: 'project-1',
    name: 'Project',
    thumbnail: null,
    startSceneId: scene.id,
    scenes: [scene],
    characters: [],
    resources: [],
    variables: [],
    groups: [],
    assetLibrary: [asset],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('resolveSceneBackgroundUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves embedded assets through the shared display service', () => {
    const asset = createAsset();
    const project = createProject(asset);

    expect(resolveSceneBackgroundUrl(project, project.scenes[0])).toBe('data:image/png;base64,abc');
    expect(resolveBackgroundAssetDisplaySource).toHaveBeenCalledWith(asset, null);
  });

  it('resolves remote assets through the shared display service', () => {
    const asset = createAsset({
      storageType: 'remote',
      source: 'https://example.com/background.jpg',
    });
    const project = createProject(asset);

    expect(resolveSceneBackgroundUrl(project, project.scenes[0])).toBe('https://example.com/background.jpg');
    expect(resolveBackgroundAssetDisplaySource).toHaveBeenCalledWith(asset, null);
  });

  it('resolves local assets to null through the shared display service', () => {
    const asset = createAsset({
      storageType: 'local',
      source: 'assets/backgrounds/forest.png',
    });
    const project = createProject(asset);

    expect(resolveSceneBackgroundUrl(project, project.scenes[0])).toBeNull();
    expect(resolveBackgroundAssetDisplaySource).toHaveBeenCalledWith(asset, null);
  });
});
