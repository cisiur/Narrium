import { useEffect, useMemo, useState } from 'react';
import { resolveAssetDisplaySource } from '../../domain/assets/assetSources';
import { getPlatformService } from '../../services/platform';
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
  const immediateSource = useMemo(() => {
    if (!asset) {
      return null;
    }

    if (asset.storageType === 'local') {
      return null;
    }

    return resolveAssetDisplaySource(asset);
  }, [asset]);
  const [source, setSource] = useState<string | null>(immediateSource);

  useEffect(() => {
    let isCurrent = true;

    if (!asset) {
      setSource(null);
      return () => {
        isCurrent = false;
      };
    }

    if (asset.storageType !== 'local') {
      setSource(resolveAssetDisplaySource(asset));
      return () => {
        isCurrent = false;
      };
    }

    if (!projectFilePath) {
      setSource(null);
      return () => {
        isCurrent = false;
      };
    }

    setSource(null);
    getPlatformService()
      .resolveLocalAssetDisplaySource(projectFilePath, asset.source)
      .then((resolvedSource) => {
        if (isCurrent) {
          setSource(resolvedSource);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [asset, projectFilePath]);

  return source;
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
