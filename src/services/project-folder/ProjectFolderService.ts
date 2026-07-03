import { normalizeProject, parseProjectImport } from '../../domain/project';
import type { Project } from '../../types';
import type { PlatformProjectFileApi } from '../platform';

export const PROJECT_FOLDER_FILE_NAME = 'project.narrium.json';

export interface LocalProjectFolder {
  folderPath: string;
  filePath: string;
  project: Project;
}

export interface ProjectFolderService {
  canUseProjectFolders(): boolean;
  createProjectFolder(project: Project): Promise<LocalProjectFolder | null>;
  openProjectFolder(): Promise<LocalProjectFolder | null>;
  openProjectFolderAt(folderPath: string): Promise<LocalProjectFolder>;
  saveProject(project: Project, folderPath: string): Promise<LocalProjectFolder>;
  saveProjectAs(project: Project): Promise<LocalProjectFolder | null>;
}

export function serializeProjectFolderJson(project: Project): string {
  return `${JSON.stringify(normalizeProject(project).project, null, 2)}\n`;
}

export function parseProjectFolderJson(source: string): Project | null {
  return parseProjectImport(source);
}

export class DesktopProjectFolderService implements ProjectFolderService {
  constructor(private readonly platformProjectFiles: PlatformProjectFileApi) {}

  canUseProjectFolders(): boolean {
    return true;
  }

  async createProjectFolder(project: Project): Promise<LocalProjectFolder | null> {
    const folderPath = await this.platformProjectFiles.selectProjectFolder({
      title: 'Create Narrium Project Folder',
    });

    if (!folderPath) {
      return null;
    }

    return this.saveProject(project, folderPath);
  }

  async openProjectFolder(): Promise<LocalProjectFolder | null> {
    const folderPath = await this.platformProjectFiles.selectProjectFolder({
      title: 'Open Narrium Project Folder',
    });

    if (!folderPath) {
      return null;
    }

    return this.openProjectFolderAt(folderPath);
  }

  async openProjectFolderAt(folderPath: string): Promise<LocalProjectFolder> {
    const projectFile = await this.platformProjectFiles.readProjectFile(folderPath, PROJECT_FOLDER_FILE_NAME);
    const project = parseProjectFolderJson(projectFile.contents);

    if (!project) {
      throw new Error(`Selected folder does not contain a valid ${PROJECT_FOLDER_FILE_NAME}.`);
    }

    return {
      folderPath,
      filePath: projectFile.filePath,
      project,
    };
  }

  async saveProject(project: Project, folderPath: string): Promise<LocalProjectFolder> {
    const normalizedProject = normalizeProject(project).project;
    const filePath = await this.platformProjectFiles.writeProjectFile(
      folderPath,
      PROJECT_FOLDER_FILE_NAME,
      serializeProjectFolderJson(normalizedProject),
    );

    return {
      folderPath,
      filePath,
      project: normalizedProject,
    };
  }

  async saveProjectAs(project: Project): Promise<LocalProjectFolder | null> {
    const folderPath = await this.platformProjectFiles.selectProjectFolder({
      title: 'Save Narrium Project As',
    });

    if (!folderPath) {
      return null;
    }

    return this.saveProject(project, folderPath);
  }
}

export class BrowserProjectFolderService implements ProjectFolderService {
  canUseProjectFolders(): boolean {
    return false;
  }

  createProjectFolder(): Promise<LocalProjectFolder | null> {
    return Promise.resolve(null);
  }

  openProjectFolder(): Promise<LocalProjectFolder | null> {
    return Promise.resolve(null);
  }

  openProjectFolderAt(): Promise<LocalProjectFolder> {
    return Promise.reject(new Error('Project folders are only available in the desktop app.'));
  }

  saveProject(): Promise<LocalProjectFolder> {
    return Promise.reject(new Error('Project folders are only available in the desktop app.'));
  }

  saveProjectAs(): Promise<LocalProjectFolder | null> {
    return Promise.resolve(null);
  }
}
