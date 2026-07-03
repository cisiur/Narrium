import { describe, expect, it } from 'vitest';
import { clearFileInputValue } from './fileInputHelpers';

describe('clearFileInputValue', () => {
  it('clears file inputs so selecting the same file can fire another change event', () => {
    const input = {
      value: 'C:\\fakepath\\forest.png',
    } as HTMLInputElement;

    clearFileInputValue(input);

    expect(input.value).toBe('');
  });
});
