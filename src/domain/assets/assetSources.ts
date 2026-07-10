import type { AssetLibraryItem } from '../../types';

export function resolveAssetDisplaySource(asset: AssetLibraryItem): string {
  return asset.source;
}
