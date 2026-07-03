import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../types';
import type { PlatformProjectAssetApi } from '../platform';
import {
  collectProjectRelativeAssetPaths,
  DesktopProjectAssetService,
  resolveAssetUrl,
} from './ProjectAssetService';
import {
  createRelativeBackgroundAssetPath,
  createSafeAssetFileName,
  createUniqueAssetFileName,
  isAllowedBackgroundImageExtension,
} from './assetPaths';

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

function createPlatformAssetApi(overrides: Partial<PlatformProjectAssetApi> = {}): PlatformProjectAssetApi {
  return {
    selectBackgroundImageFile: vi.fn(() => Promise.resolve('C:/Pictures/Forest.png')),
    copyBackgroundImageToProject: vi.fn(() =>
      Promise.resolve({
        relativePath: 'assets/backgrounds/forest.png',
        renderUrl: 'asset://forest.png',
        fileName: 'forest.png',
      }),
    ),
    resolveProjectAssetUrl: vi.fn((_folderPath: string, relativePath: string) =>
      Promise.resolve(`asset://${relativePath}`),
    ),
    ...overrides,
  };
}

describe('background asset path helpers', () => {
  it('allows only supported background image extensions', () => {
    expect(isAllowedBackgroundImageExtension('forest.png')).toBe(true);
    expect(isAllowedBackgroundImageExtension('forest.JPG')).toBe(true);
    expect(isAllowedBackgroundImageExtension('forest.webp')).toBe(true);
    expect(isAllowedBackgroundImageExtension('notes.txt')).toBe(false);
    expect(isAllowedBackgroundImageExtension('archive.zip')).toBe(false);
  });

  it('creates safe asset file names', () => {
    expect(createSafeAssetFileName('Moonlit Forest Final.PNG')).toBe('moonlit-forest-final.png');
    expect(createSafeAssetFileName('!!!.jpg')).toBe('background.jpg');
  });

  it('generates unique asset file names without overwriting existing names', () => {
    expect(createUniqueAssetFileName('Forest.png', ['forest.png', 'forest-2.png'])).toBe('forest-3.png');
  });

  it('creates project-relative background asset paths', () => {
    expect(createRelativeBackgroundAssetPath('Castle Hall.png')).toBe(
      'assets/backgrounds/castle-hall.png',
    );
  });
});

describe('ProjectAssetService', () => {
  it('copies imported desktop backgrounds and returns relative project metadata', async () => {
    const platformAssetApi = createPlatformAssetApi();
    const service = new DesktopProjectAssetService(platformAssetApi);

    const result = await service.importBackgroundImage('C:/Stories/My Story');

    expect(platformAssetApi.selectBackgroundImageFile).toHaveBeenCalled();
    expect(platformAssetApi.copyBackgroundImageToProject).toHaveBeenCalledWith(
      'C:/Stories/My Story',
      'C:/Pictures/Forest.png',
    );
    expect(result).toEqual({
      relativePath: 'assets/backgrounds/forest.png',
      renderUrl: 'asset://forest.png',
      fileName: 'forest.png',
    });
    expect(result?.relativePath.startsWith('data:')).toBe(false);
  });

  it('handles canceled desktop background selection', async () => {
    const service = new DesktopProjectAssetService(
      createPlatformAssetApi({
        selectBackgroundImageFile: vi.fn(() => Promise.resolve(null)),
      }),
    );

    await expect(service.importBackgroundImage('C:/Stories/My Story')).resolves.toBeNull();
  });

  it('surfaces desktop background copy failures to the caller', async () => {
    const service = new DesktopProjectAssetService(
      createPlatformAssetApi({
        copyBackgroundImageToProject: vi.fn(() =>
          Promise.reject(new Error('Could not copy background image.')),
        ),
      }),
    );

    await expect(service.importBackgroundImage('C:/Stories/My Story')).rejects.toThrow(
      'Could not copy background image.',
    );
  });

  it('collects only project-relative background asset paths', () => {
    const project = createProject({
      assetLibrary: [
        {
          id: 'asset-local',
          kind: 'background',
          name: 'Forest',
          sourceType: 'upload',
          url: 'assets/backgrounds/forest.png',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'asset-data',
          kind: 'background',
          name: 'Embedded',
          sourceType: 'upload',
          url: 'data:image/png;base64,abc',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      scenes: [
        {
          id: 'scene-1',
          name: 'Start',
          background: {
            mode: 'upload',
            assetId: null,
            sourceSceneId: null,
            url: 'assets/backgrounds/castle.png',
          },
          position: { x: 0, y: 0 },
          dialoguePages: [],
          choices: [],
          groupId: null,
        },
      ],
    });

    expect(collectProjectRelativeAssetPaths(project)).toEqual([
      'assets/backgrounds/forest.png',
      'assets/backgrounds/castle.png',
    ]);
  });

  it('resolves project-relative asset paths for rendering without mutating project JSON values', async () => {
    const service = new DesktopProjectAssetService(createPlatformAssetApi());
    const project = createProject({
      assetLibrary: [
        {
          id: 'asset-local',
          kind: 'background',
          name: 'Forest',
          sourceType: 'upload',
          url: 'assets/backgrounds/forest.png',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    const assetUrls = await service.resolveProjectAssetUrls(project, 'C:/Stories/My Story');

    expect(assetUrls).toEqual({
      'assets/backgrounds/forest.png': 'asset://assets/backgrounds/forest.png',
    });
    expect(resolveAssetUrl('assets/backgrounds/forest.png', assetUrls)).toBe(
      'asset://assets/backgrounds/forest.png',
    );
    expect(project.assetLibrary[0].url).toBe('assets/backgrounds/forest.png');
  });
});
