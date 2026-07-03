import type { Choice, Condition, Effect, Project, RuntimeState } from '../../types';

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

export function applyNumericOperation(
  currentValue: number,
  operation: Effect['operation'],
  effectValue: number,
): number | null {
  switch (operation) {
    case '+=':
      return currentValue + effectValue;
    case '-=':
      return currentValue - effectValue;
    case '=':
      return effectValue;
    default:
      return null;
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

  if (condition.type === 'variable') {
    const variable = project.variables.find((item) => item.id === condition.targetId);

    if (!variable) {
      return false;
    }

    const runtimeValue = runtimeState.variables.variables[variable.key];

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

export function resolveUnavailableChoiceHint(
  choice: Choice,
  project: Project,
  runtimeState: RuntimeState,
): string | null {
  if (isChoiceAvailable(choice, project, runtimeState)) {
    return null;
  }

  const conditionGroups = choice.conditionGroups ?? [];

  for (const group of conditionGroups) {
    for (const condition of group.conditions) {
      if (evaluateCondition(condition, project, runtimeState)) {
        continue;
      }

      const hintText = condition.hintText.trim();

      if (hintText !== '') {
        return hintText;
      }
    }
  }

  return null;
}

export function applyEffects(
  choice: Choice,
  project: Project,
  runtimeState: RuntimeState,
): RuntimeState {
  const effects = choice.effects;

  if (!effects) {
    return runtimeState;
  }

  let nextResources = runtimeState.variables.resources;
  let nextVariables = runtimeState.variables.variables;
  let nextCharacterAttrs = runtimeState.variables.characterAttrs;

  for (const effect of effects) {
    if (effect.type === 'resource') {
      const resource = project.resources.find((item) => item.id === effect.targetId);

      if (!resource) {
        continue;
      }

      const currentValue = nextResources[resource.key] ?? 0;
      const nextValue = applyNumericOperation(currentValue, effect.operation, effect.value);

      if (nextValue === null) {
        continue;
      }

      nextResources = {
        ...nextResources,
        [resource.key]: nextValue,
      };
      continue;
    }

    if (effect.type === 'variable') {
      const variable = project.variables.find((item) => item.id === effect.targetId);

      if (!variable) {
        continue;
      }

      const currentValue = nextVariables[variable.key] ?? 0;
      const nextValue = applyNumericOperation(currentValue, effect.operation, effect.value);

      if (nextValue === null) {
        continue;
      }

      nextVariables = {
        ...nextVariables,
        [variable.key]: nextValue,
      };
      continue;
    }

    if (effect.type === 'character_attr') {
      const character = project.characters.find((item) => item.id === effect.targetId);

      if (!character || !effect.attribute) {
        continue;
      }

      if (!character.attributes.some((attribute) => attribute.key === effect.attribute)) {
        continue;
      }

      const currentCharacterAttrs = nextCharacterAttrs[character.id] ?? {};
      const currentValue = currentCharacterAttrs[effect.attribute] ?? 0;
      const nextValue = applyNumericOperation(currentValue, effect.operation, effect.value);

      if (nextValue === null) {
        continue;
      }

      nextCharacterAttrs = {
        ...nextCharacterAttrs,
        [character.id]: {
          ...currentCharacterAttrs,
          [effect.attribute]: nextValue,
        },
      };
    }
  }

  return {
    ...runtimeState,
    variables: {
      ...runtimeState.variables,
      resources: nextResources,
      variables: nextVariables,
      characterAttrs: nextCharacterAttrs,
    },
  };
}

export function advanceRuntimeForChoice(
  choice: Choice,
  project: Project,
  runtimeState: RuntimeState,
): RuntimeState {
  const targetSceneId = choice.targetSceneId;

  if (
    !isChoiceAvailable(choice, project, runtimeState) ||
    (targetSceneId !== null && !project.scenes.some((scene) => scene.id === targetSceneId))
  ) {
    return runtimeState;
  }

  const nextState = applyEffects(choice, project, runtimeState);

  if (targetSceneId === null) {
    return nextState;
  }

  return {
    ...nextState,
    currentSceneId: targetSceneId,
    currentPageIndex: 0,
  };
}
