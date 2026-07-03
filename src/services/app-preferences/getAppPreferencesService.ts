import { BrowserAppPreferencesService, type AppPreferencesService } from './AppPreferencesService';

const appPreferencesService: AppPreferencesService = new BrowserAppPreferencesService();

export function getAppPreferencesService(): AppPreferencesService {
  return appPreferencesService;
}
