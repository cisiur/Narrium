import type {
  PlatformName,
  PlatformProjectFile,
  PlatformProjectFileApi,
  PlatformService,
  UnsavedChangesAction,
} from './PlatformService';

export class BrowserPlatformService implements PlatformService, PlatformProjectFileApi {
  isBrowser(): boolean {
    return true;
  }

  isDesktop(): boolean {
    return false;
  }

  platformName(): PlatformName {
    return 'browser';
  }

  selectProjectFileToOpen(): Promise<string | null> {
    return Promise.resolve(null);
  }

  selectProjectFilePathForSaveAs(): Promise<string | null> {
    return Promise.resolve(null);
  }

  readProjectFile(): Promise<PlatformProjectFile> {
    return Promise.reject(new Error('Project files are only available in the desktop app.'));
  }

  writeProjectFile(): Promise<string> {
    return Promise.reject(new Error('Project files are only available in the desktop app.'));
  }

  importBackgroundAssetFile(): Promise<null> {
    return Promise.resolve(null);
  }

  resolveLocalAssetDisplaySource(): Promise<null> {
    return Promise.resolve(null);
  }

  copyLocalAssetForProjectSaveAs(): Promise<void> {
    return Promise.resolve();
  }

  confirmUnsavedChanges(projectName: string): Promise<UnsavedChangesAction> {
    const shouldSave = window.confirm(`Save changes to "${projectName}" before continuing?`);

    if (shouldSave) {
      return Promise.resolve('save');
    }

    const shouldDiscard = window.confirm(`Discard unsaved changes to "${projectName}"?`);

    return Promise.resolve(shouldDiscard ? 'discard' : 'cancel');
  }

  onCloseRequested(_handler?: () => Promise<boolean>): Promise<() => void> {
    return Promise.resolve(() => undefined);
  }
}
