import { describe, expect, it } from 'vitest';
import type { Project, Scene } from '../../types';
import { normalizeProject } from './projectMigrations';

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

function createScene(id: string, background: Scene['background']): Scene {
  return {
    id,
    name: id,
    background,
    position: { x: 0, y: 0 },
    dialoguePages: [],
    choices: [],
    groupId: null,
  };
}

describe('normalizeProject', () => {
  it('adds a missing variables array to old projects', () => {
    const { variables: _variables, ...legacyProject } = createProject();
    const normalizedProject = normalizeProject(legacyProject as Project);

    expect(normalizedProject.changed).toBe(true);
    expect(normalizedProject.project.variables).toEqual([]);
  });

  it('preserves existing project variables', () => {
    const project = createProject({
      variables: [
        {
          id: 'variable-1',
          key: 'visited_forest',
          defaultValue: 1,
        },
      ],
    });
    const normalizedProject = normalizeProject(project);

    expect(normalizedProject.changed).toBe(false);
    expect(normalizedProject.project.variables).toEqual(project.variables);
  });

  it('adds player-facing defaults to old resources', () => {
    const project = createProject({
      resources: [
        {
          id: 'resource-gold',
          key: 'gold',
          defaultValue: 10,
        } as Project['resources'][number],
      ],
    });
    const normalizedProject = normalizeProject(project);

    expect(normalizedProject.changed).toBe(true);
    expect(normalizedProject.project.resources[0]).toEqual({
      id: 'resource-gold',
      key: 'gold',
      displayName: 'gold',
      icon: 'circle',
      visible: true,
      defaultValue: 10,
    });
  });

  it('preserves existing resource presentation metadata', () => {
    const project = createProject({
      resources: [
        {
          id: 'resource-reputation',
          key: 'reputation',
          displayName: 'Reputation',
          icon: 'star',
          visible: false,
          defaultValue: 3,
        },
      ],
    });
    const normalizedProject = normalizeProject(project);

    expect(normalizedProject.changed).toBe(false);
    expect(normalizedProject.project.resources).toEqual(project.resources);
  });

  it('normalizes legacy background asset sourceType and url fields', () => {
    const project = createProject({
      assetLibrary: [
        {
          id: 'asset-legacy',
          kind: 'background',
          name: 'Forest',
          sourceType: 'url',
          url: 'https://example.com/forest.jpg',
          createdAt: '2026-01-01T00:00:00.000Z',
        } as unknown as Project['assetLibrary'][number],
      ],
    });

    const normalizedProject = normalizeProject(project);

    expect(normalizedProject.changed).toBe(true);
    expect(normalizedProject.project.assetLibrary).toEqual([
      {
        id: 'asset-legacy',
        kind: 'background',
        name: 'Forest',
        storageType: 'remote',
        source: 'https://example.com/forest.jpg',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('preserves local background asset storage during normalization', () => {
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

    const normalizedProject = normalizeProject(project);

    expect(normalizedProject.changed).toBe(false);
    expect(normalizedProject.project.assetLibrary[0]).toMatchObject({
      storageType: 'local',
      source: 'assets/backgrounds/forest.png',
    });
  });

  it('migrates legacy direct scene Data URLs into the asset catalog', () => {
    const dataUrl = 'data:image/png;base64,abc';
    const normalizedProject = normalizeProject(
      createProject({
        scenes: [
          createScene('scene-1', {
            mode: 'upload',
            assetId: null,
            sourceSceneId: null,
            url: dataUrl,
          }),
        ],
      }),
    );

    expect(normalizedProject.changed).toBe(true);
    expect(normalizedProject.project.assetLibrary).toEqual([
      expect.objectContaining({
        kind: 'background',
        storageType: 'embedded',
        source: dataUrl,
      }),
    ]);
    expect(normalizedProject.project.scenes[0].background).toEqual({
      mode: 'asset',
      assetId: normalizedProject.project.assetLibrary[0].id,
      sourceSceneId: null,
      url: '',
    });
  });

  it('keeps existing larger embedded images loadable during normalization', () => {
    const largeDataUrl = `data:image/png;base64,${'a'.repeat(16 * 1024 * 1024)}`;
    const project = createProject({
      thumbnail: largeDataUrl,
      assetLibrary: [
        {
          id: 'asset-large',
          kind: 'background',
          name: 'Legacy Large Background',
          storageType: 'embedded',
          source: largeDataUrl,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    const normalizedProject = normalizeProject(project);

    expect(normalizedProject.changed).toBe(false);
    expect(normalizedProject.project.thumbnail).toBe(largeDataUrl);
    expect(normalizedProject.project.assetLibrary[0].source).toBe(largeDataUrl);
  });

  it('migrates legacy direct scene remote URLs into the asset catalog', () => {
    const remoteUrl = 'https://example.com/castle.jpg';
    const normalizedProject = normalizeProject(
      createProject({
        scenes: [
          createScene('scene-1', {
            mode: 'url',
            assetId: null,
            sourceSceneId: null,
            url: remoteUrl,
          }),
        ],
      }),
    );

    expect(normalizedProject.project.assetLibrary[0]).toMatchObject({
      storageType: 'remote',
      source: remoteUrl,
    });
    expect(normalizedProject.project.scenes[0].background).toMatchObject({
      mode: 'asset',
      assetId: normalizedProject.project.assetLibrary[0].id,
      url: '',
    });
  });

  it('reuses one migrated asset for duplicate legacy background sources', () => {
    const dataUrl = 'data:image/png;base64,same';
    const normalizedProject = normalizeProject(
      createProject({
        scenes: [
          createScene('scene-1', {
            mode: 'upload',
            assetId: null,
            sourceSceneId: null,
            url: dataUrl,
          }),
          createScene('scene-2', {
            mode: 'upload',
            assetId: null,
            sourceSceneId: null,
            url: dataUrl,
          }),
        ],
      }),
    );

    expect(normalizedProject.project.assetLibrary).toHaveLength(1);
    expect(normalizedProject.project.scenes.map((scene) => scene.background.assetId)).toEqual([
      normalizedProject.project.assetLibrary[0].id,
      normalizedProject.project.assetLibrary[0].id,
    ]);
  });

  it('keeps asset catalog migration idempotent', () => {
    const firstPass = normalizeProject(
      createProject({
        scenes: [
          createScene('scene-1', {
            mode: 'url',
            assetId: null,
            sourceSceneId: null,
            url: 'https://example.com/road.jpg',
          }),
        ],
      }),
    );
    const secondPass = normalizeProject(firstPass.project);

    expect(firstPass.changed).toBe(true);
    expect(secondPass.changed).toBe(false);
    expect(secondPass.project).toEqual(firstPass.project);
  });
});
