import { describe, expect, it } from 'vitest';
import type {
  AssetLibraryItem,
  Character,
  Choice,
  Condition,
  Effect,
  Project,
  Resource,
  Scene,
} from '../../types';
import { VALIDATION_CODES, validateProject } from './projectValidation';

function createProject(scenes: Scene[], overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    thumbnail: null,
    startSceneId: scenes[0]?.id ?? 'scene-1',
    scenes,
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

function createResource(id: string): Resource {
  return {
    id,
    key: id,
    displayName: id,
    icon: 'circle',
    visible: true,
    defaultValue: 0,
  };
}

function createCharacter(id: string, attributeKeys: string[] = []): Character {
  return {
    id,
    name: id,
    attributes: attributeKeys.map((key) => ({
      key,
      defaultValue: 0,
    })),
  };
}

function createCondition(overrides: Partial<Condition> = {}): Condition {
  return {
    id: 'condition-1',
    type: 'resource',
    targetId: 'resource-1',
    operator: '>=',
    value: 1,
    hintText: '',
    ...overrides,
  };
}

function createAsset(id: string): AssetLibraryItem {
  return {
    id,
    kind: 'background',
    name: id,
    storageType: 'remote',
    source: 'https://example.com/background.jpg',
    createdAt: '2026-01-01T00:00:00.000Z',
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
    const project = createProject(
      [createScene('scene-start', [createChoice({ effects: [createEffect()] })])],
      { resources: [createResource('resource-1')] },
    );

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

  it('errors for a choice target that no longer exists', () => {
    const project = createProject([
      createScene('scene-start', [createChoice({ id: 'choice-broken', targetSceneId: 'missing-scene' })]),
    ]);

    expect(validateProject(project)).toEqual([
      {
        severity: 'error',
        code: VALIDATION_CODES.brokenChoiceTarget,
        message: 'Target scene no longer exists.',
        sceneId: 'scene-start',
        choiceId: 'choice-broken',
      },
    ]);
  });

  it('warns for a dialogue speaker that no longer exists', () => {
    const project = createProject(
      [
        {
          ...createScene('scene-start'),
          dialoguePages: [
            {
              id: 'page-1',
              speakerId: 'missing-character',
              text: 'Hello?',
            },
          ],
        },
      ],
      { characters: [createCharacter('character-hero')] },
    );

    expect(validateProject(project)).toEqual([
      {
        severity: 'warning',
        code: VALIDATION_CODES.missingDialogueSpeaker,
        message: 'Referenced speaker no longer exists.',
        sceneId: 'scene-start',
        choiceId: null,
      },
    ]);
  });

  it('warns for a scene background reference that no longer exists', () => {
    const project = createProject([
      {
        ...createScene('scene-start'),
        background: {
          mode: 'scene_reference',
          assetId: null,
          sourceSceneId: 'missing-scene',
          url: '',
        },
      },
    ]);

    expect(validateProject(project)).toEqual([
      {
        severity: 'warning',
        code: VALIDATION_CODES.brokenSceneBackgroundReference,
        message: 'Referenced scene background no longer exists.',
        sceneId: 'scene-start',
        choiceId: null,
      },
    ]);
  });

  it('warns for an asset background reference that no longer exists', () => {
    const project = createProject(
      [
        {
          ...createScene('scene-start'),
          background: {
            mode: 'asset',
            assetId: 'missing-asset',
            sourceSceneId: null,
            url: '',
          },
        },
      ],
      { assetLibrary: [createAsset('asset-existing')] },
    );

    expect(validateProject(project)).toEqual([
      {
        severity: 'warning',
        code: VALIDATION_CODES.brokenAssetBackgroundReference,
        message: 'Referenced background asset no longer exists.',
        sceneId: 'scene-start',
        choiceId: null,
      },
    ]);
  });

  it('errors for a missing Resource in a Condition', () => {
    const project = createProject([
      createScene('scene-start', [
        createChoice({
          id: 'choice-broken',
          text: 'Check gold',
          targetSceneId: 'scene-start',
          conditionGroups: [
            {
              id: 'group-1',
              conditions: [createCondition({ targetId: 'missing-resource' })],
            },
          ],
        }),
      ]),
    ]);

    expect(validateProject(project)).toEqual([
      {
        severity: 'error',
        code: VALIDATION_CODES.brokenConditionResourceReference,
        message: 'Scene "scene-start", choice "Check gold" has a Condition that references a missing Resource.',
        sceneId: 'scene-start',
        choiceId: 'choice-broken',
      },
    ]);
  });

  it('errors for a missing Resource in an Effect', () => {
    const project = createProject([
      createScene('scene-start', [
        createChoice({
          id: 'choice-broken',
          text: 'Spend gold',
          effects: [createEffect()],
        }),
      ]),
    ]);

    expect(validateProject(project)).toEqual([
      {
        severity: 'error',
        code: VALIDATION_CODES.brokenEffectResourceReference,
        message: 'Scene "scene-start", choice "Spend gold" has an Effect that references a missing Resource.',
        sceneId: 'scene-start',
        choiceId: 'choice-broken',
      },
    ]);
  });

  it('errors for a missing Variable in a Condition', () => {
    const project = createProject([
      createScene('scene-start', [
        createChoice({
          id: 'choice-broken',
          text: 'Check flag',
          targetSceneId: 'scene-start',
          conditionGroups: [
            {
              id: 'group-1',
              conditions: [
                createCondition({
                  type: 'variable',
                  targetId: 'missing-variable',
                }),
              ],
            },
          ],
        }),
      ]),
    ]);

    expect(validateProject(project)).toEqual([
      {
        severity: 'error',
        code: VALIDATION_CODES.brokenConditionVariableReference,
        message: 'Scene "scene-start", choice "Check flag" has a Condition that references a missing Variable.',
        sceneId: 'scene-start',
        choiceId: 'choice-broken',
      },
    ]);
  });

  it('errors for a missing Variable in an Effect', () => {
    const project = createProject([
      createScene('scene-start', [
        createChoice({
          id: 'choice-broken',
          text: 'Set flag',
          effects: [
            {
              ...createEffect(),
              type: 'variable',
              targetId: 'missing-variable',
            },
          ],
        }),
      ]),
    ]);

    expect(validateProject(project)).toEqual([
      {
        severity: 'error',
        code: VALIDATION_CODES.brokenEffectVariableReference,
        message: 'Scene "scene-start", choice "Set flag" has an Effect that references a missing Variable.',
        sceneId: 'scene-start',
        choiceId: 'choice-broken',
      },
    ]);
  });

  it('errors for a missing Character in a Condition', () => {
    const project = createProject([
      createScene('scene-start', [
        createChoice({
          id: 'choice-broken',
          text: 'Check courage',
          targetSceneId: 'scene-start',
          conditionGroups: [
            {
              id: 'group-1',
              conditions: [
                createCondition({
                  type: 'character_attr',
                  targetId: 'missing-character',
                  attribute: 'courage',
                }),
              ],
            },
          ],
        }),
      ]),
    ]);

    expect(validateProject(project)).toEqual([
      {
        severity: 'error',
        code: VALIDATION_CODES.brokenConditionCharacterReference,
        message: 'Scene "scene-start", choice "Check courage" has a Condition that references a missing Character.',
        sceneId: 'scene-start',
        choiceId: 'choice-broken',
      },
    ]);
  });

  it('errors for a missing Character in an Effect', () => {
    const project = createProject([
      createScene('scene-start', [
        createChoice({
          id: 'choice-broken',
          text: 'Raise courage',
          effects: [
            {
              ...createEffect(),
              type: 'character_attr',
              targetId: 'missing-character',
              attribute: 'courage',
            },
          ],
        }),
      ]),
    ]);

    expect(validateProject(project)).toEqual([
      {
        severity: 'error',
        code: VALIDATION_CODES.brokenEffectCharacterReference,
        message: 'Scene "scene-start", choice "Raise courage" has an Effect that references a missing Character.',
        sceneId: 'scene-start',
        choiceId: 'choice-broken',
      },
    ]);
  });

  it('errors for a missing Character Attribute in a Condition', () => {
    const project = createProject(
      [
        createScene('scene-start', [
          createChoice({
            id: 'choice-broken',
            text: 'Check courage',
            targetSceneId: 'scene-start',
            conditionGroups: [
              {
                id: 'group-1',
                conditions: [
                  createCondition({
                    type: 'character_attr',
                    targetId: 'character-hero',
                    attribute: 'missing-courage',
                  }),
                ],
              },
            ],
          }),
        ]),
      ],
      { characters: [createCharacter('character-hero', ['trust'])] },
    );

    expect(validateProject(project)).toEqual([
      {
        severity: 'error',
        code: VALIDATION_CODES.brokenConditionCharacterAttributeReference,
        message:
          'Scene "scene-start", choice "Check courage" has a Condition that references a missing Character Attribute.',
        sceneId: 'scene-start',
        choiceId: 'choice-broken',
      },
    ]);
  });

  it('errors for a missing Character Attribute in an Effect', () => {
    const project = createProject(
      [
        createScene('scene-start', [
          createChoice({
            id: 'choice-broken',
            text: 'Raise courage',
            effects: [
              {
                ...createEffect(),
                type: 'character_attr',
                targetId: 'character-hero',
                attribute: 'missing-courage',
              },
            ],
          }),
        ]),
      ],
      { characters: [createCharacter('character-hero', ['trust'])] },
    );

    expect(validateProject(project)).toEqual([
      {
        severity: 'error',
        code: VALIDATION_CODES.brokenEffectCharacterAttributeReference,
        message:
          'Scene "scene-start", choice "Raise courage" has an Effect that references a missing Character Attribute.',
        sceneId: 'scene-start',
        choiceId: 'choice-broken',
      },
    ]);
  });
});
