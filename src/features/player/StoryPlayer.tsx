import { useState } from 'react';
import type { Project } from '../../types';
import { createInitialRuntimeState } from './runtimeState';

interface StoryPlayerProps {
  project: Project;
  onExitPreview: () => void;
}

export function StoryPlayer({ project, onExitPreview }: StoryPlayerProps) {
  const [runtimeState] = useState(() => createInitialRuntimeState(project));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">Preview</p>
        <button
          type="button"
          onClick={onExitPreview}
          className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
        >
          Exit Preview
        </button>
      </header>

      <main className="p-6">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-gray-400">currentSceneId</dt>
            <dd className="mt-1 text-gray-100">{runtimeState.currentSceneId}</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-400">currentPageIndex</dt>
            <dd className="mt-1 text-gray-100">{runtimeState.currentPageIndex}</dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
