import type { PlatformName, PlatformService } from './PlatformService';

export class BrowserPlatformService implements PlatformService {
  isBrowser(): boolean {
    return true;
  }

  isDesktop(): boolean {
    return false;
  }

  platformName(): PlatformName {
    return 'browser';
  }
}
