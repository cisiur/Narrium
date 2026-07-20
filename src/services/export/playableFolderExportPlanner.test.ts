import { describe, expect, it } from 'vitest';
import type { AssetLibraryItem, Project, Scene } from '../../types';
import {
  createPlayableFolderExportPlan,
  getPlayableFolderName,
  PlayableFolderExportPlanError,
} from './playableFolderExportPlanner';

function createAsset(overrides: Partial<AssetLibraryItem> = {}): AssetLibraryItem {
  return {
    id: 'asset-1',
    kind: 'background',
    name: 'Forest',
    storageType: 'local',
    source: 'assets/backgrounds/forest.png',
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
    dialoguePages: [{ id: `${id}-page`, speakerId: null, text: id }],
    choices: [],
    groupId: null,
    ...overrides,
  };
}

function createProject(assetLibrary: AssetLibraryItem[], scenes: Scene[]): Project {
  return {
    id: 'project-1',
    name: 'Test Story',
    thumbnail: null,
    startSceneId: scenes[0]?.id ?? '',
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

describe('createPlayableFolderExportPlan', () => {
  it('collects direct local background references and rewrites them to relative export URLs', () => {
    const asset = createAsset();
    const project = createProject([asset], [createScene('scene-1', asset.id)]);
    const plan = createPlayableFolderExportPlan(project);

    expect(plan.localAssetCopies).toEqual([
      {
        assetIds: [asset.id],
        sourceRelativePath: 'assets/backgrounds/forest.png',
        destinationRelativePath: 'assets/backgrounds/forest.png',
      },
    ]);
    expect(plan.projectSnapshot.assetLibrary[0].source).toBe('assets/backgrounds/forest.png');
  });

  it('collects one-level scene reference backgrounds', () => {
    const asset = createAsset();
    const sourceScene = createScene('source-scene', asset.id);
    const referencingScene = createScene('reference-scene', null, {
      background: {
        mode: 'scene_reference',
        assetId: null,
        sourceSceneId: sourceScene.id,
        url: '',
      },
    });

    const plan = createPlayableFolderExportPlan(createProject([asset], [sourceScene, referencingScene]));

    expect(plan.localAssetCopies).toHaveLength(1);
    expect(plan.referencedBackgroundAssets).toEqual([
      {
        assetId: asset.id,
        storageType: 'local',
        source: 'assets/backgrounds/forest.png',
      },
    ]);
  });

  it('ignores unused asset library entries', () => {
    const unused = createAsset({ id: 'unused', source: 'assets/backgrounds/missing.png' });
    const plan = createPlayableFolderExportPlan(createProject([unused], [createScene('scene-1')]));

    expect(plan.localAssetCopies).toEqual([]);
    expect(plan.projectSnapshot.assetLibrary).toEqual([]);
  });

  it('classifies embedded remote and local referenced backgrounds', () => {
    const embedded = createAsset({
      id: 'embedded',
      storageType: 'embedded',
      source: 'data:image/png;base64,abc',
    });
    const remote = createAsset({
      id: 'remote',
      storageType: 'remote',
      source: 'https://example.com/forest.png',
    });
    const local = createAsset({ id: 'local', source: 'assets/backgrounds/local.png' });
    const plan = createPlayableFolderExportPlan(
      createProject(
        [embedded, remote, local],
        [createScene('a', embedded.id), createScene('b', remote.id), createScene('c', local.id)],
      ),
    );

    expect(plan.referencedBackgroundAssets).toEqual([
      { assetId: 'embedded', storageType: 'embedded', source: 'data:image/png;base64,abc' },
      { assetId: 'remote', storageType: 'remote', source: 'https://example.com/forest.png' },
      { assetId: 'local', storageType: 'local', source: 'assets/backgrounds/local.png' },
    ]);
    expect(plan.localAssetCopies).toHaveLength(1);
  });

  it('rejects invalid referenced local paths', () => {
    const asset = createAsset({ source: '../outside.png' });

    expect(() => createPlayableFolderExportPlan(createProject([asset], [createScene('scene-1', asset.id)])))
      .toThrow(PlayableFolderExportPlanError);
  });

  it('rejects unsupported referenced local background formats', () => {
    const asset = createAsset({ source: 'assets/backgrounds/notes.gif' });

    expect(() => createPlayableFolderExportPlan(createProject([asset], [createScene('scene-1', asset.id)])))
      .toThrow('Unsupported local background image format');
  });

  it('reuses duplicate references to the same source file', () => {
    const first = createAsset({ id: 'asset-a', source: 'assets/backgrounds/forest.png' });
    const second = createAsset({ id: 'asset-b', source: 'assets\\backgrounds\\FOREST.png' });
    const plan = createPlayableFolderExportPlan(
      createProject([first, second], [createScene('a', first.id), createScene('b', second.id)]),
    );

    expect(plan.localAssetCopies).toEqual([
      {
        assetIds: ['asset-a', 'asset-b'],
        sourceRelativePath: 'assets/backgrounds/forest.png',
        destinationRelativePath: 'assets/backgrounds/forest.png',
      },
    ]);
    expect(plan.projectSnapshot.assetLibrary.map((asset) => asset.source)).toEqual([
      'assets/backgrounds/forest.png',
      'assets/backgrounds/forest.png',
    ]);
  });

  it('handles destination filename collisions deterministically', () => {
    const first = createAsset({ id: 'asset-a', source: 'assets/backgrounds/Forest Hall.png' });
    const second = createAsset({ id: 'asset-b', source: 'assets/backgrounds/forest-hall.png' });
    const project = createProject([second, first], [createScene('b', second.id), createScene('a', first.id)]);

    expect(createPlayableFolderExportPlan(project).localAssetCopies).toEqual([
      {
        assetIds: ['asset-a'],
        sourceRelativePath: 'assets/backgrounds/Forest Hall.png',
        destinationRelativePath: 'assets/backgrounds/forest-hall.png',
      },
      {
        assetIds: ['asset-b'],
        sourceRelativePath: 'assets/backgrounds/forest-hall.png',
        destinationRelativePath: 'assets/backgrounds/forest-hall-2.png',
      },
    ]);
  });

  it('is deterministic regardless of asset library order', () => {
    const a = createAsset({ id: 'a', source: 'assets/backgrounds/z.png' });
    const b = createAsset({ id: 'b', source: 'assets/backgrounds/a.png' });
    const scenes = [createScene('a', a.id), createScene('b', b.id)];

    expect(createPlayableFolderExportPlan(createProject([a, b], scenes)).localAssetCopies)
      .toEqual(createPlayableFolderExportPlan(createProject([b, a], scenes)).localAssetCopies);
  });

  it('does not mutate the source Project', () => {
    const asset = createAsset({ source: 'assets/backgrounds/Forest Hall.png' });
    const project = createProject([asset], [createScene('scene-1', asset.id)]);
    const serializedBefore = JSON.stringify(project);
    const plan = createPlayableFolderExportPlan(project);

    expect(JSON.stringify(project)).toBe(serializedBefore);
    expect(plan.projectSnapshot).not.toBe(project);
    expect(plan.projectSnapshot.assetLibrary[0]).not.toBe(project.assetLibrary[0]);
    expect(project.assetLibrary[0].source).toBe('assets/backgrounds/Forest Hall.png');
  });

  it('creates safe deterministic playable folder names', () => {
    expect(getPlayableFolderName(' My Story! ')).toBe('my-story');
    expect(getPlayableFolderName('***')).toBe('narrium-story');
  });
});
