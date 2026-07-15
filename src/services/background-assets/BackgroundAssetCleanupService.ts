import type { Project } from '../../types';
import type {
  DeletedBackgroundFile,
  DeleteLocalBackgroundFilesResult,
  PlatformService,
} from '../platform';
import {
  collectProtectedLocalBackgroundPaths,
  normalizeBackgroundRelativePath,
  planBackgroundAssetCleanup,
  type BackgroundAssetCleanupReport,
  type PhysicalBackgroundFile,
} from './BackgroundAssetCleanupPlanner';

export interface BackgroundAssetCleanupDeletionResult extends DeleteLocalBackgroundFilesResult {
  requestedFiles: PhysicalBackgroundFile[];
  revalidatedOrphanFiles: PhysicalBackgroundFile[];
  skippedNewlyReferencedFiles: PhysicalBackgroundFile[];
  reclaimedBytes: number;
}

export interface DeleteBackgroundAssetCleanupInput {
  projectFilePath: string | null;
  orphanCandidates: PhysicalBackgroundFile[];
  getLatestProject: () => Project | null;
}

export class BackgroundAssetCleanupService {
  constructor(private readonly platformProjectFiles: PlatformService) {}

  canCleanUpLocalBackgroundFiles(projectFilePath: string | null): boolean {
    return this.platformProjectFiles.isDesktop() && Boolean(projectFilePath);
  }

  async scanLocalBackgroundFiles(
    project: Project,
    projectFilePath: string | null,
  ): Promise<BackgroundAssetCleanupReport> {
    const filePath = projectFilePath;

    if (!this.platformProjectFiles.isDesktop() || !filePath) {
      throw new Error('Local background cleanup is only available for saved desktop .narrium projects.');
    }

    const physicalFiles = await this.platformProjectFiles.listLocalBackgroundFiles(filePath);

    return planBackgroundAssetCleanup(project, physicalFiles);
  }

  async deleteOrphanedLocalBackgroundFiles(
    input: DeleteBackgroundAssetCleanupInput,
  ): Promise<BackgroundAssetCleanupDeletionResult> {
    const filePath = input.projectFilePath;

    if (!this.platformProjectFiles.isDesktop() || !filePath) {
      throw new Error('Local background cleanup is only available for saved desktop .narrium projects.');
    }

    const latestProject = input.getLatestProject();

    if (!latestProject) {
      throw new Error('No active project is available for cleanup.');
    }

    const protectedPaths = collectProtectedLocalBackgroundPaths(latestProject);
    const protectedRelativePaths = Array.from(protectedPaths.keys());
    const revalidatedOrphanFiles = input.orphanCandidates.filter(
      (file) => !protectedPaths.has(normalizeBackgroundRelativePath(file.relativePath)),
    );
    const skippedNewlyReferencedFiles = input.orphanCandidates.filter((file) =>
      protectedPaths.has(normalizeBackgroundRelativePath(file.relativePath)),
    );

    if (revalidatedOrphanFiles.length === 0) {
      return {
        requestedFiles: input.orphanCandidates,
        revalidatedOrphanFiles,
        skippedNewlyReferencedFiles,
        reclaimedBytes: 0,
        deleted: [],
        skipped: skippedNewlyReferencedFiles.map((file) => ({
          relativePath: normalizeBackgroundRelativePath(file.relativePath),
          reason: 'File became referenced before deletion.',
        })),
        failed: [],
      };
    }

    const result = await this.platformProjectFiles.deleteLocalBackgroundFiles(
      filePath,
      revalidatedOrphanFiles.map((file) => file.relativePath),
      protectedRelativePaths,
    );
    const deletedSizesByPath = new Map(
      revalidatedOrphanFiles.map((file) => [normalizeBackgroundRelativePath(file.relativePath), file.fileSize]),
    );
    const reclaimedBytes = result.deleted.reduce(
      (total, file) => total + getDeletedFileSize(file, deletedSizesByPath),
      0,
    );

    return {
      ...result,
      requestedFiles: input.orphanCandidates,
      revalidatedOrphanFiles,
      skippedNewlyReferencedFiles,
      skipped: [
        ...skippedNewlyReferencedFiles.map((file) => ({
          relativePath: normalizeBackgroundRelativePath(file.relativePath),
          reason: 'File became referenced before deletion.',
        })),
        ...result.skipped,
      ],
      reclaimedBytes,
    };
  }
}

function getDeletedFileSize(file: DeletedBackgroundFile, deletedSizesByPath: Map<string, number>): number {
  if (Number.isFinite(file.fileSize) && file.fileSize >= 0) {
    return file.fileSize;
  }

  return deletedSizesByPath.get(normalizeBackgroundRelativePath(file.relativePath)) ?? 0;
}
