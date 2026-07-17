import { normalizeProject, parseProjectImport } from '../../domain/project';
import type { Project } from '../../types';
import {
  applyMaterializedBackgroundAssets,
  planEmbeddedBackgroundAssetMigration,
} from '../background-assets';
import {
  getPerformanceInstrumentationService,
  type PerformanceInstrumentationService,
} from '../performance';
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

export function deriveProjectNameFromNarriumFilePath(filePath: string, fallbackName = 'Untitled Project'): string {
  const filename = filePath.split(/[\\/]/).pop() ?? '';
  const name = filename.replace(/\.narrium$/i, '').trim();
  const fallback = fallbackName.trim();

  return name || fallback || 'Untitled Project';
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
  constructor(
    private readonly platformProjectFiles: PlatformProjectFileApi,
    private readonly instrumentation: PerformanceInstrumentationService = getPerformanceInstrumentationService(),
  ) {}

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
    const trustedFilePath = await this.platformProjectFiles.trustExistingProjectFile(filePath);
    const projectFile = await this.platformProjectFiles.readProjectFile(trustedFilePath);
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
    return this.writeProjectWithEmbeddedBackgroundMigration(project, filePath, {
      operation: 'save',
      localAssetCopyDurationMs: 0,
    });
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
    const totalTimer = this.instrumentation.createTimer('save-as.total');
    let localAssetCopyDurationMs = 0;

    if (sourceFilePath && sourceFilePath !== destinationFilePath) {
      const copyTimer = this.instrumentation.createTimer('save-as.local-asset-copy');
      try {
        await Promise.all(
          localAssetSources.map((relativePath) =>
            this.platformProjectFiles.copyLocalAssetForProjectSaveAs(
              sourceFilePath,
              destinationFilePath,
              relativePath,
            ),
          ),
        );
      } finally {
        localAssetCopyDurationMs = copyTimer.elapsedMs();
      }
    }

    const renamedProject = {
      ...project,
      name: deriveProjectNameFromNarriumFilePath(destinationFilePath, project.name),
    };

    return this.writeProjectWithEmbeddedBackgroundMigration(renamedProject, destinationFilePath, {
      operation: 'save-as',
      localAssetCopyDurationMs,
      totalTimer,
    });
  }

  private async writeProjectWithEmbeddedBackgroundMigration(
    project: Project,
    filePath: string,
    options: {
      operation: 'save' | 'save-as';
      localAssetCopyDurationMs: number;
      totalTimer?: ReturnType<PerformanceInstrumentationService['createTimer']>;
    },
  ): Promise<LocalProjectFile> {
    const totalTimer = options.totalTimer ?? this.instrumentation.createTimer(`${options.operation}.total`);
    const normalizedProject = normalizeProject(project).project;
    const migrationRequests = planEmbeddedBackgroundAssetMigration(normalizedProject);
    let embeddedMaterializationDurationMs = 0;
    let serializationDurationMs = 0;
    let writeDurationMs = 0;
    const finalProject = migrationRequests.length > 0
      ? await (async () => {
          const materializationTimer = this.instrumentation.createTimer(`${options.operation}.embedded-materialization`);
          try {
            return applyMaterializedBackgroundAssets(
              normalizedProject,
              await this.platformProjectFiles.materializeEmbeddedBackgroundAssets(filePath, migrationRequests),
            );
          } finally {
            embeddedMaterializationDurationMs = materializationTimer.elapsedMs();
          }
        })()
      : normalizedProject;
    const serializationTimer = this.instrumentation.createTimer(`${options.operation}.serialization`);
    const serializedProject = serializeNarriumProjectFile(finalProject);

    serializationDurationMs = serializationTimer.elapsedMs();
    const writeTimer = this.instrumentation.createTimer(`${options.operation}.write`);
    const savedFilePath = await this.platformProjectFiles.writeProjectFile(
      filePath,
      serializedProject,
    );
    writeDurationMs = writeTimer.elapsedMs();
    this.instrumentation.recordSave({
      operation: options.operation,
      projectId: finalProject.id,
      projectFilePath: savedFilePath,
      projectMetrics: this.instrumentation.calculateProjectMetrics(finalProject),
      serializationDurationMs,
      writeDurationMs,
      embeddedMaterializationDurationMs,
      localAssetCopyDurationMs: options.localAssetCopyDurationMs,
      totalDurationMs: totalTimer.elapsedMs(),
    });

    return {
      filePath: savedFilePath,
      project: finalProject,
    };
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
