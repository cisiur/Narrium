import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../types';
import type { PlatformProjectFileApi, ProjectFolderSelectionOptions } from '../platform';
import {
  DesktopProjectFolderService,
  PROJECT_FOLDER_FILE_NAME,
  parseProjectFolderJson,
  serializeProjectFolderJson,
} from './ProjectFolderService';

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
    selectProjectFolder: vi.fn((_options: ProjectFolderSelectionOptions) => Promise.resolve('C:/Stories/My Story')),
    readTextFile: vi.fn(() => Promise.resolve(JSON.stringify(createProject()))),
    writeProjectFile: vi.fn((_folderPath: string, fileName: string) =>
      Promise.resolve(`C:/Stories/My Story/${fileName}`),
    ),
    ...overrides,
  };
}

describe('project folder serialization', () => {
  it('serializes normalized project JSON for project.narrium.json', () => {
    const project = createProject();

    expect(serializeProjectFolderJson(project)).toBe(`${JSON.stringify(project, null, 2)}\n`);
  });

  it('returns null for invalid project JSON', () => {
    expect(parseProjectFolderJson('{"not":"a project"}')).toBeNull();
  });

  it('normalizes project JSON while parsing', () => {
    const project = createProject();
    const source = JSON.stringify({
      ...project,
      variables: undefined,
    });

    expect(parseProjectFolderJson(source)?.variables).toEqual([]);
  });
});

describe('DesktopProjectFolderService', () => {
  it('writes project.narrium.json when creating a project folder', async () => {
    const platformFileApi = createPlatformFileApi();
    const service = new DesktopProjectFolderService(platformFileApi);
    const project = createProject();

    const result = await service.createProjectFolder(project);

    expect(platformFileApi.selectProjectFolder).toHaveBeenCalledWith({
      title: 'Create Narrium Project Folder',
    });
    expect(platformFileApi.writeProjectFile).toHaveBeenCalledWith(
      'C:/Stories/My Story',
      PROJECT_FOLDER_FILE_NAME,
      serializeProjectFolderJson(project),
    );
    expect(result?.filePath).toBe('C:/Stories/My Story/project.narrium.json');
  });

  it('reads and normalizes project.narrium.json from an opened folder', async () => {
    const project = createProject({
      scenes: [
        {
          id: 'scene-1',
          name: 'Start',
          background: {
            mode: 'none',
            assetId: null,
            sourceSceneId: null,
            url: '',
          },
          position: { x: 0, y: 0 },
          dialoguePages: [{ id: 'page-1', speakerId: null, text: 'Hello.' }],
          choices: [
            {
              id: 'choice-1',
              text: 'Continue',
              targetSceneId: null,
              conditionGroups: [],
              effects: [],
            },
          ],
          groupId: null,
        },
      ],
      startSceneId: 'scene-1',
    });
    const platformFileApi = createPlatformFileApi({
      readTextFile: vi.fn(() => Promise.resolve(JSON.stringify(project))),
    });
    const service = new DesktopProjectFolderService(platformFileApi);

    const result = await service.openProjectFolder();

    expect(platformFileApi.readTextFile).toHaveBeenCalledWith('C:/Stories/My Story/project.narrium.json');
    expect(result?.project).toEqual(project);
  });

  it('rejects invalid project.narrium.json from an opened folder', async () => {
    const platformFileApi = createPlatformFileApi({
      readTextFile: vi.fn(() => Promise.resolve('{"invalid":true}')),
    });
    const service = new DesktopProjectFolderService(platformFileApi);

    await expect(service.openProjectFolder()).rejects.toThrow(
      'Selected folder does not contain a valid project.narrium.json.',
    );
  });
});
