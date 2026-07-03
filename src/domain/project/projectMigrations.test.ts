import { describe, expect, it } from 'vitest';
import type { Project } from '../../types';
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
});
