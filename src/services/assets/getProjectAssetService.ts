import { getPlatformService } from '../platform';
import {
  BrowserProjectAssetService,
  DesktopProjectAssetService,
  type ProjectAssetService,
} from './ProjectAssetService';

const platformService = getPlatformService();
const projectAssetService: ProjectAssetService = platformService.isDesktop()
  ? new DesktopProjectAssetService(platformService)
  : new BrowserProjectAssetService();

export function getProjectAssetService(): ProjectAssetService {
  return projectAssetService;
}
