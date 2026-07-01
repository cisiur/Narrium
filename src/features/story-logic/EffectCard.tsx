import type { Character, Effect, Resource, Variable } from '../../types';

const EFFECT_OPERATIONS: Effect['operation'][] = ['+=', '-=', '='];
const EFFECT_OPERATION_LABELS: Record<Effect['operation'], string> = {
  '+=': '+',
  '-=': '-',
  '=': '=',
};

function getResourceEffectWarning(effect: Effect, resources: Resource[]) {
  if (effect.type !== 'resource') {
    return null;
  }

  if (effect.targetId === '') {
    return '⚠ Select a resource';
  }

  if (!resources.some((resource) => resource.id === effect.targetId)) {
    return '⚠ Referenced resource no longer exists';
  }

  return null;
}

function getVariableEffectWarning(effect: Effect, variables: Variable[]) {
  if (effect.type !== 'variable') {
    return null;
  }

  if (effect.targetId === '') {
    return 'Select a variable';
  }

  if (!variables.some((variable) => variable.id === effect.targetId)) {
    return 'Referenced variable no longer exists';
  }

  return null;
}

function getCharacterAttributeEffectWarning(
  effect: Effect,
  selectedCharacter: Character | null,
) {
  if (effect.type !== 'character_attr') {
    return null;
  }

  if (effect.targetId === '') {
    return '⚠ Select a character';
  }

  if (!selectedCharacter) {
    return '⚠ Referenced character no longer exists';
  }

  if (!effect.attribute) {
    return '⚠ Select an attribute';
  }

  if (!selectedCharacter.attributes.some((attribute) => attribute.key === effect.attribute)) {
    return '⚠ Referenced attribute no longer exists';
  }

  return null;
}

interface EffectCardProps {
  effect: Effect;
  index: number;
  resources: Resource[];
  variables: Variable[];
  characters: Character[];
  onUpdateEffect: (effectId: string, updater: (effect: Effect) => Effect) => void;
  onDeleteEffect: (effectId: string) => void;
}

export function EffectCard({
  effect,
  index,
  resources,
  variables,
  characters,
  onUpdateEffect,
  onDeleteEffect,
}: EffectCardProps) {
  const selectedCharacter =
    effect.type === 'character_attr'
      ? characters.find((character) => character.id === effect.targetId) ?? null
      : null;
  const characterAttributes = selectedCharacter?.attributes ?? [];
  const effectWarning =
    getResourceEffectWarning(effect, resources) ??
    getVariableEffectWarning(effect, variables) ??
    getCharacterAttributeEffectWarning(effect, selectedCharacter);

  const updateEffectType = (type: Effect['type']) => {
    onUpdateEffect(effect.id, (currentEffect) => ({
      ...currentEffect,
      type,
      targetId: '',
      attribute: undefined,
    }));
  };

  const updateCharacterTarget = (targetId: string) => {
    onUpdateEffect(effect.id, (currentEffect) => ({
      ...currentEffect,
      targetId,
      attribute: undefined,
    }));
  };

  const updateEffectAttribute = (attribute: string) => {
    onUpdateEffect(effect.id, (currentEffect) => ({
      ...currentEffect,
      attribute: attribute || undefined,
    }));
  };

  const updateEffectValue = (value: string) => {
    const nextValue = Number(value);

    onUpdateEffect(effect.id, (currentEffect) => ({
      ...currentEffect,
      value: Number.isFinite(nextValue) ? nextValue : 0,
    }));
  };

  return (
    <div className="rounded-md border border-gray-700 bg-gray-900 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-gray-200">Effect {index + 1}</div>
        <button
          type="button"
          onClick={() => onDeleteEffect(effect.id)}
          className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
        >
          Delete
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Type
          <select
            value={effect.type}
            onChange={(event) => updateEffectType(event.target.value as Effect['type'])}
            className="mt-1 w-full rounded bg-gray-950 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
          >
            <option value="resource">Resource</option>
            <option value="character_attr">Character Attribute</option>
            <option value="variable">Variable</option>
          </select>
        </label>

        {effect.type === 'resource' ? (
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Resource
            <select
              value={effect.targetId}
              onChange={(event) =>
                onUpdateEffect(effect.id, (currentEffect) => ({
                  ...currentEffect,
                  targetId: event.target.value,
                }))
              }
              disabled={resources.length === 0}
              className="mt-1 w-full rounded bg-gray-950 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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

        {effect.type === 'variable' ? (
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Variable
            <select
              value={effect.targetId}
              onChange={(event) =>
                onUpdateEffect(effect.id, (currentEffect) => ({
                  ...currentEffect,
                  targetId: event.target.value,
                }))
              }
              disabled={variables.length === 0}
              className="mt-1 w-full rounded bg-gray-950 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {variables.length === 0 ? (
                <option value="">No variables available</option>
              ) : (
                <>
                  <option value="">Select variable...</option>
                  {variables.map((variable) => (
                    <option key={variable.id} value={variable.id}>
                      {variable.key}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
        ) : null}

        {effect.type === 'character_attr' ? (
          <>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Character
              <select
                value={effect.targetId}
                onChange={(event) => updateCharacterTarget(event.target.value)}
                disabled={characters.length === 0}
                className="mt-1 w-full rounded bg-gray-950 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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

            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Attribute
              <select
                value={effect.attribute ?? ''}
                onChange={(event) => updateEffectAttribute(event.target.value)}
                disabled={!selectedCharacter || characterAttributes.length === 0}
                className="mt-1 w-full rounded bg-gray-950 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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
          </>
        ) : null}

        {effectWarning ? (
          <div className="rounded border border-yellow-700/70 bg-yellow-950/40 px-3 py-2 text-xs font-medium text-yellow-200">
            {effectWarning}
          </div>
        ) : null}

        <div className="grid grid-cols-[5rem_1fr] gap-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Operation
            <select
              value={effect.operation}
              onChange={(event) =>
                onUpdateEffect(effect.id, (currentEffect) => ({
                  ...currentEffect,
                  operation: event.target.value as Effect['operation'],
                }))
              }
              className="mt-1 w-full rounded bg-gray-950 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
            >
              {EFFECT_OPERATIONS.map((operation) => (
                <option key={operation} value={operation}>
                  {EFFECT_OPERATION_LABELS[operation]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Value
            <input
              type="number"
              value={effect.value}
              onChange={(event) => updateEffectValue(event.target.value)}
              className="mt-1 w-full rounded bg-gray-950 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
