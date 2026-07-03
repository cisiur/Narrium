export type PlatformName = 'browser' | 'desktop';

export interface PlatformService {
  isBrowser(): boolean;
  isDesktop(): boolean;
  platformName(): PlatformName;
}
