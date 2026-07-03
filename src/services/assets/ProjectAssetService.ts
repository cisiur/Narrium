import type { Project } from '../../types';
import type { PlatformBackgroundAsset, PlatformProjectAssetApi } from '../platform';
import { isProjectRelativeAssetPath } from './assetPaths';

export type ProjectAssetUrlMap = Record<string, string>;

export interface ProjectAssetService {
  canImportLocalBackgrounds(): boolean;
  importBackgroundImage(folderPath: string): Promise<PlatformBackgroundAsset | null>;
  resolveProjectAssetUrl(folderPath: string, relativePath: string): Promise<string>;
  resolveProjectAssetUrls(project: Project, folderPath: string | null): Promise<ProjectAssetUrlMap>;
}

export function resolveAssetUrl(url: string, assetUrls: ProjectAssetUrlMap): string {
  return assetUrls[url] ?? url;
}

export function collectProjectRelativeAssetPaths(project: Project): string[] {
  const paths = new Set<string>();

  for (const asset of project.assetLibrary) {
    if (asset.kind === 'background' && isProjectRelativeAssetPath(asset.url)) {
      paths.add(asset.url);
    }
  }

  for (const scene of project.scenes) {
    if (
      (scene.background.mode === 'upload' || scene.background.mode === 'url') &&
      isProjectRelativeAssetPath(scene.background.url)
    ) {
      paths.add(scene.background.url);
    }
  }

  return Array.from(paths);
}

export class DesktopProjectAssetService implements ProjectAssetService {
  constructor(private readonly platformAssets: PlatformProjectAssetApi) {}

  canImportLocalBackgrounds(): boolean {
    return true;
  }

  async importBackgroundImage(folderPath: string): Promise<PlatformBackgroundAsset | null> {
    const sourceFilePath = await this.platformAssets.selectBackgroundImageFile();

    if (!sourceFilePath) {
      return null;
    }

    return this.platformAssets.copyBackgroundImageToProject(folderPath, sourceFilePath);
  }

  resolveProjectAssetUrl(folderPath: string, relativePath: string): Promise<string> {
    return this.platformAssets.resolveProjectAssetUrl(folderPath, relativePath);
  }

  async resolveProjectAssetUrls(project: Project, folderPath: string | null): Promise<ProjectAssetUrlMap> {
    if (!folderPath) {
      return {};
    }

    const entries = await Promise.all(
      collectProjectRelativeAssetPaths(project).map(async (relativePath) => [
        relativePath,
        await this.resolveProjectAssetUrl(folderPath, relativePath),
      ] as const),
    );

    return Object.fromEntries(entries);
  }
}

export class BrowserProjectAssetService implements ProjectAssetService {
  canImportLocalBackgrounds(): boolean {
    return false;
  }

  importBackgroundImage(): Promise<PlatformBackgroundAsset | null> {
    return Promise.resolve(null);
  }

  resolveProjectAssetUrl(_folderPath: string, relativePath: string): Promise<string> {
    return Promise.resolve(relativePath);
  }

  resolveProjectAssetUrls(): Promise<ProjectAssetUrlMap> {
    return Promise.resolve({});
  }
}
