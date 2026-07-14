import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('getJsonExportService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('selects the browser JSON export service for the browser platform', async () => {
    vi.doMock('../platform', () => ({
      getPlatformService: () => ({
        isDesktop: () => false,
      }),
    }));

    const { BrowserJsonExportService } = await import('./JsonExportService');
    const { getJsonExportService } = await import('./getJsonExportService');

    expect(getJsonExportService()).toBeInstanceOf(BrowserJsonExportService);
  });

  it('selects the desktop JSON export service for the desktop platform', async () => {
    vi.doMock('../platform', () => ({
      getPlatformService: () => ({
        isDesktop: () => true,
      }),
    }));

    const { DesktopJsonExportService } = await import('./JsonExportService');
    const { getJsonExportService } = await import('./getJsonExportService');

    expect(getJsonExportService()).toBeInstanceOf(DesktopJsonExportService);
  });
});
