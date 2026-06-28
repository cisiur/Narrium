import type { Effect } from '../../types';

interface EffectCardProps {
  effect: Effect;
  index: number;
  onDeleteEffect: (effectId: string) => void;
}

function getEffectTypeLabel(type: Effect['type']) {
  return type === 'resource' ? 'Resource' : 'Character Attribute';
}

export function EffectCard({ effect, index, onDeleteEffect }: EffectCardProps) {
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

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Type</div>
          <div className="mt-1 text-xs text-gray-100">{getEffectTypeLabel(effect.type)}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Operation
          </div>
          <div className="mt-1 text-xs text-gray-100">{effect.operation}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Value</div>
          <div className="mt-1 text-xs text-gray-100">{effect.value}</div>
        </div>
      </div>
    </div>
  );
}
