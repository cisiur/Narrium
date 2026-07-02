import { describe, expect, it } from 'vitest';
import type { Project, Scene, SceneGroup } from '../types';
import { getAssignableSceneGroupOptions } from './App';

function createScene(id: string, groupId: string | null): Scene {
  return {
    id,
    name: id,
    background: {
      mode: 'none',
      assetId: null,
      sourceSceneId: null,
      url: '',
    },
    position: { x: 0, y: 0 },
    dialoguePages: [],
    choices: [],
    groupId,
  };
}

function createGroup(id: string, name: string): SceneGroup {
  return {
    id,
    name,
    color: '#38bdf8',
    position: { x: 0, y: 0 },
    size: { width: 320, height: 200 },
    collapsed: false,
  };
}

describe('getAssignableSceneGroupOptions', () => {
  it('does not include a group when all selected scenes already belong to it', () => {
    const project = {
      scenes: [createScene('scene-a', 'group-1'), createScene('scene-b', 'group-1')],
      groups: [createGroup('group-1', 'Chapter 1'), createGroup('group-2', 'Side Quest')],
    } as Project;

    expect(getAssignableSceneGroupOptions(project, ['scene-a', 'scene-b'])).toEqual([
      { id: 'group-2', name: 'Side Quest' },
    ]);
  });
});
