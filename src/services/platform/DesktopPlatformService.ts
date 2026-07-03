import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { confirm, open } from '@tauri-apps/plugin-dialog';
import type {
  PlatformName,
  PlatformBackgroundAsset,
  PlatformProjectFile,
  PlatformProjectAssetApi,
  PlatformProjectFileApi,
  ProjectFolderSelectionOptions,
  PlatformService,
  UnsavedChangesAction,
} from './PlatformService';

export interface DesktopCloseRequestEvent {
  preventDefault(): void;
}

export async function handleDesktopCloseRequest(
  event: DesktopCloseRequestEvent,
  handler: () => Promise<boolean>,
  closeWindow: () => Promise<void>,
): Promise<void> {
  event.preventDefault();

  const shouldClose = await handler();

  if (shouldClose) {
    await closeWindow();
  }
}

export class DesktopPlatformService implements PlatformService, PlatformProjectFileApi, PlatformProjectAssetApi {
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

  async selectBackgroundImageFile(): Promise<string | null> {
    const selectedPath = await open({
      directory: false,
      multiple: false,
      title: 'Import Background Image',
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
        },
      ],
    });

    return typeof selectedPath === 'string' ? selectedPath : null;
  }

  async copyBackgroundImageToProject(
    folderPath: string,
    sourceFilePath: string,
  ): Promise<PlatformBackgroundAsset> {
    const [relativePath, filePath, fileName] = await invoke<[string, string, string]>(
      'copy_background_image_to_project',
      { folderPath, sourceFilePath },
    );

    return {
      relativePath,
      renderUrl: convertFileSrc(filePath),
      fileName,
    };
  }

  async resolveProjectAssetUrl(folderPath: string, relativePath: string): Promise<string> {
    const filePath = await invoke<string>('resolve_project_asset_path', { folderPath, relativePath });

    return convertFileSrc(filePath);
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
    const appWindow = getCurrentWindow();

    return appWindow.onCloseRequested(async (event) => {
      await handleDesktopCloseRequest(event, handler, () => appWindow.destroy());
    });
  }
}
