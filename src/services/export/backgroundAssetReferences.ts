import type { AssetLibraryItem, Project } from '../../types';

export interface ReferencedBackgroundAsset {
  asset: AssetLibraryItem;
  sourceSceneIds: string[];
}

export function collectReferencedBackgroundAssetIds(project: Project): Map<string, string[]> {
  const sceneById = new Map(project.scenes.map((scene) => [scene.id, scene]));
  const referencedAssetIds = new Map<string, string[]>();

  const addReference = (assetId: string, sceneId: string) => {
    const existing = referencedAssetIds.get(assetId) ?? [];

    if (!existing.includes(sceneId)) {
      referencedAssetIds.set(assetId, [...existing, sceneId]);
    }
  };

  const collectDirectBackgroundAsset = (sourceSceneId: string, referencingSceneId: string) => {
    const sourceScene = sceneById.get(sourceSceneId);

    if (sourceScene?.background.mode === 'asset' && sourceScene.background.assetId) {
      addReference(sourceScene.background.assetId, referencingSceneId);
    }
  };

  project.scenes.forEach((scene) => {
    if (scene.background.mode === 'asset' && scene.background.assetId) {
      addReference(scene.background.assetId, scene.id);
      return;
    }

    if (scene.background.mode === 'scene_reference' && scene.background.sourceSceneId) {
      collectDirectBackgroundAsset(scene.background.sourceSceneId, scene.id);
    }
  });

  return referencedAssetIds;
}

export function collectReferencedBackgroundAssets(project: Project): ReferencedBackgroundAsset[] {
  const referencedAssetIds = collectReferencedBackgroundAssetIds(project);

  return project.assetLibrary
    .filter((asset) => asset.kind === 'background' && referencedAssetIds.has(asset.id))
    .map((asset) => ({
      asset,
      sourceSceneIds: referencedAssetIds.get(asset.id) ?? [],
    }));
}

