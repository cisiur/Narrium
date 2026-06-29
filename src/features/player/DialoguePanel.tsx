import type { Choice, DialoguePage, Scene } from '../../types';
import { ChoiceList } from './ChoiceList';
import type { ChoiceViewModel } from './playerHelpers';

interface DialoguePanelProps {
  currentScene: Scene | null;
  currentPage: DialoguePage | null;
  speakerName: string | null;
  choiceViewModels: ChoiceViewModel[];
  hasNextPage: boolean;
  isEndOfStory: boolean;
  onSelectChoice: (choice: Choice) => void;
  onNextPage: () => void;
  onExitPreview: () => void;
}

export function DialoguePanel({
  currentScene,
  currentPage,
  speakerName,
  choiceViewModels,
  hasNextPage,
  isEndOfStory,
  onSelectChoice,
  onNextPage,
  onExitPreview,
}: DialoguePanelProps) {
  return (
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
          <ChoiceList choices={choiceViewModels} onSelectChoice={onSelectChoice} />
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
                onClick={onNextPage}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
