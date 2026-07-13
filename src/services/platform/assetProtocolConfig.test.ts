import { describe, expect, it } from 'vitest';
import tauriConfig from '../../../src-tauri/tauri.conf.json';

describe('Tauri asset protocol config', () => {
  it('limits the asset protocol to project-local background images', () => {
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
      scope: [
        '**/assets/backgrounds/*.png',
        '**/assets/backgrounds/*.jpg',
        '**/assets/backgrounds/*.jpeg',
        '**/assets/backgrounds/*.webp',
      ],
    });
    expect(config.app?.security?.assetProtocol?.scope).not.toContain('**');
  });
});
