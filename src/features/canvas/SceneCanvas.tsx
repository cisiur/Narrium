import { useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { SceneNode } from './SceneNode';

function SceneCanvasSurface() {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const onConnect = useCanvasStore((state) => state.onConnect);
  const selectScene = useCanvasStore((state) => state.selectScene);
  const selectChoice = useCanvasStore((state) => state.selectChoice);
  const syncFromProject = useCanvasStore((state) => state.syncFromProject);
  const nodeTypes = useMemo<NodeTypes>(() => ({ scene: SceneNode }), []);

  useEffect(() => {
    syncFromProject();
  }, [activeProject?.id, activeProject?.updatedAt, syncFromProject]);

  return (
    <div className="relative h-full min-h-[calc(100vh-3.5rem)] bg-gray-950">
      <ReactFlow
        className="bg-gray-950"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          const [sourceSceneId, choiceId] = edge.id.split(':');

          if (sourceSceneId && choiceId) {
            selectChoice(sourceSceneId, choiceId);
          }
        }}
        onPaneClick={() => selectScene(null)}
        fitView
      >
        <Background color="#4b5563" gap={24} size={1.5} variant={BackgroundVariant.Dots} />
        <Controls className="!border-gray-700 !bg-gray-900 !text-gray-100" />
        <MiniMap
          className="!bg-gray-900"
          maskColor="rgb(3 7 18 / 0.7)"
          nodeColor="#1f2937"
          nodeStrokeColor="#60a5fa"
          pannable
          zoomable
        />
      </ReactFlow>

      {nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg border border-gray-700 bg-gray-900/90 px-5 py-4 text-sm text-gray-200 shadow-xl">
            No scenes yet — click + Add Scene to get started
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SceneCanvas() {
  return (
    <ReactFlowProvider>
      <SceneCanvasSurface />
    </ReactFlowProvider>
  );
}
