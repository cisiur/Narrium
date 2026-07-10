import { Handle, Position, type NodeProps } from 'reactflow';
import {
  resolveLegacySceneBackgroundSource,
  resolveSceneBackgroundAsset,
  useAssetDisplaySource,
} from '../assets/assetDisplay';
import { useCanvasStore, type SceneNodeData } from '../../store/useCanvasStore';

interface ThumbnailResult {
  imageUrl: string | null;
  placeholder: string;
}

export function SceneNode({ id, data, selected }: NodeProps<SceneNodeData>) {
  const selectScene = useCanvasStore((state) => state.selectScene);
  const openEditor = useCanvasStore((state) => state.openEditor);
  const pageCount = data.scene.dialoguePages.length;
  const choiceCount = data.scene.choices.length;
  const project = {
    id: 'thumbnail-project',
    name: 'Thumbnail Project',
    thumbnail: null,
    startSceneId: '',
    scenes: data.scenes,
    characters: [],
    resources: [],
    variables: [],
    groups: [],
    assetLibrary: data.assetLibrary,
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '',
    updatedAt: '',
  };
  const asset = resolveSceneBackgroundAsset(project, data.scene);
  const assetSource = useAssetDisplaySource(asset, data.projectFilePath);
  const legacySource = resolveLegacySceneBackgroundSource(project, data.scene);
  const thumbnail: ThumbnailResult = {
    imageUrl: asset ? assetSource : legacySource,
    placeholder:
      data.scene.background.mode === 'scene_reference'
        ? 'Scene Reference'
        : asset || legacySource
          ? 'Missing Asset'
          : 'No Background',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
          return;
        }

        selectScene(id);
      }}
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
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-gray-300 !bg-gray-500" />
      <div className="mb-2 h-20 overflow-hidden rounded-md border border-gray-700 bg-gray-900">
        {thumbnail.imageUrl ? (
          <img
            src={thumbnail.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-[11px] font-medium text-gray-500">
            {thumbnail.placeholder}
          </div>
        )}
      </div>
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
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-gray-300 !bg-blue-500" />
    </div>
  );
}
