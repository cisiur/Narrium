import type { Effect, Resource } from '../../types';

const EFFECT_OPERATIONS: Effect['operation'][] = ['+=', '-=', '='];

interface EffectCardProps {
  effect: Effect;
  index: number;
  resources: Resource[];
  onUpdateEffect: (effectId: string, updater: (effect: Effect) => Effect) => void;
  onDeleteEffect: (effectId: string) => void;
}

export function EffectCard({
  effect,
  index,
  resources,
  onUpdateEffect,
  onDeleteEffect,
}: EffectCardProps) {
  const updateEffectType = (type: Effect['type']) => {
    onUpdateEffect(effect.id, (currentEffect) => ({
      ...currentEffect,
      type,
      targetId: '',
      attribute: undefined,
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
          </select>
        </label>

        {effect.type === 'character_attr' ? (
          <p className="rounded-md border border-dashed border-gray-700 px-3 py-3 text-xs text-gray-500">
            Character Attribute editor will be implemented in E6-13.
          </p>
        ) : null}

        {effect.type === 'resource' ? (
          <>
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
                      {operation}
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
          </>
        ) : null}
      </div>
    </div>
  );
}
