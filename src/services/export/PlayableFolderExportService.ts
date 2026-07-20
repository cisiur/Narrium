import type { Project } from '../../types';
import type { PlatformService, PlayableFolderExportResult } from '../platform';
import { createStandaloneHtml } from './standaloneHtmlExport';
import {
  createPlayableFolderExportPlan,
  getPlayableFolderName,
  type PlayableFolderExportPlan,
} from './playableFolderExportPlanner';

export type PlayableFolderExportServiceResult =
  | {
      status: 'success';
      outputDirectory: string;
      indexHtmlPath: string;
      copiedAssetCount: number;
      plan: PlayableFolderExportPlan;
    }
  | {
      status: 'canceled';
    };

export class PlayableFolderExportService {
  constructor(private readonly platformService: PlatformService) {}

  canExportPlayableFolder(): boolean {
    return this.platformService.isDesktop();
  }

  async exportProject(
    project: Project,
    projectFilePath: string | null,
  ): Promise<PlayableFolderExportServiceResult> {
    if (!this.canExportPlayableFolder()) {
      throw new Error('Playable folder export is only available in the desktop app.');
    }

    if (!projectFilePath) {
      throw new Error('Save this project as a .narrium file before exporting a playable folder.');
    }

    const plan = createPlayableFolderExportPlan(project);
    const folderName = getPlayableFolderName(project.name);
    const destinationParentDirectory = await this.platformService.selectPlayableFolderExportDestination({
      title: 'Choose Playable Folder Export Destination',
      defaultFolderName: folderName,
    });

    if (!destinationParentDirectory) {
      return {
        status: 'canceled',
      };
    }

    const indexHtml = createStandaloneHtml(plan.projectSnapshot, {
      resolveLocalAssetSources: true,
    });
    const writeResult: PlayableFolderExportResult = await this.platformService.writePlayableFolderExport({
      sourceProjectFilePath: projectFilePath,
      destinationParentDirectory,
      folderName,
      indexHtml,
      localAssetCopies: plan.localAssetCopies.map((copy) => ({
        sourceRelativePath: copy.sourceRelativePath,
        destinationRelativePath: copy.destinationRelativePath,
      })),
    });

    return {
      status: 'success',
      outputDirectory: writeResult.outputDirectory,
      indexHtmlPath: writeResult.indexHtmlPath,
      copiedAssetCount: writeResult.copiedAssetCount,
      plan,
    };
  }
}

