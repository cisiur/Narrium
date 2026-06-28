import type { Dispatch, SetStateAction } from 'react';
import type { Character, Condition, ConditionGroup, Resource } from '../../types';
import { ConditionRow } from './ConditionRow';

type EditingConditionValue = {
  conditionId: string;
  value: string;
} | null;

interface ConditionGroupCardProps {
  group: ConditionGroup;
  index: number;
  resources: Resource[];
  characters: Character[];
  editingConditionValue: EditingConditionValue;
  setEditingConditionValue: Dispatch<SetStateAction<EditingConditionValue>>;
  onDeleteGroup: (conditionGroupId: string) => void;
  onAddCondition: (conditionGroupId: string) => void;
  onUpdateCondition: (
    conditionGroupId: string,
    conditionId: string,
    updater: (condition: Condition) => Condition,
  ) => void;
  onDeleteCondition: (conditionGroupId: string, conditionId: string) => void;
}

export function ConditionGroupCard({
  group,
  index,
  resources,
  characters,
  editingConditionValue,
  setEditingConditionValue,
  onDeleteGroup,
  onAddCondition,
  onUpdateCondition,
  onDeleteCondition,
}: ConditionGroupCardProps) {
  return (
    <div className="rounded-md border border-gray-700 bg-gray-900 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-gray-200">Group {index + 1}</div>
        <button
          type="button"
          onClick={() => onDeleteGroup(group.id)}
          className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
        >
          Delete Group
        </button>
      </div>
      {group.conditions.length === 0 ? (
        <p className="mt-3 text-xs text-gray-500">No conditions</p>
      ) : (
        <div className="mt-3 space-y-2">
          {group.conditions.map((condition) => (
            <ConditionRow
              key={condition.id}
              condition={condition}
              conditionGroupId={group.id}
              resources={resources}
              characters={characters}
              editingConditionValue={editingConditionValue}
              setEditingConditionValue={setEditingConditionValue}
              onUpdateCondition={onUpdateCondition}
              onDeleteCondition={onDeleteCondition}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => onAddCondition(group.id)}
        className="mt-3 rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-700"
      >
        + Add Condition
      </button>
    </div>
  );
}
