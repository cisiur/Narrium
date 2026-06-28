import type { Dispatch, SetStateAction } from 'react';
import type { Character, Condition, Resource } from '../../types';

const CONDITION_OPERATORS: Condition['operator'][] = ['>=', '<=', '==', '>', '<', '!='];

type EditingConditionValue = {
  conditionId: string;
  value: string;
} | null;

interface ConditionRowProps {
  condition: Condition;
  conditionGroupId: string;
  resources: Resource[];
  characters: Character[];
  editingConditionValue: EditingConditionValue;
  setEditingConditionValue: Dispatch<SetStateAction<EditingConditionValue>>;
  onUpdateCondition: (
    conditionGroupId: string,
    conditionId: string,
    updater: (condition: Condition) => Condition,
  ) => void;
  onDeleteCondition: (conditionGroupId: string, conditionId: string) => void;
}

function getResourceConditionWarning(condition: Condition, resources: Resource[]) {
  if (condition.type !== 'resource') {
    return null;
  }

  if (condition.targetId === '') {
    return '⚠ Select a resource';
  }

  if (!resources.some((resource) => resource.id === condition.targetId)) {
    return '⚠ Referenced resource no longer exists';
  }

  return null;
}

function getCharacterAttributeConditionWarning(
  condition: Condition,
  selectedCharacter: Character | null,
) {
  if (condition.type !== 'character_attr') {
    return null;
  }

  if (condition.targetId === '') {
    return '⚠ Select a character';
  }

  if (!selectedCharacter) {
    return '⚠ Referenced character no longer exists';
  }

  if (!condition.attribute) {
    return '⚠ Select an attribute';
  }

  if (!selectedCharacter.attributes.some((attribute) => attribute.key === condition.attribute)) {
    return '⚠ Referenced attribute no longer exists';
  }

  return null;
}

export function ConditionRow({
  condition,
  conditionGroupId,
  resources,
  characters,
  editingConditionValue,
  setEditingConditionValue,
  onUpdateCondition,
  onDeleteCondition,
}: ConditionRowProps) {
  const selectedCharacter =
    condition.type === 'character_attr'
      ? characters.find((character) => character.id === condition.targetId) ?? null
      : null;
  const characterAttributes = selectedCharacter?.attributes ?? [];
  const conditionWarning =
    getResourceConditionWarning(condition, resources) ??
    getCharacterAttributeConditionWarning(condition, selectedCharacter);

  const updateConditionValue = (value: string) => {
    const nextValue = Number(value);

    setEditingConditionValue({
      conditionId: condition.id,
      value,
    });

    onUpdateCondition(conditionGroupId, condition.id, (currentCondition) => ({
      ...currentCondition,
      value: Number.isFinite(nextValue) ? nextValue : 0,
    }));
  };

  const updateConditionType = (type: Condition['type']) => {
    onUpdateCondition(conditionGroupId, condition.id, (currentCondition) => ({
      ...currentCondition,
      type,
      targetId: '',
      attribute: undefined,
    }));
  };

  const updateConditionTarget = (targetId: string) => {
    onUpdateCondition(conditionGroupId, condition.id, (currentCondition) => ({
      ...currentCondition,
      targetId,
    }));
  };

  const updateCharacterConditionTarget = (targetId: string) => {
    onUpdateCondition(conditionGroupId, condition.id, (currentCondition) => ({
      ...currentCondition,
      targetId,
      attribute: undefined,
    }));
  };

  const updateConditionAttribute = (attribute: string) => {
    onUpdateCondition(conditionGroupId, condition.id, (currentCondition) => ({
      ...currentCondition,
      attribute: attribute || undefined,
    }));
  };

  return (
    <div className="space-y-2 rounded-md border border-gray-700 bg-gray-950 p-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Type
          <select
            value={condition.type}
            onChange={(event) => updateConditionType(event.target.value as Condition['type'])}
            className="mt-1 w-full rounded bg-gray-900 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
          >
            <option value="resource">Resource</option>
            <option value="character_attr">Character Attribute</option>
          </select>
        </label>
        {condition.type === 'resource' ? (
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Target
            <select
              value={condition.targetId}
              onChange={(event) => updateConditionTarget(event.target.value)}
              disabled={resources.length === 0}
              className="mt-1 w-full rounded bg-gray-900 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resources.length === 0 ? (
                <option value="">No resources available</option>
              ) : (
                <>
                  <option value="">Select resource...</option>
                  {resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.key}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
        ) : null}
        {condition.type === 'character_attr' ? (
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Character
            <select
              value={condition.targetId}
              onChange={(event) => updateCharacterConditionTarget(event.target.value)}
              disabled={characters.length === 0}
              className="mt-1 w-full rounded bg-gray-900 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {characters.length === 0 ? (
                <option value="">No characters available</option>
              ) : (
                <>
                  <option value="">Select character...</option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
        ) : null}
      </div>

      {conditionWarning ? (
        <div className="rounded border border-yellow-700/70 bg-yellow-950/40 px-3 py-2 text-xs font-medium text-yellow-200">
          {conditionWarning}
        </div>
      ) : null}

      {condition.type === 'character_attr' ? (
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Attribute
          <select
            value={condition.attribute ?? ''}
            onChange={(event) => updateConditionAttribute(event.target.value)}
            disabled={!selectedCharacter || characterAttributes.length === 0}
            className="mt-1 w-full rounded bg-gray-900 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!selectedCharacter ? (
              <option value="">Select character first</option>
            ) : characterAttributes.length === 0 ? (
              <option value="">No attributes available</option>
            ) : (
              <>
                <option value="">Select attribute...</option>
                {characterAttributes.map((attribute) => (
                  <option key={attribute.key} value={attribute.key}>
                    {attribute.key}
                  </option>
                ))}
              </>
            )}
          </select>
        </label>
      ) : null}

      <div className="grid grid-cols-[4.5rem_1fr_auto] items-end gap-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Operator
          <select
            value={condition.operator}
            onChange={(event) =>
              onUpdateCondition(conditionGroupId, condition.id, (currentCondition) => ({
                ...currentCondition,
                operator: event.target.value as Condition['operator'],
              }))
            }
            className="mt-1 w-full rounded bg-gray-900 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
          >
            {CONDITION_OPERATORS.map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Value
          <input
            type="number"
            value={
              editingConditionValue?.conditionId === condition.id
                ? editingConditionValue.value
                : condition.value
            }
            onFocus={() =>
              setEditingConditionValue({
                conditionId: condition.id,
                value: String(condition.value),
              })
            }
            onBlur={() => setEditingConditionValue(null)}
            onChange={(event) => updateConditionValue(event.target.value)}
            className="mt-1 w-full rounded bg-gray-900 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
          />
        </label>

        <button
          type="button"
          onClick={() => onDeleteCondition(conditionGroupId, condition.id)}
          className="rounded bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-200 hover:bg-red-950 hover:text-red-100"
          aria-label="Delete condition"
          title="Delete condition"
        >
          🗑
        </button>
      </div>

      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Hint
        <input
          type="text"
          value={condition.hintText}
          onChange={(event) =>
            onUpdateCondition(conditionGroupId, condition.id, (currentCondition) => ({
              ...currentCondition,
              hintText: event.target.value,
            }))
          }
          className="mt-1 w-full rounded bg-gray-900 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
          placeholder="Optional hint"
        />
      </label>
    </div>
  );
}
