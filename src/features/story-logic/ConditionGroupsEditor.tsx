import { useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { Choice, Condition, ConditionGroup, Scene } from '../../types';
import { ConditionGroupCard } from './ConditionGroupCard';

function createConditionGroup(): ConditionGroup {
  return {
    id: crypto.randomUUID(),
    conditions: [createCondition()],
  };
}

function createCondition(): Condition {
  return {
    id: crypto.randomUUID(),
    type: 'resource',
    targetId: '',
    attribute: undefined,
    operator: '>=',
    value: 0,
    hintText: '',
  };
}

interface ConditionGroupsEditorProps {
  choice: Choice;
  scene: Scene;
}

export function ConditionGroupsEditor({ choice, scene }: ConditionGroupsEditorProps) {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const updateActiveProject = useWorkspaceStore((state) => state.updateActiveProject);
  const conditionGroups = choice.conditionGroups ?? [];
  const resources = activeProject?.resources ?? [];
  const characters = activeProject?.characters ?? [];
  const [editingConditionValue, setEditingConditionValue] = useState<{
    conditionId: string;
    value: string;
  } | null>(null);

  const updateChoiceConditionGroups = (updater: (groups: ConditionGroup[]) => ConditionGroup[]) => {
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
                      conditionGroups: updater(projectChoice.conditionGroups ?? []),
                    }
                  : projectChoice,
              ),
            }
          : projectScene,
      ),
    }));
  };

  const addConditionGroup = () => {
    updateChoiceConditionGroups((groups) => [...groups, createConditionGroup()]);
  };

  const deleteConditionGroup = (conditionGroupId: string) => {
    updateChoiceConditionGroups((groups) => groups.filter((group) => group.id !== conditionGroupId));
  };

  const addCondition = (conditionGroupId: string) => {
    updateChoiceConditionGroups((groups) =>
      groups.map((group) =>
        group.id === conditionGroupId
          ? {
              ...group,
              conditions: [...group.conditions, createCondition()],
            }
          : group,
      ),
    );
  };

  const updateCondition = (
    conditionGroupId: string,
    conditionId: string,
    updater: (condition: Condition) => Condition,
  ) => {
    updateChoiceConditionGroups((groups) =>
      groups.map((group) =>
        group.id === conditionGroupId
          ? {
              ...group,
              conditions: group.conditions.map((condition) =>
                condition.id === conditionId ? updater(condition) : condition,
              ),
            }
          : group,
      ),
    );
  };

  const deleteCondition = (conditionGroupId: string, conditionId: string) => {
    updateChoiceConditionGroups((groups) =>
      groups.map((group) =>
        group.id === conditionGroupId
          ? {
              ...group,
              conditions: group.conditions.filter((condition) => condition.id !== conditionId),
            }
          : group,
      ),
    );

    if (editingConditionValue?.conditionId === conditionId) {
      setEditingConditionValue(null);
    }
  };

  return (
    <section className="mt-4 border-t border-gray-700 pt-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Conditions</div>

      {conditionGroups.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-700 px-3 py-3 text-xs text-gray-500">
          No condition groups
        </p>
      ) : (
        <div className="space-y-2">
          {conditionGroups.map((group, index) => (
            <ConditionGroupCard
              key={group.id}
              group={group}
              index={index}
              resources={resources}
              characters={characters}
              editingConditionValue={editingConditionValue}
              setEditingConditionValue={setEditingConditionValue}
              onDeleteGroup={deleteConditionGroup}
              onAddCondition={addCondition}
              onUpdateCondition={updateCondition}
              onDeleteCondition={deleteCondition}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addConditionGroup}
        className="mt-3 rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
      >
        + Add OR Group
      </button>
    </section>
  );
}
