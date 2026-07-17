import type {
  EmbeddedBackgroundAssetMaterializationRequest,
  MaterializedBackgroundAsset,
} from '../background-assets/BackgroundAssetMigrationService';

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

export interface ImportedBackgroundAssetFile {
  name: string;
  relativePath: string;
  mimeType: string;
  fileSize: number;
}

export interface PhysicalBackgroundFile {
  relativePath: string;
  fileName: string;
  fileSize: number;
}

export interface FingerprintedBackgroundFile extends PhysicalBackgroundFile {
  contentHash: string;
}

export interface DeletedBackgroundFile {
  relativePath: string;
  fileSize: number;
}

export interface SkippedBackgroundFileDeletion {
  relativePath: string;
  reason: string;
}

export interface FailedBackgroundFileDeletion {
  relativePath: string;
  error: string;
}

export interface DeleteLocalBackgroundFilesResult {
  deleted: DeletedBackgroundFile[];
  skipped: SkippedBackgroundFileDeletion[];
  failed: FailedBackgroundFileDeletion[];
}

export type UnsavedChangesAction = 'save' | 'discard' | 'cancel';

export interface PlatformProjectFileApi {
  selectProjectFileToOpen(options: ProjectFileSelectionOptions): Promise<string | null>;
  selectProjectFilePathForSaveAs(options: ProjectFileSaveOptions): Promise<string | null>;
  trustExistingProjectFile(filePath: string): Promise<string>;
  readProjectFile(filePath: string): Promise<PlatformProjectFile>;
  writeProjectFile(filePath: string, contents: string): Promise<string>;
  importBackgroundAssetFile(projectFilePath: string): Promise<ImportedBackgroundAssetFile | null>;
  resolveLocalAssetDisplaySource(projectFilePath: string, relativePath: string): Promise<string | null>;
  copyLocalAssetForProjectSaveAs(
    sourceProjectFilePath: string,
    destinationProjectFilePath: string,
    relativePath: string,
  ): Promise<void>;
  materializeEmbeddedBackgroundAssets(
    projectFilePath: string,
    assets: EmbeddedBackgroundAssetMaterializationRequest[],
  ): Promise<MaterializedBackgroundAsset[]>;
  listLocalBackgroundFiles(projectFilePath: string): Promise<PhysicalBackgroundFile[]>;
  fingerprintLocalBackgroundFiles(projectFilePath: string): Promise<FingerprintedBackgroundFile[]>;
  deleteLocalBackgroundFiles(
    projectFilePath: string,
    relativePaths: string[],
    protectedRelativePaths: string[],
  ): Promise<DeleteLocalBackgroundFilesResult>;
}

export interface PlatformAppPreferencesApi {
  readAppPreferences(): Promise<string | null>;
  writeAppPreferences(contents: string): Promise<void>;
}

export interface PlatformService extends PlatformProjectFileApi, PlatformAppPreferencesApi {
  isBrowser(): boolean;
  isDesktop(): boolean;
  platformName(): PlatformName;
  confirmUnsavedChanges(projectName: string): Promise<UnsavedChangesAction>;
  onCloseRequested(handler: () => Promise<boolean>): Promise<() => void>;
}
