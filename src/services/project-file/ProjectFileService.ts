import { normalizeProject, parseProjectImport } from '../../domain/project';
import type { Project } from '../../types';
import type { PlatformProjectFileApi } from '../platform';

export const NARRIUM_PROJECT_FORMAT = 'narrium.project';
export const NARRIUM_PROJECT_FORMAT_VERSION = 1;
export const NARRIUM_PROJECT_EXTENSION = 'narrium';

export interface NarriumProjectFile {
  format: typeof NARRIUM_PROJECT_FORMAT;
  formatVersion: typeof NARRIUM_PROJECT_FORMAT_VERSION;
  project: Project;
}

export interface LocalProjectFile {
  filePath: string;
  project: Project;
}

export interface ProjectFileService {
  canUseProjectFiles(): boolean;
  openProjectFile(): Promise<LocalProjectFile | null>;
  openProjectFileAt(filePath: string): Promise<LocalProjectFile>;
  saveProject(project: Project, filePath: string): Promise<LocalProjectFile>;
  saveProjectAs(project: Project, sourceFilePath?: string | null): Promise<LocalProjectFile | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureNarriumProjectExtension(filePath: string): string {
  return filePath.toLowerCase().endsWith(`.${NARRIUM_PROJECT_EXTENSION}`)
    ? filePath
    : `${filePath}.${NARRIUM_PROJECT_EXTENSION}`;
}

export function serializeNarriumProjectFile(project: Project): string {
  const wrappedProject: NarriumProjectFile = {
    format: NARRIUM_PROJECT_FORMAT,
    formatVersion: NARRIUM_PROJECT_FORMAT_VERSION,
    project: normalizeProject(project).project,
  };

  return `${JSON.stringify(wrappedProject, null, 2)}\n`;
}

export function parseNarriumProjectFile(source: string): Project | null {
  try {
    const parsed = JSON.parse(source) as unknown;

    if (
      isRecord(parsed) &&
      parsed.format === NARRIUM_PROJECT_FORMAT &&
      parsed.formatVersion === NARRIUM_PROJECT_FORMAT_VERSION &&
      parsed.project !== undefined
    ) {
      return parseProjectImport(JSON.stringify(parsed.project));
    }
  } catch {
    return null;
  }

  return parseProjectImport(source);
}

function getReferencedLocalAssetSources(project: Project): string[] {
  return Array.from(
    new Set(
      project.assetLibrary
        .filter((asset) => asset.kind === 'background' && asset.storageType === 'local')
        .map((asset) => asset.source),
    ),
  );
}

export class DesktopProjectFileService implements ProjectFileService {
  constructor(private readonly platformProjectFiles: PlatformProjectFileApi) {}

  canUseProjectFiles(): boolean {
    return true;
  }

  async openProjectFile(): Promise<LocalProjectFile | null> {
    const filePath = await this.platformProjectFiles.selectProjectFileToOpen({
      title: 'Open Narrium Project File',
    });

    if (!filePath) {
      return null;
    }

    return this.openProjectFileAt(filePath);
  }

  async openProjectFileAt(filePath: string): Promise<LocalProjectFile> {
    const projectFile = await this.platformProjectFiles.readProjectFile(filePath);
    const project = parseNarriumProjectFile(projectFile.contents);

    if (!project) {
      throw new Error('Selected file is not a valid Narrium project file.');
    }

    return {
      filePath: projectFile.filePath,
      project,
    };
  }

  async saveProject(project: Project, filePath: string): Promise<LocalProjectFile> {
    const normalizedProject = normalizeProject(project).project;
    const savedFilePath = await this.platformProjectFiles.writeProjectFile(
      filePath,
      serializeNarriumProjectFile(normalizedProject),
    );

    return {
      filePath: savedFilePath,
      project: normalizedProject,
    };
  }

  async saveProjectAs(project: Project, sourceFilePath: string | null = null): Promise<LocalProjectFile | null> {
    const filePath = await this.platformProjectFiles.selectProjectFilePathForSaveAs({
      title: 'Save Narrium Project As',
      defaultFileName: `${project.name || 'Untitled Project'}.${NARRIUM_PROJECT_EXTENSION}`,
    });

    if (!filePath) {
      return null;
    }

    const destinationFilePath = ensureNarriumProjectExtension(filePath);
    const localAssetSources = getReferencedLocalAssetSources(project);

    if (sourceFilePath && sourceFilePath !== destinationFilePath) {
      await Promise.all(
        localAssetSources.map((relativePath) =>
          this.platformProjectFiles.copyLocalAssetForProjectSaveAs(
            sourceFilePath,
            destinationFilePath,
            relativePath,
          ),
        ),
      );
    }

    return this.saveProject(project, destinationFilePath);
  }
}

export class BrowserProjectFileService implements ProjectFileService {
  canUseProjectFiles(): boolean {
    return false;
  }

  openProjectFile(): Promise<LocalProjectFile | null> {
    return Promise.resolve(null);
  }

  openProjectFileAt(): Promise<LocalProjectFile> {
    return Promise.reject(new Error('Project files are only available in the desktop app.'));
  }

  saveProject(): Promise<LocalProjectFile> {
    return Promise.reject(new Error('Project files are only available in the desktop app.'));
  }

  saveProjectAs(): Promise<LocalProjectFile | null> {
    return Promise.resolve(null);
  }
}
