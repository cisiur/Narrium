import type {
  PlatformBackgroundAsset,
  PlatformName,
  PlatformProjectFile,
  PlatformProjectAssetApi,
  PlatformProjectFileApi,
  PlatformService,
  UnsavedChangesAction,
} from './PlatformService';

export class BrowserPlatformService implements PlatformService, PlatformProjectFileApi, PlatformProjectAssetApi {
  isBrowser(): boolean {
    return true;
  }

  isDesktop(): boolean {
    return false;
  }

  platformName(): PlatformName {
    return 'browser';
  }

  selectProjectFolder(): Promise<string | null> {
    return Promise.resolve(null);
  }

  readProjectFile(): Promise<PlatformProjectFile> {
    return Promise.reject(new Error('Project folders are only available in the desktop app.'));
  }

  writeProjectFile(): Promise<string> {
    return Promise.reject(new Error('Project folders are only available in the desktop app.'));
  }

  selectBackgroundImageFile(): Promise<string | null> {
    return Promise.resolve(null);
  }

  copyBackgroundImageToProject(): Promise<PlatformBackgroundAsset> {
    return Promise.reject(new Error('Local project assets are only available in the desktop app.'));
  }

  resolveProjectAssetUrl(): Promise<string> {
    return Promise.reject(new Error('Local project assets are only available in the desktop app.'));
  }

  confirmUnsavedChanges(projectName: string): Promise<UnsavedChangesAction> {
    const shouldSave = window.confirm(`Save changes to "${projectName}" before continuing?`);

    if (shouldSave) {
      return Promise.resolve('save');
    }

    const shouldDiscard = window.confirm(`Discard unsaved changes to "${projectName}"?`);

    return Promise.resolve(shouldDiscard ? 'discard' : 'cancel');
  }

  onCloseRequested(): Promise<() => void> {
    return Promise.resolve(() => undefined);
  }
}
