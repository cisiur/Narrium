import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import { createStandaloneHtml } from './standaloneHtmlExport';

function createProject(): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    thumbnail: null,
    startSceneId: '',
    scenes: [],
    characters: [],
    resources: [],
    variables: [
      {
        id: 'variable-suspicion',
        key: 'suspicion',
        defaultValue: 1,
      },
    ],
    groups: [],
    assetLibrary: [],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('createStandaloneHtml', () => {
  it('includes variable initialization and save/load snapshot preservation', () => {
    const html = createStandaloneHtml(createProject());

    expect(html).toContain('(project.variables || []).map((variable)');
    expect(html).toContain('variables: { ...state.variables.variables }');
    expect(html).toContain('hasFiniteNumericValues(value.variables.variables)');
  });
});
