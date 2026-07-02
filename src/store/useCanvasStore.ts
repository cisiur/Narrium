import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from 'reactflow';
import { create } from 'zustand';
import {
  computeSceneGroupBounds,
  getGroupNodeId,
  getScenesInGroup,
  projectSceneEdge,
  shouldRenderSceneNode,
} from '../features/canvas/sceneGroups';
import type { AssetLibraryItem, Choice, DialoguePage, Scene, SceneBackground, SceneGroup } from '../types';
import type { Project } from '../types';
import { useWorkspaceStore } from './workspaceStore';

export type CanvasView = 'canvas' | 'editor';

export interface SceneNodeData {
  scene: Scene;
  scenes: Scene[];
  assetLibrary: AssetLibraryItem[];
}

export interface SceneGroupFrameData {
  group: SceneGroup;
  sceneCount: number;
}

export interface CollapsedSceneGroupNodeData {
  group: SceneGroup;
  sceneCount: number;
}

export type CanvasNodeData = SceneNodeData | SceneGroupFrameData | CollapsedSceneGroupNodeData;

interface AddBackgroundAssetInput {
  name: string;
  sourceType: 'upload' | 'url';
  url: string;
}

interface CanvasStore {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
  selectedSceneId: string | null;
  selectedSceneIds: string[];
  selectedGroupId: string | null;
  selectedChoiceId: string | null;
  activeView: CanvasView;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addScene: (name: string) => void;
  deleteScene: (id: string) => void;
  selectScene: (id: string | null) => void;
  selectScenes: (ids: string[]) => void;
  selectGroup: (id: string | null) => void;
  selectChoice: (sceneId: string, choiceId: string) => void;
  clearSelectedChoice: () => void;
  openEditor: (id: string) => void;
  groupSelectedScenes: () => void;
  ungroupSelectedGroup: () => void;
  updateSceneGroupName: (groupId: string, name: string) => void;
  updateSceneGroupCollapsed: (groupId: string, collapsed: boolean) => void;
  syncFromProject: () => void;
  updateSceneName: (sceneId: string, name: string) => void;
  updateSceneBackground: (sceneId: string, background: SceneBackground) => void;
  addBackgroundAsset: (input: AddBackgroundAssetInput) => void;
  deleteBackgroundAsset: (assetId: string) => void;
  updateBackgroundAssetName: (assetId: string, name: string) => void;
  addDialoguePage: (sceneId: string) => void;
  updateDialoguePage: (sceneId: string, pageId: string, text: string) => void;
  updateDialoguePageSpeaker: (sceneId: string, pageId: string, speakerId: string | null) => void;
  moveDialoguePageUp: (sceneId: string, pageId: string) => void;
  moveDialoguePageDown: (sceneId: string, pageId: string) => void;
  deleteDialoguePage: (sceneId: string, pageId: string) => void;
  addChoice: (sceneId: string) => void;
  copiedChoice: Choice | null;
  copiedChoiceProjectId: string | null;
  copyChoice: (sceneId: string, choiceId: string) => void;
  copySelectedChoice: () => void;
  pasteChoice: (sceneId: string) => void;
  updateChoiceText: (sceneId: string, choiceId: string, text: string) => void;
  updateChoiceTarget: (sceneId: string, choiceId: string, targetSceneId: string | null) => void;
  deleteChoice: (sceneId: string, choiceId: string) => void;
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function createDialoguePage(text = ''): DialoguePage {
  return {
    id: createId('page'),
    speakerId: null,
    text,
  };
}

function moveDialoguePage(pages: DialoguePage[], pageId: string, direction: -1 | 1) {
  const currentIndex = pages.findIndex((page) => page.id === pageId);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= pages.length) {
    return pages;
  }

  const nextPages = [...pages];
  const currentPage = nextPages[currentIndex];

  nextPages[currentIndex] = nextPages[nextIndex];
  nextPages[nextIndex] = currentPage;

  return nextPages;
}

function createChoice(text = 'New choice', targetSceneId: string | null = null): Choice {
  return {
    id: createId('choice'),
    text,
    targetSceneId,
    conditionGroups: [],
    effects: [],
  };
}

