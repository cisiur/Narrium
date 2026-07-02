import { useEffect, useRef, useState } from 'react';
import type { NodeProps } from 'reactflow';
import { useCanvasStore, type SceneGroupFrameData } from '../../store/useCanvasStore';

export function SceneGroupFrame({ data }: NodeProps<SceneGroupFrameData>) {
  const selectedGroupId = useCanvasStore((state) => state.selectedGroupId);
  const selectGroup = useCanvasStore((state) => state.selectGroup);
  const updateSceneGroupCollapsed = useCanvasStore((state) => state.updateSceneGroupCollapsed);
  const updateSceneGroupName = useCanvasStore((state) => state.updateSceneGroupName);
  const [draftName, setDraftName] = useState(data.group.name);
  const cancelNextBlurRef = useRef(false);
  const isSelected = selectedGroupId === data.group.id;

  useEffect(() => {
    setDraftName(data.group.name);
  }, [data.group.name]);

  const commitName = () => {
    if (cancelNextBlurRef.current) {
      cancelNextBlurRef.current = false;
      setDraftName(data.group.name);
      return;
    }

    const nextName = draftName.trim() || 'Untitled Group';

    if (nextName !== data.group.name) {
      updateSceneGroupName(data.group.id, nextName);
    } else {
      setDraftName(data.group.name);
    }
  };

  return (
    <div
      className={[
        'pointer-events-none h-full w-full rounded-lg border bg-sky-500/10 text-sky-50 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.10)]',
        isSelected ? 'border-sky-200 ring-2 ring-sky-300/35' : 'border-sky-500/60',
      ].join(' ')}
    >
      <div
        className="nodrag nopan pointer-events-auto flex h-10 items-center gap-2 rounded-t-lg border-b border-sky-300/35 bg-sky-950/90 px-3 shadow-sm"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          selectGroup(data.group.id);
        }}
      >
        <input
          className="nodrag nopan nowheel min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-sky-50 outline-none focus:border-sky-300/70 focus:bg-gray-950/70"
          value={draftName}
          aria-label="Scene group name"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={commitName}
          onClick={(event) => {
            event.stopPropagation();
            selectGroup(data.group.id);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }

            if (event.key === 'Escape') {
              cancelNextBlurRef.current = true;
              setDraftName(data.group.name);
              event.currentTarget.blur();
            }

            event.stopPropagation();
          }}
        />
        <span className="shrink-0 rounded bg-sky-800/80 px-2 py-1 text-xs font-semibold text-sky-100">
          {data.sceneCount}
        </span>
        <button
          type="button"
          className="nodrag nopan rounded bg-sky-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-600"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            updateSceneGroupCollapsed(data.group.id, true);
          }}
        >
          Collapse
        </button>
      </div>
    </div>
  );
}
