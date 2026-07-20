import { describe, expect, it, vi } from 'vitest';
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
    expect(history.undoStackSizes).toHaveLength(PROJECT_HISTORY_LIMIT);
    expect(history.undoStack[0].name).toBe('Snapshot 5');
  });

  it('calculates each newly pushed snapshot size once without resizing previous snapshots', () => {
    const calculateSnapshotSize = vi.fn((serializedProject: string) => serializedProject.length);
    let history = createEmptyProjectHistory('project-1');

    history = pushProjectSnapshot(history, createProject('First'), calculateSnapshotSize);
    history = pushProjectSnapshot(history, createProject('Second'), calculateSnapshotSize);

    expect(calculateSnapshotSize).toHaveBeenCalledTimes(2);
    expect(history.undoStack.map((project) => project.name)).toEqual(['First', 'Second']);
    expect(history.undoStackSizes).toEqual(
      calculateSnapshotSize.mock.calls.map(([serializedProject]) => serializedProject.length),
    );
  });

  it('undo reuses retained undo sizes and only sizes the current redo snapshot', () => {
    const calculateSnapshotSize = vi.fn((serializedProject: string) => serializedProject.length);
    let history = createEmptyProjectHistory('project-1');

    history = pushProjectSnapshot(history, createProject('First'), calculateSnapshotSize);
    history = pushProjectSnapshot(history, createProject('Second'), calculateSnapshotSize);
    calculateSnapshotSize.mockClear();

    const result = undoProjectHistory(history, createProject('Third'), calculateSnapshotSize);

    expect(calculateSnapshotSize).toHaveBeenCalledTimes(1);
    expect(result.project?.name).toBe('Second');
    expect(result.history.undoStack.map((project) => project.name)).toEqual(['First']);
    expect(result.history.undoStackSizes).toEqual([history.undoStackSizes?.[0]]);
    expect(result.history.redoStack.map((project) => project.name)).toEqual(['Third']);
    expect(result.history.redoStackSizes).toEqual([calculateSnapshotSize.mock.results[0].value]);
  });

  it('redo reuses retained redo sizes and only sizes the current undo snapshot', () => {
    const calculateSnapshotSize = vi.fn((serializedProject: string) => serializedProject.length);
    let history = createEmptyProjectHistory('project-1');

    history = pushProjectSnapshot(history, createProject('First'), calculateSnapshotSize);
    history = pushProjectSnapshot(history, createProject('Second'), calculateSnapshotSize);
    const undone = undoProjectHistory(history, createProject('Third'), calculateSnapshotSize);
    calculateSnapshotSize.mockClear();

    const redone = redoProjectHistory(undone.history, undone.project, calculateSnapshotSize);

    expect(calculateSnapshotSize).toHaveBeenCalledTimes(1);
    expect(redone.project?.name).toBe('Third');
    expect(redone.history.redoStack).toEqual([]);
    expect(redone.history.redoStackSizes).toEqual([]);
    expect(redone.history.undoStack.map((project) => project.name)).toEqual(['First', 'Second']);
    expect(redone.history.undoStackSizes?.[0]).toBe(history.undoStackSizes?.[0]);
  });

  it('trimming at the history limit removes matching stored sizes', () => {
    const calculateSnapshotSize = vi.fn((serializedProject: string) => JSON.parse(serializedProject).name.length);
    let history = createEmptyProjectHistory('project-1');

    for (let index = 0; index < PROJECT_HISTORY_LIMIT + 5; index += 1) {
      history = pushProjectSnapshot(history, createProject(`Snapshot ${index}`), calculateSnapshotSize);
    }

    expect(history.undoStack).toHaveLength(PROJECT_HISTORY_LIMIT);
    expect(history.undoStackSizes).toHaveLength(PROJECT_HISTORY_LIMIT);
    expect(history.undoStack[0].name).toBe('Snapshot 5');
    expect(history.undoStackSizes?.[0]).toBe('Snapshot 5'.length);
  });

  it('keeps history metrics correct from retained sizes after undo and redo', () => {
    const calculateSnapshotSize = vi.fn((serializedProject: string) => JSON.parse(serializedProject).name.length);
    let history = createEmptyProjectHistory('project-1');

    history = pushProjectSnapshot(history, createProject('First'), calculateSnapshotSize);
    history = pushProjectSnapshot(history, createProject('Second'), calculateSnapshotSize);
    const undone = undoProjectHistory(history, createProject('Third'), calculateSnapshotSize);
    const redone = redoProjectHistory(undone.history, undone.project, calculateSnapshotSize);

    expect(undone.history.undoStack).toHaveLength(1);
    expect(undone.history.redoStack).toHaveLength(1);
    expect(undone.history.undoStackSizes).toEqual(['First'.length]);
    expect(undone.history.redoStackSizes).toEqual(['Third'.length]);
    expect(redone.history.undoStack).toHaveLength(2);
    expect(redone.history.redoStack).toHaveLength(0);
    expect(redone.history.undoStackSizes).toEqual(['First'.length, 'Second'.length]);
  });

  it('does not add size metadata to project snapshots', () => {
    const history = pushProjectSnapshot(createEmptyProjectHistory('project-1'), createProject('First'));

    expect(history.undoStack[0]).not.toHaveProperty('serializedSnapshotSize');
    expect(history.undoStack[0]).not.toHaveProperty('snapshotSize');
    expect(JSON.stringify(history.undoStack[0])).not.toContain('undoStackSizes');
  });
});
