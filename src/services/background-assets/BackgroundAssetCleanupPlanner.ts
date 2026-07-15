import type { Project } from '../../types';

export interface PhysicalBackgroundFile {
  relativePath: string;
  fileName: string;
  fileSize: number;
}

export interface MissingReferencedBackgroundFile {
  relativePath: string;
  assetIds: string[];
}

export interface ProtectedLocalBackgroundPath {
  relativePath: string;
  assetIds: string[];
}

export interface BackgroundAssetCleanupReport {
  projectId: string;
  projectFilePath: string;
  referencedFiles: PhysicalBackgroundFile[];
  orphanedFiles: PhysicalBackgroundFile[];
  missingReferencedFiles: MissingReferencedBackgroundFile[];
  protectedRelativePaths: string[];
}

export function normalizeBackgroundRelativePath(source: string): string {
  return source
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part.length > 0 && part !== '.')
    .join('/');
}

export function getBackgroundRelativePathComparisonKey(source: string): string {
  return normalizeBackgroundRelativePath(source).toLowerCase();
}

export function collectProtectedLocalBackgroundPaths(project: Project): Map<string, ProtectedLocalBackgroundPath> {
  const protectedPaths = new Map<string, ProtectedLocalBackgroundPath>();

  for (const asset of project.assetLibrary) {
    if (asset.kind !== 'background' || asset.storageType !== 'local') {
      continue;
    }

    const normalizedPath = normalizeBackgroundRelativePath(asset.source);
    const comparisonKey = getBackgroundRelativePathComparisonKey(asset.source);

    if (!normalizedPath || !comparisonKey) {
      continue;
    }

    const existing = protectedPaths.get(comparisonKey);

    protectedPaths.set(
      comparisonKey,
      existing
        ? {
            relativePath: existing.relativePath,
            assetIds: [...existing.assetIds, asset.id],
          }
        : {
            relativePath: normalizedPath,
            assetIds: [asset.id],
          },
    );
  }

  return protectedPaths;
}

export function planBackgroundAssetCleanup(
  project: Project,
  projectFilePath: string,
  physicalFiles: PhysicalBackgroundFile[],
): BackgroundAssetCleanupReport {
  const protectedPaths = collectProtectedLocalBackgroundPaths(project);
  const physicalFilesByKey = new Map<string, PhysicalBackgroundFile>();

  for (const file of physicalFiles) {
    const normalizedPath = normalizeBackgroundRelativePath(file.relativePath);
    const comparisonKey = getBackgroundRelativePathComparisonKey(file.relativePath);

    if (!normalizedPath || !comparisonKey || physicalFilesByKey.has(comparisonKey)) {
      continue;
    }

    physicalFilesByKey.set(comparisonKey, {
      ...file,
      relativePath: normalizedPath,
    });
  }

  const referencedFiles: PhysicalBackgroundFile[] = [];
  const orphanedFiles: PhysicalBackgroundFile[] = [];

  for (const [comparisonKey, file] of physicalFilesByKey.entries()) {
    if (protectedPaths.has(comparisonKey)) {
      referencedFiles.push(file);
    } else {
      orphanedFiles.push(file);
    }
  }

  const missingReferencedFiles = Array.from(protectedPaths.entries())
    .filter(([comparisonKey]) => !physicalFilesByKey.has(comparisonKey))
    .map(([, protectedPath]) => ({
      relativePath: protectedPath.relativePath,
      assetIds: protectedPath.assetIds,
    }));

  return {
    projectId: project.id,
    projectFilePath,
    referencedFiles,
    orphanedFiles,
    missingReferencedFiles,
    protectedRelativePaths: Array.from(protectedPaths.values()).map((path) => path.relativePath),
  };
}
