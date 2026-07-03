import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserPlatformService } from './BrowserPlatformService';
import { DesktopPlatformService } from './DesktopPlatformService';
import { getPlatformService } from './getPlatformService';

describe('platform services', () => {
  afterEach(() => {
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
});
