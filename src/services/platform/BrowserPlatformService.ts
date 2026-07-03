import type { PlatformName, PlatformProjectFileApi, PlatformService } from './PlatformService';

export class BrowserPlatformService implements PlatformService, PlatformProjectFileApi {
  isBrowser(): boolean {
    return true;
  }

  isDesktop(): boolean {
    return false;
  }

  platformName(): PlatformName {
    return 'browser';
  }

  selectProjectFolder(): Promise<string | null> {
    return Promise.resolve(null);
  }

  readTextFile(): Promise<string> {
    return Promise.reject(new Error('Project folders are only available in the desktop app.'));
  }

  writeProjectFile(): Promise<string> {
    return Promise.reject(new Error('Project folders are only available in the desktop app.'));
  }
}
