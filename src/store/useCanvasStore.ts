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
import type { AssetLibraryItem, Choice, DialoguePage, Scene, SceneBackground } from '../types';
import { useWorkspaceStore } from './workspaceStore';

export type CanvasView = 'canvas' | 'editor';

export interface SceneNodeData {
  scene: Scene;
  scenes: Scene[];
  assetLibrary: AssetLibraryItem[];
}

interface AddBackgroundAssetInput {
  name: string;
  sourceType: 'upload' | 'url';
  url: string;
}

interface CanvasStore {
  nodes: Node<SceneNodeData>[];
  edges: Edge[];
  selectedSceneId: string | null;
  selectedChoiceId: string | null;
  activeView: CanvasView;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addScene: (name: string) => void;
  deleteScene: (id: string) => void;
  selectScene: (id: string | null) => void;
  selectChoice: (sceneId: string, choiceId: string) => void;
  clearSelectedChoice: () => void;
  openEditor: (id: string) => void;
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
  assetLibrary: AssetLibraryItem[],
  selectedSceneId: string | null,
): Node<SceneNodeData>[] {
  return scenes.map((scene) => ({
    id: scene.id,
    type: 'scene',
    position: scene.position,
    selected: scene.id === selectedSceneId,
    data: {
      scene,
      scenes,
      assetLibrary,
    },
  }));
}

function buildEdges(scenes: Scene[]): Edge[] {
  return scenes.flatMap((scene) =>
    scene.choices
      .filter((choice) => choice.targetSceneId)
      .map((choice) => ({
        id: `${scene.id}:${choice.id}`,
        source: scene.id,
        target: choice.targetSceneId as string,
        label: choice.text || 'Choice',
        animated: false,
        className: 'text-gray-200',
      })),
  );
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
  selectedChoiceId: null,
  copiedChoice: null,
  copiedChoiceProjectId: null,
  activeView: 'canvas',
  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));

    const positionChanges = changes.filter(
      (change): change is NodeChange & { id: string; position: { x: number; y: number } } =>
        change.type === 'position' && Boolean(change.position),
    );

    if (positionChanges.length > 0) {
      updateActiveProject((scenes) =>
        scenes.map((scene) => {
          const change = positionChanges.find((item) => item.id === scene.id);

          return change ? { ...scene, position: change.position } : scene;
        }),
      );
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
      selectedChoiceId: null,
      activeView: 'canvas',
    });
    get().syncFromProject();
  },
  selectScene: (id: string | null) => {
    set((state) => ({
      selectedSceneId: id,
      selectedChoiceId: null,
      activeView: id ? 'editor' : 'canvas',
      nodes: state.nodes.map((node) => ({
        ...node,
        selected: node.id === id,
      })),
    }));
  },
  selectChoice: (sceneId: string, choiceId: string) => {
    set({
      selectedSceneId: sceneId,
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
      selectedChoiceId: null,
      activeView: 'editor',
      nodes: state.nodes.map((node) => ({
        ...node,
        selected: node.id === id,
      })),
    }));
  },
  syncFromProject: () => {
    const activeProject = useWorkspaceStore.getState().activeProject;
    const selectedSceneId = get().selectedSceneId;

    if (!activeProject) {
      set({
        nodes: [],
        edges: [],
        selectedSceneId: null,
        selectedChoiceId: null,
        activeView: 'canvas',
      });
      return;
    }

    const selectedSceneExists = activeProject.scenes.some((scene) => scene.id === selectedSceneId);
    const nextSelectedSceneId = selectedSceneExists ? selectedSceneId : null;
    const selectedChoiceId = get().selectedChoiceId;
    const selectedChoiceExists = activeProject.scenes.some(
      (scene) =>
        scene.id === nextSelectedSceneId &&
        scene.choices.some((choice) => choice.id === selectedChoiceId),
    );

    set({
      nodes: buildNodes(activeProject.scenes, activeProject.assetLibrary, nextSelectedSceneId),
      edges: buildEdges(activeProject.scenes),
      selectedSceneId: nextSelectedSceneId,
      selectedChoiceId: selectedChoiceExists ? selectedChoiceId : null,
      activeView: nextSelectedSceneId ? get().activeView : 'canvas',
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
