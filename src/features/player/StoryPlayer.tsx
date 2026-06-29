import { useState } from 'react';
import type { Choice, Project } from '../../types';
import {
  applyEffects,
  isChoiceAvailable,
} from '../story-logic/runtimeLogic';
import { DialoguePanel } from './DialoguePanel';
import {
  createChoiceViewModels,
  resolveSceneBackgroundUrl,
  resolveSpeakerName,
} from './playerHelpers';
import { createInitialRuntimeState } from './runtimeState';
import { StoryPlayerHeader } from './StoryPlayerHeader';

interface StoryPlayerProps {
  project: Project;
  onExitPreview: () => void;
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
  const choiceViewModels = createChoiceViewModels(visibleChoices, project, runtimeState);
  const isEndOfStory = Boolean(currentScene && currentPage && !hasNextPage && visibleChoices.length === 0);

  const goToChoiceTarget = (choice: Choice) => {
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

  const restartPreview = () => {
    setRuntimeState(createInitialRuntimeState(project));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <StoryPlayerHeader onRestartPreview={restartPreview} onExitPreview={onExitPreview} />

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
          <DialoguePanel
            currentScene={currentScene}
            currentPage={currentPage}
            speakerName={speakerName}
            choiceViewModels={choiceViewModels}
            hasNextPage={hasNextPage}
            isEndOfStory={isEndOfStory}
            onSelectChoice={goToChoiceTarget}
            onNextPage={goToNextPage}
            onExitPreview={onExitPreview}
          />
        </section>
      </main>
    </div>
  );
}
