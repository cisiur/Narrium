import { describe, expect, it } from 'vitest';
import type { AssetLibraryItem, Project, Scene } from '../../types';
import { resolveLegacySceneBackgroundSource, resolveSceneBackgroundAsset } from './assetDisplay';

function createBackgroundAsset(overrides: Partial<AssetLibraryItem> = {}): AssetLibraryItem {
  return {
    id: 'asset-local-background',
    kind: 'background',
    name: 'Forest',
    storageType: 'local',
    source: 'assets/backgrounds/forest.png',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 'scene-1',
    name: 'Forest',
    background: {
      mode: 'none',
      assetId: null,
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

function createProject(scene: Scene, assetLibrary: AssetLibraryItem[]): Project {
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
    assetLibrary,
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('scene background asset display resolution', () => {
  it('resolves local background asset references used by the desktop preview path', () => {
    const asset = createBackgroundAsset();
    const scene = createScene({
      background: {
        mode: 'asset',
        assetId: asset.id,
        sourceSceneId: null,
        url: '',
      },
    });
    const project = createProject(scene, [asset]);

    expect(resolveSceneBackgroundAsset(project, scene)).toBe(asset);
    expect(resolveLegacySceneBackgroundSource(project, scene)).toBeNull();
  });

  it('keeps embedded browser background sources on the immediate display path', () => {
    const scene = createScene({
      background: {
        mode: 'upload',
        assetId: null,
        sourceSceneId: null,
        url: 'data:image/png;base64,abc',
      },
    });
    const project = createProject(scene, []);

    expect(resolveSceneBackgroundAsset(project, scene)).toBeNull();
    expect(resolveLegacySceneBackgroundSource(project, scene)).toBe('data:image/png;base64,abc');
  });
});
