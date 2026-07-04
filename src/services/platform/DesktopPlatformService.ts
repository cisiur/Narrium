import { invoke } from '@tauri-apps/api/core';
import { confirm, open } from '@tauri-apps/plugin-dialog';
import type {
  PlatformName,
  PlatformProjectFile,
  PlatformProjectFileApi,
  ProjectFolderSelectionOptions,
  PlatformService,
  UnsavedChangesAction,
} from './PlatformService';

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

  async readProjectFile(folderPath: string, fileName: string): Promise<PlatformProjectFile> {
    const [filePath, contents] = await invoke<[string, string]>('read_project_file', { folderPath, fileName });

    return {
      filePath,
      contents,
    };
  }

  writeProjectFile(folderPath: string, fileName: string, contents: string): Promise<string> {
    return invoke('write_project_file', { folderPath, fileName, contents });
  }

  async confirmUnsavedChanges(projectName: string): Promise<UnsavedChangesAction> {
    const shouldSave = await confirm(`Save changes to "${projectName}" before continuing?`, {
      title: 'Unsaved Changes',
      kind: 'warning',
      okLabel: 'Save',
      cancelLabel: "Don't Save",
    });

    if (shouldSave) {
      return 'save';
    }

    const shouldDiscard = await confirm(`Discard unsaved changes to "${projectName}"?`, {
      title: 'Unsaved Changes',
      kind: 'warning',
      okLabel: "Don't Save",
      cancelLabel: 'Cancel',
    });

    return shouldDiscard ? 'discard' : 'cancel';
  }

  onCloseRequested(_handler: () => Promise<boolean>): Promise<() => void> {
    // TODO: Redesign native-close dirty protection. The previous async close guard
    // could trap the app, so native window close must pass through for now.
    return Promise.resolve(() => undefined);
  }
}
