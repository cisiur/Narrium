import type {
  Choice,
  Condition,
  ConditionGroup,
  DialoguePage,
  Project,
  ProjectSettings,
  Resource,
  Scene,
  SceneBackground,
} from '../types';
import { DEFAULT_RESOURCE_ICON } from '../features/resources/resourcePresentation';

type LegacyProject = Omit<Partial<Project>, 'scenes' | 'settings'> & {
  scenes?: LegacyScene[];
  settings?: Partial<ProjectSettings>;
  resources?: LegacyResource[];
};

type LegacyResource = Partial<Resource> & Pick<Resource, 'id' | 'key' | 'defaultValue'>;

type LegacyScene = Omit<Partial<Scene>, 'dialoguePages' | 'choices' | 'background'> & {
  background?: Partial<SceneBackground>;
  dialoguePages?: LegacyDialoguePage[];
  choices?: Array<Choice | LegacyChoice>;
};

type LegacyDialoguePage = Partial<DialoguePage>;

type LegacyChoice = Omit<Choice, 'conditionGroups'> & {
  conditions?: Condition[];
  conditionGroups?: ConditionGroup[];
  effects?: Choice['effects'];
};

const DEFAULT_BACKGROUND: SceneBackground = {
  mode: 'none',
  assetId: null,
  sourceSceneId: null,
  url: '',
};

const DEFAULT_SETTINGS: ProjectSettings = {
  allowSessionSaveLoad: true,
};

function hasField(target: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(target, field);
}

function isMissingField(target: object, field: PropertyKey): boolean {
  return !hasField(target, field) || (target as Record<PropertyKey, unknown>)[field] === undefined;
}

function createConditionGroup(conditions: Condition[]): ConditionGroup {
  return {
    id: crypto.randomUUID(),
    conditions,
  };
}

function normalizeChoice(choice: Choice | LegacyChoice): { choice: Choice; changed: boolean } {
  const legacyChoice = choice as LegacyChoice;
  const hasLegacyConditions = 'conditions' in legacyChoice;
  const hasConditionGroups = !isMissingField(legacyChoice, 'conditionGroups');
  const hasEffects = !isMissingField(legacyChoice, 'effects');
  const conditionGroups = legacyChoice.conditionGroups ?? [];
  const effects = legacyChoice.effects ?? [];
  let changed = !hasConditionGroups || !hasEffects;

  if (!hasLegacyConditions) {
    return {
      choice: {
        ...choice,
        conditionGroups,
        effects,
      },
      changed,
    };
  }

  const { conditions = [], ...choiceWithoutLegacyConditions } = legacyChoice;
  let nextConditionGroups = conditionGroups;

  if (nextConditionGroups.length === 0 && conditions.length > 0) {
    nextConditionGroups = [createConditionGroup(conditions)];
  }
  changed = true;

  return {
    choice: {
      ...choiceWithoutLegacyConditions,
      conditionGroups: nextConditionGroups,
      effects,
    },
    changed,
  };
}

function normalizeBackground(background: Partial<SceneBackground> | undefined): {
  background: SceneBackground;
  changed: boolean;
} {
  if (!background) {
    return {
      background: DEFAULT_BACKGROUND,
      changed: true,
    };
  }

  const changed =
    isMissingField(background, 'mode') ||
    isMissingField(background, 'assetId') ||
    isMissingField(background, 'sourceSceneId') ||
    isMissingField(background, 'url');

  return {
    background: {
      ...background,
      mode: background.mode ?? 'none',
      assetId: background.assetId ?? null,
      sourceSceneId: background.sourceSceneId ?? null,
      url: background.url ?? '',
    },
    changed,
  };
}

function normalizeDialoguePage(page: LegacyDialoguePage): {
  page: DialoguePage;
  changed: boolean;
} {
  const changed = isMissingField(page, 'speakerId');

  return {
    page: {
      ...page,
      speakerId: page.speakerId ?? null,
    } as DialoguePage,
    changed,
  };
}

