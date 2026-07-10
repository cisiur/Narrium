import { describe, expect, it } from 'vitest';
import type { AssetLibraryItem } from '../../types';
import { resolveAssetDisplaySource } from './assetSources';

function createAsset(storageType: AssetLibraryItem['storageType'], source: string): AssetLibraryItem {
  return {
    id: `asset-${storageType}`,
    kind: 'background',
    name: 'Background',
    storageType,
    source,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('resolveAssetDisplaySource', () => {
  it('returns embedded asset Data URLs', () => {
    expect(resolveAssetDisplaySource(createAsset('embedded', 'data:image/png;base64,abc'))).toBe(
      'data:image/png;base64,abc',
    );
  });

  it('returns remote asset URLs', () => {
    expect(resolveAssetDisplaySource(createAsset('remote', 'https://example.com/background.jpg'))).toBe(
      'https://example.com/background.jpg',
    );
  });

  it('keeps local asset sources as project-relative paths', () => {
    expect(resolveAssetDisplaySource(createAsset('local', 'assets/backgrounds/forest.png'))).toBe(
      'assets/backgrounds/forest.png',
    );
  });
});
