import { useEffect, useMemo, useState } from 'react';
import {
  resolveBackgroundAssetDisplaySource,
  type BackgroundAssetDisplayResolution,
} from '../../services/background-assets';
import type { AssetLibraryItem, Project, Scene } from '../../types';

export function resolveSceneBackgroundAsset(project: Project, scene: Scene): AssetLibraryItem | null {
  const resolveDirectAsset = (candidate: Scene): AssetLibraryItem | null => {
    if (candidate.background.mode !== 'asset' || !candidate.background.assetId) {
      return null;
    }

    return project.assetLibrary.find((asset) => asset.id === candidate.background.assetId) ?? null;
  };

  if (scene.background.mode === 'scene_reference' && scene.background.sourceSceneId) {
    const referencedScene = project.scenes.find((candidate) => candidate.id === scene.background.sourceSceneId);

    return referencedScene ? resolveDirectAsset(referencedScene) : null;
  }

  return resolveDirectAsset(scene);
}

export function resolveLegacySceneBackgroundSource(project: Project, scene: Scene): string | null {
  const resolveDirectSource = (candidate: Scene): string | null => {
    if (candidate.background.mode === 'url' || candidate.background.mode === 'upload') {
      return candidate.background.url || null;
    }

    return null;
  };

  if (scene.background.mode === 'scene_reference' && scene.background.sourceSceneId) {
    const referencedScene = project.scenes.find((candidate) => candidate.id === scene.background.sourceSceneId);

    return referencedScene ? resolveDirectSource(referencedScene) : null;
  }

  return resolveDirectSource(scene);
}

export function useAssetDisplaySource(
  asset: AssetLibraryItem | null,
  projectFilePath: string | null,
): string | null {
  const resolution = useMemo(
    () => resolveBackgroundAssetDisplaySource(asset, projectFilePath),
    [asset, projectFilePath],
  );
  const [source, setSource] = useState<string | null>(resolution.source);

  useEffect(() => {
    return subscribeToAssetDisplaySource(resolution, setSource);
  }, [resolution]);

  return source;
}

export function subscribeToAssetDisplaySource(
  resolution: BackgroundAssetDisplayResolution,
  setSource: (source: string | null) => void,
): () => void {
  let isCurrent = true;

  setSource(resolution.source);

  if (resolution.loadSource) {
    void resolution
      .loadSource()
      .catch(() => null)
      .then((resolvedSource) => {
        if (isCurrent) {
          setSource(resolvedSource);
        }
      });
  }

  return () => {
    isCurrent = false;
  };
}

export function useSceneBackgroundDisplaySource(
  project: Project,
  scene: Scene | null,
  projectFilePath: string | null,
): string | null {
  const asset = scene ? resolveSceneBackgroundAsset(project, scene) : null;
  const assetSource = useAssetDisplaySource(asset, projectFilePath);
  const legacySource = scene ? resolveLegacySceneBackgroundSource(project, scene) : null;

  return asset ? assetSource : legacySource;
}
