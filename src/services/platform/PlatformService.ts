export type PlatformName = 'browser' | 'desktop';

export interface ProjectFolderSelectionOptions {
  title: string;
}

export interface PlatformProjectFile {
  filePath: string;
  contents: string;
}

export type UnsavedChangesAction = 'save' | 'discard' | 'cancel';

export interface PlatformProjectFileApi {
  selectProjectFolder(options: ProjectFolderSelectionOptions): Promise<string | null>;
  readProjectFile(folderPath: string, fileName: string): Promise<PlatformProjectFile>;
  writeProjectFile(folderPath: string, fileName: string, contents: string): Promise<string>;
}

export interface PlatformService extends PlatformProjectFileApi {
  isBrowser(): boolean;
  isDesktop(): boolean;
  platformName(): PlatformName;
  confirmUnsavedChanges(projectName: string): Promise<UnsavedChangesAction>;
  onCloseRequested(handler: () => Promise<boolean>): Promise<() => void>;
}
