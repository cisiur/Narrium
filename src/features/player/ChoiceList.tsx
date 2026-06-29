import type { Choice } from '../../types';
import type { ChoiceViewModel } from './playerHelpers';

interface ChoiceListProps {
  choices: ChoiceViewModel[];
  onSelectChoice: (choice: Choice) => void;
}

export function ChoiceList({ choices, onSelectChoice }: ChoiceListProps) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 space-y-2">
      {choices.map(({ choice, isEnabled, unavailableHint }) => (
        <div key={choice.id}>
          <button
            type="button"
            onClick={() => onSelectChoice(choice)}
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
      ))}
    </div>
  );
}
