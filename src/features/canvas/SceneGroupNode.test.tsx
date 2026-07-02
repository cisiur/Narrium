import { renderToStaticMarkup } from 'react-dom/server';
import { ReactFlowProvider } from 'reactflow';
import { describe, expect, it } from 'vitest';
import type { SceneGroup } from '../../types';
import { SceneGroupNode } from './SceneGroupNode';

function createGroup(): SceneGroup {
  return {
    id: 'group-1',
    name: 'Chapter 1',
    color: '#38bdf8',
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
    collapsed: true,
  };
}

function renderNode(sceneCount = 12) {
  return renderToStaticMarkup(
    <ReactFlowProvider>
      <SceneGroupNode
        id="group:group-1"
        type="sceneGroup"
        selected={false}
        dragging={false}
        zIndex={0}
        dragHandle={undefined}
        isConnectable={false}
        xPos={0}
        yPos={0}
        data={{ group: createGroup(), sceneCount }}
      />
    </ReactFlowProvider>,
  );
}

describe('SceneGroupNode', () => {
  it('renders collapsed group details', () => {
    const html = renderNode();

    expect(html).toContain('Chapter 1');
    expect(html).toContain('12 scenes');
  });

  it('renders Expand and Ungroup actions', () => {
    const html = renderNode();

    expect(html).toContain('Expand');
    expect(html).toContain('Ungroup');
  });
});