function cloneChoice(choice: Choice): Choice {
  return JSON.parse(JSON.stringify(choice)) as Choice;
}

function cloneChoiceWithNewIds(choice: Choice): Choice {
  return {
    ...cloneChoice(choice),
    id: createId('choice'),
    conditionGroups: (choice.conditionGroups ?? []).map((conditionGroup) => ({
      ...conditionGroup,
      id: createId('condition_group'),
      conditions: conditionGroup.conditions.map((condition) => ({
        ...condition,
        id: createId('condition'),
      })),
    })),
    effects: (choice.effects ?? []).map((effect) => ({
      ...effect,
      id: createId('effect'),
    })),
  };
}

function createScene(name: string, position: { x: number; y: number }): Scene {
  return {
    id: createId('scene'),
    name,
    background: {
      mode: 'none',
      assetId: null,
      sourceSceneId: null,
      url: '',
    },
    position,
    dialoguePages: [createDialoguePage('')],
    choices: [],
    groupId: null,
  };
}

function buildNodes(
  scenes: Scene[],
  groups: SceneGroup[],
  assetLibrary: AssetLibraryItem[],
  selectedSceneIds: string[],
  selectedGroupId: string | null,
): Node<CanvasNodeData>[] {
  const selectedSceneIdSet = new Set(selectedSceneIds);
  const groupNodes: Node<SceneGroupFrameData>[] = groups
    .filter((group) => !group.collapsed)
    .map((group) => ({
      id: getGroupNodeId(group.id),
      type: 'sceneGroupFrame',
      position: group.position,
      draggable: false,
      selectable: false,
      connectable: false,
      zIndex: 0,
      style: {
        width: group.size.width,
        height: group.size.height,
      },
      data: {
        group,
        sceneCount: getScenesInGroup(scenes, group.id).length,
      },
    }));

  const collapsedGroupNodes: Node<CollapsedSceneGroupNodeData>[] = groups
    .filter((group) => group.collapsed)
    .map((group) => ({
      id: getGroupNodeId(group.id),
      type: 'sceneGroup',
      position: group.position,
      draggable: false,
      selected: group.id === selectedGroupId,
      zIndex: 3,
      data: {
        group,
        sceneCount: getScenesInGroup(scenes, group.id).length,
      },
    }));

  const sceneNodes: Node<SceneNodeData>[] = scenes
    .filter((scene) => shouldRenderSceneNode(scene, groups))
    .map((scene) => ({
      id: scene.id,
      type: 'scene',
      position: scene.position,
      selected: selectedSceneIdSet.has(scene.id),
      zIndex: 2,
      data: {
        scene,
        scenes,
        assetLibrary,
      },
    }));

  return [...groupNodes, ...collapsedGroupNodes, ...sceneNodes];
}

function areBoundsEqual(group: SceneGroup, bounds: { position: SceneGroup['position']; size: SceneGroup['size'] }) {
  return (
    group.position.x === bounds.position.x &&
    group.position.y === bounds.position.y &&
    group.size.width === bounds.size.width &&
    group.size.height === bounds.size.height
  );
}

function updateGroupBoundsForSceneMembership(project: Project, groupIds: Set<string>): SceneGroup[] {
  if (groupIds.size === 0) {
    return project.groups;
  }

  return project.groups.map((group) => {
    if (!groupIds.has(group.id)) {
      return group;
    }

    const memberScenes = getScenesInGroup(project.scenes, group.id);

    if (memberScenes.length === 0) {
      return group;
    }

    const bounds = computeSceneGroupBounds(memberScenes);

    return areBoundsEqual(group, bounds)
      ? group
      : {
          ...group,
          position: bounds.position,
          size: bounds.size,
      };
  });
}

function finalizeSceneGroupMembership(project: Project, groupIdsToUpdate: Set<string>): SceneGroup[] {
  const groupsWithMembers = project.groups.filter(
    (group) => getScenesInGroup(project.scenes, group.id).length > 0,
  );

  return updateGroupBoundsForSceneMembership(
    {
      ...project,
      groups: groupsWithMembers,
    },
    groupIdsToUpdate,
  );
}

