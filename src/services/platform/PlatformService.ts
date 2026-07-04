export type PlatformName = 'browser' | 'desktop';

export interface ProjectFileSelectionOptions {
  title: string;
}

export interface ProjectFileSaveOptions {
  title: string;
  defaultFileName: string;
}

export interface PlatformProjectFile {
  filePath: string;
  contents: string;
}

export type UnsavedChangesAction = 'save' | 'discard' | 'cancel';

export interface PlatformProjectFileApi {
  selectProjectFileToOpen(options: ProjectFileSelectionOptions): Promise<string | null>;
  selectProjectFilePathForSaveAs(options: ProjectFileSaveOptions): Promise<string | null>;
  readProjectFile(filePath: string): Promise<PlatformProjectFile>;
  writeProjectFile(filePath: string, contents: string): Promise<string>;
}

export interface PlatformService extends PlatformProjectFileApi {
  isBrowser(): boolean;
  isDesktop(): boolean;
  platformName(): PlatformName;
  confirmUnsavedChanges(projectName: string): Promise<UnsavedChangesAction>;
  onCloseRequested(handler: () => Promise<boolean>): Promise<() => void>;
}
