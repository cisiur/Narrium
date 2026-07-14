import { resolveBackgroundAssetDisplaySource } from '../../services/background-assets';
import type { Project, Scene } from '../../types';
export { createChoiceViewModels, type ChoiceViewModel } from '../../domain/runtime';

function resolveDirectBackgroundUrl(project: Project, scene: Scene): string | null {
  if (scene.background.mode === 'url' || scene.background.mode === 'upload') {
    return scene.background.url || null;
  }

  if (scene.background.mode === 'asset' && scene.background.assetId) {
    const asset = project.assetLibrary.find((item) => item.id === scene.background.assetId);

    return resolveBackgroundAssetDisplaySource(asset ?? null, null).source;
  }

  return null;
}

export function resolveSceneBackgroundUrl(project: Project, scene: Scene): string | null {
  if (scene.background.mode === 'scene_reference' && scene.background.sourceSceneId) {
    const referencedScene = project.scenes.find(
      (candidate) => candidate.id === scene.background.sourceSceneId,
    );

    return referencedScene ? resolveDirectBackgroundUrl(project, referencedScene) : null;
  }

  return resolveDirectBackgroundUrl(project, scene);
}

export function resolveSpeakerName(project: Project, speakerId: string | null): string {
  if (speakerId === null) {
    return 'Narrator';
  }

  return project.characters.find((character) => character.id === speakerId)?.name ?? 'Unknown Speaker';
}
