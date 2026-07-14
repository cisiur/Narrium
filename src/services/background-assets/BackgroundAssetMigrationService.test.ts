import { describe, expect, it } from 'vitest';
import type { AssetLibraryItem, Project } from '../../types';
import {
  applyMaterializedBackgroundAssets,
  parseEmbeddedBackgroundDataUrl,
  planEmbeddedBackgroundAssetMigration,
  type MaterializedBackgroundAsset,
} from './BackgroundAssetMigrationService';

const PNG_DATA_URL = 'data:image/png;base64,cG5n';
const JPEG_DATA_URL = 'data:image/jpeg;base64,anBlZw==';
const WEBP_DATA_URL = 'data:image/webp;base64,d2VicA==';

function createAsset(overrides: Partial<AssetLibraryItem> = {}): AssetLibraryItem {
  return {
    id: 'asset-a12f3c',
    kind: 'background',
    name: 'Forest Clearing',
    storageType: 'embedded',
    source: PNG_DATA_URL,
    createdAt: '2026-01-01T00:00:00.000Z',
    metadata: {
      width: 1920,
      height: 1080,
      mimeType: 'image/png',
      fileSize: 24,
    },
    ...overrides,
  };
}

function createProject(assetLibrary: AssetLibraryItem[]): Project {
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

function materialized(
  overrides: Partial<MaterializedBackgroundAsset> = {},
): MaterializedBackgroundAsset {
  return {
    assetId: 'asset-a12f3c',
    relativePath: 'assets/backgrounds/forest-clearing.png',
    mimeType: 'image/png',
    fileSize: 1024,
    ...overrides,
  };
}

describe('parseEmbeddedBackgroundDataUrl', () => {
  it('parses valid PNG Data URLs', () => {
    expect(parseEmbeddedBackgroundDataUrl(PNG_DATA_URL)).toEqual({
      mimeType: 'image/png',
      base64Data: 'cG5n',
      extension: 'png',
    });
  });

  it('parses valid JPEG Data URLs', () => {
    expect(parseEmbeddedBackgroundDataUrl(JPEG_DATA_URL)).toEqual({
      mimeType: 'image/jpeg',
      base64Data: 'anBlZw==',
      extension: 'jpg',
    });
  });

  it('parses valid WEBP Data URLs', () => {
    expect(parseEmbeddedBackgroundDataUrl(WEBP_DATA_URL)).toEqual({
      mimeType: 'image/webp',
      base64Data: 'd2VicA==',
      extension: 'webp',
    });
  });

  it('rejects Data URLs missing ;base64', () => {
    expect(() => parseEmbeddedBackgroundDataUrl('data:image/png,cG5n')).toThrow(';base64');
  });

  it('rejects unsupported image MIME types', () => {
    expect(() => parseEmbeddedBackgroundDataUrl('data:image/gif;base64,Z2lm')).toThrow('unsupported');
  });

  it('rejects non-image Data URLs', () => {
    expect(() => parseEmbeddedBackgroundDataUrl('data:text/plain;base64,dGV4dA==')).toThrow('image MIME');
  });

  it('rejects empty payloads', () => {
    expect(() => parseEmbeddedBackgroundDataUrl('data:image/png;base64,')).toThrow('non-empty');
  });

  it('rejects malformed headers', () => {
    expect(() => parseEmbeddedBackgroundDataUrl('data:;base64,cG5n')).toThrow('supported image MIME');
    expect(() => parseEmbeddedBackgroundDataUrl('image/png;base64,cG5n')).toThrow('valid Data URL');
    expect(() => parseEmbeddedBackgroundDataUrl('data:image/png;base64;name=forest,cG5n')).toThrow(';base64');
  });

  it('canonicalizes JPEG MIME casing', () => {
    expect(parseEmbeddedBackgroundDataUrl('data:IMAGE/JPEG;base64,anBlZw==')).toMatchObject({
      mimeType: 'image/jpeg',
      extension: 'jpg',
    });
  });
});

describe('planEmbeddedBackgroundAssetMigration', () => {
  it('returns empty requests when there are no embedded assets', () => {
    const project = createProject([
      createAsset({ id: 'asset-local', storageType: 'local', source: 'assets/backgrounds/forest.png' }),
      createAsset({ id: 'asset-remote', storageType: 'remote', source: 'https://example.com/forest.png' }),
    ]);

    expect(planEmbeddedBackgroundAssetMigration(project)).toEqual([]);
  });

  it('creates one request for one embedded background', () => {
    const project = createProject([createAsset()]);

    expect(planEmbeddedBackgroundAssetMigration(project)).toEqual([
      {
        assetId: 'asset-a12f3c',
        suggestedName: 'forest-clearing-a12f3c',
        mimeType: 'image/png',
        base64Data: 'cG5n',
      },
    ]);
  });

  it('preserves assetLibrary order for multiple embedded assets', () => {
    const project = createProject([
      createAsset({ id: 'asset-first111', name: 'First', source: JPEG_DATA_URL }),
      createAsset({ id: 'asset-second2', name: 'Second', source: WEBP_DATA_URL }),
    ]);

    expect(planEmbeddedBackgroundAssetMigration(project).map((request) => request.assetId)).toEqual([
      'asset-first111',
      'asset-second2',
    ]);
  });

  it('skips local and remote assets', () => {
    const project = createProject([
      createAsset({ id: 'asset-local', storageType: 'local', source: 'assets/backgrounds/forest.png' }),
      createAsset({ id: 'asset-embedded' }),
      createAsset({ id: 'asset-remote', storageType: 'remote', source: 'https://example.com/forest.png' }),
    ]);

    expect(planEmbeddedBackgroundAssetMigration(project).map((request) => request.assetId)).toEqual([
      'asset-embedded',
    ]);
  });

  it('uses asset ids in requests', () => {
    const [request] = planEmbeddedBackgroundAssetMigration(createProject([createAsset({ id: 'asset-custom123' })]));

    expect(request.assetId).toBe('asset-custom123');
  });

  it('creates deterministic suggested names', () => {
    const project = createProject([createAsset({ id: 'asset-a12f3c', name: 'Forest Clearing!' })]);

    expect(planEmbeddedBackgroundAssetMigration(project)[0].suggestedName).toBe('forest-clearing-a12f3c');
    expect(planEmbeddedBackgroundAssetMigration(project)[0].suggestedName).toBe('forest-clearing-a12f3c');
  });

  it('includes a stable short asset-id portion in suggested names', () => {
    const [request] = planEmbeddedBackgroundAssetMigration(createProject([createAsset({ id: 'asset-a12f3c' })]));

    expect(request.suggestedName).toContain('a12f3c');
  });

  it('throws on malformed embedded backgrounds without returning a partial plan', () => {
    const project = createProject([
      createAsset({ id: 'asset-valid', source: PNG_DATA_URL }),
      createAsset({ id: 'asset-invalid', source: 'data:image/png,missing-base64' }),
    ]);

    expect(() => planEmbeddedBackgroundAssetMigration(project)).toThrow('asset-invalid');
  });

  it('does not mutate the input project', () => {
    const project = createProject([createAsset()]);
    const before = JSON.stringify(project);

    planEmbeddedBackgroundAssetMigration(project);

    expect(JSON.stringify(project)).toBe(before);
  });
});

describe('applyMaterializedBackgroundAssets', () => {
  it('converts one embedded background asset to local', () => {
    const project = createProject([createAsset()]);
    const nextProject = applyMaterializedBackgroundAssets(project, [materialized()]);

    expect(nextProject.assetLibrary[0]).toMatchObject({
      storageType: 'local',
      source: 'assets/backgrounds/forest-clearing.png',
    });
  });

  it('maps multiple results by assetId rather than result order', () => {
    const project = createProject([
      createAsset({ id: 'asset-one111', source: PNG_DATA_URL }),
      createAsset({ id: 'asset-two222', source: JPEG_DATA_URL }),
    ]);
    const nextProject = applyMaterializedBackgroundAssets(project, [
      materialized({ assetId: 'asset-two222', relativePath: 'assets/backgrounds/two.jpg', mimeType: 'image/jpeg' }),
      materialized({ assetId: 'asset-one111', relativePath: 'assets/backgrounds/one.png' }),
    ]);

    expect(nextProject.assetLibrary.map((asset) => asset.source)).toEqual([
      'assets/backgrounds/one.png',
      'assets/backgrounds/two.jpg',
    ]);
  });

  it('leaves remote assets unchanged', () => {
    const remoteAsset = createAsset({ id: 'asset-remote', storageType: 'remote', source: 'https://example.com/bg.png' });
    const project = createProject([createAsset(), remoteAsset]);
    const nextProject = applyMaterializedBackgroundAssets(project, [materialized()]);

    expect(nextProject.assetLibrary[1]).toBe(remoteAsset);
  });

  it('leaves local assets unchanged', () => {
    const localAsset = createAsset({ id: 'asset-local', storageType: 'local', source: 'assets/backgrounds/local.png' });
    const project = createProject([createAsset(), localAsset]);
    const nextProject = applyMaterializedBackgroundAssets(project, [materialized()]);

    expect(nextProject.assetLibrary[1]).toBe(localAsset);
  });

  it('preserves asset id, name, and createdAt', () => {
    const nextAsset = applyMaterializedBackgroundAssets(createProject([createAsset()]), [materialized()]).assetLibrary[0];

    expect(nextAsset).toMatchObject({
      id: 'asset-a12f3c',
      name: 'Forest Clearing',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('preserves metadata width and height', () => {
    const nextAsset = applyMaterializedBackgroundAssets(createProject([createAsset()]), [materialized()]).assetLibrary[0];

    expect(nextAsset.metadata).toMatchObject({
      width: 1920,
      height: 1080,
    });
  });

  it('updates metadata MIME and file size', () => {
    const nextAsset = applyMaterializedBackgroundAssets(
      createProject([createAsset()]),
      [materialized({ mimeType: 'image/webp', fileSize: 2048, relativePath: 'assets/backgrounds/forest.webp' })],
    ).assetLibrary[0];

    expect(nextAsset.metadata).toMatchObject({
      mimeType: 'image/webp',
      fileSize: 2048,
    });
  });

  it('does not mutate the input project or asset objects', () => {
    const asset = createAsset();
    const project = createProject([asset]);
    const before = JSON.stringify(project);
    const nextProject = applyMaterializedBackgroundAssets(project, [materialized()]);

    expect(JSON.stringify(project)).toBe(before);
    expect(nextProject).not.toBe(project);
    expect(nextProject.assetLibrary[0]).not.toBe(asset);
    expect(project.assetLibrary[0]).toBe(asset);
  });

  it('throws for duplicate result asset ids', () => {
    expect(() =>
      applyMaterializedBackgroundAssets(createProject([createAsset()]), [
        materialized(),
        materialized({ relativePath: 'assets/backgrounds/other.png' }),
      ]),
    ).toThrow('Duplicate');
  });

  it('throws for unknown result asset ids', () => {
    expect(() =>
      applyMaterializedBackgroundAssets(createProject([createAsset()]), [
        materialized({ assetId: 'asset-missing' }),
      ]),
    ).toThrow('unknown asset');
  });

  it('throws for results that reference non-embedded assets', () => {
    expect(() =>
      applyMaterializedBackgroundAssets(
        createProject([createAsset({ id: 'asset-remote', storageType: 'remote', source: 'https://example.com/bg.png' })]),
        [materialized({ assetId: 'asset-remote' })],
      ),
    ).toThrow('non-eligible embedded background');
  });

  it('throws when an eligible embedded asset has no matching result', () => {
    expect(() =>
      applyMaterializedBackgroundAssets(
        createProject([
          createAsset({ id: 'asset-one111' }),
          createAsset({ id: 'asset-two222', source: JPEG_DATA_URL }),
        ]),
        [materialized({ assetId: 'asset-one111' })],
      ),
    ).toThrow('Missing materialized background result');
  });

  it('throws for empty relative paths', () => {
    expect(() =>
      applyMaterializedBackgroundAssets(createProject([createAsset()]), [
        materialized({ relativePath: '  ' }),
      ]),
    ).toThrow('empty relative path');
  });

  it('throws for invalid file sizes', () => {
    expect(() =>
      applyMaterializedBackgroundAssets(createProject([createAsset()]), [
        materialized({ fileSize: -1 }),
      ]),
    ).toThrow('invalid file size');
    expect(() =>
      applyMaterializedBackgroundAssets(createProject([createAsset()]), [
        materialized({ fileSize: Number.NaN }),
      ]),
    ).toThrow('invalid file size');
  });

  it('throws for unsupported result MIME types', () => {
    expect(() =>
      applyMaterializedBackgroundAssets(createProject([createAsset()]), [
        materialized({ mimeType: 'image/gif' as MaterializedBackgroundAsset['mimeType'] }),
      ]),
    ).toThrow('unsupported MIME');
  });

  it('returns the same project object when no eligible assets and empty results are provided', () => {
    const project = createProject([
      createAsset({ id: 'asset-local', storageType: 'local', source: 'assets/backgrounds/local.png' }),
    ]);

    expect(applyMaterializedBackgroundAssets(project, [])).toBe(project);
  });
});
