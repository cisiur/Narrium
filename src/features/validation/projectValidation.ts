import type { Choice, Condition, Effect, Project, Scene } from '../../types';

export type ValidationSeverity = 'warning' | 'error';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  sceneId: string | null;
  choiceId: string | null;
}

export const VALIDATION_CODES = {
  targetlessChoiceWithoutEffects: 'targetless_choice_without_effects',
  brokenChoiceTarget: 'broken_choice_target',
  missingDialogueSpeaker: 'missing_dialogue_speaker',
  brokenSceneBackgroundReference: 'broken_scene_background_reference',
  brokenAssetBackgroundReference: 'broken_asset_background_reference',
  brokenConditionResourceReference: 'broken_condition_resource_reference',
  brokenEffectResourceReference: 'broken_effect_resource_reference',
  brokenConditionVariableReference: 'broken_condition_variable_reference',
  brokenEffectVariableReference: 'broken_effect_variable_reference',
  brokenConditionCharacterReference: 'broken_condition_character_reference',
  brokenEffectCharacterReference: 'broken_effect_character_reference',
  brokenConditionCharacterAttributeReference: 'broken_condition_character_attribute_reference',
  brokenEffectCharacterAttributeReference: 'broken_effect_character_attribute_reference',
} as const;

type ProjectValidationRule = (project: Project) => ValidationIssue[];

function validateTargetlessChoicesWithoutEffects(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  project.scenes.forEach((scene) => {
    scene.choices.forEach((choice) => {
      if (choice.targetSceneId !== null || (choice.effects ?? []).length > 0) {
        return;
      }

      issues.push({
        severity: 'warning',
        code: VALIDATION_CODES.targetlessChoiceWithoutEffects,
        message: 'This choice does nothing. Add a target scene or at least one effect.',
        sceneId: scene.id,
        choiceId: choice.id,
      });
    });
  });

  return issues;
}

function validateBrokenChoiceTargets(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sceneIds = new Set(project.scenes.map((scene) => scene.id));

  project.scenes.forEach((scene) => {
    scene.choices.forEach((choice) => {
      if (choice.targetSceneId === null || sceneIds.has(choice.targetSceneId)) {
        return;
      }

      issues.push({
        severity: 'error',
        code: VALIDATION_CODES.brokenChoiceTarget,
        message: 'Target scene no longer exists.',
        sceneId: scene.id,
        choiceId: choice.id,
      });
    });
  });

  return issues;
}

function validateMissingDialogueSpeakers(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const characterIds = new Set(project.characters.map((character) => character.id));

  project.scenes.forEach((scene) => {
    scene.dialoguePages.forEach((dialoguePage) => {
      if (dialoguePage.speakerId === null || characterIds.has(dialoguePage.speakerId)) {
        return;
      }

      issues.push({
        severity: 'warning',
        code: VALIDATION_CODES.missingDialogueSpeaker,
        message: 'Referenced speaker no longer exists.',
        sceneId: scene.id,
        choiceId: null,
      });
    });
  });

  return issues;
}

function validateBrokenSceneBackgroundReferences(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sceneIds = new Set(project.scenes.map((scene) => scene.id));

  project.scenes.forEach((scene) => {
    if (
      scene.background.mode !== 'scene_reference' ||
      scene.background.sourceSceneId === null ||
      sceneIds.has(scene.background.sourceSceneId)
    ) {
      return;
    }

    issues.push({
      severity: 'warning',
      code: VALIDATION_CODES.brokenSceneBackgroundReference,
      message: 'Referenced scene background no longer exists.',
      sceneId: scene.id,
      choiceId: null,
    });
  });

  return issues;
}

function validateBrokenAssetBackgroundReferences(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const assetIds = new Set(project.assetLibrary.map((asset) => asset.id));

  project.scenes.forEach((scene) => {
    if (
      scene.background.mode !== 'asset' ||
      scene.background.assetId === null ||
      assetIds.has(scene.background.assetId)
    ) {
      return;
    }

    issues.push({
      severity: 'warning',
      code: VALIDATION_CODES.brokenAssetBackgroundReference,
      message: 'Referenced background asset no longer exists.',
      sceneId: scene.id,
      choiceId: null,
    });
  });

  return issues;
}

function formatChoiceContext(scene: Scene, choice: Choice) {
  return `Scene "${scene.name}", choice "${choice.text || 'Untitled choice'}"`;
}

