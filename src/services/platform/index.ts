export { BrowserPlatformService } from './BrowserPlatformService';
export { DesktopPlatformService } from './DesktopPlatformService';
export { getPlatformService } from './getPlatformService';
export type {
  EmbeddedBackgroundAssetMaterializationRequest,
  MaterializedBackgroundAsset,
} from '../background-assets/BackgroundAssetMigrationService';
export type {
  PlatformName,
  PlatformAppPreferencesApi,
  DeleteLocalBackgroundFilesResult,
  DeletedBackgroundFile,
  FailedBackgroundFileDeletion,
  FingerprintedBackgroundFile,
  PlatformProjectFile,
  PlatformProjectFileApi,
  PlatformService,
  PhysicalBackgroundFile,
  ProjectFileSaveOptions,
  ProjectFileSelectionOptions,
  SkippedBackgroundFileDeletion,
  UnsavedChangesAction,
} from './PlatformService';
