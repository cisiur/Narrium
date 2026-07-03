export type PlatformName = 'browser' | 'desktop';

export interface ProjectFolderSelectionOptions {
  title: string;
}

export interface PlatformProjectFileApi {
  selectProjectFolder(options: ProjectFolderSelectionOptions): Promise<string | null>;
  readTextFile(filePath: string): Promise<string>;
  writeProjectFile(folderPath: string, fileName: string, contents: string): Promise<string>;
}

export interface PlatformService extends PlatformProjectFileApi {
  isBrowser(): boolean;
  isDesktop(): boolean;
  platformName(): PlatformName;
}
