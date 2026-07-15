import { describe, expect, it } from 'vitest';
import type { AssetLibraryItem, Project } from '../../types';
import {
  normalizeBackgroundRelativePath,
  planBackgroundAssetCleanup,
  type PhysicalBackgroundFile,
} from './BackgroundAssetCleanupPlanner';

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

function physical(relativePath: string, fileSize = 10): PhysicalBackgroundFile {
  return {
    relativePath,
    fileName: relativePath.split(/[\\/]/).pop() ?? relativePath,
    fileSize,
  };
}

describe('background asset cleanup planning', () => {
  it('protects local Asset Library files even when no scene uses them', () => {
    const report = planBackgroundAssetCleanup(createProject([createAsset()]), 'C:/Stories/Story.narrium', [
      physical('assets/backgrounds/forest.png'),
    ]);

    expect(report.referencedFiles.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/forest.png',
    ]);
    expect(report.orphanedFiles).toEqual([]);
  });

  it('classifies physical files without local Asset Library entries as orphaned', () => {
    const report = planBackgroundAssetCleanup(createProject([]), 'C:/Stories/Story.narrium', [
      physical('assets/backgrounds/orphan.png'),
    ]);

    expect(report.orphanedFiles.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/orphan.png',
    ]);
  });

  it('treats duplicate local Asset Library paths as one protected path', () => {
    const report = planBackgroundAssetCleanup(
      createProject([
        createAsset({ id: 'asset-one' }),
        createAsset({ id: 'asset-two', source: 'assets/backgrounds/forest.png' }),
      ]),
      'C:/Stories/Story.narrium',
      [physical('assets/backgrounds/forest.png')],
    );

    expect(report.protectedRelativePaths).toEqual(['assets/backgrounds/forest.png']);
    expect(report.referencedFiles).toHaveLength(1);
  });

  it('does not let embedded assets protect filesystem paths', () => {
    const report = planBackgroundAssetCleanup(
      createProject([
        createAsset({
          id: 'asset-embedded',
          storageType: 'embedded',
          source: 'assets/backgrounds/forest.png',
        }),
      ]),
      'C:/Stories/Story.narrium',
      [physical('assets/backgrounds/forest.png')],
    );

    expect(report.orphanedFiles.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/forest.png',
    ]);
  });

  it('does not let remote assets protect filesystem paths', () => {
    const report = planBackgroundAssetCleanup(
      createProject([
        createAsset({
          id: 'asset-remote',
          storageType: 'remote',
          source: 'assets/backgrounds/forest.png',
        }),
      ]),
      'C:/Stories/Story.narrium',
      [physical('assets/backgrounds/forest.png')],
    );

    expect(report.orphanedFiles.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/forest.png',
    ]);
  });

  it('reports missing referenced files separately and never as deletion candidates', () => {
    const report = planBackgroundAssetCleanup(createProject([createAsset()]), 'C:/Stories/Story.narrium', [
      physical('assets/backgrounds/orphan.png'),
    ]);

    expect(report.missingReferencedFiles).toEqual([
      {
        relativePath: 'assets/backgrounds/forest.png',
        assetIds: ['asset-local'],
      },
    ]);
    expect(report.orphanedFiles.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/orphan.png',
    ]);
  });

  it('normalizes path separators consistently', () => {
    const report = planBackgroundAssetCleanup(
      createProject([createAsset({ source: 'assets\\backgrounds\\forest.png' })]),
      'C:/Stories/Story.narrium',
      [physical('assets/backgrounds/forest.png')],
    );

    expect(normalizeBackgroundRelativePath('assets\\backgrounds\\.\\forest.png')).toBe(
      'assets/backgrounds/forest.png',
    );
    expect(report.referencedFiles.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/forest.png',
    ]);
    expect(report.missingReferencedFiles).toEqual([]);
  });

  it('protects mixed-case Asset Library paths when the physical file casing differs', () => {
    const report = planBackgroundAssetCleanup(
      createProject([createAsset({ source: 'assets/backgrounds/Forest.png' })]),
      'C:/Stories/Story.narrium',
      [physical('assets/backgrounds/forest.png')],
    );

    expect(report.referencedFiles.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/forest.png',
    ]);
    expect(report.orphanedFiles).toEqual([]);
    expect(report.missingReferencedFiles).toEqual([]);
    expect(report.protectedRelativePaths).toEqual(['assets/backgrounds/Forest.png']);
  });

  it('protects lower-case Asset Library paths when the physical file casing differs', () => {
    const report = planBackgroundAssetCleanup(
      createProject([createAsset({ source: 'assets/backgrounds/forest.png' })]),
      'C:/Stories/Story.narrium',
      [physical('assets/backgrounds/Forest.png')],
    );

    expect(report.referencedFiles.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/Forest.png',
    ]);
    expect(report.orphanedFiles).toEqual([]);
    expect(report.missingReferencedFiles).toEqual([]);
  });

  it('keeps duplicate mixed-case local entries as one protected path', () => {
    const report = planBackgroundAssetCleanup(
      createProject([
        createAsset({ id: 'asset-one', source: 'assets/backgrounds/Forest.png' }),
        createAsset({ id: 'asset-two', source: 'assets/backgrounds/forest.png' }),
      ]),
      'C:/Stories/Story.narrium',
      [physical('assets/backgrounds/FOREST.png')],
    );

    expect(report.protectedRelativePaths).toEqual(['assets/backgrounds/Forest.png']);
    expect(report.referencedFiles).toHaveLength(1);
    expect(report.missingReferencedFiles).toEqual([]);
  });
});
