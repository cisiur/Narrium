import { describe, expect, it } from 'vitest';
import type { Variable } from '../../types';
import { resolveVariableKey } from './variableHelpers';

function createVariable(id: string, key: string): Variable {
  return {
    id,
    key,
    defaultValue: 0,
  };
}

describe('resolveVariableKey', () => {
  it('keeps unused keys unchanged', () => {
    expect(resolveVariableKey([createVariable('variable-1', 'flag')], 'score', null)).toBe('score');
  });

  it('uses a default key for empty input', () => {
    expect(resolveVariableKey([], '   ', null)).toBe('variable');
  });

  it('adds suffixes for duplicate keys', () => {
    const variables = [
      createVariable('variable-1', 'flag'),
      createVariable('variable-2', 'flag_2'),
    ];

    expect(resolveVariableKey(variables, 'flag', null)).toBe('flag_3');
  });

  it('ignores the current variable while renaming', () => {
    const variables = [
      createVariable('variable-1', 'flag'),
      createVariable('variable-2', 'flag_2'),
    ];

    expect(resolveVariableKey(variables, 'flag', 'variable-1')).toBe('flag');
  });
});
