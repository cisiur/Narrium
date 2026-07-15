export {
  resolveBackgroundAssetDisplaySource,
  resolveLocalBackgroundAssetDisplaySource,
} from './BackgroundAssetDisplayService';
export {
  applyMaterializedBackgroundAssets,
  parseEmbeddedBackgroundDataUrl,
  planEmbeddedBackgroundAssetMigration,
} from './BackgroundAssetMigrationService';
export {
  collectProtectedLocalBackgroundPaths,
  getBackgroundRelativePathComparisonKey,
  normalizeBackgroundRelativePath,
  planBackgroundAssetCleanup,
} from './BackgroundAssetCleanupPlanner';
export { BackgroundAssetCleanupService } from './BackgroundAssetCleanupService';
export { planBackgroundAssetDuplicates } from './BackgroundAssetDuplicatePlanner';
export { BackgroundAssetDuplicateService } from './BackgroundAssetDuplicateService';
export type {
  BackgroundAssetDisplayResolution,
  LocalAssetDisplayResolver,
} from './BackgroundAssetDisplayService';
export type {
  BackgroundAssetCleanupReport,
  MissingReferencedBackgroundFile,
  PhysicalBackgroundFile,
} from './BackgroundAssetCleanupPlanner';
export type {
  BackgroundAssetCleanupDeletionResult,
  DeleteBackgroundAssetCleanupInput,
} from './BackgroundAssetCleanupService';
export type {
  BackgroundAssetDuplicateGroup,
  BackgroundAssetDuplicateReport,
  DuplicateBackgroundFile,
  FingerprintedBackgroundFile,
} from './BackgroundAssetDuplicatePlanner';
export type {
  EmbeddedBackgroundAssetMaterializationRequest,
  EmbeddedBackgroundImageExtension,
  EmbeddedBackgroundImageMimeType,
  MaterializedBackgroundAsset,
  ParsedEmbeddedBackgroundDataUrl,
} from './BackgroundAssetMigrationService';
