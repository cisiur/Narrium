import type { Scene, SceneGroup } from '../../types';

export interface SceneGroupBounds {
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface SceneGroupBoundsOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  padding?: number;
}

export interface ProjectedSceneEdge {
  visible: boolean;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface ProjectSceneEdgeInput {
  sourceSceneId: string;
  targetSceneId: string;
  scenes: Scene[];
  groups: SceneGroup[];
}

export const DEFAULT_SCENE_NODE_SIZE = {
  width: 240,
  height: 160,
};

export const DEFAULT_SCENE_GROUP_PADDING = 32;

export function getGroupNodeId(groupId: string): string {
  return `group:${groupId}`;
}

export function getGroupById(groups: SceneGroup[], groupId: string | null): SceneGroup | undefined {
  if (groupId === null) {
    return undefined;
  }

  return groups.find((group) => group.id === groupId);
}

export function getScenesInGroup(scenes: Scene[], groupId: string): Scene[] {
  return scenes.filter((scene) => scene.groupId === groupId);
}

export function getSceneGroup(scene: Scene, groups: SceneGroup[]): SceneGroup | undefined {
  return getGroupById(groups, scene.groupId);
}

export function isSceneInCollapsedGroup(scene: Scene, groups: SceneGroup[]): boolean {
  return getSceneGroup(scene, groups)?.collapsed === true;
}

export function shouldRenderSceneNode(scene: Scene, groups: SceneGroup[]): boolean {
  return !isSceneInCollapsedGroup(scene, groups);
}

export function getVisibleNodeIdForScene(
  sceneId: string,
  scenes: Scene[],
  groups: SceneGroup[],
): string {
  const scene = scenes.find((candidate) => candidate.id === sceneId);

  if (!scene) {
    return sceneId;
  }

  const group = getSceneGroup(scene, groups);

  if (!group || !group.collapsed) {
    return scene.id;
  }

  return getGroupNodeId(group.id);
}

export function computeSceneGroupBounds(
  scenes: Scene[],
  options: SceneGroupBoundsOptions = {},
): SceneGroupBounds {
  if (scenes.length === 0) {
    return {
      position: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
    };
  }

  const nodeWidth = options.nodeWidth ?? DEFAULT_SCENE_NODE_SIZE.width;
  const nodeHeight = options.nodeHeight ?? DEFAULT_SCENE_NODE_SIZE.height;
  const padding = options.padding ?? DEFAULT_SCENE_GROUP_PADDING;

  const minX = Math.min(...scenes.map((scene) => scene.position.x));
  const minY = Math.min(...scenes.map((scene) => scene.position.y));
  const maxX = Math.max(...scenes.map((scene) => scene.position.x + nodeWidth));
  const maxY = Math.max(...scenes.map((scene) => scene.position.y + nodeHeight));

  return {
    position: {
      x: minX - padding,
      y: minY - padding,
    },
    size: {
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    },
  };
}

export function projectSceneEdge(input: ProjectSceneEdgeInput): ProjectedSceneEdge {
  const sourceNodeId = getVisibleNodeIdForScene(input.sourceSceneId, input.scenes, input.groups);
  const targetNodeId = getVisibleNodeIdForScene(input.targetSceneId, input.scenes, input.groups);

  return {
    visible: sourceNodeId !== targetNodeId,
    sourceNodeId,
    targetNodeId,
  };
}
