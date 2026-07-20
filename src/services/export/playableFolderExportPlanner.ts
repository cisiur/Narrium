import type { AssetLibraryItem, Project } from '../../types';
import { collectReferencedBackgroundAssets } from './backgroundAssetReferences';

const BACKGROUND_EXPORT_DIR = 'assets/backgrounds';
const SUPPORTED_BACKGROUND_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

export type ReferencedBackgroundAssetStorageType = 'embedded' | 'remote' | 'local';

export interface PlayableFolderLocalAssetCopy {
  assetIds: string[];
  sourceRelativePath: string;
  destinationRelativePath: string;
}

export interface PlayableFolderExportPlan {
  projectSnapshot: Project;
  referencedBackgroundAssets: Array<{
    assetId: string;
    storageType: ReferencedBackgroundAssetStorageType;
    source: string;
  }>;
  localAssetCopies: PlayableFolderLocalAssetCopy[];
}

export class PlayableFolderExportPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlayableFolderExportPlanError';
  }
}

interface LocalAssetCandidate {
  asset: AssetLibraryItem;
  normalizedSource: string;
  comparisonKey: string;
}

interface LocalSourcePlan {
  assetIds: string[];
  normalizedSource: string;
  comparisonKey: string;
  destinationRelativePath: string;
}

export function createPlayableFolderExportPlan(project: Project): PlayableFolderExportPlan {
  const referencedBackgroundAssets = collectReferencedBackgroundAssets(project);
  const referencedBackgroundAssetIds = new Set(
    referencedBackgroundAssets.map((referencedAsset) => referencedAsset.asset.id),
  );
  const localCandidates = referencedBackgroundAssets
    .map(({ asset }) => asset)
    .filter((asset) => asset.storageType === 'local')
    .map(createLocalAssetCandidate);
  const localSourcePlans = createLocalSourcePlans(localCandidates);
  const destinationBySourceKey = new Map(
    localSourcePlans.map((sourcePlan) => [sourcePlan.comparisonKey, sourcePlan.destinationRelativePath]),
  );
  const projectSnapshot: Project = {
    ...project,
    scenes: project.scenes.map((scene) => ({
      ...scene,
      background: {
        ...scene.background,
      },
      dialoguePages: scene.dialoguePages.map((page) => ({ ...page })),
      choices: scene.choices.map((choice) => ({
        ...choice,
        conditionGroups: choice.conditionGroups.map((group) => ({
          ...group,
          conditions: group.conditions.map((condition) => ({ ...condition })),
        })),
        effects: choice.effects.map((effect) => ({ ...effect })),
      })),
      position: { ...scene.position },
    })),
    characters: project.characters.map((character) => ({
      ...character,
      attributes: character.attributes.map((attribute) => ({ ...attribute })),
    })),
    resources: project.resources.map((resource) => ({ ...resource })),
    variables: project.variables.map((variable) => ({ ...variable })),
    groups: project.groups.map((group) => ({
      ...group,
      position: { ...group.position },
      size: { ...group.size },
    })),
    assetLibrary: project.assetLibrary.filter((asset) => referencedBackgroundAssetIds.has(asset.id)).map((asset) => {
      if (asset.storageType !== 'local') {
        return {
          ...asset,
          metadata: asset.metadata ? { ...asset.metadata } : undefined,
        };
      }

      const normalizedSource = normalizeExportRelativePath(asset.source);
      const destinationRelativePath = destinationBySourceKey.get(getExportPathComparisonKey(normalizedSource));

      return {
        ...asset,
        source: destinationRelativePath ?? asset.source,
        metadata: asset.metadata ? { ...asset.metadata } : undefined,
      };
    }),
    settings: { ...project.settings },
  };

  return {
    projectSnapshot,
    referencedBackgroundAssets: referencedBackgroundAssets.map(({ asset }) => ({
      assetId: asset.id,
      storageType: asset.storageType,
      source: asset.source,
    })),
    localAssetCopies: localSourcePlans.map((sourcePlan) => ({
      assetIds: sourcePlan.assetIds,
      sourceRelativePath: sourcePlan.normalizedSource,
      destinationRelativePath: sourcePlan.destinationRelativePath,
    })),
  };
}

export function getPlayableFolderName(projectName: string): string {
  return sanitizePathSegment(projectName) || 'narrium-story';
}

