import { getPlatformService } from '../platform';
import {
  BrowserProjectFileService,
  DesktopProjectFileService,
  type ProjectFileService,
} from './ProjectFileService';

const platformService = getPlatformService();

const projectFileService: ProjectFileService = platformService.isDesktop()
  ? new DesktopProjectFileService(platformService)
  : new BrowserProjectFileService();

export function getProjectFileService(): ProjectFileService {
  return projectFileService;
}
