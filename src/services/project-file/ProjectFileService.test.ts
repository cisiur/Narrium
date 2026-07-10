import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../types';
import type { PlatformProjectFileApi, ProjectFileSaveOptions, ProjectFileSelectionOptions } from '../platform';
import {
  DesktopProjectFileService,
  NARRIUM_PROJECT_EXTENSION,
  NARRIUM_PROJECT_FORMAT,
  NARRIUM_PROJECT_FORMAT_VERSION,
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
  });

  it('uses Save As to select a .narrium file path', async () => {
    const platformFileApi = createPlatformFileApi();
    const service = new DesktopProjectFileService(platformFileApi);
    const project = createProject({ name: 'Moonlit Road' });

    const result = await service.saveProjectAs(project);

    expect(platformFileApi.selectProjectFilePathForSaveAs).toHaveBeenCalledWith({
      title: 'Save Narrium Project As',
      defaultFileName: `Moonlit Road.${NARRIUM_PROJECT_EXTENSION}`,
    });
    expect(result?.filePath).toBe('C:/Stories/My Story.narrium');
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
