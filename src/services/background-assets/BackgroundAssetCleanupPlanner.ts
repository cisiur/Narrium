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

export interface BackgroundAssetCleanupReport {
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

export function collectProtectedLocalBackgroundPaths(project: Project): Map<string, string[]> {
  const protectedPaths = new Map<string, string[]>();

  for (const asset of project.assetLibrary) {
    if (asset.kind !== 'background' || asset.storageType !== 'local') {
      continue;
    }

    const normalizedPath = normalizeBackgroundRelativePath(asset.source);

    if (!normalizedPath) {
      continue;
    }

    protectedPaths.set(normalizedPath, [...(protectedPaths.get(normalizedPath) ?? []), asset.id]);
  }

  return protectedPaths;
}

export function planBackgroundAssetCleanup(
  project: Project,
  physicalFiles: PhysicalBackgroundFile[],
): BackgroundAssetCleanupReport {
  const protectedPaths = collectProtectedLocalBackgroundPaths(project);
  const physicalFilesByPath = new Map<string, PhysicalBackgroundFile>();

  for (const file of physicalFiles) {
    const normalizedPath = normalizeBackgroundRelativePath(file.relativePath);

    if (!normalizedPath || physicalFilesByPath.has(normalizedPath)) {
      continue;
    }

    physicalFilesByPath.set(normalizedPath, {
      ...file,
      relativePath: normalizedPath,
    });
  }

  const referencedFiles: PhysicalBackgroundFile[] = [];
  const orphanedFiles: PhysicalBackgroundFile[] = [];

  for (const file of physicalFilesByPath.values()) {
    if (protectedPaths.has(file.relativePath)) {
      referencedFiles.push(file);
    } else {
      orphanedFiles.push(file);
    }
  }

  const missingReferencedFiles = Array.from(protectedPaths.entries())
    .filter(([relativePath]) => !physicalFilesByPath.has(relativePath))
    .map(([relativePath, assetIds]) => ({
      relativePath,
      assetIds,
    }));

  return {
    referencedFiles,
    orphanedFiles,
    missingReferencedFiles,
    protectedRelativePaths: Array.from(protectedPaths.keys()),
  };
}
