import type { PlatformService } from '../platform';
import type { AssetLibraryItem, Project } from '../../types';

export type ExportPreflightResult =
  | {
      status: 'safe';
      localAssets: AssetLibraryItem[];
    }
  | {
      status: 'warning';
      localAssets: AssetLibraryItem[];
    }
  | {
      status: 'blocked';
      localAssets: AssetLibraryItem[];
      missingLocalAssets: AssetLibraryItem[];
      message: string;
    };

export interface StandaloneHtmlExportPreflightUi {
  confirmLocalAssetWarning(localAssets: AssetLibraryItem[]): Promise<boolean>;
  showBlockedExportError(message: string, missingLocalAssets: AssetLibraryItem[]): void;
}

function getReferencedBackgroundAssetIds(project: Project) {
  const sceneById = new Map(project.scenes.map((scene) => [scene.id, scene]));
  const referencedAssetIds = new Set<string>();

  const collectDirectBackgroundAsset = (sceneId: string) => {
    const scene = sceneById.get(sceneId);

    if (scene?.background.mode === 'asset' && scene.background.assetId) {
      referencedAssetIds.add(scene.background.assetId);
    }
  };

  project.scenes.forEach((scene) => {
    if (scene.background.mode === 'asset' && scene.background.assetId) {
      referencedAssetIds.add(scene.background.assetId);
      return;
    }

    if (scene.background.mode === 'scene_reference' && scene.background.sourceSceneId) {
      collectDirectBackgroundAsset(scene.background.sourceSceneId);
    }
  });

  return referencedAssetIds;
}

function getReferencedLocalAssets(project: Project) {
  const referencedAssetIds = getReferencedBackgroundAssetIds(project);

  return project.assetLibrary.filter(
    (asset) => asset.storageType === 'local' && referencedAssetIds.has(asset.id),
  );
}

export async function validateStandaloneHtmlExport(
  project: Project,
  projectFilePath: string | null,
  platformService: Pick<PlatformService, 'resolveLocalAssetDisplaySource'>,
): Promise<ExportPreflightResult> {
  const localAssets = getReferencedLocalAssets(project);

  if (localAssets.length === 0) {
    return {
      status: 'safe',
      localAssets,
    };
  }

  if (!projectFilePath) {
    return {
      status: 'blocked',
      localAssets,
      missingLocalAssets: localAssets,
      message:
        'Standalone HTML export cannot verify local desktop assets until this project has a .narrium file path.',
    };
  }

  const resolvedAssets = await Promise.all(
    localAssets.map(async (asset) => ({
      asset,
      displaySource: await platformService
        .resolveLocalAssetDisplaySource(projectFilePath, asset.source)
        .catch(() => null),
    })),
  );
  const missingLocalAssets = resolvedAssets
    .filter((assetResult) => assetResult.displaySource === null)
    .map((assetResult) => assetResult.asset);

  if (missingLocalAssets.length > 0) {
    return {
      status: 'blocked',
      localAssets,
      missingLocalAssets,
      message:
        'Standalone HTML export was blocked because one or more local desktop assets could not be found.',
    };
  }

  return {
    status: 'warning',
    localAssets,
  };
}

export async function shouldProceedWithStandaloneHtmlExport(
  preflight: ExportPreflightResult,
  ui: StandaloneHtmlExportPreflightUi,
): Promise<boolean> {
  if (preflight.status === 'safe') {
    return true;
  }

  if (preflight.status === 'blocked') {
    ui.showBlockedExportError(preflight.message, preflight.missingLocalAssets);
    return false;
  }

  return ui.confirmLocalAssetWarning(preflight.localAssets);
}
