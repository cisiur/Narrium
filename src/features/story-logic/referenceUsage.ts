import type { Project } from '../../types';

export type StoryLogicReferenceKind = 'resource' | 'character';
export type StoryLogicUsageType = 'Condition' | 'Effect';

export interface StoryLogicUsage {
  sceneName: string;
  choiceLabel: string;
  usageTypes: StoryLogicUsageType[];
}

interface StoryLogicReferenceTarget {
  kind: StoryLogicReferenceKind;
  id: string;
}

function isStoryLogicReference(
  referenceType: string,
  targetKind: StoryLogicReferenceKind,
  targetId: string,
  referenceId: string,
): boolean {
  if (targetKind === 'resource') {
    return referenceType === 'resource' && targetId === referenceId;
  }

  return referenceType === 'character_attr' && targetId === referenceId;
}

export function findStoryLogicUsages(
  project: Project,
  target: StoryLogicReferenceTarget,
): StoryLogicUsage[] {
  const usages: StoryLogicUsage[] = [];

  project.scenes.forEach((scene) => {
    scene.choices.forEach((choice, choiceIndex) => {
      const usageTypes: StoryLogicUsageType[] = [];
      const hasConditionUsage = (choice.conditionGroups ?? []).some((group) =>
        group.conditions.some((condition) =>
          isStoryLogicReference(condition.type, target.kind, condition.targetId, target.id),
        ),
      );
      const hasEffectUsage = (choice.effects ?? []).some((effect) =>
        isStoryLogicReference(effect.type, target.kind, effect.targetId, target.id),
      );

      if (hasConditionUsage) {
        usageTypes.push('Condition');
      }

      if (hasEffectUsage) {
        usageTypes.push('Effect');
      }

      if (usageTypes.length === 0) {
        return;
      }

      usages.push({
        sceneName: scene.name || 'Untitled Scene',
        choiceLabel: choice.text.trim() || `Choice ${choiceIndex + 1}`,
        usageTypes,
      });
    });
  });

  return usages;
}

export function formatStoryLogicUsageWarning(
  referenceLabel: string,
  usages: StoryLogicUsage[],
): string {
  const usageLines = usages
    .map(
      (usage) =>
        [
          `Scene:\n${usage.sceneName}`,
          `Choice:\n${usage.choiceLabel}`,
          `Used as:\n${usage.usageTypes.map((usageType) => `- ${usageType}`).join('\n')}`,
        ].join('\n\n'),
    )
    .join('\n\n');

  return [
    `This ${referenceLabel} is currently used by Story Logic.`,
    usageLines,
    'Delete anyway?',
  ].join('\n\n');
}
