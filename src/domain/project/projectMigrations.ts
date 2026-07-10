import type {
  Choice,
  Condition,
  ConditionGroup,
  DialoguePage,
  AssetLibraryItem,
  AssetStorageType,
  Project,
  ProjectSettings,
  Resource,
  Scene,
  SceneBackground,
} from '../../types';
import { DEFAULT_RESOURCE_ICON } from './projectDefaults';

type LegacyProject = Omit<Partial<Project>, 'scenes' | 'settings'> & {
  scenes?: LegacyScene[];
  settings?: Partial<ProjectSettings>;
  resources?: LegacyResource[];
  assetLibrary?: LegacyAssetLibraryItem[];
};

type LegacyResource = Partial<Resource> & Pick<Resource, 'id' | 'key' | 'defaultValue'>;

type LegacyScene = Omit<Partial<Scene>, 'dialoguePages' | 'choices' | 'background'> & {
  background?: Partial<SceneBackground>;
  dialoguePages?: LegacyDialoguePage[];
  choices?: Array<Choice | LegacyChoice>;
};
type LegacyAssetLibraryItem = Partial<AssetLibraryItem> & {
  sourceType?: 'upload' | 'url';
  url?: string;
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
const LEGACY_ASSET_CREATED_AT = '1970-01-01T00:00:00.000Z';

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

function inferAssetStorageType(asset: LegacyAssetLibraryItem, source: string): AssetStorageType {
  if (asset.storageType === 'embedded' || asset.storageType === 'remote') {
    return asset.storageType;
  }

  if (asset.sourceType === 'upload') {
    return 'embedded';
  }

  if (asset.sourceType === 'url') {
    return 'remote';
  }

  return source.startsWith('data:') ? 'embedded' : 'remote';
}

function normalizeAssetLibraryItem(asset: LegacyAssetLibraryItem): {
  asset: AssetLibraryItem;
  changed: boolean;
} {
  const source = asset.source ?? asset.url ?? '';
  const storageType = inferAssetStorageType(asset, source);
  const changed =
    isMissingField(asset, 'storageType') ||
    asset.storageType !== storageType ||
    isMissingField(asset, 'source') ||
    asset.source !== source ||
    hasField(asset, 'sourceType') ||
    hasField(asset, 'url');

  return {
    asset: {
      id: asset.id ?? createLegacyAssetId(source || asset.name || 'background', new Set()),
      kind: 'background',
      name: asset.name ?? 'Untitled Background',
      storageType,
      source,
      createdAt: asset.createdAt ?? LEGACY_ASSET_CREATED_AT,
      ...(asset.metadata ? { metadata: asset.metadata } : {}),
    },
    changed,
  };
}

function hashSource(source: string): string {
  let hash = 5381;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function createLegacyAssetId(source: string, usedIds: Set<string>): string {
  const baseId = `asset_legacy_${hashSource(source)}`;

  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let suffix = 2;
  let nextId = `${baseId}_${suffix}`;

  while (usedIds.has(nextId)) {
    suffix += 1;
    nextId = `${baseId}_${suffix}`;
  }

  usedIds.add(nextId);
  return nextId;
}

function createMigratedBackgroundAsset(
  source: string,
  storageType: AssetStorageType,
  usedIds: Set<string>,
  createdAt: string,
): AssetLibraryItem {
  return {
    id: createLegacyAssetId(source, usedIds),
    kind: 'background',
    name: storageType === 'remote' ? 'Imported Remote Background' : 'Imported Background',
    storageType,
    source,
    createdAt,
  };
}

function migrateSceneBackgroundsToAssets(
  scenes: Scene[],
  assetLibrary: AssetLibraryItem[],
  projectCreatedAt: string | undefined,
): { scenes: Scene[]; assetLibrary: AssetLibraryItem[]; changed: boolean } {
  let changed = false;
  const nextAssetLibrary = [...assetLibrary];
  const usedIds = new Set(nextAssetLibrary.map((asset) => asset.id));
  const sourceToAssetId = new Map<string, string>();

  nextAssetLibrary.forEach((asset) => {
    if (!sourceToAssetId.has(asset.source)) {
      sourceToAssetId.set(asset.source, asset.id);
    }
  });

  const migratedScenes = scenes.map((scene) => {
    const background = scene.background;

    if (
      (background.mode !== 'upload' && background.mode !== 'url') ||
      background.url.trim().length === 0
    ) {
      return scene;
    }

    const source = background.url;
    const storageType: AssetStorageType = background.mode === 'upload' ? 'embedded' : 'remote';
    let assetId = sourceToAssetId.get(source);

    if (!assetId) {
      const asset = createMigratedBackgroundAsset(
        source,
        storageType,
        usedIds,
        projectCreatedAt ?? LEGACY_ASSET_CREATED_AT,
      );
      nextAssetLibrary.push(asset);
      sourceToAssetId.set(source, asset.id);
      assetId = asset.id;
    }

    changed = true;

    return {
      ...scene,
      background: {
        mode: 'asset',
        assetId,
        sourceSceneId: null,
        url: '',
      } satisfies SceneBackground,
    };
  });

  return {
    scenes: migratedScenes,
    assetLibrary: nextAssetLibrary,
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
  const assetLibrary = (legacyProject.assetLibrary ?? []).map((asset) => {
    const normalizedAsset = normalizeAssetLibraryItem(asset);

    if (normalizedAsset.changed) {
      changed = true;
    }

    return normalizedAsset.asset;
  });
  const backgroundMigration = migrateSceneBackgroundsToAssets(
    scenes,
    assetLibrary,
    legacyProject.createdAt,
  );

  if (backgroundMigration.changed) {
    changed = true;
  }

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
          scenes: backgroundMigration.scenes,
          characters: legacyProject.characters ?? [],
          resources,
          variables: legacyProject.variables ?? [],
          groups: legacyProject.groups ?? [],
          assetLibrary: backgroundMigration.assetLibrary,
          settings: {
            ...DEFAULT_SETTINGS,
            ...legacyProject.settings,
          },
        }
      : project,
    changed,
  };
}
