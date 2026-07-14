import {
  BrowserJsonExportService,
  getProjectExportFilename,
  serializeProjectForJsonExport,
} from '../services/json-export';
import type { Project } from '../types';

export function exportProjectAsJson(project: Project) {
  void new BrowserJsonExportService().exportProject(project);
}

export { getProjectExportFilename, serializeProjectForJsonExport };
