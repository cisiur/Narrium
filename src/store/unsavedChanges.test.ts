import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../types';
import type { UnsavedChangesAction } from '../services/platform';
import { ensureCanLeaveProject } from './unsavedChanges';

function createProject(): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    thumbnail: null,
    startSceneId: '',
    scenes: [],
    characters: [],
    resources: [],
    variables: [],
    groups: [],
    assetLibrary: [],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('ensureCanLeaveProject', () => {
  function confirmAction(action: UnsavedChangesAction) {
    return vi.fn((_projectName: string) => Promise.resolve(action));
  }

  it('allows clean projects to close without prompting', async () => {
    const confirmUnsavedChanges = vi.fn();

    await expect(
      ensureCanLeaveProject({
        activeProject: createProject(),
        activeProjectDirty: false,
        confirmUnsavedChanges,
        saveActiveProject: vi.fn(),
        markProjectClean: vi.fn(),
      }),
    ).resolves.toBe(true);
    expect(confirmUnsavedChanges).not.toHaveBeenCalled();
  });

  it('keeps the project open when the user cancels', async () => {
    await expect(
      ensureCanLeaveProject({
        activeProject: createProject(),
        activeProjectDirty: true,
        confirmUnsavedChanges: confirmAction('cancel'),
        saveActiveProject: vi.fn(),
        markProjectClean: vi.fn(),
      }),
    ).resolves.toBe(false);
  });

  it('allows close and marks clean when the user discards changes', async () => {
    const markProjectClean = vi.fn();

    await expect(
      ensureCanLeaveProject({
        activeProject: createProject(),
        activeProjectDirty: true,
        confirmUnsavedChanges: confirmAction('discard'),
        saveActiveProject: vi.fn(),
        markProjectClean,
      }),
    ).resolves.toBe(true);
    expect(markProjectClean).toHaveBeenCalled();
  });

  it('allows close after a successful save', async () => {
    await expect(
      ensureCanLeaveProject({
        activeProject: createProject(),
        activeProjectDirty: true,
        confirmUnsavedChanges: confirmAction('save'),
        saveActiveProject: vi.fn(() => Promise.resolve(true)),
        markProjectClean: vi.fn(),
      }),
    ).resolves.toBe(true);
  });

  it('keeps the project open when save fails or Save As is canceled', async () => {
    await expect(
      ensureCanLeaveProject({
        activeProject: createProject(),
        activeProjectDirty: true,
        confirmUnsavedChanges: confirmAction('save'),
        saveActiveProject: vi.fn(() => Promise.resolve(false)),
        markProjectClean: vi.fn(),
      }),
    ).resolves.toBe(false);
  });
});
