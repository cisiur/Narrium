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

  it('reads and writes desktop app preferences through native commands', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    const commands: Array<{ cmd: string; payload?: InvokeArgs }> = [];
    mockIPC(<T,>(cmd: string, payload?: InvokeArgs): T => {
      commands.push({ cmd, payload });

      if (cmd === 'read_app_preferences_file') {
        return '{"recentProjects":[],"lastOpenedProjectFilePath":null}' as T;
      }

      if (cmd === 'write_app_preferences_file') {
        return undefined as T;
      }

      throw new Error(`Unexpected command: ${cmd}`);
    });

    await expect(service.readAppPreferences()).resolves.toBe(
      '{"recentProjects":[],"lastOpenedProjectFilePath":null}',
    );
    await expect(service.writeAppPreferences('{"recentProjects":[]}')).resolves.toBeUndefined();

    expect(commands).toEqual([
      {
        cmd: 'read_app_preferences_file',
        payload: {},
      },
      {
        cmd: 'write_app_preferences_file',
        payload: {
          contents: '{"recentProjects":[]}',
        },
      },
    ]);
  });

  it('selects desktop project files through the trusted native open command', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    mockIPC(<T,>(cmd: string, payload?: InvokeArgs): T => {
      expect(cmd).toBe('select_project_file_to_open');
      expect(payload).toEqual({
        title: 'Open Project',
      });

      return 'D:/Stories/Test.narrium' as T;
    });

    await expect(service.selectProjectFileToOpen({ title: 'Open Project' })).resolves.toBe(
      'D:/Stories/Test.narrium',
    );
  });

  it('selects desktop Save As paths through the trusted native save command', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    mockIPC(<T,>(cmd: string, payload?: InvokeArgs): T => {
      expect(cmd).toBe('select_project_file_path_for_save_as');
      expect(payload).toEqual({
        title: 'Save Project As',
        defaultFileName: 'Story.narrium',
      });

      return 'D:/Stories/Story.narrium' as T;
    });

    await expect(
      service.selectProjectFilePathForSaveAs({
        title: 'Save Project As',
        defaultFileName: 'Story.narrium',
      }),
    ).resolves.toBe('D:/Stories/Story.narrium');
  });

  it('registers explicit desktop project trust through the native command', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    mockIPC(<T,>(cmd: string, payload?: InvokeArgs): T => {
      expect(cmd).toBe('trust_existing_project_file');
      expect(payload).toEqual({
        filePath: 'D:/Stories/Recent.narrium',
      });

      return 'D:/Stories/Recent.narrium' as T;
    });

    await expect(service.trustExistingProjectFile('D:/Stories/Recent.narrium')).resolves.toBe(
      'D:/Stories/Recent.narrium',
    );
  });

  it('does not register trust when reading desktop project files directly', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    const commands: string[] = [];
    mockIPC(<T,>(cmd: string, payload?: InvokeArgs): T => {
      commands.push(cmd);

      if (cmd === 'read_project_file') {
        expect(payload).toEqual({
          filePath: 'D:/Stories/Untrusted.narrium',
        });
        return ['D:/Stories/Untrusted.narrium', '{"id":"project-1"}'] as T;
      }

      throw new Error(`Unexpected command: ${cmd}`);
    });

    await expect(service.readProjectFile('D:/Stories/Untrusted.narrium')).resolves.toEqual({
      filePath: 'D:/Stories/Untrusted.narrium',
      contents: '{"id":"project-1"}',
    });
    expect(commands).toEqual(['read_project_file']);
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

  it('rejects browser embedded background materialization clearly', async () => {
    const service = new BrowserPlatformService();

    await expect(
      service.materializeEmbeddedBackgroundAssets('D:/Stories/Test.narrium', []),
    ).rejects.toThrow('only available in the desktop app');
  });

  it('rejects browser duplicate fingerprinting clearly', async () => {
    const service = new BrowserPlatformService();

    await expect(service.fingerprintLocalBackgroundFiles()).rejects.toThrow(
      'duplicate detection is only available',
    );
  });

  it('invokes desktop embedded background materialization through the native command', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    const request = [
      {
        assetId: 'asset-1',
        suggestedName: 'forest-a1',
        mimeType: 'image/png' as const,
        base64Data: 'iVBORw0KGgo=',
      },
    ];
    const response = [
      {
        assetId: 'asset-1',
        relativePath: 'assets/backgrounds/forest-a1.png',
        mimeType: 'image/png' as const,
        fileSize: 8,
      },
    ];
    mockIPC(<T,>(cmd: string, payload?: InvokeArgs): T => {
      expect(cmd).toBe('materialize_embedded_background_assets');
      expect(payload).toEqual({
        projectFilePath: 'D:/Stories/Test.narrium',
        assets: request,
      });

      return response as T;
    });

    await expect(
      service.materializeEmbeddedBackgroundAssets('D:/Stories/Test.narrium', request),
    ).resolves.toEqual(response);
  });

  it('invokes desktop local background fingerprinting through the native command', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    const response = [
      {
        relativePath: 'assets/backgrounds/forest.png',
        fileName: 'forest.png',
        fileSize: 8,
        contentHash: 'abc123',
      },
    ];
    mockIPC(<T,>(cmd: string, payload?: InvokeArgs): T => {
      expect(cmd).toBe('fingerprint_local_background_files');
      expect(payload).toEqual({
        projectFilePath: 'D:/Stories/Test.narrium',
      });

      return response as T;
    });

    await expect(service.fingerprintLocalBackgroundFiles('D:/Stories/Test.narrium')).resolves.toEqual(response);
  });

  it('invokes desktop playable folder export writes through the native command', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    const response = {
      outputDirectory: 'D:/Exports/test-story',
      indexHtmlPath: 'D:/Exports/test-story/index.html',
      copiedAssetCount: 1,
    };
    const request = {
      sourceProjectFilePath: 'D:/Stories/Test.narrium',
      destinationParentDirectory: 'D:/Exports',
      folderName: 'test-story',
      indexHtml: '<!doctype html>',
      localAssetCopies: [
        {
          sourceRelativePath: 'assets/backgrounds/forest.png',
          destinationRelativePath: 'assets/backgrounds/forest.png',
        },
      ],
    };

    mockIPC(<T,>(cmd: string, payload?: InvokeArgs): T => {
      expect(cmd).toBe('write_playable_folder_export');
      expect(payload).toEqual(request);

      return response as T;
    });

    await expect(service.writePlayableFolderExport(request)).resolves.toEqual(response);
  });

  it('leaves browser playable folder export unavailable', async () => {
    const service = new BrowserPlatformService();

    await expect(
      service.selectPlayableFolderExportDestination({
        title: 'Export',
        defaultFolderName: 'story',
      }),
    ).resolves.toBeNull();
    await expect(
      service.writePlayableFolderExport({
        sourceProjectFilePath: 'D:/Stories/Test.narrium',
        destinationParentDirectory: 'D:/Exports',
        folderName: 'story',
        indexHtml: '',
        localAssetCopies: [],
      }),
    ).rejects.toThrow('only available in the desktop app');
  });

  it('propagates desktop embedded background materialization errors unchanged', async () => {
    const service = new DesktopPlatformService();
    vi.stubGlobal('window', {});
    const nativeError = new Error('materialization failed');
    mockIPC(() => {
      throw nativeError;
    });

    await expect(
      service.materializeEmbeddedBackgroundAssets('D:/Stories/Test.narrium', []),
    ).rejects.toBe(nativeError);
  });
});
