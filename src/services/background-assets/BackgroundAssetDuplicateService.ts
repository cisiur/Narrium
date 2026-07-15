import type { Project } from '../../types';
import type { PlatformService } from '../platform';
import {
  planBackgroundAssetDuplicates,
  type BackgroundAssetDuplicateReport,
} from './BackgroundAssetDuplicatePlanner';

export class BackgroundAssetDuplicateService {
  constructor(private readonly platformProjectFiles: PlatformService) {}

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

    const fingerprintedFiles = await this.platformProjectFiles.fingerprintLocalBackgroundFiles(filePath);

    return planBackgroundAssetDuplicates(project, filePath, fingerprintedFiles);
  }
}
