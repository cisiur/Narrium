import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SceneGroup } from '../../types';
import { SceneGroupFrame } from './SceneGroupFrame';

function createGroup(): SceneGroup {
  return {
    id: 'group-1',
    name: 'Chapter 1',
    color: '#38bdf8',
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
    collapsed: false,
  };
}

function renderFrame(sceneCount = 12) {
  return renderToStaticMarkup(
    <SceneGroupFrame
      id="group:group-1"
      type="sceneGroupFrame"
      selected={false}
      dragging={false}
      zIndex={0}
      dragHandle={undefined}
      isConnectable={false}
      xPos={0}
      yPos={0}
      data={{ group: createGroup(), sceneCount }}
    />,
  );
}

describe('SceneGroupFrame', () => {
  it('renders the expanded group frame', () => {
    const html = renderFrame();

    expect(html).toContain('Scene group name');
    expect(html).toContain('Chapter 1');
  });

  it('displays the scene count', () => {
    const html = renderFrame();

    expect(html).toContain('(12)');
  });

  it('renders a Collapse action', () => {
    const html = renderFrame();

    expect(html).toContain('Collapse');
  });
});
