import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { PlatformName, PlatformProjectFileApi, ProjectFolderSelectionOptions, PlatformService } from './PlatformService';

export class DesktopPlatformService implements PlatformService, PlatformProjectFileApi {
  isBrowser(): boolean {
    return false;
  }

  isDesktop(): boolean {
    return true;
  }

  platformName(): PlatformName {
    return 'desktop';
  }

  async selectProjectFolder(options: ProjectFolderSelectionOptions): Promise<string | null> {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      title: options.title,
    });

    return typeof selectedPath === 'string' ? selectedPath : null;
  }

  readTextFile(filePath: string): Promise<string> {
    return invoke('read_text_file', { filePath });
  }

  writeProjectFile(folderPath: string, fileName: string, contents: string): Promise<string> {
    return invoke('write_project_file', { folderPath, fileName, contents });
  }
}
