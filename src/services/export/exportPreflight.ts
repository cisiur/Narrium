import type { PlatformService } from '../platform';
import type { AssetLibraryItem, Project } from '../../types';
import { collectReferencedBackgroundAssets } from './backgroundAssetReferences';

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

function getReferencedLocalAssets(project: Project) {
  return collectReferencedBackgroundAssets(project)
    .map((referencedAsset) => referencedAsset.asset)
    .filter((asset) => asset.storageType === 'local');
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
