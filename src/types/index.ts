export interface WorkspaceProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnailDataUrl: string | null;
}

export interface WorkspaceState {
  projects: WorkspaceProjectMeta[];
  activeProjectId: string | null;
}

export interface Project {
  id: string;
  name: string;
  thumbnail: string | null;
  startSceneId: string;
  scenes: Scene[];
  characters: Character[];
  resources: Resource[];
  variables: Variable[];
  groups: SceneGroup[];
  assetLibrary: AssetLibraryItem[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  name: string;
  background: SceneBackground;
  position: { x: number; y: number };
  dialoguePages: DialoguePage[];
  choices: Choice[];
  groupId: string | null;
}

export interface SceneBackground {
  mode: 'upload' | 'url' | 'asset' | 'scene_reference' | 'none';
  assetId: string | null;
  sourceSceneId: string | null;
  url: string;
}

export interface DialoguePage {
  id: string;
  speakerId: string | null;
  text: string;
}

export interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditionGroups: ConditionGroup[];
  effects: Effect[];
}

export interface ConditionGroup {
  id: string;
  conditions: Condition[];
}

export interface Condition {
  id: string;
  type: 'resource' | 'character_attr' | 'variable';
  targetId: string;
  attribute?: string;
  operator: '>=' | '<=' | '==' | '>' | '<' | '!=';
  value: number;
  hintText: string;
}

export interface Effect {
  id: string;
  type: 'resource' | 'character_attr' | 'variable';
  targetId: string;
  attribute?: string;
  operation: '+=' | '-=' | '=';
  value: number;
}

export interface Character {
  id: string;
  name: string;
  attributes: CharacterAttribute[];
}

export interface CharacterAttribute {
  key: string;
  defaultValue: number;
}

export interface Resource {
  id: string;
  key: string;
  displayName: string;
  icon: string;
  visible: boolean;
  defaultValue: number;
}

export interface Variable {
  id: string;
  key: string;
  defaultValue: number;
}

export interface SceneGroup {
  id: string;
  name: string;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  collapsed: boolean;
}

export interface AssetLibraryItem {
  id: string;
  kind: 'background';
  name: string;
  sourceType: 'upload' | 'url';
  url: string;
  createdAt: string;
}

export interface ProjectSettings {
  allowSessionSaveLoad: boolean;
}

export interface RuntimeState {
  currentSceneId: string;
  currentPageIndex: number;
  variables: {
    resources: Record<string, number>;
    variables: Record<string, number>;
    characterAttrs: Record<string, Record<string, number>>;
  };
  saveSlots?: RuntimeSaveSlot[];
}

export interface RuntimeSaveSlot {
  id: string;
  savedAt: string;
  snapshot: Omit<RuntimeState, 'saveSlots'>;
}
