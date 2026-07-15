import { describe, expect, it, vi } from 'vitest';
import type { AssetLibraryItem, Project } from '../../types';
import type { MaterializedBackgroundAsset } from '../background-assets';
import type { PlatformProjectFileApi, ProjectFileSaveOptions, ProjectFileSelectionOptions } from '../platform';
import {
  DesktopProjectFileService,
  NARRIUM_PROJECT_EXTENSION,
  NARRIUM_PROJECT_FORMAT,
  NARRIUM_PROJECT_FORMAT_VERSION,
  deriveProjectNameFromNarriumFilePath,
  parseNarriumProjectFile,
  serializeNarriumProjectFile,
} from './ProjectFileService';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    thumbnail: null,
    startSceneId: '',
    scenes: [],
    characters: [],
    resources: [],
    variables: [],
    groups: [],
    assetLibrary: [],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createBackgroundAsset(overrides: Partial<AssetLibraryItem> = {}): AssetLibraryItem {
  return {
    id: 'asset-embedded-a12f3c',
    kind: 'background',
    name: 'Forest Clearing',
    storageType: 'embedded',
    source: 'data:image/png;base64,cG5n',
    createdAt: '2026-01-01T00:00:00.000Z',
    metadata: {
      width: 640,
      height: 360,
      mimeType: 'image/png',
      fileSize: 3,
    },
    ...overrides,
  };
}

function parseWrittenProject(platformFileApi: PlatformProjectFileApi): Project {
  const writeProjectFile = vi.mocked(platformFileApi.writeProjectFile);
  const contents = writeProjectFile.mock.calls[writeProjectFile.mock.calls.length - 1]?.[1];

  if (!contents) {
    throw new Error('No project file contents were written.');
  }

  const parsed = JSON.parse(contents) as { project: Project };

  return parsed.project;
}

function materializedBackground(
  overrides: Partial<MaterializedBackgroundAsset> = {},
): MaterializedBackgroundAsset {
  return {
    assetId: 'asset-embedded-a12f3c',
    relativePath: 'assets/backgrounds/forest-clearing.png',
    mimeType: 'image/png',
    fileSize: 1024,
    ...overrides,
  };
}

function createPlatformFileApi(overrides: Partial<PlatformProjectFileApi> = {}): PlatformProjectFileApi {
  return {
    selectProjectFileToOpen: vi.fn((_options: ProjectFileSelectionOptions) =>
      Promise.resolve('C:/Stories/My Story.narrium'),
    ),
    selectProjectFilePathForSaveAs: vi.fn((_options: ProjectFileSaveOptions) =>
      Promise.resolve('C:/Stories/My Story.narrium'),
    ),
    readProjectFile: vi.fn((filePath: string) =>
      Promise.resolve({
        filePath,
        contents: serializeNarriumProjectFile(createProject()),
      }),
    ),
    writeProjectFile: vi.fn((filePath: string) => Promise.resolve(filePath)),
    importBackgroundAssetFile: vi.fn(() => Promise.resolve(null)),
    resolveLocalAssetDisplaySource: vi.fn(() => Promise.resolve(null)),
    copyLocalAssetForProjectSaveAs: vi.fn(() => Promise.resolve()),
    materializeEmbeddedBackgroundAssets: vi.fn(() => Promise.reject(new Error('not implemented'))),
    ...overrides,
  };
}

