import { describe, expect, it, vi } from 'vitest';
import type { AssetLibraryItem } from '../../types';
import { resolveBackgroundAssetDisplaySource } from './BackgroundAssetDisplayService';

function createAsset(overrides: Partial<AssetLibraryItem> = {}): AssetLibraryItem {
  return {
    id: 'asset-1',
    kind: 'background',
    name: 'Forest',
    storageType: 'embedded',
    source: 'data:image/png;base64,abc',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('resolveBackgroundAssetDisplaySource', () => {
  it('resolves embedded assets to their Data URL', () => {
    expect(resolveBackgroundAssetDisplaySource(createAsset(), null)).toEqual({
      source: 'data:image/png;base64,abc',
    });
  });

  it('resolves remote assets to their URL', () => {
    expect(
      resolveBackgroundAssetDisplaySource(
        createAsset({
          storageType: 'remote',
          source: 'https://example.com/background.jpg',
        }),
        null,
      ),
    ).toEqual({
      source: 'https://example.com/background.jpg',
    });
  });

  it('delegates local assets with a project file path to the injected local resolver', async () => {
    const localResolver = vi.fn(() => Promise.resolve('asset://localhost/backgrounds/forest.png'));
    const resolution = resolveBackgroundAssetDisplaySource(
      createAsset({
        storageType: 'local',
        source: 'assets/backgrounds/forest.png',
      }),
      'D:\\Stories\\Forest.narrium',
      localResolver,
    );

    expect(resolution.source).toBeNull();
    expect(localResolver).not.toHaveBeenCalled();
    await expect(resolution.loadSource?.()).resolves.toBe('asset://localhost/backgrounds/forest.png');
    expect(localResolver).toHaveBeenCalledWith('D:\\Stories\\Forest.narrium', 'assets/backgrounds/forest.png');
  });

  it('resolves local assets without a project file path to null', () => {
    const localResolver = vi.fn(() => Promise.resolve('asset://localhost/backgrounds/forest.png'));
    const resolution = resolveBackgroundAssetDisplaySource(
      createAsset({
        storageType: 'local',
        source: 'assets/backgrounds/forest.png',
      }),
      null,
      localResolver,
    );

    expect(resolution).toEqual({ source: null });
    expect(localResolver).not.toHaveBeenCalled();
  });

  it('keeps null when the local resolver returns null', async () => {
    const resolution = resolveBackgroundAssetDisplaySource(
      createAsset({
        storageType: 'local',
        source: 'assets/backgrounds/missing.png',
      }),
      'D:\\Stories\\Forest.narrium',
      () => Promise.resolve(null),
    );

    await expect(resolution.loadSource?.()).resolves.toBeNull();
  });

  it('treats local resolver failures as unresolved display sources', async () => {
    const resolution = resolveBackgroundAssetDisplaySource(
      createAsset({
        storageType: 'local',
        source: 'assets/backgrounds/rejected.png',
      }),
      'D:\\Stories\\Forest.narrium',
      () => Promise.reject(new Error('missing asset')),
    );

    await expect(resolution.loadSource?.()).resolves.toBeNull();
  });

  it('resolves null assets to null', () => {
    expect(resolveBackgroundAssetDisplaySource(null, 'D:\\Stories\\Forest.narrium')).toEqual({
      source: null,
    });
  });
});
