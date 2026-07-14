import { describe, expect, it } from 'vitest';
import type { AssetLibraryItem, Project, Scene } from '../../types';
import {
  resolveLegacySceneBackgroundSource,
  resolveSceneBackgroundAsset,
  subscribeToAssetDisplaySource,
} from './assetDisplay';

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

function createProject(scenes: Scene | Scene[], assetLibrary: AssetLibraryItem[]): Project {
  const projectScenes = Array.isArray(scenes) ? scenes : [scenes];

  return {
    id: 'project-1',
    name: 'Project',
    thumbnail: null,
    startSceneId: projectScenes[0]?.id ?? '',
    scenes: projectScenes,
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

  it('resolves scene-reference backgrounds through the referenced scene asset', () => {
    const asset = createBackgroundAsset();
    const referencedScene = createScene({
      id: 'scene-source',
      background: {
        mode: 'asset',
        assetId: asset.id,
        sourceSceneId: null,
        url: '',
      },
    });
    const scene = createScene({
      id: 'scene-reference',
      background: {
        mode: 'scene_reference',
        assetId: null,
        sourceSceneId: referencedScene.id,
        url: '',
      },
    });
    const project = createProject([scene, referencedScene], [asset]);

    expect(resolveSceneBackgroundAsset(project, scene)).toBe(asset);
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

  it('keeps legacy direct scene-reference upload backgrounds on the immediate display path', () => {
    const referencedScene = createScene({
      id: 'scene-source',
      background: {
        mode: 'upload',
        assetId: null,
        sourceSceneId: null,
        url: 'data:image/png;base64,legacy',
      },
    });
    const scene = createScene({
      id: 'scene-reference',
      background: {
        mode: 'scene_reference',
        assetId: null,
        sourceSceneId: referencedScene.id,
        url: '',
      },
    });
    const project = createProject([scene, referencedScene], []);

    expect(resolveSceneBackgroundAsset(project, scene)).toBeNull();
    expect(resolveLegacySceneBackgroundSource(project, scene)).toBe('data:image/png;base64,legacy');
  });
});

describe('asset display source subscription', () => {
  it('ignores stale asynchronous local-resolution results after the selected asset changes', async () => {
    let resolveLocalSource: (source: string | null) => void = () => undefined;
    const updates: Array<string | null> = [];
    const cleanupLocal = subscribeToAssetDisplaySource(
      {
        source: null,
        loadSource: () =>
          new Promise<string | null>((resolve) => {
            resolveLocalSource = resolve;
          }),
      },
      (source) => updates.push(source),
    );

    cleanupLocal();
    subscribeToAssetDisplaySource(
      {
        source: 'data:image/png;base64,new',
      },
      (source) => updates.push(source),
    );
    resolveLocalSource('asset://localhost/backgrounds/old.png');
    await Promise.resolve();

    expect(updates).toEqual([null, 'data:image/png;base64,new']);
  });

  it('updates immediately when switching from a local asset to a remote asset', async () => {
    let resolveLocalSource: (source: string | null) => void = () => undefined;
    const updates: Array<string | null> = [];
    const cleanupLocal = subscribeToAssetDisplaySource(
      {
        source: null,
        loadSource: () =>
          new Promise<string | null>((resolve) => {
            resolveLocalSource = resolve;
          }),
      },
      (source) => updates.push(source),
    );

    cleanupLocal();
    subscribeToAssetDisplaySource(
      {
        source: 'https://example.com/new-background.jpg',
      },
      (source) => updates.push(source),
    );
    resolveLocalSource('asset://localhost/backgrounds/old.png');
    await Promise.resolve();

    expect(updates).toEqual([null, 'https://example.com/new-background.jpg']);
  });

  it('treats failed local display resolution as a missing source', async () => {
    const updates: Array<string | null> = [];

    subscribeToAssetDisplaySource(
      {
        source: null,
        loadSource: () => Promise.reject(new Error('missing local file')),
      },
      (source) => updates.push(source),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(updates).toEqual([null, null]);
  });
});
