import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearMocks, mockConvertFileSrc, mockIPC } from '@tauri-apps/api/mocks';
import type { InvokeArgs } from '@tauri-apps/api/core';
import { BrowserPlatformService } from './BrowserPlatformService';
import { DesktopPlatformService } from './DesktopPlatformService';
import { getPlatformService } from './getPlatformService';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

function createNativeWindowMock() {
  let closeHandler: ((event: { preventDefault(): void }) => void | Promise<void>) | null = null;
  let isDestroyed = false;
  const destroy = vi.fn(async () => {
    isDestroyed = true;
  });
  const onCloseRequested = vi.fn(async (handler: typeof closeHandler) => {
    closeHandler = handler;
    return () => {
      closeHandler = null;
    };
  });
  const requestClose = async () => {
    let isPrevented = false;
    const preventDefault = vi.fn();

    if (!closeHandler) {
      throw new Error('No close handler registered.');
    }

    await closeHandler({
      preventDefault: () => {
        isPrevented = true;
        preventDefault();
      },
    });

    if (!isPrevented) {
      await destroy();
    }

    return { isDestroyed, preventDefault };
  };

  return {
    destroy,
    onCloseRequested,
    requestClose,
  };
}

describe('platform services', () => {
  afterEach(() => {
    if (typeof window !== 'undefined') {
      clearMocks();
    }
    vi.restoreAllMocks();
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

  it('destroys desktop windows after a clean close decision', async () => {
    const nativeWindow = createNativeWindowMock();
    const service = new DesktopPlatformService(() => nativeWindow);
    const handler = vi.fn().mockResolvedValue(true);

    const dispose = await service.onCloseRequested(handler);
    const closeResult = await nativeWindow.requestClose();
    dispose();

    expect(closeResult.preventDefault).toHaveBeenCalledTimes(1);
    expect(closeResult.isDestroyed).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(nativeWindow.destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps desktop windows open when a close decision is rejected', async () => {
    const nativeWindow = createNativeWindowMock();
    const service = new DesktopPlatformService(() => nativeWindow);
    const handler = vi.fn().mockResolvedValue(false);

    const dispose = await service.onCloseRequested(handler);
    const event = await nativeWindow.requestClose();
    dispose();

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.isDestroyed).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(nativeWindow.destroy).not.toHaveBeenCalled();
  });

  it('does not create duplicate close decisions while one is pending', async () => {
    const nativeWindow = createNativeWindowMock();
    const service = new DesktopPlatformService(() => nativeWindow);
    const closeDecision = createDeferred<boolean>();
    const handler = vi.fn(() => closeDecision.promise);

    const dispose = await service.onCloseRequested(handler);
    const firstClose = nativeWindow.requestClose();
    const secondClose = await nativeWindow.requestClose();

    expect(secondClose.preventDefault).toHaveBeenCalledTimes(1);
    expect(secondClose.isDestroyed).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(nativeWindow.destroy).not.toHaveBeenCalled();

    closeDecision.resolve(true);
    const firstCloseEvent = await firstClose;
    dispose();

    expect(firstCloseEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(firstCloseEvent.isDestroyed).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(nativeWindow.destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps close usable after a close decision throws', async () => {
    const nativeWindow = createNativeWindowMock();
    const service = new DesktopPlatformService(() => nativeWindow);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error('dialog rejected'))
      .mockResolvedValueOnce(true);

    const dispose = await service.onCloseRequested(handler);

    const failedClose = await nativeWindow.requestClose();
    const retryClose = await nativeWindow.requestClose();
    dispose();

    expect(failedClose.preventDefault).toHaveBeenCalledTimes(1);
    expect(failedClose.isDestroyed).toBe(false);
    expect(retryClose.isDestroyed).toBe(true);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(nativeWindow.destroy).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      'Could not complete native close request.',
      expect.any(Error),
    );
  });

  it('reaches the terminal native destroy path after an approved decision', async () => {
    const nativeWindow = createNativeWindowMock();
    const service = new DesktopPlatformService(() => nativeWindow);
    const handler = vi.fn().mockResolvedValue(true);

    const dispose = await service.onCloseRequested(handler);

    const closeResult = await nativeWindow.requestClose();
    dispose();

    expect(closeResult.isDestroyed).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(nativeWindow.destroy).toHaveBeenCalledTimes(1);
  });

  it('leaves browser close behavior unaffected', async () => {
    const service = new BrowserPlatformService();
    const handler = vi.fn().mockResolvedValue(false);

    const dispose = await service.onCloseRequested(handler);
    dispose();

    expect(handler).not.toHaveBeenCalled();
  });

  it('requests desktop unsaved-change decisions through the app command', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    mockIPC(<T,>(cmd: string, payload?: InvokeArgs): T => {
      expect(cmd).toBe('confirm_unsaved_changes');
      expect(payload).toEqual({ projectName: 'Test Project' });
      return 'discard' as T;
    });

    await expect(service.confirmUnsavedChanges('Test Project')).resolves.toBe('discard');
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

  it('returns null when desktop local asset resolution fails', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    mockIPC(<T,>(cmd: string): T => {
      if (cmd === 'resolve_local_asset_file') {
        throw new Error('Local asset file is missing.');
      }

      throw new Error(`Unexpected command: ${cmd}`);
    });

    await expect(
      service.resolveLocalAssetDisplaySource(
        'D:/Stories/Test/Test.narrium',
        'assets/backgrounds/missing.png',
      ),
    ).resolves.toBeNull();
  });

  it('leaves browser local asset display resolution disabled', async () => {
    const service = new BrowserPlatformService();

    await expect(service.resolveLocalAssetDisplaySource()).resolves.toBeNull();
  });
});
