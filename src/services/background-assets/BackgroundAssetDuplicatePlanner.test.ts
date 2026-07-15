import { describe, expect, it } from 'vitest';
import type { AssetLibraryItem, Project } from '../../types';
import {
  planBackgroundAssetDuplicates,
  type FingerprintedBackgroundFile,
} from './BackgroundAssetDuplicatePlanner';

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
    startSceneId: 'scene-1',
    scenes: [
      {
        id: 'scene-1',
        name: 'Scene',
        background: {
          mode: 'asset',
          assetId: 'scene-only',
          sourceSceneId: null,
          url: 'assets/backgrounds/orphan.png',
        },
        position: { x: 0, y: 0 },
        dialoguePages: [],
        choices: [],
        groupId: null,
      },
    ],
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

function fingerprinted(
  relativePath: string,
  contentHash: string,
  fileSize = 10,
): FingerprintedBackgroundFile {
  return {
    relativePath,
    fileName: relativePath.split(/[\\/]/).pop() ?? relativePath,
    fileSize,
    contentHash,
  };
}

describe('background asset duplicate planning', () => {
  it('groups two physical files with the same hash', () => {
    const report = planBackgroundAssetDuplicates(createProject(), 'C:/Stories/Story.narrium', [
      fingerprinted('assets/backgrounds/forest.png', 'hash-a'),
      fingerprinted('assets/backgrounds/forest-copy.webp', 'hash-a'),
    ]);

    expect(report.groups).toHaveLength(1);
    expect(report.groups[0].files.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/forest-copy.webp',
      'assets/backgrounds/forest.png',
    ]);
  });

  it('does not create a group for one physical file alone', () => {
    const report = planBackgroundAssetDuplicates(createProject(), 'C:/Stories/Story.narrium', [
      fingerprinted('assets/backgrounds/forest.png', 'hash-a'),
    ]);

    expect(report.groups).toEqual([]);
  });

  it('creates multiple independent groups for multiple hashes', () => {
    const report = planBackgroundAssetDuplicates(createProject(), 'C:/Stories/Story.narrium', [
      fingerprinted('assets/backgrounds/b.png', 'hash-b'),
      fingerprinted('assets/backgrounds/a.png', 'hash-a'),
      fingerprinted('assets/backgrounds/d.png', 'hash-b'),
      fingerprinted('assets/backgrounds/c.png', 'hash-a'),
    ]);

    expect(report.groups.map((group) => group.files.map((file) => file.relativePath))).toEqual([
      ['assets/backgrounds/a.png', 'assets/backgrounds/c.png'],
      ['assets/backgrounds/b.png', 'assets/backgrounds/d.png'],
    ]);
  });

  it('does not group files with different hashes even when names are similar', () => {
    const report = planBackgroundAssetDuplicates(createProject(), 'C:/Stories/Story.narrium', [
      fingerprinted('assets/backgrounds/forest.png', 'hash-a'),
      fingerprinted('assets/backgrounds/forest-copy.png', 'hash-b'),
    ]);

    expect(report.groups).toEqual([]);
  });

  it('groups files with different names and extensions when hashes match', () => {
    const report = planBackgroundAssetDuplicates(createProject(), 'C:/Stories/Story.narrium', [
      fingerprinted('assets/backgrounds/castle.jpg', 'hash-a'),
      fingerprinted('assets/backgrounds/woods.webp', 'hash-a'),
    ]);

    expect(report.groups[0].files.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/castle.jpg',
      'assets/backgrounds/woods.webp',
    ]);
  });

  it('classifies referenced and unreferenced physical files from the Asset Library', () => {
    const report = planBackgroundAssetDuplicates(
      createProject([createAsset({ source: 'assets/backgrounds/forest.png' })]),
      'C:/Stories/Story.narrium',
      [
        fingerprinted('assets/backgrounds/forest.png', 'hash-a'),
        fingerprinted('assets/backgrounds/forest-copy.png', 'hash-a'),
      ],
    );

    expect(report.groups[0].referencedFiles.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/forest.png',
    ]);
    expect(report.groups[0].unreferencedFiles.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/forest-copy.png',
    ]);
  });

  it('classifies differently cased physical paths as referenced', () => {
    const report = planBackgroundAssetDuplicates(
      createProject([createAsset({ source: 'assets/backgrounds/Forest.png' })]),
      'C:/Stories/Story.narrium',
      [
        fingerprinted('assets/backgrounds/forest.png', 'hash-a'),
        fingerprinted('assets/backgrounds/copy.png', 'hash-a'),
      ],
    );

    expect(report.groups[0].referencedFiles.map((file) => file.relativePath)).toEqual([
      'assets/backgrounds/forest.png',
    ]);
  });

  it('counts duplicate mixed-case Asset Library entries as one physical reference', () => {
    const report = planBackgroundAssetDuplicates(
      createProject([
        createAsset({ id: 'asset-one', source: 'assets/backgrounds/Forest.png' }),
        createAsset({ id: 'asset-two', source: 'assets/backgrounds/forest.png' }),
      ]),
      'C:/Stories/Story.narrium',
      [
        fingerprinted('assets/backgrounds/FOREST.png', 'hash-a'),
        fingerprinted('assets/backgrounds/copy.png', 'hash-a'),
      ],
    );

    expect(report.groups[0].referencedFiles).toHaveLength(1);
    expect(report.groups[0].referencedFiles[0].relativePath).toBe('assets/backgrounds/FOREST.png');
  });

  it('ignores embedded and remote assets for physical reference classification', () => {
    const report = planBackgroundAssetDuplicates(
      createProject([
        createAsset({
          id: 'asset-embedded',
          storageType: 'embedded',
          source: 'assets/backgrounds/forest.png',
        }),
        createAsset({
          id: 'asset-remote',
          storageType: 'remote',
          source: 'assets/backgrounds/copy.png',
        }),
      ]),
      'C:/Stories/Story.narrium',
      [
        fingerprinted('assets/backgrounds/forest.png', 'hash-a'),
        fingerprinted('assets/backgrounds/copy.png', 'hash-a'),
      ],
    );

    expect(report.groups[0].referencedFiles).toEqual([]);
    expect(report.groups[0].unreferencedFiles).toHaveLength(2);
  });

  it('does not use scene background data for referenced classification', () => {
    const report = planBackgroundAssetDuplicates(createProject([]), 'C:/Stories/Story.narrium', [
      fingerprinted('assets/backgrounds/orphan.png', 'hash-a'),
      fingerprinted('assets/backgrounds/copy.png', 'hash-a'),
    ]);

    expect(report.groups[0].referencedFiles).toEqual([]);
  });

  it('calculates potential reclaimable bytes as group total minus one retained copy', () => {
    const report = planBackgroundAssetDuplicates(createProject(), 'C:/Stories/Story.narrium', [
      fingerprinted('assets/backgrounds/a.png', 'hash-a', 12),
      fingerprinted('assets/backgrounds/b.png', 'hash-a', 12),
      fingerprinted('assets/backgrounds/c.png', 'hash-a', 12),
    ]);

    expect(report.groups[0].totalSize).toBe(36);
    expect(report.groups[0].potentialReclaimableBytes).toBe(24);
    expect(report.totalPotentialReclaimableBytes).toBe(24);
  });

  it('returns deterministic group and file ordering', () => {
    const report = planBackgroundAssetDuplicates(createProject(), 'C:/Stories/Story.narrium', [
      fingerprinted('assets/backgrounds/z.png', 'hash-z'),
      fingerprinted('assets/backgrounds/b.png', 'hash-b'),
      fingerprinted('assets/backgrounds/a.png', 'hash-b'),
      fingerprinted('assets/backgrounds/y.png', 'hash-z'),
    ]);

    expect(report.groups.map((group) => group.files.map((file) => file.relativePath))).toEqual([
      ['assets/backgrounds/a.png', 'assets/backgrounds/b.png'],
      ['assets/backgrounds/y.png', 'assets/backgrounds/z.png'],
    ]);
  });

  it('includes the scanned project id and project file path', () => {
    const report = planBackgroundAssetDuplicates(createProject(), 'C:/Stories/Story.narrium', []);

    expect(report.projectId).toBe('project-1');
    expect(report.projectFilePath).toBe('C:/Stories/Story.narrium');
  });
});
