import type { Project } from '../../types';

export interface JsonExportSaveDialogOptions {
  title: string;
  defaultFileName: string;
}

export interface JsonExportFileApi {
  selectJsonExportPath(options: JsonExportSaveDialogOptions): Promise<string | null>;
  writeJsonExportFile(filePath: string, contents: string): Promise<string>;
}

export interface JsonExportService {
  exportProject(project: Project): Promise<void>;
}

export function getProjectExportFilename(projectName: string): string {
  const safeName = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return safeName ? `narrium-${safeName}.json` : 'narrium-project.json';
}

export function serializeProjectForJsonExport(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export class BrowserJsonExportService implements JsonExportService {
  exportProject(project: Project): Promise<void> {
    const json = serializeProjectForJsonExport(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = getProjectExportFilename(project.name);
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);

    return Promise.resolve();
  }
}

export class DesktopJsonExportService implements JsonExportService {
  constructor(private readonly jsonExportFiles: JsonExportFileApi) {}

  async exportProject(project: Project): Promise<void> {
    const filePath = await this.jsonExportFiles.selectJsonExportPath({
      title: 'Export Narrium Project JSON',
      defaultFileName: getProjectExportFilename(project.name),
    });

    if (!filePath) {
      return;
    }

    await this.jsonExportFiles.writeJsonExportFile(filePath, serializeProjectForJsonExport(project));
  }
}
