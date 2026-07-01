import { describe, expect, it } from 'vitest';
import type { Scene, SceneGroup } from '../../types';
import {
  computeSceneGroupBounds,
  getGroupNodeId,
  getVisibleNodeIdForScene,
  projectSceneEdge,
  shouldRenderSceneNode,
} from './sceneGroups';

function createScene(
  id: string,
  input: Partial<Pick<Scene, 'groupId' | 'position'>> = {},
): Scene {
  return {
    id,
    name: id,
    background: {
      mode: 'none',
      assetId: null,
      sourceSceneId: null,
      url: '',
    },
    position: input.position ?? { x: 0, y: 0 },
    dialoguePages: [],
    choices: [],
    groupId: input.groupId ?? null,
  };
}

function createGroup(id: string, collapsed: boolean): SceneGroup {
  return {
    id,
    name: id,
    color: '#38bdf8',
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    collapsed,
  };
}

describe('scene group canvas helpers', () => {
  it('renders a scene without group as a scene node', () => {
    const scene = createScene('scene-a');

    expect(shouldRenderSceneNode(scene, [])).toBe(true);
    expect(getVisibleNodeIdForScene(scene.id, [scene], [])).toBe('scene-a');
  });

  it('renders a scene in an expanded group as a scene node', () => {
    const scene = createScene('scene-a', { groupId: 'group-a' });
    const groups = [createGroup('group-a', false)];

    expect(shouldRenderSceneNode(scene, groups)).toBe(true);
    expect(getVisibleNodeIdForScene(scene.id, [scene], groups)).toBe('scene-a');
  });

  it('maps a scene in a collapsed group to the group node id', () => {
    const scene = createScene('scene-a', { groupId: 'group-a' });
    const groups = [createGroup('group-a', true)];

    expect(shouldRenderSceneNode(scene, groups)).toBe(false);
    expect(getVisibleNodeIdForScene(scene.id, [scene], groups)).toBe(getGroupNodeId('group-a'));
  });

  it('hides edges inside the same collapsed group', () => {
    const scenes = [
      createScene('scene-a', { groupId: 'group-a' }),
      createScene('scene-b', { groupId: 'group-a' }),
    ];
    const groups = [createGroup('group-a', true)];

    expect(projectSceneEdge({ sourceSceneId: 'scene-a', targetSceneId: 'scene-b', scenes, groups })).toEqual({
      visible: false,
      sourceNodeId: 'group:group-a',
      targetNodeId: 'group:group-a',
    });
  });

  it('projects inside collapsed group to outside as group to scene', () => {
    const scenes = [createScene('scene-a', { groupId: 'group-a' }), createScene('scene-b')];
    const groups = [createGroup('group-a', true)];

    expect(projectSceneEdge({ sourceSceneId: 'scene-a', targetSceneId: 'scene-b', scenes, groups })).toEqual({
      visible: true,
      sourceNodeId: 'group:group-a',
      targetNodeId: 'scene-b',
    });
  });

  it('projects outside to inside collapsed group as scene to group', () => {
    const scenes = [createScene('scene-a'), createScene('scene-b', { groupId: 'group-b' })];
    const groups = [createGroup('group-b', true)];

    expect(projectSceneEdge({ sourceSceneId: 'scene-a', targetSceneId: 'scene-b', scenes, groups })).toEqual({
      visible: true,
      sourceNodeId: 'scene-a',
      targetNodeId: 'group:group-b',
    });
  });

  it('projects between different collapsed groups as group to group', () => {
    const scenes = [
      createScene('scene-a', { groupId: 'group-a' }),
      createScene('scene-b', { groupId: 'group-b' }),
    ];
    const groups = [createGroup('group-a', true), createGroup('group-b', true)];

    expect(projectSceneEdge({ sourceSceneId: 'scene-a', targetSceneId: 'scene-b', scenes, groups })).toEqual({
      visible: true,
      sourceNodeId: 'group:group-a',
      targetNodeId: 'group:group-b',
    });
  });

  it('projects expanded group scene to collapsed group as scene to group', () => {
    const scenes = [
      createScene('scene-a', { groupId: 'group-a' }),
      createScene('scene-b', { groupId: 'group-b' }),
    ];
    const groups = [createGroup('group-a', false), createGroup('group-b', true)];

    expect(projectSceneEdge({ sourceSceneId: 'scene-a', targetSceneId: 'scene-b', scenes, groups })).toEqual({
      visible: true,
      sourceNodeId: 'scene-a',
      targetNodeId: 'group:group-b',
    });
  });

  it('projects collapsed group to expanded group scene as group to scene', () => {
    const scenes = [
      createScene('scene-a', { groupId: 'group-a' }),
      createScene('scene-b', { groupId: 'group-b' }),
    ];
    const groups = [createGroup('group-a', true), createGroup('group-b', false)];

    expect(projectSceneEdge({ sourceSceneId: 'scene-a', targetSceneId: 'scene-b', scenes, groups })).toEqual({
      visible: true,
      sourceNodeId: 'group:group-a',
      targetNodeId: 'scene-b',
    });
  });

  it('keeps current canvas behavior when there are no groups', () => {
    const scenes = [createScene('scene-a'), createScene('scene-b')];

    expect(projectSceneEdge({ sourceSceneId: 'scene-a', targetSceneId: 'scene-b', scenes, groups: [] })).toEqual({
      visible: true,
      sourceNodeId: 'scene-a',
      targetNodeId: 'scene-b',
    });
  });

  it('treats a scene referencing a missing group as a normal scene', () => {
    const scene = createScene('scene-a', { groupId: 'missing-group' });

    expect(shouldRenderSceneNode(scene, [])).toBe(true);
    expect(getVisibleNodeIdForScene(scene.id, [scene], [])).toBe('scene-a');
  });

  it('returns a safe empty bounding box for an empty group', () => {
    expect(computeSceneGroupBounds([])).toEqual({
      position: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
    });
  });

  it('computes a bounding box around multiple scenes with padding', () => {
    const scenes = [
      createScene('scene-a', { position: { x: 100, y: 200 } }),
      createScene('scene-b', { position: { x: 500, y: 420 } }),
    ];

    expect(computeSceneGroupBounds(scenes, { nodeWidth: 200, nodeHeight: 100, padding: 20 })).toEqual({
      position: { x: 80, y: 180 },
      size: { width: 640, height: 360 },
    });
  });
});
