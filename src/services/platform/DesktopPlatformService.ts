import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { confirm, open, save } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type {
  ImportedBackgroundAssetFile,
  PlatformName,
  PlatformProjectFile,
  PlatformProjectFileApi,
  ProjectFileSaveOptions,
  ProjectFileSelectionOptions,
  PlatformService,
  UnsavedChangesAction,
} from './PlatformService';

interface NativeCloseEvent {
  preventDefault(): void;
}

interface NativeWindowCloseApi {
  onCloseRequested(handler: (event: NativeCloseEvent) => void | Promise<void>): Promise<() => void>;
  destroy(): Promise<void>;
}

export class DesktopPlatformService implements PlatformService, PlatformProjectFileApi {
  private isCloseDecisionPending = false;

  constructor(private readonly getNativeWindow: () => NativeWindowCloseApi = getCurrentWindow) {}

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

  async importBackgroundAssetFile(projectFilePath: string): Promise<ImportedBackgroundAssetFile | null> {
    const selectedPath = await open({
      directory: false,
      multiple: false,
      title: 'Import Background Image',
      filters: [
        {
          name: 'Background Image',
          extensions: ['png', 'jpg', 'jpeg', 'webp'],
        },
      ],
    });

    if (typeof selectedPath !== 'string') {
      return null;
    }

    const [name, relativePath, mimeType, fileSize] = await invoke<[string, string, string, number]>(
      'import_background_asset_file',
      {
        projectFilePath,
        sourceFilePath: selectedPath,
      },
    );

    return {
      name,
      relativePath,
      mimeType,
      fileSize,
    };
  }

  async resolveLocalAssetDisplaySource(
    projectFilePath: string,
    relativePath: string,
  ): Promise<string | null> {
    try {
      const absolutePath = await invoke<string>('resolve_local_asset_file', {
        projectFilePath,
        relativePath,
      });

      return convertFileSrc(absolutePath);
    } catch {
      return null;
    }
  }

  copyLocalAssetForProjectSaveAs(
    sourceProjectFilePath: string,
    destinationProjectFilePath: string,
    relativePath: string,
  ): Promise<void> {
    return invoke('copy_local_asset_for_project_save_as', {
      sourceProjectFilePath,
      destinationProjectFilePath,
      relativePath,
    });
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

  async onCloseRequested(handler: () => Promise<boolean>): Promise<() => void> {
    const nativeWindow = this.getNativeWindow();

    return nativeWindow.onCloseRequested(async (event) => {
      event.preventDefault();

      if (this.isCloseDecisionPending) {
        return;
      }

      this.isCloseDecisionPending = true;

      try {
        const canClose = await handler();

        if (!canClose) {
          return;
        }

        await nativeWindow.destroy();
      } finally {
        this.isCloseDecisionPending = false;
      }
    });
  }
}
