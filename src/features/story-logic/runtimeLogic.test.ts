import { describe, expect, it } from 'vitest';
import type { Choice, Project, RuntimeState } from '../../types';
import {
  applyEffects,
  isChoiceAvailable,
  resolveUnavailableChoiceHint,
} from './runtimeLogic';

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
          { key: 'courage', defaultValue: 1 },
          { key: 'trust', defaultValue: 2 },
        ],
      },
    ],
    resources: [
      { id: 'resource-gold', key: 'gold', defaultValue: 5 },
      { id: 'resource-food', key: 'food', defaultValue: 3 },
    ],
    groups: [],
    assetLibrary: [],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createRuntimeState(): RuntimeState {
  return {
    currentSceneId: 'scene-start',
    currentPageIndex: 0,
    variables: {
      resources: {
        gold: 5,
        food: 3,
      },
      characterAttrs: {
        'character-hero': {
          courage: 1,
          trust: 2,
        },
      },
    },
  };
}

describe('applyEffects', () => {
  it('applies resource and character attribute effects without mutating the input state', () => {
    const project = createProject();
    const runtimeState = createRuntimeState();
    const choice: Choice = {
      id: 'choice-1',
      text: 'Pay and inspire',
      targetSceneId: 'scene-next',
      conditionGroups: [],
      effects: [
        {
          id: 'effect-gold',
          type: 'resource',
          targetId: 'resource-gold',
          operation: '-=',
          value: 2,
        },
        {
          id: 'effect-courage',
          type: 'character_attr',
          targetId: 'character-hero',
          attribute: 'courage',
          operation: '+=',
          value: 4,
        },
      ],
    };

    const nextState = applyEffects(choice, project, runtimeState);

    expect(nextState.variables.resources.gold).toBe(3);
    expect(nextState.variables.characterAttrs['character-hero'].courage).toBe(5);
    expect(runtimeState.variables.resources.gold).toBe(5);
    expect(runtimeState.variables.characterAttrs['character-hero'].courage).toBe(1);
  });
});

describe('isChoiceAvailable', () => {
  it('returns true when a choice has no condition groups', () => {
    const choice: Choice = {
      id: 'choice-1',
      text: 'Continue',
      targetSceneId: 'scene-next',
      conditionGroups: [],
      effects: [],
    };

    expect(isChoiceAvailable(choice, createProject(), createRuntimeState())).toBe(true);
  });

  it('returns true when any condition group passes', () => {
    const choice: Choice = {
      id: 'choice-1',
      text: 'Open the gate',
      targetSceneId: 'scene-next',
      conditionGroups: [
        {
          id: 'group-failing',
          conditions: [
            {
              id: 'condition-too-much-gold',
              type: 'resource',
              targetId: 'resource-gold',
              operator: '>',
              value: 10,
              hintText: 'Bring more gold.',
            },
          ],
        },
        {
          id: 'group-passing',
          conditions: [
            {
              id: 'condition-enough-trust',
              type: 'character_attr',
              targetId: 'character-hero',
              attribute: 'trust',
              operator: '>=',
              value: 2,
              hintText: 'Earn trust first.',
            },
          ],
        },
      ],
      effects: [],
    };

    expect(isChoiceAvailable(choice, createProject(), createRuntimeState())).toBe(true);
  });

  it('returns false when no condition group passes', () => {
    const choice: Choice = {
      id: 'choice-1',
      text: 'Buy supplies',
      targetSceneId: 'scene-next',
      conditionGroups: [
        {
          id: 'group-1',
          conditions: [
            {
              id: 'condition-gold',
              type: 'resource',
              targetId: 'resource-gold',
              operator: '>=',
              value: 8,
              hintText: 'Need more gold.',
            },
          ],
        },
      ],
      effects: [],
    };

    expect(isChoiceAvailable(choice, createProject(), createRuntimeState())).toBe(false);
  });
});

describe('resolveUnavailableChoiceHint', () => {
  it('returns the first hint for a failing condition', () => {
    const choice: Choice = {
      id: 'choice-1',
      text: 'Buy supplies',
      targetSceneId: 'scene-next',
      conditionGroups: [
        {
          id: 'group-1',
          conditions: [
            {
              id: 'condition-gold',
              type: 'resource',
              targetId: 'resource-gold',
              operator: '>=',
              value: 8,
              hintText: 'Need more gold.',
            },
          ],
        },
      ],
      effects: [],
    };

    expect(resolveUnavailableChoiceHint(choice, createProject(), createRuntimeState())).toBe(
      'Need more gold.',
    );
  });

  it('returns null when the choice is available', () => {
    const choice: Choice = {
      id: 'choice-1',
      text: 'Continue',
      targetSceneId: 'scene-next',
      conditionGroups: [],
      effects: [],
    };

    expect(resolveUnavailableChoiceHint(choice, createProject(), createRuntimeState())).toBeNull();
  });
});