function buildEdges(scenes: Scene[], groups: SceneGroup[]): Edge[] {
  return scenes.flatMap((scene) =>
    scene.choices
      .filter((choice) => choice.targetSceneId)
      .flatMap((choice) => {
        const projectedEdge = projectSceneEdge({
          sourceSceneId: scene.id,
          targetSceneId: choice.targetSceneId as string,
          scenes,
          groups,
        });

        if (!projectedEdge.visible) {
          return [];
        }

        return {
          id: `${scene.id}:${choice.id}`,
          source: projectedEdge.sourceNodeId,
          target: projectedEdge.targetNodeId,
          label: choice.text || 'Choice',
          animated: false,
          className: 'text-gray-200',
        };
      }),
  );
}

function getSelectedSceneIdsFromNodes(nodes: Node<CanvasNodeData>[]): string[] {
  return nodes.filter((node) => node.type === 'scene' && node.selected).map((node) => node.id);
}

function getSelectedGroupIdFromNodes(nodes: Node<CanvasNodeData>[]): string | null {
  const selectedGroupNode = nodes.find((node) => node.type === 'sceneGroup' && node.selected);

  return selectedGroupNode ? (selectedGroupNode.data as CollapsedSceneGroupNodeData).group.id : null;
}

function updateActiveProject(mutator: (scenes: Scene[]) => Scene[]) {
  useWorkspaceStore.getState().updateActiveProject((project) => ({
    ...project,
    scenes: mutator(project.scenes),
  }));
}

function createEmptyBackground(): SceneBackground {
  return {
    mode: 'none',
    assetId: null,
    sourceSceneId: null,
    url: '',
  };
}

