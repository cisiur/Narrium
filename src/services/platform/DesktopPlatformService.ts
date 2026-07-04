import { invoke } from '@tauri-apps/api/core';
import { confirm, open, save } from '@tauri-apps/plugin-dialog';
import type {
  PlatformName,
  PlatformProjectFile,
  PlatformProjectFileApi,
  ProjectFileSaveOptions,
  ProjectFileSelectionOptions,
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

  async selectProjectFileToOpen(options: ProjectFileSelectionOptions): Promise<string | null> {
    const selectedPath = await open({
      directory: false,
      multiple: false,
      title: options.title,
      filters: [
        {
          name: 'Narrium Project',
          extensions: ['narrium'],
        },
        {
          name: 'Legacy JSON',
          extensions: ['json'],
        },
      ],
    });

    return typeof selectedPath === 'string' ? selectedPath : null;
  }

  async selectProjectFilePathForSaveAs(options: ProjectFileSaveOptions): Promise<string | null> {
    const selectedPath = await save({
      title: options.title,
      defaultPath: options.defaultFileName,
      filters: [
        {
          name: 'Narrium Project',
          extensions: ['narrium'],
        },
      ],
    });

    return typeof selectedPath === 'string' ? selectedPath : null;
  }

  async readProjectFile(filePath: string): Promise<PlatformProjectFile> {
    const [resolvedFilePath, contents] = await invoke<[string, string]>('read_project_file', { filePath });

    return {
      filePath: resolvedFilePath,
      contents,
    };
  }

  writeProjectFile(filePath: string, contents: string): Promise<string> {
    return invoke('write_project_file', { filePath, contents });
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
