import { useState } from 'react';
import type { Project, Scene } from '../../types';
import {
  applyEffects,
  isChoiceAvailable,
  resolveUnavailableChoiceHint,
} from '../story-logic/runtimeLogic';
import { createInitialRuntimeState } from './runtimeState';

interface StoryPlayerProps {
  project: Project;
  onExitPreview: () => void;
}

function resolveDirectBackgroundUrl(project: Project, scene: Scene): string | null {
  if (scene.background.mode === 'url' || scene.background.mode === 'upload') {
    return scene.background.url || null;
  }

  if (scene.background.mode === 'asset' && scene.background.assetId) {
    return project.assetLibrary.find((asset) => asset.id === scene.background.assetId)?.url ?? null;
  }

  return null;
}

function resolveSceneBackgroundUrl(project: Project, scene: Scene): string | null {
  if (scene.background.mode === 'scene_reference' && scene.background.sourceSceneId) {
    const referencedScene = project.scenes.find(
      (candidate) => candidate.id === scene.background.sourceSceneId,
    );

    return referencedScene ? resolveDirectBackgroundUrl(project, referencedScene) : null;
  }

  return resolveDirectBackgroundUrl(project, scene);
}

function resolveSpeakerName(project: Project, speakerId: string | null): string {
  if (speakerId === null) {
    return 'Narrator';
  }

  return project.characters.find((character) => character.id === speakerId)?.name ?? 'Unknown Speaker';
}

export function StoryPlayer({ project, onExitPreview }: StoryPlayerProps) {
  const [runtimeState, setRuntimeState] = useState(() => createInitialRuntimeState(project));
  const currentScene =
    project.scenes.find((scene) => scene.id === runtimeState.currentSceneId) ?? null;
  const currentPage = currentScene?.dialoguePages[runtimeState.currentPageIndex] ?? null;
  const backgroundUrl = currentScene ? resolveSceneBackgroundUrl(project, currentScene) : null;
  const speakerName = currentPage ? resolveSpeakerName(project, currentPage.speakerId) : null;
  const hasNextPage = currentScene
    ? runtimeState.currentPageIndex < currentScene.dialoguePages.length - 1
    : false;
  const visibleChoices = currentScene && currentPage && !hasNextPage ? currentScene.choices : [];
  const isEndOfStory = Boolean(currentScene && currentPage && !hasNextPage && visibleChoices.length === 0);

  const goToChoiceTarget = (choice: NonNullable<typeof currentScene>['choices'][number]) => {
    const targetSceneId = choice.targetSceneId;

    if (
      !isChoiceAvailable(choice, project, runtimeState) ||
      !targetSceneId ||
      !project.scenes.some((scene) => scene.id === targetSceneId)
    ) {
      return;
    }

    setRuntimeState((current) => ({
      ...applyEffects(choice, project, current),
      currentSceneId: targetSceneId,
      currentPageIndex: 0,
    }));
  };

  const goToNextPage = () => {
    if (!currentScene) {
      return;
    }

    setRuntimeState((current) => ({
      ...current,
      currentPageIndex: Math.min(
        current.currentPageIndex + 1,
        currentScene.dialoguePages.length - 1,
      ),
    }));
  };

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

      <main className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
        {backgroundUrl ? (
          <img
            src={backgroundUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        ) : null}
        <div className="absolute inset-0 bg-gray-950/70" />

        <section className="relative flex min-h-[calc(100vh-3.5rem)] items-end p-6">
          <div className="w-full rounded border border-gray-700 bg-gray-900/90 p-5 shadow-xl">
            {!currentScene ? (
              <div>
                <p className="text-sm font-semibold text-gray-100">Scene not found</p>
                <p className="mt-2 text-sm text-gray-400">
                  No scene matches the current runtime scene id.
                </p>
              </div>
            ) : !currentPage ? (
              <div>
                <p className="text-sm font-semibold text-gray-100">Dialogue page not found</p>
                <p className="mt-2 text-sm text-gray-400">
                  No dialogue page exists at the current runtime page index.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-blue-300">{speakerName}</p>
                <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-gray-100">
                  {currentPage.text}
                </p>
                {visibleChoices.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    {visibleChoices.map((choice) => {
                      const hasValidTarget = Boolean(
                        choice.targetSceneId &&
                          project.scenes.some((scene) => scene.id === choice.targetSceneId),
                      );
                      const isAvailable = isChoiceAvailable(choice, project, runtimeState);
                      const unavailableHint = isAvailable
                        ? null
                        : resolveUnavailableChoiceHint(choice, project, runtimeState);
                      const isEnabled = isAvailable && hasValidTarget;

                      return (
                        <div key={choice.id}>
                          <button
                            type="button"
                            onClick={() => goToChoiceTarget(choice)}
                            disabled={!isEnabled}
                            className={
                              isEnabled
                                ? 'block w-full rounded border border-blue-500/50 bg-blue-600/20 px-3 py-2 text-left text-sm text-blue-100 hover:bg-blue-600/30'
                                : 'block w-full cursor-not-allowed rounded border border-gray-700 bg-gray-800/80 px-3 py-2 text-left text-sm text-gray-400'
                            }
                          >
                            {choice.text}
                          </button>
                          {unavailableHint ? (
                            <p className="mt-1 px-3 text-xs text-gray-500">{unavailableHint}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {isEndOfStory ? (
                  <div className="mt-5 rounded border border-gray-700 bg-gray-800/80 p-4">
                    <p className="text-sm font-semibold text-gray-100">The End</p>
                    <p className="mt-2 text-sm text-gray-400">
                      This story has reached its final scene.
                    </p>
                    <button
                      type="button"
                      onClick={onExitPreview}
                      className="mt-4 rounded bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-100 hover:bg-gray-600"
                    >
                      Exit Preview
                    </button>
                  </div>
                ) : null}
                {hasNextPage ? (
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={goToNextPage}
                      className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