describe('native Narrium project file serialization', () => {
  it('serializes projects with the .narrium wrapper', () => {
    const project = createProject();

    expect(JSON.parse(serializeNarriumProjectFile(project))).toEqual({
      format: NARRIUM_PROJECT_FORMAT,
      formatVersion: NARRIUM_PROJECT_FORMAT_VERSION,
      project,
    });
  });

  it('serializes normalized background assets without duplicating scene source URLs', () => {
    const project = createProject({
      startSceneId: 'scene-1',
      scenes: [
        {
          id: 'scene-1',
          name: 'Scene 1',
          background: {
            mode: 'upload',
            assetId: null,
            sourceSceneId: null,
            url: 'data:image/png;base64,background',
          },
          position: { x: 0, y: 0 },
          dialoguePages: [],
          choices: [],
          groupId: null,
        },
      ],
    });

    const serialized = JSON.parse(serializeNarriumProjectFile(project)) as {
      project: Project;
    };

    expect(serialized.project.assetLibrary).toEqual([
      expect.objectContaining({
        storageType: 'embedded',
        source: 'data:image/png;base64,background',
      }),
    ]);
    expect(serialized.project.scenes[0].background).toEqual({
      mode: 'asset',
      assetId: serialized.project.assetLibrary[0].id,
      sourceSceneId: null,
      url: '',
    });
    expect(JSON.stringify(serialized.project).match(/data:image\/png;base64,background/g)).toHaveLength(1);
  });

  it('serializes local background assets as relative paths', () => {
    const project = createProject({
      assetLibrary: [
        {
          id: 'asset-local',
          kind: 'background',
          name: 'Forest',
          storageType: 'local',
          source: 'assets/backgrounds/forest.png',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const serialized = JSON.parse(serializeNarriumProjectFile(project)) as {
      project: Project;
    };

    expect(serialized.project.assetLibrary[0]).toMatchObject({
      storageType: 'local',
      source: 'assets/backgrounds/forest.png',
    });
    expect(serialized.project.assetLibrary[0].source).not.toMatch(/^[A-Za-z]:[\\/]/);
    expect(serialized.project.assetLibrary[0].source).not.toContain('\\');
  });

  it('parses wrapped .narrium project files', () => {
    const project = createProject();

    expect(parseNarriumProjectFile(serializeNarriumProjectFile(project))).toEqual(project);
  });

  it('parses legacy raw Project JSON', () => {
    const project = createProject();

    expect(parseNarriumProjectFile(JSON.stringify(project))).toEqual(project);
  });

  it('normalizes legacy raw Project JSON while parsing', () => {
    const project = createProject();
    const source = JSON.stringify({
      ...project,
      variables: undefined,
    });

    expect(parseNarriumProjectFile(source)?.variables).toEqual([]);
  });

  it('returns null for invalid project files', () => {
    expect(parseNarriumProjectFile('{"not":"a project"}')).toBeNull();
  });
});

describe('DesktopProjectFileService', () => {
  it('derives project names from .narrium file paths', () => {
    expect(deriveProjectNameFromNarriumFilePath('D:/Stories/Szept/Szept.narrium')).toBe('Szept');
    expect(deriveProjectNameFromNarriumFilePath('D:/Stories/My Story.narrium')).toBe('My Story');
    expect(deriveProjectNameFromNarriumFilePath('D:\\Stories\\Chapter One.NARRIUM')).toBe('Chapter One');
    expect(deriveProjectNameFromNarriumFilePath('D:/Stories/.narrium', 'Original Name')).toBe('Original Name');
    expect(deriveProjectNameFromNarriumFilePath('D:/Stories/.narrium', '  ')).toBe('Untitled Project');
  });

  it('opens a selected Narrium project file and records its file path', async () => {
    const platformFileApi = createPlatformFileApi();
    const service = new DesktopProjectFileService(platformFileApi);

    const result = await service.openProjectFile();

    expect(platformFileApi.selectProjectFileToOpen).toHaveBeenCalledWith({
      title: 'Open Narrium Project File',
    });
    expect(platformFileApi.readProjectFile).toHaveBeenCalledWith('C:/Stories/My Story.narrium');
    expect(result?.filePath).toBe('C:/Stories/My Story.narrium');
  });

  it('saves to a known .narrium project file path', async () => {
    const platformFileApi = createPlatformFileApi();
    const service = new DesktopProjectFileService(platformFileApi);
    const project = createProject();

    const result = await service.saveProject(project, 'C:/Stories/My Story.narrium');

    expect(platformFileApi.writeProjectFile).toHaveBeenCalledWith(
      'C:/Stories/My Story.narrium',
      serializeNarriumProjectFile(project),
    );
    expect(result.filePath).toBe('C:/Stories/My Story.narrium');
    expect(result.project.name).toBe('Test Project');
    expect(platformFileApi.materializeEmbeddedBackgroundAssets).not.toHaveBeenCalled();
  });

  it('materializes embedded backgrounds before saving a known project file path', async () => {
    const embeddedAsset = createBackgroundAsset();
    const remoteAsset = createBackgroundAsset({
      id: 'asset-remote',
      name: 'Remote',
      storageType: 'remote',
      source: 'https://example.com/remote.png',
    });
    const localAsset = createBackgroundAsset({
      id: 'asset-local',
      name: 'Local',
      storageType: 'local',
      source: 'assets/backgrounds/local.png',
    });
    const project = createProject({
      startSceneId: 'scene-1',
      scenes: [
        {
          id: 'scene-1',
          name: 'Scene 1',
          background: {
            mode: 'asset',
            assetId: embeddedAsset.id,
            sourceSceneId: null,
            url: '',
          },
          position: { x: 0, y: 0 },
          dialoguePages: [],
          choices: [],
          groupId: null,
        },
      ],
      assetLibrary: [embeddedAsset, remoteAsset, localAsset],
    });
    const platformFileApi = createPlatformFileApi({
      materializeEmbeddedBackgroundAssets: vi.fn(() =>
        Promise.resolve([
          materializedBackground({
            assetId: embeddedAsset.id,
            relativePath: 'assets/backgrounds/forest-clearing.png',
          }),
        ]),
      ),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    const result = await service.saveProject(project, 'C:/Stories/My Story.narrium');
    const writtenProject = parseWrittenProject(platformFileApi);

    expect(platformFileApi.materializeEmbeddedBackgroundAssets).toHaveBeenCalledWith(
      'C:/Stories/My Story.narrium',
      [
        {
          assetId: embeddedAsset.id,
          suggestedName: 'forest-clearing-a12f3c',
          mimeType: 'image/png',
          base64Data: 'cG5n',
        },
      ],
    );
    expect(
      vi.mocked(platformFileApi.materializeEmbeddedBackgroundAssets).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(platformFileApi.writeProjectFile).mock.invocationCallOrder[0]);
    expect(writtenProject.assetLibrary[0]).toMatchObject({
      id: embeddedAsset.id,
      storageType: 'local',
      source: 'assets/backgrounds/forest-clearing.png',
    });
    expect(JSON.stringify(writtenProject)).not.toContain(embeddedAsset.source);
    expect(result.project.assetLibrary[0]).toMatchObject({
      id: embeddedAsset.id,
      storageType: 'local',
      source: 'assets/backgrounds/forest-clearing.png',
    });
    expect(result.project.scenes[0].background.assetId).toBe(embeddedAsset.id);
    expect(result.project.assetLibrary[1]).toEqual(remoteAsset);
    expect(result.project.assetLibrary[2]).toEqual(localAsset);
    expect(project.assetLibrary[0]).toEqual(embeddedAsset);
  });

  it('materializes multiple embedded backgrounds in asset-library order', async () => {
    const firstAsset = createBackgroundAsset({
      id: 'asset-first111',
      name: 'First',
      source: 'data:image/png;base64,Zmlyc3Q=',
    });
    const secondAsset = createBackgroundAsset({
      id: 'asset-second2',
      name: 'Second',
      source: 'data:image/webp;base64,c2Vjb25k',
      metadata: {
        mimeType: 'image/webp',
      },
    });
    const platformFileApi = createPlatformFileApi({
      materializeEmbeddedBackgroundAssets: vi.fn(() =>
        Promise.resolve([
          materializedBackground({
            assetId: firstAsset.id,
            relativePath: 'assets/backgrounds/first.png',
            fileSize: 10,
          }),
          materializedBackground({
            assetId: secondAsset.id,
            relativePath: 'assets/backgrounds/second.webp',
            mimeType: 'image/webp',
            fileSize: 20,
          }),
        ]),
      ),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    await service.saveProject(createProject({ assetLibrary: [firstAsset, secondAsset] }), 'C:/Stories/Story.narrium');

    expect(vi.mocked(platformFileApi.materializeEmbeddedBackgroundAssets).mock.calls[0][1].map((request) => request.assetId)).toEqual([
      firstAsset.id,
      secondAsset.id,
    ]);
  });

  it('does not write when embedded background planning fails during Save', async () => {
    const project = createProject({
      assetLibrary: [
        createBackgroundAsset({
          id: 'asset-broken',
          source: 'data:image/png,missing-base64',
        }),
      ],
    });
    const platformFileApi = createPlatformFileApi();
    const service = new DesktopProjectFileService(platformFileApi);

    await expect(service.saveProject(project, 'C:/Stories/Story.narrium')).rejects.toThrow('asset-broken');

    expect(platformFileApi.materializeEmbeddedBackgroundAssets).not.toHaveBeenCalled();
    expect(platformFileApi.writeProjectFile).not.toHaveBeenCalled();
  });

  it('does not write when embedded background materialization fails during Save', async () => {
    const project = createProject({ assetLibrary: [createBackgroundAsset()] });
    const platformFileApi = createPlatformFileApi({
      materializeEmbeddedBackgroundAssets: vi.fn(() => Promise.reject(new Error('materialize failed'))),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    await expect(service.saveProject(project, 'C:/Stories/Story.narrium')).rejects.toThrow('materialize failed');

    expect(platformFileApi.writeProjectFile).not.toHaveBeenCalled();
  });

  it('propagates write errors after successful embedded background materialization during Save', async () => {
    const project = createProject({ assetLibrary: [createBackgroundAsset()] });
    const platformFileApi = createPlatformFileApi({
      materializeEmbeddedBackgroundAssets: vi.fn(() =>
        Promise.resolve([
          materializedBackground({
            assetId: 'asset-embedded-a12f3c',
            relativePath: 'assets/backgrounds/forest.png',
            fileSize: 10,
          }),
        ]),
      ),
      writeProjectFile: vi.fn(() => Promise.reject(new Error('write failed'))),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    await expect(service.saveProject(project, 'C:/Stories/Story.narrium')).rejects.toThrow('write failed');

    expect(platformFileApi.materializeEmbeddedBackgroundAssets).toHaveBeenCalled();
  });

  it('uses Save As to select a .narrium file path and rename the saved project', async () => {
    const platformFileApi = createPlatformFileApi();
    const service = new DesktopProjectFileService(platformFileApi);
    const project = createProject({ name: 'Moonlit Road' });

    const result = await service.saveProjectAs(project);

    expect(platformFileApi.selectProjectFilePathForSaveAs).toHaveBeenCalledWith({
      title: 'Save Narrium Project As',
      defaultFileName: `Moonlit Road.${NARRIUM_PROJECT_EXTENSION}`,
    });
    expect(result?.filePath).toBe('C:/Stories/My Story.narrium');
    expect(result?.project.name).toBe('My Story');
    expect(platformFileApi.writeProjectFile).toHaveBeenCalledWith(
      'C:/Stories/My Story.narrium',
      serializeNarriumProjectFile({
        ...project,
        name: 'My Story',
      }),
    );
    expect(project.name).toBe('Moonlit Road');
  });

  it('preserves spaces and removes uppercase .NARRIUM when Save As renames the project', async () => {
    const platformFileApi = createPlatformFileApi({
      selectProjectFilePathForSaveAs: vi.fn((_options: ProjectFileSaveOptions) =>
        Promise.resolve('D:/Stories/Chapter One.NARRIUM'),
      ),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    const result = await service.saveProjectAs(createProject({ name: 'Draft Name' }));

    expect(result?.project.name).toBe('Chapter One');
  });

  it('copies referenced local background assets before Save As writes the relocated project', async () => {
    const project = createProject({
      assetLibrary: [
        {
          id: 'asset-local',
          kind: 'background',
          name: 'Forest',
          storageType: 'local',
          source: 'assets/backgrounds/forest.png',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const platformFileApi = createPlatformFileApi({
      selectProjectFilePathForSaveAs: vi.fn((_options: ProjectFileSaveOptions) =>
        Promise.resolve('D:/Stories/Relocated.narrium'),
      ),
      writeProjectFile: vi.fn((filePath: string) => Promise.resolve(filePath)),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    const result = await service.saveProjectAs(project, 'C:/Stories/Original.narrium');

    expect(platformFileApi.copyLocalAssetForProjectSaveAs).toHaveBeenCalledWith(
      'C:/Stories/Original.narrium',
      'D:/Stories/Relocated.narrium',
      'assets/backgrounds/forest.png',
    );
    expect(platformFileApi.writeProjectFile).toHaveBeenCalledWith(
      'D:/Stories/Relocated.narrium',
      serializeNarriumProjectFile({
        ...project,
        name: 'Relocated',
      }),
    );
    expect(result?.filePath).toBe('D:/Stories/Relocated.narrium');
    expect(result?.project.name).toBe('Relocated');
  });

  it('materializes embedded backgrounds into the Save As destination for drafts', async () => {
    const embeddedAsset = createBackgroundAsset();
    const platformFileApi = createPlatformFileApi({
      selectProjectFilePathForSaveAs: vi.fn((_options: ProjectFileSaveOptions) =>
        Promise.resolve('D:/Stories/Saved Draft.narrium'),
      ),
      materializeEmbeddedBackgroundAssets: vi.fn(() =>
        Promise.resolve([
          materializedBackground({
            assetId: embeddedAsset.id,
            relativePath: 'assets/backgrounds/forest-clearing.png',
          }),
        ]),
      ),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    const result = await service.saveProjectAs(createProject({ assetLibrary: [embeddedAsset] }), null);
    const writtenProject = parseWrittenProject(platformFileApi);

    expect(platformFileApi.copyLocalAssetForProjectSaveAs).not.toHaveBeenCalled();
    expect(platformFileApi.materializeEmbeddedBackgroundAssets).toHaveBeenCalledWith(
      'D:/Stories/Saved Draft.narrium',
      expect.arrayContaining([expect.objectContaining({ assetId: embeddedAsset.id })]),
    );
    expect(writtenProject).toMatchObject({
      name: 'Saved Draft',
      assetLibrary: [
        expect.objectContaining({
          id: embeddedAsset.id,
          storageType: 'local',
          source: 'assets/backgrounds/forest-clearing.png',
        }),
      ],
    });
    expect(JSON.stringify(writtenProject)).not.toContain(embeddedAsset.source);
    expect(result?.filePath).toBe('D:/Stories/Saved Draft.narrium');
    expect(result?.project.name).toBe('Saved Draft');
    expect(result?.project.assetLibrary[0]).toMatchObject({
      storageType: 'local',
      source: 'assets/backgrounds/forest-clearing.png',
    });
  });

  it('copies existing local assets before materializing embedded assets during Save As', async () => {
    const localAsset = createBackgroundAsset({
      id: 'asset-local',
      storageType: 'local',
      source: 'assets/backgrounds/existing.png',
    });
    const embeddedAsset = createBackgroundAsset();
    const platformFileApi = createPlatformFileApi({
      selectProjectFilePathForSaveAs: vi.fn((_options: ProjectFileSaveOptions) =>
        Promise.resolve('D:/Stories/Relocated.narrium'),
      ),
      materializeEmbeddedBackgroundAssets: vi.fn(() =>
        Promise.resolve([
          materializedBackground({
            assetId: embeddedAsset.id,
            relativePath: 'assets/backgrounds/forest-clearing.png',
          }),
        ]),
      ),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    await service.saveProjectAs(
      createProject({ assetLibrary: [localAsset, embeddedAsset] }),
      'C:/Stories/Original.narrium',
    );
    const writtenProject = parseWrittenProject(platformFileApi);

    expect(platformFileApi.copyLocalAssetForProjectSaveAs).toHaveBeenCalledWith(
      'C:/Stories/Original.narrium',
      'D:/Stories/Relocated.narrium',
      localAsset.source,
    );
    expect(
      vi.mocked(platformFileApi.copyLocalAssetForProjectSaveAs).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(platformFileApi.materializeEmbeddedBackgroundAssets).mock.invocationCallOrder[0],
    );
    expect(
      vi.mocked(platformFileApi.materializeEmbeddedBackgroundAssets).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(platformFileApi.writeProjectFile).mock.invocationCallOrder[0]);
    expect(writtenProject.assetLibrary.map((asset) => asset.source)).toEqual([
      localAsset.source,
      'assets/backgrounds/forest-clearing.png',
    ]);
  });

  it('handles mixed local, embedded, and remote assets during Save As', async () => {
    const localAsset = createBackgroundAsset({
      id: 'asset-local',
      storageType: 'local',
      source: 'assets/backgrounds/local.png',
    });
    const embeddedAsset = createBackgroundAsset();
    const remoteAsset = createBackgroundAsset({
      id: 'asset-remote',
      storageType: 'remote',
      source: 'https://example.com/bg.png',
    });
    const platformFileApi = createPlatformFileApi({
      selectProjectFilePathForSaveAs: vi.fn((_options: ProjectFileSaveOptions) =>
        Promise.resolve('D:/Stories/Mixed.narrium'),
      ),
      materializeEmbeddedBackgroundAssets: vi.fn(() =>
        Promise.resolve([
          materializedBackground({
            assetId: embeddedAsset.id,
            relativePath: 'assets/backgrounds/embedded.png',
          }),
        ]),
      ),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    const result = await service.saveProjectAs(
      createProject({ assetLibrary: [localAsset, embeddedAsset, remoteAsset] }),
      'C:/Stories/Original.narrium',
    );

    expect(result?.project.assetLibrary).toEqual([
      localAsset,
      expect.objectContaining({
        id: embeddedAsset.id,
        storageType: 'local',
        source: 'assets/backgrounds/embedded.png',
      }),
      remoteAsset,
    ]);
    expect(parseWrittenProject(platformFileApi).assetLibrary[0].source).toBe(localAsset.source);
  });

  it('skips local asset copies when Save As source and destination paths match but still migrates embedded assets', async () => {
    const embeddedAsset = createBackgroundAsset();
    const platformFileApi = createPlatformFileApi({
      selectProjectFilePathForSaveAs: vi.fn((_options: ProjectFileSaveOptions) =>
        Promise.resolve('C:/Stories/Same.narrium'),
      ),
      materializeEmbeddedBackgroundAssets: vi.fn(() =>
        Promise.resolve([
          materializedBackground({
            assetId: embeddedAsset.id,
            relativePath: 'assets/backgrounds/embedded.png',
          }),
        ]),
      ),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    const result = await service.saveProjectAs(
      createProject({
        assetLibrary: [
          createBackgroundAsset({
            id: 'asset-local',
            storageType: 'local',
            source: 'assets/backgrounds/local.png',
          }),
          embeddedAsset,
        ],
      }),
      'C:/Stories/Same.narrium',
    );

    expect(platformFileApi.copyLocalAssetForProjectSaveAs).not.toHaveBeenCalled();
    expect(platformFileApi.materializeEmbeddedBackgroundAssets).toHaveBeenCalledWith(
      'C:/Stories/Same.narrium',
      expect.arrayContaining([expect.objectContaining({ assetId: embeddedAsset.id })]),
    );
    expect(result?.project.assetLibrary[1]).toMatchObject({
      storageType: 'local',
      source: 'assets/backgrounds/embedded.png',
    });
  });

  it('skips local asset copies when Save As source path is null', async () => {
    const embeddedAsset = createBackgroundAsset();
    const platformFileApi = createPlatformFileApi({
      materializeEmbeddedBackgroundAssets: vi.fn(() =>
        Promise.resolve([
          materializedBackground({
            assetId: embeddedAsset.id,
            relativePath: 'assets/backgrounds/embedded.png',
          }),
        ]),
      ),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    await service.saveProjectAs(
      createProject({
        assetLibrary: [
          createBackgroundAsset({
            id: 'asset-local',
            storageType: 'local',
            source: 'assets/backgrounds/local.png',
          }),
          embeddedAsset,
        ],
      }),
      null,
    );

    expect(platformFileApi.copyLocalAssetForProjectSaveAs).not.toHaveBeenCalled();
    expect(platformFileApi.materializeEmbeddedBackgroundAssets).toHaveBeenCalled();
  });

  it('does not write Save As when local asset relocation fails', async () => {
    const project = createProject({
      assetLibrary: [
        {
          id: 'asset-local',
          kind: 'background',
          name: 'Forest',
          storageType: 'local',
          source: 'assets/backgrounds/forest.png',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const platformFileApi = createPlatformFileApi({
      copyLocalAssetForProjectSaveAs: vi.fn(() => Promise.reject(new Error('copy failed'))),
      writeProjectFile: vi.fn((filePath: string) => Promise.resolve(filePath)),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    await expect(service.saveProjectAs(project, 'C:/Stories/Original.narrium')).rejects.toThrow(
      'copy failed',
    );
    expect(platformFileApi.materializeEmbeddedBackgroundAssets).not.toHaveBeenCalled();
    expect(platformFileApi.writeProjectFile).not.toHaveBeenCalled();
    expect(project.name).toBe('Test Project');
  });

  it('does not materialize or write Save As when embedded background planning fails', async () => {
    const project = createProject({
      assetLibrary: [
        createBackgroundAsset({
          id: 'asset-broken',
          source: 'data:image/png,missing-base64',
        }),
      ],
    });
    const platformFileApi = createPlatformFileApi();
    const service = new DesktopProjectFileService(platformFileApi);

    await expect(service.saveProjectAs(project)).rejects.toThrow('asset-broken');

    expect(platformFileApi.materializeEmbeddedBackgroundAssets).not.toHaveBeenCalled();
    expect(platformFileApi.writeProjectFile).not.toHaveBeenCalled();
  });

  it('does not write Save As when embedded background materialization fails', async () => {
    const project = createProject({ assetLibrary: [createBackgroundAsset()] });
    const platformFileApi = createPlatformFileApi({
      materializeEmbeddedBackgroundAssets: vi.fn(() => Promise.reject(new Error('materialize failed'))),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    await expect(service.saveProjectAs(project)).rejects.toThrow('materialize failed');

    expect(platformFileApi.writeProjectFile).not.toHaveBeenCalled();
  });

  it('adds the .narrium extension when Save As returns a path without it', async () => {
    const platformFileApi = createPlatformFileApi({
      selectProjectFilePathForSaveAs: vi.fn((_options: ProjectFileSaveOptions) =>
        Promise.resolve('C:/Stories/My Story'),
      ),
      writeProjectFile: vi.fn((filePath: string) => Promise.resolve(filePath)),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    const result = await service.saveProjectAs(createProject());

    expect(platformFileApi.writeProjectFile).toHaveBeenCalledWith(
      'C:/Stories/My Story.narrium',
      expect.any(String),
    );
    expect(result?.filePath).toBe('C:/Stories/My Story.narrium');
    expect(result?.project.name).toBe('My Story');
  });

  it('does not rename or write when Save As is canceled', async () => {
    const platformFileApi = createPlatformFileApi({
      selectProjectFilePathForSaveAs: vi.fn((_options: ProjectFileSaveOptions) => Promise.resolve(null)),
      writeProjectFile: vi.fn((filePath: string) => Promise.resolve(filePath)),
    });
    const service = new DesktopProjectFileService(platformFileApi);
    const project = createProject({ name: 'Original Name' });

    await expect(service.saveProjectAs(project)).resolves.toBeNull();

    expect(platformFileApi.copyLocalAssetForProjectSaveAs).not.toHaveBeenCalled();
    expect(platformFileApi.materializeEmbeddedBackgroundAssets).not.toHaveBeenCalled();
    expect(platformFileApi.writeProjectFile).not.toHaveBeenCalled();
    expect(project.name).toBe('Original Name');
  });

  it('does not mutate the project name when Save As write fails', async () => {
    const platformFileApi = createPlatformFileApi({
      writeProjectFile: vi.fn(() => Promise.reject(new Error('write failed'))),
    });
    const service = new DesktopProjectFileService(platformFileApi);
    const project = createProject({ name: 'Original Name' });

    await expect(service.saveProjectAs(project)).rejects.toThrow('write failed');

    expect(project.name).toBe('Original Name');
  });

  it('does not write legacy project.narrium.json as the default save target', async () => {
    const platformFileApi = createPlatformFileApi();
    const service = new DesktopProjectFileService(platformFileApi);

    await service.saveProjectAs(createProject());

    expect(platformFileApi.writeProjectFile).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('project.narrium.json'),
    );
  });

  it('rejects invalid selected project files', async () => {
    const platformFileApi = createPlatformFileApi({
      readProjectFile: vi.fn((filePath: string) =>
        Promise.resolve({
          filePath,
          contents: '{"invalid":true}',
        }),
      ),
    });
    const service = new DesktopProjectFileService(platformFileApi);

    await expect(service.openProjectFile()).rejects.toThrow(
      'Selected file is not a valid Narrium project file.',
    );
  });
});
