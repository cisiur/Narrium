import { describe, expect, it } from 'vitest';
import type { Choice, Project, RuntimeState } from '../../types';
import { createChoiceViewModels } from '../player/playerHelpers';
import {
  advanceRuntimeForChoice,
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
    variables: [
      { id: 'variable-suspicion', key: 'suspicion', defaultValue: 1 },
      { id: 'variable-visited-forest', key: 'visited_forest', defaultValue: 0 },
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
      variables: {
        suspicion: 1,
        visited_forest: 0,
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

function createScene(id: string, name: string = id): Project['scenes'][number] {
  return {
    id,
    name,
    background: {
      mode: 'none',
      assetId: null,
      sourceSceneId: null,
      url: '',
    },
    position: { x: 0, y: 0 },
    dialoguePages: [],
    choices: [],
    groupId: null,
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

  it('applies variable effects without mutating the input state', () => {
    const project = createProject();
    const runtimeState = createRuntimeState();
    const choice: Choice = {
      id: 'choice-1',
      text: 'Raise suspicion',
      targetSceneId: null,
      conditionGroups: [],
      effects: [
        {
          id: 'effect-suspicion',
          type: 'variable',
          targetId: 'variable-suspicion',
          operation: '+=',
          value: 2,
        },
      ],
    };

    const nextState = applyEffects(choice, project, runtimeState);

    expect(nextState.variables.variables.suspicion).toBe(3);
    expect(runtimeState.variables.variables.suspicion).toBe(1);
  });

  it('ignores missing variable effects', () => {
    const runtimeState = createRuntimeState();
    const choice: Choice = {
      id: 'choice-1',
      text: 'Missing variable',
      targetSceneId: null,
      conditionGroups: [],
      effects: [
        {
          id: 'effect-missing',
          type: 'variable',
          targetId: 'missing-variable',
          operation: '+=',
          value: 2,
        },
      ],
    };

    expect(applyEffects(choice, createProject(), runtimeState).variables.variables).toEqual(
      runtimeState.variables.variables,
    );
  });
});

describe('advanceRuntimeForChoice', () => {
  it('applies effects and navigates when a choice is available and has a valid target', () => {
    const project: Project = {
      ...createProject(),
      scenes: [createScene('scene-start', 'Start'), createScene('scene-next', 'Next')],
    };
    const runtimeState = createRuntimeState();
    const choice: Choice = {
      id: 'choice-1',
      text: 'Pay',
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
      ],
    };

    const nextState = advanceRuntimeForChoice(choice, project, runtimeState);

    expect(nextState.currentSceneId).toBe('scene-next');
    expect(nextState.currentPageIndex).toBe(0);
    expect(nextState.variables.resources.gold).toBe(3);
  });

  it('applies effects and stays on the current scene and page when the choice has no target', () => {
    const runtimeState = createRuntimeState();
    const choice: Choice = {
      id: 'choice-1',
      text: 'Gather gold',
      targetSceneId: null,
      conditionGroups: [],
      effects: [
        {
          id: 'effect-gold',
          type: 'resource',
          targetId: 'resource-gold',
          operation: '+=',
          value: 2,
        },
        {
          id: 'effect-courage',
          type: 'character_attr',
          targetId: 'character-hero',
          attribute: 'courage',
          operation: '+=',
          value: 1,
        },
      ],
    };

    const nextState = advanceRuntimeForChoice(choice, createProject(), runtimeState);

    expect(nextState.currentSceneId).toBe('scene-start');
    expect(nextState.currentPageIndex).toBe(0);
    expect(nextState.variables.resources.gold).toBe(7);
    expect(nextState.variables.characterAttrs['character-hero'].courage).toBe(2);
  });

  it('does not apply effects or advance when the choice has an invalid non-null target', () => {
    const project: Project = {
      ...createProject(),
      scenes: [createScene('scene-start', 'Start')],
    };
    const runtimeState = createRuntimeState();
    const choice: Choice = {
      id: 'choice-1',
      text: 'Go nowhere',
      targetSceneId: 'missing-scene',
      conditionGroups: [],
      effects: [
        {
          id: 'effect-gold',
          type: 'resource',
          targetId: 'resource-gold',
          operation: '+=',
          value: 2,
        },
      ],
    };

    const nextState = advanceRuntimeForChoice(choice, project, runtimeState);

    expect(nextState).toBe(runtimeState);
    expect(nextState.variables.resources.gold).toBe(5);
  });
});

describe('createChoiceViewModels', () => {
  it('enables newly available action choices after runtime variables update', () => {
    const project: Project = {
      ...createProject(),
      scenes: [createScene('scene-start', 'Start')],
    };
    const actionChoice: Choice = {
      id: 'choice-action',
      text: 'Find gold',
      targetSceneId: null,
      conditionGroups: [],
      effects: [
        {
          id: 'effect-gold',
          type: 'resource',
          targetId: 'resource-gold',
          operation: '+=',
          value: 5,
        },
      ],
    };
    const gatedChoice: Choice = {
      id: 'choice-gated',
      text: 'Buy passage',
      targetSceneId: 'scene-start',
      conditionGroups: [
        {
          id: 'group-gold',
          conditions: [
            {
              id: 'condition-gold',
              type: 'resource',
              targetId: 'resource-gold',
              operator: '>=',
              value: 10,
              hintText: 'Need more gold.',
            },
          ],
        },
      ],
      effects: [],
    };
    const runtimeState = createRuntimeState();

    const initialChoices = createChoiceViewModels([actionChoice, gatedChoice], project, runtimeState);
    const nextState = advanceRuntimeForChoice(actionChoice, project, runtimeState);
    const rerenderedChoices = createChoiceViewModels([actionChoice, gatedChoice], project, nextState);

    expect(initialChoices.map((choice) => choice.isEnabled)).toEqual([true, false]);
    expect(nextState.variables.resources.gold).toBe(10);
    expect(rerenderedChoices.map((choice) => choice.isEnabled)).toEqual([true, true]);
  });

  it('disables choices with invalid non-null targets', () => {
    const project: Project = {
      ...createProject(),
      scenes: [createScene('scene-start', 'Start')],
    };
    const choices = createChoiceViewModels(
      [
        {
          id: 'choice-action',
          text: 'Stay here',
          targetSceneId: null,
          conditionGroups: [],
          effects: [],
        },
        {
          id: 'choice-invalid-target',
          text: 'Missing path',
          targetSceneId: 'missing-scene',
          conditionGroups: [],
          effects: [],
        },
      ],
      project,
      createRuntimeState(),
    );

    expect(choices.map((choice) => choice.isEnabled)).toEqual([true, false]);
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

  it('evaluates variable conditions', () => {
    const choice: Choice = {
      id: 'choice-1',
      text: 'Press further',
      targetSceneId: 'scene-next',
      conditionGroups: [
        {
          id: 'group-variable',
          conditions: [
            {
              id: 'condition-suspicion',
              type: 'variable',
              targetId: 'variable-suspicion',
              operator: '>=',
              value: 1,
              hintText: 'Raise suspicion first.',
            },
          ],
        },
      ],
      effects: [],
    };

    expect(isChoiceAvailable(choice, createProject(), createRuntimeState())).toBe(true);
  });

  it('returns false for missing variable conditions', () => {
    const choice: Choice = {
      id: 'choice-1',
      text: 'Press further',
      targetSceneId: 'scene-next',
      conditionGroups: [
        {
          id: 'group-variable',
          conditions: [
            {
              id: 'condition-missing-variable',
              type: 'variable',
              targetId: 'missing-variable',
              operator: '>=',
              value: 1,
              hintText: 'Raise suspicion first.',
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
