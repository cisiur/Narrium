import { useWorkspaceStore } from '../../store/workspaceStore';
import type { Choice, Effect, Scene } from '../../types';
import { EffectCard } from './EffectCard';

function createEffect(): Effect {
  return {
    id: crypto.randomUUID(),
    type: 'resource',
    targetId: '',
    operation: '+=',
    value: 0,
  };
}

interface EffectsEditorProps {
  choice: Choice;
  scene: Scene;
}

export function EffectsEditor({ choice, scene }: EffectsEditorProps) {
  const updateActiveProject = useWorkspaceStore((state) => state.updateActiveProject);
  const effects = choice.effects ?? [];

  const updateChoiceEffects = (updater: (effects: Effect[]) => Effect[]) => {
    updateActiveProject((project) => ({
      ...project,
      scenes: project.scenes.map((projectScene) =>
        projectScene.id === scene.id
          ? {
              ...projectScene,
              choices: projectScene.choices.map((projectChoice) =>
                projectChoice.id === choice.id
                  ? {
                      ...projectChoice,
                      effects: updater(projectChoice.effects ?? []),
                    }
                  : projectChoice,
              ),
            }
          : projectScene,
      ),
    }));
  };

  const addEffect = () => {
    updateChoiceEffects((currentEffects) => [...currentEffects, createEffect()]);
  };

  const deleteEffect = (effectId: string) => {
    updateChoiceEffects((currentEffects) =>
      currentEffects.filter((effect) => effect.id !== effectId),
    );
  };

  return (
    <section className="mt-4 border-t border-gray-700 pt-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Effects</div>

      {effects.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-700 px-3 py-3 text-xs text-gray-500">
          No effects
        </p>
      ) : (
        <div className="space-y-2">
          {effects.map((effect, index) => (
            <EffectCard
              key={effect.id}
              effect={effect}
              index={index}
              onDeleteEffect={deleteEffect}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addEffect}
        className="mt-3 rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
      >
        + Add Effect
      </button>
    </section>
  );
}
