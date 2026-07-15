import type { Project } from '../../types';
import {
  collectProtectedLocalBackgroundPaths,
  getBackgroundRelativePathComparisonKey,
  normalizeBackgroundRelativePath,
} from './BackgroundAssetCleanupPlanner';

export interface FingerprintedBackgroundFile {
  relativePath: string;
  fileName: string;
  fileSize: number;
  contentHash: string;
}

export interface DuplicateBackgroundFile extends FingerprintedBackgroundFile {
  referenced: boolean;
}

export interface BackgroundAssetDuplicateGroup {
  contentHash: string;
  files: DuplicateBackgroundFile[];
  referencedFiles: DuplicateBackgroundFile[];
  unreferencedFiles: DuplicateBackgroundFile[];
  totalSize: number;
  potentialReclaimableBytes: number;
}

export interface BackgroundAssetDuplicateReport {
  projectId: string;
  projectFilePath: string;
  groups: BackgroundAssetDuplicateGroup[];
  totalPotentialReclaimableBytes: number;
}

export function planBackgroundAssetDuplicates(
  project: Project,
  projectFilePath: string,
  physicalFiles: FingerprintedBackgroundFile[],
): BackgroundAssetDuplicateReport {
  const protectedPaths = collectProtectedLocalBackgroundPaths(project);
  const uniqueFilesByPath = new Map<string, DuplicateBackgroundFile>();

  for (const file of physicalFiles) {
    const normalizedPath = normalizeBackgroundRelativePath(file.relativePath);
    const comparisonKey = getBackgroundRelativePathComparisonKey(file.relativePath);

    if (!normalizedPath || !comparisonKey || uniqueFilesByPath.has(comparisonKey)) {
      continue;
    }

    uniqueFilesByPath.set(comparisonKey, {
      ...file,
      relativePath: normalizedPath,
      referenced: protectedPaths.has(comparisonKey),
    });
  }

  const filesByHash = new Map<string, DuplicateBackgroundFile[]>();

  for (const file of uniqueFilesByPath.values()) {
    const existing = filesByHash.get(file.contentHash) ?? [];
    existing.push(file);
    filesByHash.set(file.contentHash, existing);
  }

  const groups = Array.from(filesByHash.entries())
    .filter(([, files]) => files.length >= 2)
    .map(([contentHash, files]) => {
      const sortedFiles = [...files].sort(compareBackgroundFilesByPath);
      const totalSize = sortedFiles.reduce((total, file) => total + safeFileSize(file.fileSize), 0);
      const potentialReclaimableBytes = Math.max(0, totalSize - safeFileSize(sortedFiles[0]?.fileSize ?? 0));

      return {
        contentHash,
        files: sortedFiles,
        referencedFiles: sortedFiles.filter((file) => file.referenced),
        unreferencedFiles: sortedFiles.filter((file) => !file.referenced),
        totalSize,
        potentialReclaimableBytes,
      };
    })
    .sort((a, b) => compareBackgroundFilesByPath(a.files[0], b.files[0]));

  return {
    projectId: project.id,
    projectFilePath,
    groups,
    totalPotentialReclaimableBytes: groups.reduce(
      (total, group) => total + group.potentialReclaimableBytes,
      0,
    ),
  };
}

function compareBackgroundFilesByPath(
  a: Pick<FingerprintedBackgroundFile, 'relativePath'>,
  b: Pick<FingerprintedBackgroundFile, 'relativePath'>,
): number {
  const aKey = getBackgroundRelativePathComparisonKey(a.relativePath);
  const bKey = getBackgroundRelativePathComparisonKey(b.relativePath);
  const keyComparison = aKey.localeCompare(bKey);

  return keyComparison === 0
    ? normalizeBackgroundRelativePath(a.relativePath).localeCompare(normalizeBackgroundRelativePath(b.relativePath))
    : keyComparison;
}

function safeFileSize(fileSize: number): number {
  return Number.isFinite(fileSize) && fileSize > 0 ? fileSize : 0;
}