function createLocalAssetCandidate(asset: AssetLibraryItem): LocalAssetCandidate {
  const normalizedSource = normalizeExportRelativePath(asset.source);

  validateLocalBackgroundSource(normalizedSource, asset.name);

  return {
    asset,
    normalizedSource,
    comparisonKey: getExportPathComparisonKey(normalizedSource),
  };
}

function createLocalSourcePlans(candidates: LocalAssetCandidate[]): LocalSourcePlan[] {
  const candidatesBySource = new Map<string, LocalSourcePlan>();

  for (const candidate of [...candidates].sort(compareLocalAssetCandidates)) {
    const existing = candidatesBySource.get(candidate.comparisonKey);

    if (existing) {
      existing.assetIds.push(candidate.asset.id);
      existing.assetIds.sort();
      continue;
    }

    candidatesBySource.set(candidate.comparisonKey, {
      assetIds: [candidate.asset.id],
      normalizedSource: candidate.normalizedSource,
      comparisonKey: candidate.comparisonKey,
      destinationRelativePath: '',
    });
  }

  const usedDestinationNames = new Set<string>();
  const localSourcePlans = Array.from(candidatesBySource.values()).sort((a, b) =>
    a.comparisonKey.localeCompare(b.comparisonKey),
  );

  return localSourcePlans.map((sourcePlan) => {
    const { stem, extension } = splitSupportedBackgroundFilename(sourcePlan.normalizedSource);
    const baseName = `${sanitizePathSegment(stem) || 'background'}.${extension}`;
    const destinationFileName = allocateCollisionSafeFilename(baseName, usedDestinationNames);

    return {
      ...sourcePlan,
      destinationRelativePath: `${BACKGROUND_EXPORT_DIR}/${destinationFileName}`,
    };
  });
}

function normalizeExportRelativePath(source: string): string {
  return source
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part.length > 0 && part !== '.')
    .join('/');
}

function validateLocalBackgroundSource(relativePath: string, assetName: string) {
  const parts = relativePath.split('/');

  if (relativePath === '') {
    throw new PlayableFolderExportPlanError(`Local background asset "${assetName}" has an empty file path.`);
  }

  if (/^[a-zA-Z]:\//.test(relativePath) || relativePath.startsWith('/') || relativePath.startsWith('//')) {
    throw new PlayableFolderExportPlanError(
      `Local background asset "${assetName}" must use a project-relative file path.`,
    );
  }

  if (parts.some((part) => part === '..')) {
    throw new PlayableFolderExportPlanError(
      `Local background asset "${assetName}" cannot use a path that escapes the project folder.`,
    );
  }

  if (parts.length !== 3 || parts[0] !== 'assets' || parts[1] !== 'backgrounds') {
    throw new PlayableFolderExportPlanError(
      `Local background asset "${assetName}" must be directly under assets/backgrounds/.`,
    );
  }

  splitSupportedBackgroundFilename(relativePath);
}

function splitSupportedBackgroundFilename(relativePath: string) {
  const fileName = relativePath.split('/').pop() ?? '';
  const extensionMatch = /\.([^.]+)$/.exec(fileName);
  const extension = extensionMatch?.[1]?.toLowerCase() ?? '';

  if (!SUPPORTED_BACKGROUND_EXTENSIONS.has(extension)) {
    throw new PlayableFolderExportPlanError(
      `Unsupported local background image format for ${relativePath}. Use PNG, JPG, JPEG, or WEBP.`,
    );
  }

  return {
    stem: fileName.slice(0, -(extension.length + 1)),
    extension,
  };
}

function allocateCollisionSafeFilename(baseName: string, usedDestinationNames: Set<string>): string {
  const extensionIndex = baseName.lastIndexOf('.');
  const stem = extensionIndex === -1 ? baseName : baseName.slice(0, extensionIndex);
  const extension = extensionIndex === -1 ? '' : baseName.slice(extensionIndex);
  let candidate = baseName;
  let suffix = 2;

  while (usedDestinationNames.has(candidate.toLowerCase())) {
    candidate = `${stem}-${suffix}${extension}`;
    suffix += 1;
  }

  usedDestinationNames.add(candidate.toLowerCase());
  return candidate;
}

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getExportPathComparisonKey(relativePath: string): string {
  return normalizeExportRelativePath(relativePath).toLowerCase();
}

function compareLocalAssetCandidates(a: LocalAssetCandidate, b: LocalAssetCandidate): number {
  const sourceComparison = a.comparisonKey.localeCompare(b.comparisonKey);

  return sourceComparison === 0 ? a.asset.id.localeCompare(b.asset.id) : sourceComparison;
}
