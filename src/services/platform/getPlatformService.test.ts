import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearMocks, mockConvertFileSrc, mockIPC } from '@tauri-apps/api/mocks';
import type { InvokeArgs } from '@tauri-apps/api/core';
import { BrowserPlatformService } from './BrowserPlatformService';
import { DesktopPlatformService } from './DesktopPlatformService';
import { getPlatformService } from './getPlatformService';

describe('platform services', () => {
  afterEach(() => {
    if (typeof window !== 'undefined') {
      clearMocks();
    }
    vi.unstubAllGlobals();
  });

  it('reports browser platform identity', () => {
    const service = new BrowserPlatformService();

    expect(service.isBrowser()).toBe(true);
    expect(service.isDesktop()).toBe(false);
    expect(service.platformName()).toBe('browser');
  });

  it('reports desktop platform identity', () => {
    const service = new DesktopPlatformService();

    expect(service.isBrowser()).toBe(false);
    expect(service.isDesktop()).toBe(true);
    expect(service.platformName()).toBe('desktop');
  });

  it('does not intercept native desktop close requests', async () => {
    const service = new DesktopPlatformService();
    const handler = vi.fn().mockResolvedValue(false);

    const dispose = await service.onCloseRequested(handler);
    dispose();

    expect(handler).not.toHaveBeenCalled();
  });

  it('resolves to browser when Tauri globals are unavailable', () => {
    vi.stubGlobal('window', {});

    expect(getPlatformService().platformName()).toBe('browser');
  });

  it('resolves to desktop when Tauri globals are available', () => {
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: {},
    });

    expect(getPlatformService().platformName()).toBe('desktop');
  });

  it('resolves local asset files to asset protocol URLs', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    mockConvertFileSrc('windows');
    mockIPC(<T,>(cmd: string, payload?: InvokeArgs): T => {
      if (cmd === 'resolve_local_asset_file') {
        expect(payload).toEqual({
          projectFilePath: 'D:/Stories/Test/Test.narrium',
          relativePath: 'assets/backgrounds/forest.png',
        });
        return 'D:\\Stories\\Test\\assets\\backgrounds\\forest.png' as T;
      }

      throw new Error(`Unexpected command: ${cmd}`);
    });

    await expect(
      service.resolveLocalAssetDisplaySource(
        'D:/Stories/Test/Test.narrium',
        'assets/backgrounds/forest.png',
      ),
    ).resolves.toBe('http://asset.localhost/D%3A%5CStories%5CTest%5Cassets%5Cbackgrounds%5Cforest.png');
  });
});