function validateConditionReference(
  condition: Condition,
  project: Project,
  scene: Scene,
  choice: Choice,
): ValidationIssue | null {
  const context = formatChoiceContext(scene, choice);

  if (condition.type === 'resource') {
    if (project.resources.some((resource) => resource.id === condition.targetId)) {
      return null;
    }

    return {
      severity: 'error',
      code: VALIDATION_CODES.brokenConditionResourceReference,
      message: `${context} has a Condition that references a missing Resource.`,
      sceneId: scene.id,
      choiceId: choice.id,
    };
  }

  if (condition.type === 'variable') {
    if (project.variables.some((variable) => variable.id === condition.targetId)) {
      return null;
    }

    return {
      severity: 'error',
      code: VALIDATION_CODES.brokenConditionVariableReference,
      message: `${context} has a Condition that references a missing Variable.`,
      sceneId: scene.id,
      choiceId: choice.id,
    };
  }

  if (condition.type === 'character_attr') {
    const character = project.characters.find((item) => item.id === condition.targetId);

    if (!character) {
      return {
        severity: 'error',
        code: VALIDATION_CODES.brokenConditionCharacterReference,
        message: `${context} has a Condition that references a missing Character.`,
        sceneId: scene.id,
        choiceId: choice.id,
      };
    }

    if (
      !condition.attribute ||
      !character.attributes.some((attribute) => attribute.key === condition.attribute)
    ) {
      return {
        severity: 'error',
        code: VALIDATION_CODES.brokenConditionCharacterAttributeReference,
        message: `${context} has a Condition that references a missing Character Attribute.`,
        sceneId: scene.id,
        choiceId: choice.id,
      };
    }
  }

  return null;
}

function validateEffectReference(
  effect: Effect,
  project: Project,
  scene: Scene,
  choice: Choice,
): ValidationIssue | null {
  const context = formatChoiceContext(scene, choice);

  if (effect.type === 'resource') {
    if (project.resources.some((resource) => resource.id === effect.targetId)) {
      return null;
    }

    return {
      severity: 'error',
      code: VALIDATION_CODES.brokenEffectResourceReference,
      message: `${context} has an Effect that references a missing Resource.`,
      sceneId: scene.id,
      choiceId: choice.id,
    };
  }

  if (effect.type === 'variable') {
    if (project.variables.some((variable) => variable.id === effect.targetId)) {
      return null;
    }

    return {
      severity: 'error',
      code: VALIDATION_CODES.brokenEffectVariableReference,
      message: `${context} has an Effect that references a missing Variable.`,
      sceneId: scene.id,
      choiceId: choice.id,
    };
  }

  if (effect.type === 'character_attr') {
    const character = project.characters.find((item) => item.id === effect.targetId);

    if (!character) {
      return {
        severity: 'error',
        code: VALIDATION_CODES.brokenEffectCharacterReference,
        message: `${context} has an Effect that references a missing Character.`,
        sceneId: scene.id,
        choiceId: choice.id,
      };
    }

    if (
      !effect.attribute ||
      !character.attributes.some((attribute) => attribute.key === effect.attribute)
    ) {
      return {
        severity: 'error',
        code: VALIDATION_CODES.brokenEffectCharacterAttributeReference,
        message: `${context} has an Effect that references a missing Character Attribute.`,
        sceneId: scene.id,
        choiceId: choice.id,
      };
    }
  }

  return null;
}

function validateBrokenStoryLogicReferences(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  project.scenes.forEach((scene) => {
    scene.choices.forEach((choice) => {
      (choice.conditionGroups ?? []).forEach((conditionGroup) => {
        conditionGroup.conditions.forEach((condition) => {
          const issue = validateConditionReference(condition, project, scene, choice);

          if (issue) {
            issues.push(issue);
          }
        });
      });

      (choice.effects ?? []).forEach((effect) => {
        const issue = validateEffectReference(effect, project, scene, choice);

        if (issue) {
          issues.push(issue);
        }
      });
    });
  });

  return issues;
}

const projectValidationRules: ProjectValidationRule[] = [
  validateTargetlessChoicesWithoutEffects,
  validateBrokenChoiceTargets,
  validateMissingDialogueSpeakers,
  validateBrokenSceneBackgroundReferences,
  validateBrokenAssetBackgroundReferences,
  validateBrokenStoryLogicReferences,
];

export function validateProject(project: Project): ValidationIssue[] {
  return projectValidationRules.flatMap((rule) => rule(project));
}
