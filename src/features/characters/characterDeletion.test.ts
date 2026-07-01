import { describe, expect, it } from 'vitest';
import type { Project, Scene } from '../../types';
import { deleteCharacterFromProject, findDialogueSpeakerUsages } from './characterDeletion';

function createProject(scenes: Scene[]): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    thumbnail: null,
    startSceneId: scenes[0]?.id ?? '',
    scenes,
    characters: [
      {
        id: 'character-used',
        name: 'Used Character',
        attributes: [],
      },
      {
        id: 'character-unused',
        name: 'Unused Character',
        attributes: [],
      },
    ],
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

function createScene(id: string, speakerId: string | null): Scene {
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
    dialoguePages: [
      {
        id: `${id}-page-1`,
        speakerId,
        text: 'Hello.',
      },
    ],
    choices: [],
    groupId: null,
  };
}

describe('character deletion', () => {
  it('deletes an unused character without changing dialogue speakers', () => {
    const project = createProject([createScene('scene-1', 'character-used')]);
    const nextProject = deleteCharacterFromProject(project, 'character-unused');

    expect(nextProject.characters.map((character) => character.id)).toEqual(['character-used']);
    expect(nextProject.scenes[0].dialoguePages[0].speakerId).toBe('character-used');
  });

  it('detects dialogue speaker references before deleting a character', () => {
    const project = createProject([
      createScene('scene-1', 'character-used'),
      createScene('scene-2', null),
      createScene('scene-3', 'character-used'),
    ]);

    expect(findDialogueSpeakerUsages(project, 'character-used')).toEqual([
      { sceneId: 'scene-1', pageId: 'scene-1-page-1' },
      { sceneId: 'scene-3', pageId: 'scene-3-page-1' },
    ]);
  });

  it('clears speaker references after confirmed referenced character deletion', () => {
    const project = createProject([
      createScene('scene-1', 'character-used'),
      createScene('scene-2', null),
      createScene('scene-3', 'character-used'),
    ]);
    const nextProject = deleteCharacterFromProject(project, 'character-used', {
      clearDialogueSpeakers: true,
    });

    expect(nextProject.characters.map((character) => character.id)).toEqual(['character-unused']);
    expect(nextProject.scenes.flatMap((scene) => scene.dialoguePages)).toEqual([
      expect.objectContaining({ id: 'scene-1-page-1', speakerId: null }),
      expect.objectContaining({ id: 'scene-2-page-1', speakerId: null }),
      expect.objectContaining({ id: 'scene-3-page-1', speakerId: null }),
    ]);
  });

  it('leaves the project unchanged when referenced character deletion is cancelled', () => {
    const project = createProject([createScene('scene-1', 'character-used')]);
    const confirmed = false;
    const nextProject = confirmed
      ? deleteCharacterFromProject(project, 'character-used', { clearDialogueSpeakers: true })
      : project;

    expect(nextProject).toBe(project);
    expect(nextProject.characters.map((character) => character.id)).toEqual([
      'character-used',
      'character-unused',
    ]);
    expect(nextProject.scenes[0].dialoguePages[0].speakerId).toBe('character-used');
  });
});
