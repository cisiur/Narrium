import type { Project, Scene } from '../../types';
import { resolveAssetUrl, type ProjectAssetUrlMap } from '../../services/assets';
export { createChoiceViewModels, type ChoiceViewModel } from '../../domain/runtime';

function resolveDirectBackgroundUrl(
  project: Project,
  scene: Scene,
  assetUrls: ProjectAssetUrlMap = {},
): string | null {
  if (scene.background.mode === 'url' || scene.background.mode === 'upload') {
    return scene.background.url ? resolveAssetUrl(scene.background.url, assetUrls) : null;
  }

  if (scene.background.mode === 'asset' && scene.background.assetId) {
    const asset = project.assetLibrary.find((item) => item.id === scene.background.assetId);

    return asset?.url ? resolveAssetUrl(asset.url, assetUrls) : null;
  }

  return null;
}

export function resolveSceneBackgroundUrl(
  project: Project,
  scene: Scene,
  assetUrls: ProjectAssetUrlMap = {},
): string | null {
  if (scene.background.mode === 'scene_reference' && scene.background.sourceSceneId) {
    const referencedScene = project.scenes.find(
      (candidate) => candidate.id === scene.background.sourceSceneId,
    );

    return referencedScene ? resolveDirectBackgroundUrl(project, referencedScene, assetUrls) : null;
  }

  return resolveDirectBackgroundUrl(project, scene, assetUrls);
}

export function resolveSpeakerName(project: Project, speakerId: string | null): string {
  if (speakerId === null) {
    return 'Narrator';
  }

  return project.characters.find((character) => character.id === speakerId)?.name ?? 'Unknown Speaker';
}
