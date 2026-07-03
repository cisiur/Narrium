import type { Choice, Project, RuntimeState } from '../../types';
import { isChoiceAvailable, resolveUnavailableChoiceHint } from './runtimeLogic';

export interface ChoiceViewModel {
  choice: Choice;
  isEnabled: boolean;
  unavailableHint: string | null;
}

export function createChoiceViewModels(
  choices: Choice[],
  project: Project,
  runtimeState: RuntimeState,
): ChoiceViewModel[] {
  return choices.map((choice) => {
    const hasValidTarget = Boolean(
      choice.targetSceneId === null ||
        project.scenes.some((scene) => scene.id === choice.targetSceneId),
    );
    const isAvailable = isChoiceAvailable(choice, project, runtimeState);

    return {
      choice,
      isEnabled: isAvailable && hasValidTarget,
      unavailableHint: isAvailable
        ? null
        : resolveUnavailableChoiceHint(choice, project, runtimeState),
    };
  });
}
