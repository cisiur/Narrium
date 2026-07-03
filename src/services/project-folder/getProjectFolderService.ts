import { getPlatformService } from '../platform';
import {
  BrowserProjectFolderService,
  DesktopProjectFolderService,
  type ProjectFolderService,
} from './ProjectFolderService';

const platformService = getPlatformService();

const projectFolderService: ProjectFolderService = platformService.isDesktop()
  ? new DesktopProjectFolderService(platformService)
  : new BrowserProjectFolderService();

export function getProjectFolderService(): ProjectFolderService {
  return projectFolderService;
}
