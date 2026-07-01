import type { Project } from '../../types';

export interface DialogueSpeakerUsage {
  sceneId: string;
  pageId: string;
}

export function findDialogueSpeakerUsages(project: Project, characterId: string): DialogueSpeakerUsage[] {
  return project.scenes.flatMap((scene) =>
    scene.dialoguePages
      .filter((page) => page.speakerId === characterId)
      .map((page) => ({
        sceneId: scene.id,
        pageId: page.id,
      })),
  );
}

export function deleteCharacterFromProject(
  project: Project,
  characterId: string,
  options: { clearDialogueSpeakers?: boolean } = {},
): Project {
  return {
    ...project,
    characters: project.characters.filter((character) => character.id !== characterId),
    scenes: options.clearDialogueSpeakers
      ? project.scenes.map((scene) => ({
          ...scene,
          dialoguePages: scene.dialoguePages.map((page) =>
            page.speakerId === characterId ? { ...page, speakerId: null } : page,
          ),
        }))
      : project.scenes,
  };
}