function normalizeScene(scene: LegacyScene): { scene: Scene; changed: boolean } {
  let changed =
    !hasField(scene, 'background') ||
    isMissingField(scene, 'position') ||
    isMissingField(scene, 'dialoguePages') ||
    isMissingField(scene, 'choices') ||
    isMissingField(scene, 'groupId');
  const normalizedBackground = normalizeBackground(scene.background);

  if (normalizedBackground.changed) {
    changed = true;
  }

  const dialoguePages = (scene.dialoguePages ?? []).map((page) => {
    const normalizedPage = normalizeDialoguePage(page);

    if (normalizedPage.changed) {
      changed = true;
    }

    return normalizedPage.page;
  });
  const choices = (scene.choices ?? []).map((choice) => {
    const normalizedChoice = normalizeChoice(choice);

    if (normalizedChoice.changed) {
      changed = true;
    }

    return normalizedChoice.choice;
  });

  return {
    scene: {
      ...scene,
      background: normalizedBackground.background,
      position: scene.position ?? { x: 0, y: 0 },
      dialoguePages,
      choices,
      groupId: scene.groupId ?? null,
    } as Scene,
    changed,
  };
}

function normalizeResource(resource: LegacyResource): { resource: Resource; changed: boolean } {
  const changed =
    isMissingField(resource, 'displayName') ||
    isMissingField(resource, 'icon') ||
    isMissingField(resource, 'visible');

  return {
    resource: {
      ...resource,
      displayName: resource.displayName ?? resource.key,
      icon: resource.icon ?? DEFAULT_RESOURCE_ICON,
      visible: resource.visible ?? true,
    },
    changed,
  };
}

export function normalizeProject(project: Project): { project: Project; changed: boolean } {
  const legacyProject = project as LegacyProject;
  let changed = false;
  const thumbnail = legacyProject.thumbnail ?? null;

  if (isMissingField(legacyProject, 'thumbnail')) {
    changed = true;
  }

  const collectionFields: Array<
    keyof Pick<Project, 'scenes' | 'characters' | 'resources' | 'variables' | 'groups' | 'assetLibrary'>
  > = ['scenes', 'characters', 'resources', 'variables', 'groups', 'assetLibrary'];

  collectionFields.forEach((field) => {
    if (isMissingField(legacyProject, field)) {
      changed = true;
    }
  });

  if (
    !hasField(legacyProject, 'settings') ||
    isMissingField(legacyProject.settings ?? {}, 'allowSessionSaveLoad')
  ) {
    changed = true;
  }

  const scenes = (legacyProject.scenes ?? []).map((scene) => {
    const normalizedScene = normalizeScene(scene);

    if (normalizedScene.changed) {
      changed = true;
    }

    return normalizedScene.scene;
  });
  const resources = (legacyProject.resources ?? []).map((resource) => {
    const normalizedResource = normalizeResource(resource);

    if (normalizedResource.changed) {
      changed = true;
    }

    return normalizedResource.resource;
  });
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const startSceneId =
    scenes.length === 0
      ? ''
      : sceneIds.has(legacyProject.startSceneId ?? '')
        ? legacyProject.startSceneId ?? ''
        : scenes[0].id;

  if (isMissingField(legacyProject, 'startSceneId') || startSceneId !== legacyProject.startSceneId) {
    changed = true;
  }

  return {
    project: changed
      ? {
          ...project,
          thumbnail,
          startSceneId,
          scenes,
          characters: legacyProject.characters ?? [],
          resources,
          variables: legacyProject.variables ?? [],
          groups: legacyProject.groups ?? [],
          assetLibrary: legacyProject.assetLibrary ?? [],
          settings: {
            ...DEFAULT_SETTINGS,
            ...legacyProject.settings,
          },
        }
      : project,
    changed,
  };
}
