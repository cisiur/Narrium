import type { AssetLibraryItem, Project } from '../../types';

export type EmbeddedBackgroundImageMimeType = 'image/png' | 'image/jpeg' | 'image/webp';
export type EmbeddedBackgroundImageExtension = 'png' | 'jpg' | 'webp';

export interface ParsedEmbeddedBackgroundDataUrl {
  mimeType: EmbeddedBackgroundImageMimeType;
  base64Data: string;
  extension: EmbeddedBackgroundImageExtension;
}

export interface EmbeddedBackgroundAssetMaterializationRequest {
  assetId: string;
  suggestedName: string;
  mimeType: EmbeddedBackgroundImageMimeType;
  base64Data: string;
}

export interface MaterializedBackgroundAsset {
  assetId: string;
  relativePath: string;
  mimeType: EmbeddedBackgroundImageMimeType;
  fileSize: number;
}

const MIME_TO_EXTENSION: Record<EmbeddedBackgroundImageMimeType, EmbeddedBackgroundImageExtension> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function isSupportedEmbeddedBackgroundMimeType(value: string): value is EmbeddedBackgroundImageMimeType {
  return value === 'image/png' || value === 'image/jpeg' || value === 'image/webp';
}

function describeAsset(asset: AssetLibraryItem): string {
  return `${asset.name || 'Unnamed asset'} (${asset.id})`;
}

function validateBase64PayloadStructure(payload: string): void {
  if (/\s/.test(payload)) {
    throw new Error('Embedded background Data URL base64 payload must not contain whitespace.');
  }

  if (/[^A-Za-z0-9+/=]/.test(payload)) {
    throw new Error('Embedded background Data URL base64 payload contains invalid characters.');
  }

  const firstPaddingIndex = payload.indexOf('=');

  if (firstPaddingIndex !== -1) {
    const padding = payload.slice(firstPaddingIndex);

    if (!/^=+$/.test(padding)) {
      throw new Error('Embedded background Data URL base64 padding must appear only at the end.');
    }

    if (padding.length > 2) {
      throw new Error('Embedded background Data URL base64 payload must not contain more than two padding characters.');
    }

    if (payload.length % 4 !== 0) {
      throw new Error('Embedded background Data URL base64 payload has an invalid length.');
    }
  } else if (payload.length % 4 === 1) {
    throw new Error('Embedded background Data URL base64 payload has an invalid length.');
  }
}

export function parseEmbeddedBackgroundDataUrl(source: string): ParsedEmbeddedBackgroundDataUrl {
  const commaIndex = source.indexOf(',');

  if (!source.startsWith('data:') || commaIndex === -1) {
    throw new Error('Embedded background source must be a valid Data URL.');
  }

  const header = source.slice(5, commaIndex);
  const payload = source.slice(commaIndex + 1);
  const headerParts = header.split(';');

  if (headerParts.length !== 2 || headerParts[0] === '' || headerParts[1].toLowerCase() !== 'base64') {
    throw new Error('Embedded background Data URL must use a supported image MIME type with ;base64.');
  }

  const rawMimeType = headerParts[0].toLowerCase();

  if (!rawMimeType.startsWith('image/')) {
    throw new Error('Embedded background Data URL must contain an image MIME type.');
  }

  const mimeType = rawMimeType;

  if (!isSupportedEmbeddedBackgroundMimeType(mimeType)) {
    throw new Error('Embedded background Data URL uses an unsupported image MIME type.');
  }

  if (payload.length === 0) {
    throw new Error('Embedded background Data URL must contain non-empty base64 data.');
  }

  validateBase64PayloadStructure(payload);

  return {
    mimeType,
    base64Data: payload,
    extension: MIME_TO_EXTENSION[mimeType],
  };
}

function isEmbeddedBackgroundAsset(asset: AssetLibraryItem): boolean {
  return asset.kind === 'background' && asset.storageType === 'embedded';
}

function isEligibleEmbeddedBackgroundAsset(asset: AssetLibraryItem): boolean {
  if (!isEmbeddedBackgroundAsset(asset)) {
    return false;
  }

  try {
    parseEmbeddedBackgroundDataUrl(asset.source);
    return true;
  } catch {
    return false;
  }
}

function createSuggestedName(asset: AssetLibraryItem): string {
  const namePart = asset.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  const cleanAssetId = asset.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const stableIdPart = cleanAssetId.slice(Math.max(0, cleanAssetId.length - 6)) || 'asset';

  return `${namePart || 'background'}-${stableIdPart}`;
}

export function planEmbeddedBackgroundAssetMigration(
  project: Project,
): EmbeddedBackgroundAssetMaterializationRequest[] {
  return project.assetLibrary.flatMap((asset) => {
    if (!isEmbeddedBackgroundAsset(asset)) {
      return [];
    }

    let parsedDataUrl: ParsedEmbeddedBackgroundDataUrl;

    try {
      parsedDataUrl = parseEmbeddedBackgroundDataUrl(asset.source);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown Data URL parsing error.';
      throw new Error(`Cannot plan embedded background migration for ${describeAsset(asset)}: ${reason}`);
    }

    return [
      {
        assetId: asset.id,
        suggestedName: createSuggestedName(asset),
        mimeType: parsedDataUrl.mimeType,
        base64Data: parsedDataUrl.base64Data,
      },
    ];
  });
}

export function applyMaterializedBackgroundAssets(
  project: Project,
  results: MaterializedBackgroundAsset[],
): Project {
  const resultsByAssetId = new Map<string, MaterializedBackgroundAsset>();

  for (const result of results) {
    if (resultsByAssetId.has(result.assetId)) {
      throw new Error(`Duplicate materialized background result for asset ${result.assetId}.`);
    }

    if (!result.relativePath.trim()) {
      throw new Error(`Materialized background result for asset ${result.assetId} has an empty relative path.`);
    }

    if (!Number.isFinite(result.fileSize) || result.fileSize < 0) {
      throw new Error(`Materialized background result for asset ${result.assetId} has an invalid file size.`);
    }

    if (!isSupportedEmbeddedBackgroundMimeType(result.mimeType)) {
      throw new Error(`Materialized background result for asset ${result.assetId} has an unsupported MIME type.`);
    }

    resultsByAssetId.set(result.assetId, result);
  }

  const assetsById = new Map(project.assetLibrary.map((asset) => [asset.id, asset]));
  const eligibleAssets = project.assetLibrary.filter(isEligibleEmbeddedBackgroundAsset);

  for (const result of results) {
    const asset = assetsById.get(result.assetId);

    if (!asset) {
      throw new Error(`Materialized background result references unknown asset ${result.assetId}.`);
    }

    if (!isEligibleEmbeddedBackgroundAsset(asset)) {
      throw new Error(`Materialized background result references non-eligible embedded background asset ${result.assetId}.`);
    }
  }

  for (const asset of eligibleAssets) {
    if (!resultsByAssetId.has(asset.id)) {
      throw new Error(`Missing materialized background result for embedded background asset ${asset.id}.`);
    }
  }

  if (eligibleAssets.length === 0 && results.length === 0) {
    return project;
  }

  return {
    ...project,
    assetLibrary: project.assetLibrary.map((asset) => {
      const result = resultsByAssetId.get(asset.id);

      if (!result) {
        return asset;
      }

      return {
        ...asset,
        storageType: 'local',
        source: result.relativePath,
        metadata: {
          ...asset.metadata,
          mimeType: result.mimeType,
          fileSize: result.fileSize,
        },
      };
    }),
  };
}
