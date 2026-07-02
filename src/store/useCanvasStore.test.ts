import { beforeEach, describe, expect, it } from 'vitest';
import type { Choice, Project, Scene, SceneGroup } from '../types';
import { validateProject } from '../features/validation/projectValidation';
import { createEmptyProjectHistory } from './projectHistory';
import { useCanvasStore } from './useCanvasStore';
import { useWorkspaceStore } from './workspaceStore';

function createScene(
  id: string,
  choices: Choice[] = [],
  input: Partial<Pick<Scene, 'position' | 'groupId'>> = {},
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
    choices,
    groupId: input.groupId ?? null,
  };
}

function createGroup(id: string, input: Partial<SceneGroup> = {}): SceneGroup {
  return {
    id,
    name: 'Existing Group',
    color: '#38bdf8',
    position: { x: 12, y: 34 },
    size: { width: 500, height: 300 },
    collapsed: false,
    ...input,
  };
}

function createChoice(input: Partial<Choice> = {}): Choice {
  return {
    id: 'choice-original',
    text: 'Open the gate',
    targetSceneId: 'scene-target',
    conditionGroups: [
      {
        id: 'condition-group-original',
        conditions: [
          {
            id: 'condition-resource-original',
            type: 'resource',
            targetId: 'resource-gold',
            operator: '>=',
            value: 3,
            hintText: 'Need more gold.',
          },
          {
            id: 'condition-character-original',
            type: 'character_attr',
            targetId: 'character-hero',
            attribute: 'courage',
            operator: '>=',
            value: 1,
            hintText: 'Find courage first.',
          },
        ],
      },
    ],
    effects: [
      {
        id: 'effect-variable-original',
        type: 'variable',
        targetId: 'variable-opened-gate',
        operation: '=',
        value: 1,
      },
      {
        id: 'effect-character-original',
        type: 'character_attr',
        targetId: 'character-hero',
        attribute: 'courage',
        operation: '+=',
        value: 2,
      },
    ],
    ...input,
  };
}

