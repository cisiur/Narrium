import type { Choice, Condition, Project, RuntimeState } from '../../types';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function compareNumbers(
  leftValue: unknown,
  operator: Condition['operator'],
  rightValue: unknown,
): boolean {
  if (!isFiniteNumber(leftValue) || !isFiniteNumber(rightValue)) {
    return false;
  }

  switch (operator) {
    case '>=':
      return leftValue >= rightValue;
    case '<=':
      return leftValue <= rightValue;
    case '==':
      return leftValue === rightValue;
    case '>':
      return leftValue > rightValue;
    case '<':
      return leftValue < rightValue;
    case '!=':
      return leftValue !== rightValue;
    default:
      return false;
  }
}

export function evaluateCondition(
  condition: Condition,
  project: Project,
  runtimeState: RuntimeState,
): boolean {
  if (condition.type === 'resource') {
    const resource = project.resources.find((item) => item.id === condition.targetId);

    if (!resource) {
      return false;
    }

    const runtimeValue = runtimeState.variables.resources[resource.key];

    return compareNumbers(runtimeValue, condition.operator, condition.value);
  }

  if (condition.type === 'character_attr') {
    const character = project.characters.find((item) => item.id === condition.targetId);

    if (!character || !condition.attribute) {
      return false;
    }

    if (!character.attributes.some((attribute) => attribute.key === condition.attribute)) {
      return false;
    }

    const runtimeValue = runtimeState.variables.characterAttrs[character.id]?.[condition.attribute];

    return compareNumbers(runtimeValue, condition.operator, condition.value);
  }

  return false;
}

export function isChoiceAvailable(
  choice: Choice,
  project: Project,
  runtimeState: RuntimeState,
): boolean {
  const conditionGroups = choice.conditionGroups ?? [];

  if (conditionGroups.length === 0) {
    return true;
  }

  return conditionGroups.some((group) =>
    group.conditions.every((condition) => evaluateCondition(condition, project, runtimeState)),
  );
}
