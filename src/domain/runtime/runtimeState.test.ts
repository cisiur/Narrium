import { describe, expect, it } from 'vitest';
import type { Project } from '../../types';
import { createInitialRuntimeState } from './runtimeState';

function createProject(): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    thumbnail: null,
    startSceneId: 'scene-start',
    scenes: [],
    characters: [
      {
        id: 'character-hero',
        name: 'Hero',
        attributes: [
          { key: 'courage', defaultValue: 3 },
          { key: 'wit', defaultValue: 5 },
        ],
      },
      {
        id: 'character-guide',
        name: 'Guide',
        attributes: [{ key: 'trust', defaultValue: 2 }],
      },
    ],
    resources: [
      {
        id: 'resource-gold',
        key: 'gold',
        displayName: 'Gold',
        icon: 'coins',
        visible: true,
        defaultValue: 10,
      },
      {
        id: 'resource-food',
        key: 'food',
        displayName: 'Food',
        icon: 'food',
        visible: true,
        defaultValue: 4,
      },
    ],
    variables: [],
    groups: [],
    assetLibrary: [],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('createInitialRuntimeState', () => {
  it('initializes the current scene from the project start scene', () => {
    const runtimeState = createInitialRuntimeState(createProject());

    expect(runtimeState.currentSceneId).toBe('scene-start');
  });

  it('initializes the current page index to zero', () => {
    const runtimeState = createInitialRuntimeState(createProject());

    expect(runtimeState.currentPageIndex).toBe(0);
  });

  it('initializes resources from resource keys and default values', () => {
    const runtimeState = createInitialRuntimeState(createProject());

    expect(runtimeState.variables.resources).toEqual({
      gold: 10,
      food: 4,
    });
  });

  it('initializes variables from variable keys and default values', () => {
    const runtimeState = createInitialRuntimeState({
      ...createProject(),
      variables: [
        { id: 'variable-visited-forest', key: 'visited_forest', defaultValue: 1 },
        { id: 'variable-clues', key: 'clues', defaultValue: 2 },
      ],
    });

    expect(runtimeState.variables.variables).toEqual({
      visited_forest: 1,
      clues: 2,
    });
  });

  it('initializes character attributes by character id and attribute key', () => {
    const runtimeState = createInitialRuntimeState(createProject());

    expect(runtimeState.variables.characterAttrs).toEqual({
      'character-hero': {
        courage: 3,
        wit: 5,
      },
      'character-guide': {
        trust: 2,
      },
    });
  });

  it('does not mutate the source project', () => {
    const project = createProject();
    const projectBefore = JSON.parse(JSON.stringify(project)) as Project;

    createInitialRuntimeState(project);

    expect(project).toEqual(projectBefore);
  });
});
