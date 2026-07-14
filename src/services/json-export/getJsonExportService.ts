import { DesktopJsonExportFileApi } from './DesktopJsonExportFileApi';
import {
  BrowserJsonExportService,
  DesktopJsonExportService,
  type JsonExportService,
} from './JsonExportService';

type TauriWindow = Window & {
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
};

const browserJsonExportService = new BrowserJsonExportService();
const desktopJsonExportService = new DesktopJsonExportService(new DesktopJsonExportFileApi());

function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const tauriWindow = window as TauriWindow;

  return Boolean(tauriWindow.__TAURI__ || tauriWindow.__TAURI_INTERNALS__);
}

export function getJsonExportService(): JsonExportService {
  return isTauriRuntime() ? desktopJsonExportService : browserJsonExportService;
}
