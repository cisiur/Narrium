import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Scene } from '../../types';
import { BackgroundEditor } from './SceneEditorPanel';

function createScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 'scene-1',
    name: 'Scene 1',
    background: {
      mode: 'none',
      assetId: null,
      sourceSceneId: null,
      url: '',
    },
    position: { x: 0, y: 0 },
    dialoguePages: [],
    choices: [],
    groupId: null,
    ...overrides,
  };
}

describe('BackgroundEditor', () => {
  it('hides direct URL and Upload background source options while keeping Asset Library actions', () => {
    const html = renderToStaticMarkup(
      <BackgroundEditor scene={createScene()} scenes={[createScene()]} assets={[]} />,
    );

    expect(html).toContain('None');
    expect(html).toContain('Scene Reference');
    expect(html).toContain('Asset Library');
    expect(html).not.toContain('External Image URL');
    expect(html).not.toContain('Upload Image');
    expect(html).toContain('Add asset by URL');
    expect(html).toContain('Add asset by upload');
    expect(html).toContain('Add a background asset by upload or URL.');
  });
});
