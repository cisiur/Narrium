import { Handle, Position, type NodeProps } from 'reactflow';
import { useCanvasStore, type CollapsedSceneGroupNodeData } from '../../store/useCanvasStore';

export function SceneGroupNode({ data, selected }: NodeProps<CollapsedSceneGroupNodeData>) {
  const selectGroup = useCanvasStore((state) => state.selectGroup);
  const updateSceneGroupCollapsed = useCanvasStore((state) => state.updateSceneGroupCollapsed);
  const ungroupSelectedGroup = useCanvasStore((state) => state.ungroupSelectedGroup);

  return (
    <div
      role="button"
      tabIndex={0}
      className={[
        'min-w-52 rounded-lg border bg-sky-950 px-3 py-3 text-left text-sky-50 shadow-xl transition',
        selected ? 'border-sky-300 ring-2 ring-sky-300/30' : 'border-sky-500/70 hover:border-sky-300',
      ].join(' ')}
      onClick={() => selectGroup(data.group.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          selectGroup(data.group.id);
        }
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-sky-200 !bg-sky-700" />
      <div className="mb-2 rounded border border-sky-400/30 bg-sky-900/80 px-2 py-2">
        <div className="text-sm font-semibold">{data.group.name}</div>
        <div className="mt-1 text-xs text-sky-200">
          {data.sceneCount} {data.sceneCount === 1 ? 'scene' : 'scenes'}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="nodrag rounded bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-500"
          onClick={(event) => {
            event.stopPropagation();
            updateSceneGroupCollapsed(data.group.id, false);
          }}
        >
          Expand
        </button>
        <button
          type="button"
          className="nodrag rounded bg-gray-700 px-2 py-1 text-xs font-semibold text-gray-100 hover:bg-gray-600"
          onClick={(event) => {
            event.stopPropagation();
            selectGroup(data.group.id);
            ungroupSelectedGroup();
          }}
        >
          Ungroup
        </button>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-sky-200 !bg-sky-400" />
    </div>
  );
}
