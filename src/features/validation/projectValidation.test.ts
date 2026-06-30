import { describe, expect, it } from 'vitest';
import type { Choice, Effect, Project, Scene } from '../../types';
import { VALIDATION_CODES, validateProject } from './projectValidation';

function createProject(scenes: Scene[]): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    thumbnail: null,
    startSceneId: scenes[0]?.id ?? 'scene-1',
    scenes,
    characters: [],
    resources: [],
    groups: [],
    assetLibrary: [],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createScene(id: string, choices: Choice[] = []): Scene {
  return {
    id,
    name: id,
    background: {
      mode: 'none',
      assetId: null,
      sourceSceneId: null,
      url: '',
    },
    position: { x: 0, y: 0 },
    dialoguePages: [],
    choices,
    groupId: null,
  };
}

function createChoice(overrides: Partial<Choice> = {}): Choice {
  return {
    id: 'choice-1',
    text: 'Continue',
    targetSceneId: null,
    conditionGroups: [],
    effects: [],
    ...overrides,
  };
}

function createEffect(): Effect {
  return {
    id: 'effect-1',
    type: 'resource',
    targetId: 'resource-1',
    operation: '+=',
    value: 1,
  };
}

describe('validateProject', () => {
  it('does not warn for a valid navigation choice', () => {
    const project = createProject([
      createScene('scene-start', [createChoice({ targetSceneId: 'scene-next' })]),
      createScene('scene-next'),
    ]);

    expect(validateProject(project)).toEqual([]);
  });

  it('does not warn for a valid action choice', () => {
    const project = createProject([
      createScene('scene-start', [createChoice({ effects: [createEffect()] })]),
    ]);

    expect(validateProject(project)).toEqual([]);
  });

  it('warns for a targetless choice with no effects', () => {
    const project = createProject([
      createScene('scene-start', [createChoice({ id: 'choice-empty' })]),
    ]);

    expect(validateProject(project)).toEqual([
      {
        severity: 'warning',
        code: VALIDATION_CODES.targetlessChoiceWithoutEffects,
        message: 'This choice does nothing. Add a target scene or at least one effect.',
        sceneId: 'scene-start',
        choiceId: 'choice-empty',
      },
    ]);
  });

  it('returns multiple issues across multiple scenes', () => {
    const project = createProject([
      createScene('scene-a', [createChoice({ id: 'choice-a' })]),
      createScene('scene-b', [createChoice({ id: 'choice-b' })]),
    ]);

    expect(validateProject(project)).toEqual([
      expect.objectContaining({
        code: VALIDATION_CODES.targetlessChoiceWithoutEffects,
        sceneId: 'scene-a',
        choiceId: 'choice-a',
      }),
      expect.objectContaining({
        code: VALIDATION_CODES.targetlessChoiceWithoutEffects,
        sceneId: 'scene-b',
        choiceId: 'choice-b',
      }),
    ]);
  });
});
