import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import {
  PROJECT_HISTORY_LIMIT,
  createEmptyProjectHistory,
  pushProjectSnapshot,
  redoProjectHistory,
  undoProjectHistory,
} from './projectHistory';

function createProject(name: string, id = 'project-1'): Project {
  return {
    id,
    name,
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

describe('project history', () => {
  it('stores snapshots for undo and clears redo history after a new edit', () => {
    const initialProject = createProject('Initial');
    const editedProject = createProject('Edited');
    const redoneProject = createProject('Redone');
    const history = pushProjectSnapshot(createEmptyProjectHistory(initialProject.id), initialProject);
    const undone = undoProjectHistory(history, editedProject);

    expect(undone.project?.name).toBe('Initial');
    expect(undone.history.redoStack).toHaveLength(1);

    const nextHistory = pushProjectSnapshot(undone.history, redoneProject);

    expect(nextHistory.undoStack.map((project) => project.name)).toEqual(['Redone']);
    expect(nextHistory.redoStack).toEqual([]);
  });

  it('replays undo and redo snapshots for the current project', () => {
    const firstProject = createProject('First');
    const secondProject = createProject('Second');
    const thirdProject = createProject('Third');
    let history = createEmptyProjectHistory(firstProject.id);

    history = pushProjectSnapshot(history, firstProject);
    history = pushProjectSnapshot(history, secondProject);

    const undone = undoProjectHistory(history, thirdProject);

    expect(undone.project?.name).toBe('Second');

    const redone = redoProjectHistory(undone.history, undone.project);

    expect(redone.project?.name).toBe('Third');
  });

  it('does not undo history from a different active project', () => {
    const history = pushProjectSnapshot(createEmptyProjectHistory('project-1'), createProject('First'));
    const result = undoProjectHistory(history, createProject('Other', 'project-2'));

    expect(result.project).toBeNull();
    expect(result.history).toBe(history);
  });

  it('keeps at most fifty undo snapshots', () => {
    let history = createEmptyProjectHistory('project-1');

    for (let index = 0; index < PROJECT_HISTORY_LIMIT + 5; index += 1) {
      history = pushProjectSnapshot(history, createProject(`Snapshot ${index}`));
    }

    expect(history.undoStack).toHaveLength(PROJECT_HISTORY_LIMIT);
    expect(history.undoStack[0].name).toBe('Snapshot 5');
  });
});
