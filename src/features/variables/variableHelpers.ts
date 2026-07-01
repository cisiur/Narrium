import type { Variable } from '../../types';

export const DEFAULT_VARIABLE_KEY = 'New Variable';

export function createVariable(key = DEFAULT_VARIABLE_KEY): Variable {
  return {
    id: crypto.randomUUID(),
    key,
    defaultValue: 0,
  };
}

export function resolveVariableKey(
  variables: Variable[],
  nextKey: string,
  currentVariableId: string | null,
) {
  const baseKey = nextKey.trim() || 'variable';
  const usedKeys = new Set(
    variables
      .filter((variable) => variable.id !== currentVariableId)
      .map((variable) => variable.key),
  );

  if (!usedKeys.has(baseKey)) {
    return baseKey;
  }

  let suffix = 2;
  let candidate = `${baseKey}_${suffix}`;

  while (usedKeys.has(candidate)) {
    suffix += 1;
    candidate = `${baseKey}_${suffix}`;
  }

  return candidate;
}
