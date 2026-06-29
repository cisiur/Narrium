import type { Choice, Condition, ConditionGroup, Project } from '../types';

type LegacyChoice = Omit<Choice, 'conditionGroups'> & {
  conditions?: Condition[];
  conditionGroups?: ConditionGroup[];
};

function createConditionGroup(conditions: Condition[]): ConditionGroup {
  return {
    id: crypto.randomUUID(),
    conditions,
  };
}

function normalizeChoice(choice: Choice | LegacyChoice): { choice: Choice; changed: boolean } {
  const legacyChoice = choice as LegacyChoice;
  const hasLegacyConditions = 'conditions' in legacyChoice;
  const conditionGroups = legacyChoice.conditionGroups ?? [];

  if (!hasLegacyConditions) {
    return {
      choice: {
        ...choice,
        conditionGroups,
      },
      changed: false,
    };
  }

  const { conditions = [], ...choiceWithoutLegacyConditions } = legacyChoice;
  let nextConditionGroups = conditionGroups;

  if (nextConditionGroups.length === 0 && conditions.length > 0) {
    nextConditionGroups = [createConditionGroup(conditions)];
  }

  return {
    choice: {
      ...choiceWithoutLegacyConditions,
      conditionGroups: nextConditionGroups,
    },
    changed: true,
  };
}

export function normalizeProject(project: Project): { project: Project; changed: boolean } {
  let changed = false;
  const thumbnail = project.thumbnail ?? null;

  if (!('thumbnail' in project)) {
    changed = true;
  }

  const scenes = project.scenes.map((scene) => {
    let sceneChanged = false;
    const choices = scene.choices.map((choice) => {
      const normalizedChoice = normalizeChoice(choice);

      if (normalizedChoice.changed) {
        sceneChanged = true;
        changed = true;
      }

      return normalizedChoice.choice;
    });

    return sceneChanged ? { ...scene, choices } : scene;
  });

  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const startSceneId =
    scenes.length === 0
      ? ''
      : sceneIds.has(project.startSceneId)
        ? project.startSceneId
        : scenes[0].id;

  if (startSceneId !== project.startSceneId) {
    changed = true;
  }

  return {
    project: changed ? { ...project, thumbnail, startSceneId, scenes } : project,
    changed,
  };
}
