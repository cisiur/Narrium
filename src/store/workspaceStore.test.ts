import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './workspaceStore';

describe('createEmptyProject', () => {
  it('creates new projects with an empty variables array', () => {
    const project = createEmptyProject({
      id: 'project-1',
      name: 'Test Project',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      thumbnailDataUrl: null,
    });

    expect(project.variables).toEqual([]);
  });
});
