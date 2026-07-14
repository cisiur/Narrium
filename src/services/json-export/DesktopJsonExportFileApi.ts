import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import type { JsonExportFileApi, JsonExportSaveDialogOptions } from './JsonExportService';

export class DesktopJsonExportFileApi implements JsonExportFileApi {
  async selectJsonExportPath(options: JsonExportSaveDialogOptions): Promise<string | null> {
    const selectedPath = await save({
      title: options.title,
      defaultPath: options.defaultFileName,
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    });

    return typeof selectedPath === 'string' ? selectedPath : null;
  }

  writeJsonExportFile(filePath: string, contents: string): Promise<string> {
    return invoke('write_json_export_file', { filePath, contents });
  }
}
