import { getPlatformService } from '../platform';
import type { AssetLibraryItem } from '../../types';

export interface BackgroundAssetDisplayResolution {
  source: string | null;
  loadSource?: () => Promise<string | null>;
}

export type LocalAssetDisplayResolver = (
  projectFilePath: string,
  relativePath: string,
) => Promise<string | null>;

export function resolveLocalBackgroundAssetDisplaySource(
  projectFilePath: string,
  relativePath: string,
): Promise<string | null> {
  return getPlatformService().resolveLocalAssetDisplaySource(projectFilePath, relativePath);
}

export function resolveBackgroundAssetDisplaySource(
  asset: AssetLibraryItem | null,
  projectFilePath: string | null,
  localAssetResolver: LocalAssetDisplayResolver = resolveLocalBackgroundAssetDisplaySource,
): BackgroundAssetDisplayResolution {
  if (!asset) {
    return { source: null };
  }

  if (asset.storageType === 'embedded' || asset.storageType === 'remote') {
    return { source: asset.source };
  }

  if (!projectFilePath) {
    return { source: null };
  }

  return {
    source: null,
    loadSource: () => localAssetResolver(projectFilePath, asset.source).catch(() => null),
  };
}