function createProject(id = 'project-1'): Project {
  const choice = createChoice();

  return {
    id,
    name: 'Test Project',
    thumbnail: null,
    startSceneId: 'scene-start',
    scenes: [
      createScene('scene-start', [choice], { position: { x: 100, y: 200 } }),
      createScene('scene-target', [], { position: { x: 500, y: 420 } }),
    ],
    characters: [
      {
        id: 'character-hero',
        name: 'Hero',
        attributes: [{ key: 'courage', defaultValue: 1 }],
      },
    ],
    resources: [
      {
        id: 'resource-gold',
        key: 'gold',
        displayName: 'Gold',
        icon: 'coins',
        visible: true,
        defaultValue: 5,
      },
    ],
    variables: [
      {
        id: 'variable-opened-gate',
        key: 'opened_gate',
        defaultValue: 0,
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

function setActiveProject(project: Project) {
  useWorkspaceStore.setState({
    projects: [],
    activeProjectId: project.id,
    activeProject: project,
    projectHistory: createEmptyProjectHistory(project.id),
  });
  useCanvasStore.setState({
    selectedSceneId: 'scene-start',
    selectedSceneIds: ['scene-start'],
    selectedGroupId: null,
    selectedChoiceId: null,
    copiedChoice: null,
    copiedChoiceProjectId: null,
    activeView: 'editor',
  });
  useCanvasStore.getState().syncFromProject();
}

function getStartScene(project: Project) {
  const scene = project.scenes.find((item) => item.id === 'scene-start');

  if (!scene) {
    throw new Error('Missing start scene');
  }

  return scene;
}

describe('choice copy and paste', () => {
  beforeEach(() => {
    setActiveProject(createProject());
  });

  it('copies the selected choice into the in-memory clipboard without creating undo history', () => {
    useCanvasStore.setState({ selectedChoiceId: 'choice-original' });

    useCanvasStore.getState().copySelectedChoice();

    expect(useCanvasStore.getState().copiedChoice).toEqual(createChoice());
    expect(useCanvasStore.getState().copiedChoice).not.toBe(
      getStartScene(useWorkspaceStore.getState().activeProject as Project).choices[0],
    );
    expect(useWorkspaceStore.getState().projectHistory.undoStack).toHaveLength(0);
  });

  it('pastes a copied choice at the end of the current scene and creates undo history', () => {
    useCanvasStore.getState().copyChoice('scene-start', 'choice-original');

    useCanvasStore.getState().pasteChoice('scene-start');

    const project = useWorkspaceStore.getState().activeProject as Project;
    const choices = getStartScene(project).choices;

    expect(choices).toHaveLength(2);
    expect(choices[1].text).toBe('Open the gate');
    expect(useWorkspaceStore.getState().projectHistory.undoStack).toHaveLength(1);
    expect(useCanvasStore.getState().selectedChoiceId).toBe(choices[1].id);
  });

  it('regenerates choice, condition group, condition, and effect ids when pasting', () => {
    useCanvasStore.getState().copyChoice('scene-start', 'choice-original');
    useCanvasStore.getState().pasteChoice('scene-start');

    const choices = getStartScene(useWorkspaceStore.getState().activeProject as Project).choices;
    const original = choices[0];
    const pasted = choices[1];

    expect(pasted.id).not.toBe(original.id);
    expect(pasted.conditionGroups[0].id).not.toBe(original.conditionGroups[0].id);
    expect(pasted.conditionGroups[0].conditions.map((condition) => condition.id)).not.toEqual(
      original.conditionGroups[0].conditions.map((condition) => condition.id),
    );
    expect(pasted.effects.map((effect) => effect.id)).not.toEqual(
      original.effects.map((effect) => effect.id),
    );
  });

  it('preserves Story Logic references and keeps validation passing after paste', () => {
    useCanvasStore.getState().copyChoice('scene-start', 'choice-original');
    useCanvasStore.getState().pasteChoice('scene-start');

    const project = useWorkspaceStore.getState().activeProject as Project;
    const choices = getStartScene(project).choices;
    const pasted = choices[1];

    expect(pasted.targetSceneId).toBe('scene-target');
    expect(pasted.conditionGroups[0].conditions.map((condition) => condition.targetId)).toEqual([
      'resource-gold',
      'character-hero',
    ]);
    expect(pasted.conditionGroups[0].conditions.map((condition) => condition.hintText)).toEqual([
      'Need more gold.',
      'Find courage first.',
    ]);
    expect(pasted.effects.map((effect) => effect.targetId)).toEqual([
      'variable-opened-gate',
      'character-hero',
    ]);
    expect(validateProject(project)).toEqual([]);
  });

  it('does not paste a clipboard copied from another project', () => {
    useCanvasStore.getState().copyChoice('scene-start', 'choice-original');
    setActiveProject(createProject('project-2'));
    useCanvasStore.setState({
      copiedChoice: createChoice(),
      copiedChoiceProjectId: 'project-1',
    });

    useCanvasStore.getState().pasteChoice('scene-start');

    const choices = getStartScene(useWorkspaceStore.getState().activeProject as Project).choices;

    expect(choices).toHaveLength(1);
    expect(useWorkspaceStore.getState().projectHistory.undoStack).toHaveLength(0);
  });
});

describe('scene groups', () => {
  beforeEach(() => {
    setActiveProject(createProject());
  });

  it('creates a group for selected scenes and assigns scene group ids', () => {
    useCanvasStore.getState().selectScenes(['scene-start', 'scene-target']);

    useCanvasStore.getState().groupSelectedScenes();

    const project = useWorkspaceStore.getState().activeProject as Project;
    const group = project.groups[0];

    expect(project.groups).toHaveLength(1);
    expect(group.id).toMatch(/^group_/);
    expect(project.scenes.map((scene) => scene.groupId)).toEqual([group.id, group.id]);
    expect(useCanvasStore.getState().selectedSceneIds).toEqual([]);
    expect(useCanvasStore.getState().selectedGroupId).toBe(group.id);
  });

  it('initializes group bounds and default values from selected scenes', () => {
    useCanvasStore.getState().selectScenes(['scene-start', 'scene-target']);

    useCanvasStore.getState().groupSelectedScenes();

    const project = useWorkspaceStore.getState().activeProject as Project;
    const group = project.groups[0];

    expect(group).toMatchObject({
      name: 'New Group',
      color: '#38bdf8',
      collapsed: false,
      position: { x: 68, y: 168 },
      size: { width: 704, height: 444 },
    });
  });

  it('preserves Story Logic when grouping scenes', () => {
    const originalChoice = createChoice();
    useCanvasStore.getState().selectScenes(['scene-start', 'scene-target']);

    useCanvasStore.getState().groupSelectedScenes();

    const project = useWorkspaceStore.getState().activeProject as Project;
    const choice = getStartScene(project).choices[0];

    expect(choice).toEqual(originalChoice);
    expect(validateProject(project)).toEqual([]);
  });

  it('creates one undo snapshot when creating a group', () => {
    useCanvasStore.getState().selectScenes(['scene-start', 'scene-target']);

    useCanvasStore.getState().groupSelectedScenes();

    expect(useWorkspaceStore.getState().projectHistory.undoStack).toHaveLength(1);
  });

  it('ungroups the selected group and restores member scene group ids to null', () => {
    useCanvasStore.getState().selectScenes(['scene-start', 'scene-target']);
    useCanvasStore.getState().groupSelectedScenes();
    const groupId = (useWorkspaceStore.getState().activeProject as Project).groups[0].id;

    useCanvasStore.getState().ungroupSelectedGroup();

    const project = useWorkspaceStore.getState().activeProject as Project;

    expect(project.groups).toEqual([]);
    expect(project.scenes.map((scene) => scene.groupId)).toEqual([null, null]);
    expect(project.scenes.map((scene) => scene.position)).toEqual([
      { x: 100, y: 200 },
      { x: 500, y: 420 },
    ]);
    expect(useCanvasStore.getState().selectedGroupId).toBeNull();
    expect(groupId).toMatch(/^group_/);
  });

  it('creates one undo snapshot when ungrouping', () => {
    const group = createGroup('group-existing');
    const project = {
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-start', [createChoice()], {
          position: { x: 100, y: 200 },
          groupId: group.id,
        }),
        createScene('scene-target', [], {
          position: { x: 500, y: 420 },
          groupId: group.id,
        }),
      ],
    };
    setActiveProject(project);
    useCanvasStore.getState().selectGroup(group.id);

    useCanvasStore.getState().ungroupSelectedGroup();

    expect(useWorkspaceStore.getState().projectHistory.undoStack).toHaveLength(1);
  });

  it('does not create undo history for selection changes', () => {
    useCanvasStore.getState().selectScenes(['scene-start', 'scene-target']);
    useCanvasStore.getState().selectScene('scene-start');
    useCanvasStore.getState().selectGroup('group-missing');
    useCanvasStore.getState().selectScene(null);

    expect(useWorkspaceStore.getState().projectHistory.undoStack).toHaveLength(0);
  });

  it('renames a group without changing other group fields', () => {
    const group = createGroup('group-existing');
    const project = {
      ...createProject(),
      groups: [group],
    };
    setActiveProject(project);

    useCanvasStore.getState().updateSceneGroupName(group.id, 'Chapter 1');

    const renamedGroup = (useWorkspaceStore.getState().activeProject as Project).groups[0];

    expect(renamedGroup).toEqual({
      ...group,
      name: 'Chapter 1',
    });
  });

  it('creates one undo snapshot when renaming a group', () => {
    const group = createGroup('group-existing');
    setActiveProject({
      ...createProject(),
      groups: [group],
    });

    useCanvasStore.getState().updateSceneGroupName(group.id, 'Chapter 1');

    expect(useWorkspaceStore.getState().projectHistory.undoStack).toHaveLength(1);
  });

  it('updates group bounds when a grouped scene moves', () => {
    const group = createGroup('group-existing');
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-start', [createChoice()], {
          position: { x: 100, y: 200 },
          groupId: group.id,
        }),
        createScene('scene-target', [], {
          position: { x: 500, y: 420 },
          groupId: group.id,
        }),
      ],
    });

    useCanvasStore.getState().onNodesChange([
      {
        type: 'position',
        id: 'scene-start',
        position: { x: 900, y: 100 },
      },
    ]);

    const project = useWorkspaceStore.getState().activeProject as Project;

    expect(project.groups[0]).toMatchObject({
      position: { x: 468, y: 68 },
      size: { width: 704, height: 544 },
    });
  });

  it('preserves Story Logic when updating group bounds after a scene move', () => {
    const group = createGroup('group-existing');
    const originalChoice = createChoice();
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-start', [originalChoice], {
          position: { x: 100, y: 200 },
          groupId: group.id,
        }),
        createScene('scene-target', [], {
          position: { x: 500, y: 420 },
          groupId: group.id,
        }),
      ],
    });

    useCanvasStore.getState().onNodesChange([
      {
        type: 'position',
        id: 'scene-start',
        position: { x: 900, y: 100 },
      },
    ]);

    const project = useWorkspaceStore.getState().activeProject as Project;

    expect(getStartScene(project).choices[0]).toEqual(originalChoice);
    expect(validateProject(project)).toEqual([]);
  });

  it('creates one undo snapshot when updating group bounds after a scene move', () => {
    const group = createGroup('group-existing');
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-start', [createChoice()], {
          position: { x: 100, y: 200 },
          groupId: group.id,
        }),
        createScene('scene-target', [], {
          position: { x: 500, y: 420 },
          groupId: group.id,
        }),
      ],
    });

    useCanvasStore.getState().onNodesChange([
      {
        type: 'position',
        id: 'scene-start',
        position: { x: 900, y: 100 },
      },
    ]);

    expect(useWorkspaceStore.getState().projectHistory.undoStack).toHaveLength(1);
  });

  it('does not render member scene nodes for a collapsed group', () => {
    const group = createGroup('group-existing', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-start', [createChoice()], {
          groupId: group.id,
        }),
        createScene('scene-target', [], {
          groupId: group.id,
        }),
      ],
    });

    const nodeIds = useCanvasStore.getState().nodes.map((node) => node.id);

    expect(nodeIds).not.toContain('scene-start');
    expect(nodeIds).not.toContain('scene-target');
  });

  it('renders one collapsed group node with a stable group node id', () => {
    const group = createGroup('group-existing', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-start', [createChoice()], { groupId: group.id }),
        createScene('scene-target', [], { groupId: group.id }),
      ],
    });

    const groupNodes = useCanvasStore
      .getState()
      .nodes.filter((node) => node.type === 'sceneGroup');

    expect(groupNodes).toHaveLength(1);
    expect(groupNodes[0].id).toBe('group:group-existing');
    expect(groupNodes[0].position).toEqual(group.position);
  });

  it('keeps expanded group frame behavior for expanded groups', () => {
    const group = createGroup('group-existing');
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-start', [createChoice()], { groupId: group.id }),
        createScene('scene-target', [], { groupId: group.id }),
      ],
    });

    const nodes = useCanvasStore.getState().nodes;

    expect(nodes.some((node) => node.id === 'group:group-existing' && node.type === 'sceneGroupFrame')).toBe(true);
    expect(nodes.some((node) => node.id === 'scene-start')).toBe(true);
    expect(nodes.some((node) => node.id === 'scene-target')).toBe(true);
    expect(nodes.some((node) => node.type === 'sceneGroup')).toBe(false);
  });

  it('collapse updates only SceneGroup.collapsed', () => {
    const group = createGroup('group-existing');
    setActiveProject({
      ...createProject(),
      groups: [group],
    });

    useCanvasStore.getState().updateSceneGroupCollapsed(group.id, true);

    expect((useWorkspaceStore.getState().activeProject as Project).groups[0]).toEqual({
      ...group,
      collapsed: true,
    });
  });

  it('expand updates only SceneGroup.collapsed', () => {
    const group = createGroup('group-existing', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [group],
    });

    useCanvasStore.getState().updateSceneGroupCollapsed(group.id, false);

    expect((useWorkspaceStore.getState().activeProject as Project).groups[0]).toEqual({
      ...group,
      collapsed: false,
    });
  });

  it('creates one undo snapshot when collapsing a group', () => {
    const group = createGroup('group-existing');
    setActiveProject({
      ...createProject(),
      groups: [group],
    });

    useCanvasStore.getState().updateSceneGroupCollapsed(group.id, true);

    expect(useWorkspaceStore.getState().projectHistory.undoStack).toHaveLength(1);
  });

  it('creates one undo snapshot when expanding a group', () => {
    const group = createGroup('group-existing', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [group],
    });

    useCanvasStore.getState().updateSceneGroupCollapsed(group.id, false);

    expect(useWorkspaceStore.getState().projectHistory.undoStack).toHaveLength(1);
  });

  it('ungroups a collapsed group and restores member scene visibility', () => {
    const group = createGroup('group-existing', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-start', [createChoice()], { groupId: group.id }),
        createScene('scene-target', [], { groupId: group.id }),
      ],
    });
    useCanvasStore.getState().selectGroup(group.id);

    useCanvasStore.getState().ungroupSelectedGroup();

    const project = useWorkspaceStore.getState().activeProject as Project;
    const nodeIds = useCanvasStore.getState().nodes.map((node) => node.id);

    expect(project.groups).toEqual([]);
    expect(project.scenes.map((scene) => scene.groupId)).toEqual([null, null]);
    expect(nodeIds).toContain('scene-start');
    expect(nodeIds).toContain('scene-target');
  });

  it('preserves Story Logic after collapse, expand, and ungroup', () => {
    const group = createGroup('group-existing');
    const originalChoice = createChoice();
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-start', [originalChoice], { groupId: group.id }),
        createScene('scene-target', [], { groupId: group.id }),
      ],
    });

    useCanvasStore.getState().updateSceneGroupCollapsed(group.id, true);
    useCanvasStore.getState().updateSceneGroupCollapsed(group.id, false);
    useCanvasStore.getState().ungroupSelectedGroup();

    const project = useWorkspaceStore.getState().activeProject as Project;

    expect(getStartScene(project).choices[0]).toEqual(originalChoice);
    expect(validateProject(project)).toEqual([]);
  });

  it('projects expanded to expanded edges as scene to scene', () => {
    setActiveProject({
      ...createProject(),
      scenes: [
        createScene('scene-a', [createChoice({ id: 'choice-a', targetSceneId: 'scene-b' })]),
        createScene('scene-b'),
      ],
    });

    expect(useCanvasStore.getState().edges).toMatchObject([
      {
        id: 'scene-a:choice-a',
        source: 'scene-a',
        target: 'scene-b',
      },
    ]);
  });

  it('hides edges inside the same collapsed group', () => {
    const group = createGroup('group-a', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-a', [createChoice({ id: 'choice-a', targetSceneId: 'scene-b' })], {
          groupId: group.id,
        }),
        createScene('scene-b', [], { groupId: group.id }),
      ],
    });

    expect(useCanvasStore.getState().edges).toEqual([]);
  });

  it('projects inside collapsed group to outside as group to scene', () => {
    const group = createGroup('group-a', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-a', [createChoice({ id: 'choice-a', targetSceneId: 'scene-b' })], {
          groupId: group.id,
        }),
        createScene('scene-b'),
      ],
    });

    expect(useCanvasStore.getState().edges).toMatchObject([
      {
        id: 'scene-a:choice-a',
        source: 'group:group-a',
        target: 'scene-b',
      },
    ]);
  });

  it('projects outside to inside collapsed group as scene to group', () => {
    const group = createGroup('group-b', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-a', [createChoice({ id: 'choice-a', targetSceneId: 'scene-b' })]),
        createScene('scene-b', [], { groupId: group.id }),
      ],
    });

    expect(useCanvasStore.getState().edges).toMatchObject([
      {
        id: 'scene-a:choice-a',
        source: 'scene-a',
        target: 'group:group-b',
      },
    ]);
  });

  it('projects between different collapsed groups as group to group', () => {
    const sourceGroup = createGroup('group-a', { collapsed: true });
    const targetGroup = createGroup('group-b', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [sourceGroup, targetGroup],
      scenes: [
        createScene('scene-a', [createChoice({ id: 'choice-a', targetSceneId: 'scene-b' })], {
          groupId: sourceGroup.id,
        }),
        createScene('scene-b', [], { groupId: targetGroup.id }),
      ],
    });

    expect(useCanvasStore.getState().edges).toMatchObject([
      {
        id: 'scene-a:choice-a',
        source: 'group:group-a',
        target: 'group:group-b',
      },
    ]);
  });

  it('projects expanded to collapsed as scene to group', () => {
    const sourceGroup = createGroup('group-a');
    const targetGroup = createGroup('group-b', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [sourceGroup, targetGroup],
      scenes: [
        createScene('scene-a', [createChoice({ id: 'choice-a', targetSceneId: 'scene-b' })], {
          groupId: sourceGroup.id,
        }),
        createScene('scene-b', [], { groupId: targetGroup.id }),
      ],
    });

    expect(useCanvasStore.getState().edges).toMatchObject([
      {
        id: 'scene-a:choice-a',
        source: 'scene-a',
        target: 'group:group-b',
      },
    ]);
  });

  it('projects collapsed to expanded as group to scene', () => {
    const sourceGroup = createGroup('group-a', { collapsed: true });
    const targetGroup = createGroup('group-b');
    setActiveProject({
      ...createProject(),
      groups: [sourceGroup, targetGroup],
      scenes: [
        createScene('scene-a', [createChoice({ id: 'choice-a', targetSceneId: 'scene-b' })], {
          groupId: sourceGroup.id,
        }),
        createScene('scene-b', [], { groupId: targetGroup.id }),
      ],
    });

    expect(useCanvasStore.getState().edges).toMatchObject([
      {
        id: 'scene-a:choice-a',
        source: 'group:group-a',
        target: 'scene-b',
      },
    ]);
  });

  it('keeps duplicate projected edges separate', () => {
    const targetGroup = createGroup('group-b', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [targetGroup],
      scenes: [
        createScene('scene-a', [
          createChoice({ id: 'choice-one', text: 'First route', targetSceneId: 'scene-b' }),
          createChoice({ id: 'choice-two', text: 'Second route', targetSceneId: 'scene-c' }),
        ]),
        createScene('scene-b', [], { groupId: targetGroup.id }),
        createScene('scene-c', [], { groupId: targetGroup.id }),
      ],
    });

    expect(useCanvasStore.getState().edges).toMatchObject([
      {
        id: 'scene-a:choice-one',
        source: 'scene-a',
        target: 'group:group-b',
      },
      {
        id: 'scene-a:choice-two',
        source: 'scene-a',
        target: 'group:group-b',
      },
    ]);
  });

  it('preserves edge labels from original choice text', () => {
    const group = createGroup('group-b', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-a', [
          createChoice({ id: 'choice-a', text: 'Take the hidden road', targetSceneId: 'scene-b' }),
        ]),
        createScene('scene-b', [], { groupId: group.id }),
      ],
    });

    expect(useCanvasStore.getState().edges[0].label).toBe('Take the hidden road');
  });

  it('does not mutate Choice.targetSceneId when projecting edges', () => {
    const group = createGroup('group-b', { collapsed: true });
    setActiveProject({
      ...createProject(),
      groups: [group],
      scenes: [
        createScene('scene-a', [createChoice({ id: 'choice-a', targetSceneId: 'scene-b' })]),
        createScene('scene-b', [], { groupId: group.id }),
      ],
    });

    const project = useWorkspaceStore.getState().activeProject as Project;
    const sourceScene = project.scenes.find((scene) => scene.id === 'scene-a');

    expect(sourceScene?.choices[0].targetSceneId).toBe('scene-b');
  });
});
