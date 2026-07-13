import { describe, expect, it } from 'vitest';
import tauriConfig from '../../../src-tauri/tauri.conf.json';

describe('Tauri asset protocol config', () => {
  it('enables the asset protocol used by convertFileSrc for local background rendering', () => {
    const config = tauriConfig as {
      app?: {
        security?: {
          assetProtocol?: {
            enable?: boolean;
            scope?: string[];
          };
        };
      };
    };

    expect(config.app?.security?.assetProtocol).toEqual({
      enable: true,
      scope: ['**'],
    });
  });
});
