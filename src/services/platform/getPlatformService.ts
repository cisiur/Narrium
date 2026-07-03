import { BrowserPlatformService } from './BrowserPlatformService';
import { DesktopPlatformService } from './DesktopPlatformService';
import type { PlatformService } from './PlatformService';

type TauriWindow = Window & {
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
};

const browserPlatformService = new BrowserPlatformService();
const desktopPlatformService = new DesktopPlatformService();

function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const tauriWindow = window as TauriWindow;

  return Boolean(tauriWindow.__TAURI__ || tauriWindow.__TAURI_INTERNALS__);
}

export function getPlatformService(): PlatformService {
  return isTauriRuntime() ? desktopPlatformService : browserPlatformService;
}
