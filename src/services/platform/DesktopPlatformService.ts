import type { PlatformName, PlatformService } from './PlatformService';

export class DesktopPlatformService implements PlatformService {
  isBrowser(): boolean {
    return false;
  }

  isDesktop(): boolean {
    return true;
  }

  platformName(): PlatformName {
    return 'desktop';
  }
}
