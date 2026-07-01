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

function createGroup(id: string): SceneGroup {
  return {
    id,
    name: 'Existing Group',
    color: '#38bdf8',
    position: { x: 12, y: 34 },
    size: { width: 500, height: 300 },
    collapsed: false,
  };
}

function createChoice(): Choice {
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
});