function createBackgroundAsset(input: AddBackgroundAssetInput): AssetLibraryItem {
  return {
    id: createId('asset'),
    kind: 'background',
    name: input.name.trim() || 'Untitled Background',
    sourceType: input.sourceType,
    url: input.url,
    createdAt: new Date().toISOString(),
  };
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedSceneId: null,
  selectedSceneIds: [],
  selectedGroupId: null,
  selectedChoiceId: null,
  copiedChoice: null,
  copiedChoiceProjectId: null,
  activeView: 'canvas',
  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      ...(() => {
        const nodes = applyNodeChanges(changes, state.nodes);
        const hasSelectionChanges = changes.some((change) => change.type === 'select');

        if (!hasSelectionChanges) {
          return { nodes };
        }

        const selectedSceneIds = getSelectedSceneIdsFromNodes(nodes);
        const selectedSceneId = selectedSceneIds.length === 1 ? selectedSceneIds[0] : null;
        const selectedGroupId = selectedSceneIds.length === 0 ? getSelectedGroupIdFromNodes(nodes) : null;

        return {
          nodes,
          selectedSceneIds,
          selectedSceneId,
          selectedGroupId,
          selectedChoiceId: null,
          activeView: selectedSceneId ? 'editor' : 'canvas',
        };
      })(),
    }));

    const positionChanges = changes.filter(
      (change): change is NodeChange & { id: string; position: { x: number; y: number } } =>
        change.type === 'position' && Boolean(change.position),
    );

    if (positionChanges.length > 0) {
      const activeProject = useWorkspaceStore.getState().activeProject;
      const scenePositionChanges = positionChanges.filter((change) =>
        activeProject?.scenes.some((scene) => scene.id === change.id),
      );

      if (scenePositionChanges.length === 0) {
        return;
      }

      useWorkspaceStore.getState().updateActiveProject((project) => {
        const scenes = project.scenes.map((scene) => {
          const change = scenePositionChanges.find((item) => item.id === scene.id);

          return change ? { ...scene, position: change.position } : scene;
        });
        const movedSceneGroupIds = new Set(
          scenes
            .filter((scene) => scenePositionChanges.some((change) => change.id === scene.id))
            .map((scene) => scene.groupId)
            .filter((groupId): groupId is string => groupId !== null),
        );

        return {
          ...project,
          scenes,
          groups: updateGroupBoundsForSceneMembership({ ...project, scenes }, movedSceneGroupIds),
        };
      });
    }
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    const removedEdgeIds = changes
      .filter((change) => change.type === 'remove')
      .map((change) => change.id);

    if (removedEdgeIds.length > 0) {
      updateActiveProject((scenes) =>
        scenes.map((scene) => ({
          ...scene,
          choices: scene.choices.map((choice) =>
            removedEdgeIds.includes(`${scene.id}:${choice.id}`)
              ? { ...choice, targetSceneId: null }
              : choice,
          ),
        })),
      );
    }

    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
    get().syncFromProject();
  },
  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    updateActiveProject((scenes) =>
      scenes.map((scene) => {
        if (scene.id !== connection.source) {
          return scene;
        }

        const targetScene = scenes.find((item) => item.id === connection.target);
        const choiceText = targetScene ? `Go to ${targetScene.name}` : 'New choice';

        return {
          ...scene,
          choices: [...scene.choices, createChoice(choiceText, connection.target)],
        };
      }),
    );
    get().syncFromProject();
  },
  addScene: (name: string) => {
    const activeProject = useWorkspaceStore.getState().activeProject;

    if (!activeProject) {
      return;
    }

    const existingScenes = activeProject.scenes;
    const nextIndex = existingScenes.length;
    const scene = createScene(name, {
      x: 80 + (nextIndex % 4) * 280,
      y: 80 + Math.floor(nextIndex / 4) * 190,
    });

    useWorkspaceStore.getState().updateActiveProject((project) => ({
      ...project,
      startSceneId: project.startSceneId || scene.id,
      scenes: [...project.scenes, scene],
    }));

    set({
      selectedSceneId: scene.id,
      selectedSceneIds: [scene.id],
      selectedGroupId: null,
      selectedChoiceId: null,
      activeView: 'editor',
    });
    get().syncFromProject();
  },
  deleteScene: (id: string) => {
    useWorkspaceStore.getState().updateActiveProject((project) => {
      const scenes = project.scenes
        .filter((scene) => scene.id !== id)
        .map((scene) => ({
          ...scene,
          background:
            scene.background.mode === 'scene_reference' && scene.background.sourceSceneId === id
              ? createEmptyBackground()
              : scene.background,
          choices: scene.choices.map((choice) =>
            choice.targetSceneId === id ? { ...choice, targetSceneId: null } : choice,
          ),
        }));

      return {
        ...project,
        startSceneId: project.startSceneId === id ? scenes[0]?.id ?? '' : project.startSceneId,
        scenes,
      };
    });

    set({
      selectedSceneId: null,
      selectedSceneIds: [],
      selectedGroupId: null,
      selectedChoiceId: null,
      activeView: 'canvas',
    });
    get().syncFromProject();
  },
  selectScene: (id: string | null) => {
    const selectedSceneIds = id ? [id] : [];

    set((state) => ({
      selectedSceneId: id,
      selectedSceneIds,
      selectedGroupId: null,
      selectedChoiceId: null,
      activeView: id ? 'editor' : 'canvas',
      nodes: state.nodes.map((node) => ({
        ...node,
        selected: node.id === id,
      })),
    }));
  },
  selectScenes: (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids));

    set((state) => ({
      selectedSceneIds: uniqueIds,
      selectedSceneId: uniqueIds.length === 1 ? uniqueIds[0] : null,
      selectedGroupId: null,
      selectedChoiceId: null,
      activeView: uniqueIds.length === 1 ? 'editor' : 'canvas',
      nodes: state.nodes.map((node) => ({
        ...node,
        selected: uniqueIds.includes(node.id),
      })),
    }));
  },
  selectGroup: (id: string | null) => {
    const activeProject = useWorkspaceStore.getState().activeProject;
    const selectedGroupId = id && activeProject?.groups.some((group) => group.id === id) ? id : null;

    set((state) => ({
      selectedSceneId: null,
      selectedSceneIds: [],
      selectedGroupId,
      selectedChoiceId: null,
      activeView: 'canvas',
      nodes: state.nodes.map((node) => ({
        ...node,
        selected: selectedGroupId !== null && node.id === getGroupNodeId(selectedGroupId),
      })),
    }));
  },
  selectChoice: (sceneId: string, choiceId: string) => {
    set({
      selectedSceneId: sceneId,
      selectedSceneIds: [sceneId],
      selectedGroupId: null,
      selectedChoiceId: choiceId,
      activeView: 'editor',
    });
  },
  clearSelectedChoice: () => {
    set({
      selectedChoiceId: null,
    });
  },
  openEditor: (id: string) => {
    set((state) => ({
      selectedSceneId: id,
      selectedSceneIds: [id],
      selectedGroupId: null,
      selectedChoiceId: null,
      activeView: 'editor',
      nodes: state.nodes.map((node) => ({
        ...node,
        selected: node.id === id,
      })),
    }));
  },
  groupSelectedScenes: () => {
    const activeProject = useWorkspaceStore.getState().activeProject;

    if (!activeProject) {
      return;
    }

    const selectedSceneIdSet = new Set(get().selectedSceneIds);
    const selectedScenes = activeProject.scenes.filter((scene) => selectedSceneIdSet.has(scene.id));

    if (selectedScenes.length < 2) {
      return;
    }

    const groupId = createId('group');
    const bounds = computeSceneGroupBounds(selectedScenes);
    const affectedGroupIds = new Set(
      selectedScenes
        .map((scene) => scene.groupId)
        .filter((existingGroupId): existingGroupId is string => existingGroupId !== null),
    );
    affectedGroupIds.add(groupId);

    useWorkspaceStore.getState().updateActiveProject((project) => {
      const groups = [
        ...project.groups,
        {
          id: groupId,
          name: 'New Group',
          color: '#38bdf8',
          collapsed: false,
          position: bounds.position,
          size: bounds.size,
        },
      ];
      const scenes = project.scenes.map((scene) =>
        selectedSceneIdSet.has(scene.id) ? { ...scene, groupId } : scene,
      );
      const nextProject = {
        ...project,
        groups,
        scenes,
      };

      return {
        ...nextProject,
        groups: finalizeSceneGroupMembership(nextProject, affectedGroupIds),
      };
    });

    set({
      selectedSceneId: null,
      selectedSceneIds: [],
      selectedGroupId: groupId,
      selectedChoiceId: null,
      activeView: 'canvas',
    });
    get().syncFromProject();
  },
  ungroupSelectedGroup: () => {
    const activeProject = useWorkspaceStore.getState().activeProject;
    const selectedGroupId = get().selectedGroupId;

    if (!activeProject || !selectedGroupId) {
      return;
    }

    const group = activeProject.groups.find((item) => item.id === selectedGroupId);

    if (!group) {
      return;
    }

    useWorkspaceStore.getState().updateActiveProject((project) => {
      const nextProject = {
        ...project,
        groups: project.groups.filter((item) => item.id !== selectedGroupId),
        scenes: project.scenes.map((scene) =>
          scene.groupId === selectedGroupId ? { ...scene, groupId: null } : scene,
        ),
      };

      return {
        ...nextProject,
        groups: finalizeSceneGroupMembership(nextProject, new Set()),
      };
    });

    set({
      selectedSceneId: null,
      selectedSceneIds: [],
      selectedGroupId: null,
      selectedChoiceId: null,
      activeView: 'canvas',
    });
    get().syncFromProject();
  },
  updateSceneGroupName: (groupId: string, name: string) => {
    const nextName = name.trim() || 'Untitled Group';

    useWorkspaceStore.getState().updateActiveProject((project) => ({
      ...project,
      groups: project.groups.map((group) =>
        group.id === groupId ? { ...group, name: nextName } : group,
      ),
    }));
    get().syncFromProject();
  },
  updateSceneGroupCollapsed: (groupId: string, collapsed: boolean) => {
    useWorkspaceStore.getState().updateActiveProject((project) => ({
      ...project,
      groups: project.groups.map((group) =>
        group.id === groupId ? { ...group, collapsed } : group,
      ),
    }));
    set({
      selectedSceneId: null,
      selectedSceneIds: [],
      selectedGroupId: groupId,
      selectedChoiceId: null,
      activeView: 'canvas',
    });
    get().syncFromProject();
  },
  syncFromProject: () => {
    const activeProject = useWorkspaceStore.getState().activeProject;
    const selectedSceneId = get().selectedSceneId;
    const selectedSceneIds =
      selectedSceneId && get().selectedSceneIds.length === 0
        ? [selectedSceneId]
        : get().selectedSceneIds;
    const selectedGroupId = get().selectedGroupId;

    if (!activeProject) {
      set({
        nodes: [],
        edges: [],
        selectedSceneId: null,
        selectedSceneIds: [],
        selectedGroupId: null,
        selectedChoiceId: null,
        activeView: 'canvas',
      });
      return;
    }

    const selectedScene = activeProject.scenes.find((scene) => scene.id === selectedSceneId);
    const selectedSceneExists =
      selectedScene !== undefined && shouldRenderSceneNode(selectedScene, activeProject.groups);
    const nextSelectedSceneId = selectedSceneExists ? selectedSceneId : null;
    const nextSelectedSceneIds = selectedSceneIds.filter((id) => {
      const scene = activeProject.scenes.find((item) => item.id === id);

      return scene ? shouldRenderSceneNode(scene, activeProject.groups) : false;
    });
    const nextSelectedGroupId = activeProject.groups.some((group) => group.id === selectedGroupId)
      ? selectedGroupId
      : null;
    const selectedChoiceId = get().selectedChoiceId;
    const selectedChoiceExists = activeProject.scenes.some(
      (scene) =>
        scene.id === nextSelectedSceneId &&
        scene.choices.some((choice) => choice.id === selectedChoiceId),
    );

    set({
      nodes: buildNodes(
        activeProject.scenes,
        activeProject.groups,
        activeProject.assetLibrary,
        nextSelectedSceneIds,
        nextSelectedGroupId,
      ),
      edges: buildEdges(activeProject.scenes, activeProject.groups),
      selectedSceneId: nextSelectedSceneId,
      selectedSceneIds: nextSelectedSceneIds,
      selectedGroupId: nextSelectedGroupId,
      selectedChoiceId: selectedChoiceExists ? selectedChoiceId : null,
      activeView: nextSelectedSceneId && !nextSelectedGroupId ? get().activeView : 'canvas',
    });
  },
  updateSceneName: (sceneId: string, name: string) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) => (scene.id === sceneId ? { ...scene, name } : scene)),
    );
    get().syncFromProject();
  },
  updateSceneBackground: (sceneId: string, background: SceneBackground) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) => (scene.id === sceneId ? { ...scene, background } : scene)),
    );
    get().syncFromProject();
  },
  addBackgroundAsset: (input) => {
    const asset = createBackgroundAsset(input);

    useWorkspaceStore.getState().updateActiveProject((project) => ({
      ...project,
      assetLibrary: [...project.assetLibrary, asset],
    }));
    get().syncFromProject();
  },
  deleteBackgroundAsset: (assetId) => {
    useWorkspaceStore.getState().updateActiveProject((project) => ({
      ...project,
      assetLibrary: project.assetLibrary.filter((asset) => asset.id !== assetId),
      scenes: project.scenes.map((scene) =>
        scene.background.mode === 'asset' && scene.background.assetId === assetId
          ? { ...scene, background: createEmptyBackground() }
          : scene,
      ),
    }));
    get().syncFromProject();
  },
  updateBackgroundAssetName: (assetId, name) => {
    useWorkspaceStore.getState().updateActiveProject((project) => ({
      ...project,
      assetLibrary: project.assetLibrary.map((asset) =>
        asset.id === assetId ? { ...asset, name: name.trim() || 'Untitled Background' } : asset,
      ),
    }));
    get().syncFromProject();
  },
  addDialoguePage: (sceneId: string) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) =>
        scene.id === sceneId
          ? { ...scene, dialoguePages: [...scene.dialoguePages, createDialoguePage('')] }
          : scene,
      ),
    );
    get().syncFromProject();
  },
  updateDialoguePage: (sceneId: string, pageId: string, text: string) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              dialoguePages: scene.dialoguePages.map((page) =>
                page.id === pageId ? { ...page, text } : page,
              ),
            }
          : scene,
      ),
    );
    get().syncFromProject();
  },
  updateDialoguePageSpeaker: (sceneId: string, pageId: string, speakerId: string | null) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              dialoguePages: scene.dialoguePages.map((page) =>
                page.id === pageId ? { ...page, speakerId } : page,
              ),
            }
          : scene,
      ),
    );
    get().syncFromProject();
  },
  moveDialoguePageUp: (sceneId: string, pageId: string) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              dialoguePages: moveDialoguePage(scene.dialoguePages, pageId, -1),
            }
          : scene,
      ),
    );
    get().syncFromProject();
  },
  moveDialoguePageDown: (sceneId: string, pageId: string) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              dialoguePages: moveDialoguePage(scene.dialoguePages, pageId, 1),
            }
          : scene,
      ),
    );
    get().syncFromProject();
  },
  deleteDialoguePage: (sceneId: string, pageId: string) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) =>
        scene.id === sceneId && scene.dialoguePages.length > 1
          ? {
              ...scene,
              dialoguePages: scene.dialoguePages.filter((page) => page.id !== pageId),
            }
          : scene,
      ),
    );
    get().syncFromProject();
  },
  addChoice: (sceneId: string) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) =>
        scene.id === sceneId ? { ...scene, choices: [...scene.choices, createChoice('New choice')] } : scene,
      ),
    );
    get().syncFromProject();
  },
  copyChoice: (sceneId: string, choiceId: string) => {
    const activeProject = useWorkspaceStore.getState().activeProject;
    const choice = activeProject?.scenes
      .find((scene) => scene.id === sceneId)
      ?.choices.find((item) => item.id === choiceId);

    if (!activeProject || !choice) {
      return;
    }

    set({
      copiedChoice: cloneChoice(choice),
      copiedChoiceProjectId: activeProject.id,
    });
  },
  copySelectedChoice: () => {
    const { selectedSceneId, selectedChoiceId } = get();

    if (!selectedSceneId || !selectedChoiceId) {
      return;
    }

    get().copyChoice(selectedSceneId, selectedChoiceId);
  },
  pasteChoice: (sceneId: string) => {
    const activeProject = useWorkspaceStore.getState().activeProject;
    const { copiedChoice, copiedChoiceProjectId } = get();

    if (!activeProject || !copiedChoice || copiedChoiceProjectId !== activeProject.id) {
      return;
    }

    const pastedChoice = cloneChoiceWithNewIds(copiedChoice);

    updateActiveProject((scenes) =>
      scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              choices: [...scene.choices, pastedChoice],
            }
          : scene,
      ),
    );
    set({
      selectedSceneId: sceneId,
      selectedSceneIds: [sceneId],
      selectedGroupId: null,
      selectedChoiceId: pastedChoice.id,
      activeView: 'editor',
    });
    get().syncFromProject();
  },
  updateChoiceText: (sceneId: string, choiceId: string, text: string) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              choices: scene.choices.map((choice) =>
                choice.id === choiceId ? { ...choice, text } : choice,
              ),
            }
          : scene,
      ),
    );
    get().syncFromProject();
  },
  updateChoiceTarget: (sceneId: string, choiceId: string, targetSceneId: string | null) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              choices: scene.choices.map((choice) =>
                choice.id === choiceId ? { ...choice, targetSceneId } : choice,
              ),
            }
          : scene,
      ),
    );
    get().syncFromProject();
  },
  deleteChoice: (sceneId: string, choiceId: string) => {
    updateActiveProject((scenes) =>
      scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              choices: scene.choices.filter((choice) => choice.id !== choiceId),
            }
          : scene,
      ),
    );
    get().syncFromProject();
  },
}));
