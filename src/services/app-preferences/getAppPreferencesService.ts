import { getPlatformService } from '../platform';
import {
  BrowserAppPreferencesService,
  DesktopAppPreferencesService,
  type AppPreferencesService,
} from './AppPreferencesService';

let appPreferencesService: AppPreferencesService | null = null;

export function getAppPreferencesService(): AppPreferencesService {
  if (!appPreferencesService) {
    const platformService = getPlatformService();

    appPreferencesService = platformService.isDesktop()
      ? new DesktopAppPreferencesService(platformService)
      : new BrowserAppPreferencesService();
  }

  return appPreferencesService;
}
