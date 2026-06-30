import type { Project } from '../../types';

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

const projectValidationRules: ProjectValidationRule[] = [
  validateTargetlessChoicesWithoutEffects,
  validateBrokenChoiceTargets,
  validateMissingDialogueSpeakers,
  validateBrokenSceneBackgroundReferences,
  validateBrokenAssetBackgroundReferences,
];

export function validateProject(project: Project): ValidationIssue[] {
  return projectValidationRules.flatMap((rule) => rule(project));
}
