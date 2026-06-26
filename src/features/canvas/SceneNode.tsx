import { Handle, Position, type NodeProps } from 'reactflow';
import { useCanvasStore, type SceneNodeData } from '../../store/useCanvasStore';

export function SceneNode({ id, data, selected }: NodeProps<SceneNodeData>) {
  const selectScene = useCanvasStore((state) => state.selectScene);
  const openEditor = useCanvasStore((state) => state.openEditor);
  const pageCount = data.scene.dialoguePages.length;
  const choiceCount = data.scene.choices.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => selectScene(id)}
      onDoubleClick={() => openEditor(id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          selectScene(id);
        }
      }}
      className={[
        'min-w-48 cursor-pointer rounded-lg border bg-gray-800 px-3 py-2 text-left text-gray-100 shadow-lg transition',
        selected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-600 hover:border-gray-400',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-gray-300 !bg-gray-500" />
      <div className="text-sm font-semibold">{data.scene.name}</div>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
        <span>
          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
        </span>
        <span aria-hidden="true">/</span>
        <span>
          {choiceCount} {choiceCount === 1 ? 'choice' : 'choices'}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-gray-300 !bg-blue-500" />
    </div>
  );
}
