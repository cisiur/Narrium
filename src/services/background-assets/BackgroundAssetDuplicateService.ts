import type { Project } from '../../types';
import type { PlatformService } from '../platform';
import {
  getPerformanceInstrumentationService,
  type PerformanceInstrumentationService,
} from '../performance';
import {
  planBackgroundAssetDuplicates,
  type BackgroundAssetDuplicateReport,
} from './BackgroundAssetDuplicatePlanner';

export class BackgroundAssetDuplicateService {
  constructor(
    private readonly platformProjectFiles: PlatformService,
    private readonly instrumentation: PerformanceInstrumentationService = getPerformanceInstrumentationService(),
  ) {}

  canFindDuplicateLocalBackgroundFiles(projectFilePath: string | null): boolean {
    return this.platformProjectFiles.isDesktop() && Boolean(projectFilePath);
  }

  async scanDuplicateLocalBackgroundFiles(
    project: Project,
    projectFilePath: string | null,
  ): Promise<BackgroundAssetDuplicateReport> {
    const filePath = projectFilePath;

    if (!this.platformProjectFiles.isDesktop() || !filePath) {
      throw new Error('Local background duplicate detection is only available for saved desktop .narrium projects.');
    }

    const fingerprintTimer = this.instrumentation.createTimer('background-duplicates.fingerprint');
    const fingerprintedFiles = await this.platformProjectFiles.fingerprintLocalBackgroundFiles(filePath);
    const report = planBackgroundAssetDuplicates(project, filePath, fingerprintedFiles);

    this.instrumentation.recordDuplicate({
      projectId: project.id,
      projectFilePath: filePath,
      fingerprintDurationMs: fingerprintTimer.elapsedMs(),
      scannedFileCount: fingerprintedFiles.length,
      duplicateGroupCount: report.groups.length,
    });

    return report;
  }
}
