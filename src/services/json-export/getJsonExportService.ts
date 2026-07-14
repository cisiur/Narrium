import { DesktopJsonExportFileApi } from './DesktopJsonExportFileApi';
import {
  BrowserJsonExportService,
  DesktopJsonExportService,
  type JsonExportService,
} from './JsonExportService';
import { getPlatformService } from '../platform';

const browserJsonExportService = new BrowserJsonExportService();
const desktopJsonExportService = new DesktopJsonExportService(new DesktopJsonExportFileApi());

export function getJsonExportService(): JsonExportService {
  return getPlatformService().isDesktop() ? desktopJsonExportService : browserJsonExportService;
}
