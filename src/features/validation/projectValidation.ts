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

const projectValidationRules: ProjectValidationRule[] = [
  validateTargetlessChoicesWithoutEffects,
];

export function validateProject(project: Project): ValidationIssue[] {
  return projectValidationRules.flatMap((rule) => rule(project));
}
