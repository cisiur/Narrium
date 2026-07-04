import { describe, expect, it } from 'vitest';
import tauriConfig from '../../../src-tauri/tauri.conf.json';

describe('Tauri asset protocol config', () => {
  it('keeps the desktop asset protocol enabled for local media URLs', () => {
    expect(tauriConfig.app.security.assetProtocol).toMatchObject({
      enable: true,
      scope: [],
    });
  });
});
