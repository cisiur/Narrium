# Data Model — Narrium

This document defines the canonical data structures for Narrium. It is the primary reference for implementation in React, Zustand stores, player runtime, JSON import/export, and future migrations.

---

## Principles

- The model must be JSON-serializable without transformation.
- The same `Project` object is the source of truth for editor and exported player.
- Scene logic is declarative only: conditions and effects, no scripting language.
- Background assets are portable inside exported/imported project JSON.
- Workspace metadata is stored separately from full project payload.
- Characters and Resources are project data, not separate stores.

---

## Top-level models

### WorkspaceProjectMeta

Lightweight metadata used by the **My Projects** screen.

```typescript
interface WorkspaceProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnailDataUrl: string | null;
}
```

#### Notes

- `id` is the stable workspace-level project identifier.
- `thumbnailDataUrl` is reserved for project previews.
- The full project is stored separately under `narrium_project_{id}`.

---

### WorkspaceState

```typescript
interface WorkspaceState {
  projects: WorkspaceProjectMeta[];
  activeProjectId: string | null;
}
```

#### Notes

- Stored under `narrium_workspace` in localStorage.
- `activeProjectId` indicates the currently opened project in the editor.
- Only one project can be active at a time.

---

### Project

Canonical full editor project model.

```typescript
interface Project {
  id: string;
  name: string;
  startSceneId: string;
  scenes: Scene[];
  characters: Character[];
  resources: Resource[];
  groups: SceneGroup[];
  assetLibrary: AssetLibraryItem[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}
```

#### Notes

- `startSceneId` is the story entry point for preview and export.
- Current implementation allows `startSceneId` to be an empty string when the project has no scenes yet.
- `groups` are canvas-only organizational containers in MVP.
- `assetLibrary` stores reusable project-level backgrounds.
- `characters` stores project-level speaker/logic entities.
- `resources` stores project-wide numeric variables.
- `updatedAt` must be refreshed on every meaningful editor change.

---

## Scene graph models

### Scene

```typescript
interface Scene {
  id: string;
  name: string;
  background: SceneBackground;
  position: { x: number; y: number };
  dialoguePages: DialoguePage[];
  choices: Choice[];
  groupId: string | null;
}
```

#### Notes

- `position` is editor-only canvas layout data.
- `groupId` links the scene to a `SceneGroup`; null means ungrouped.
- A scene may contain dialogue with zero choices, which represents an ending scene.

---

### SceneBackground

```typescript
interface SceneBackground {
  mode: 'upload' | 'url' | 'asset' | 'scene_reference' | 'none';
  assetId: string | null;
  sourceSceneId: string | null;
  url: string;
}
```

#### Mode behavior

| Mode | Meaning |
|---|---|
| `none` | No background assigned |
| `url` | Uses external URL stored in `url` |
| `upload` | Uses data URL stored in `url` |
| `asset` | Uses reusable project asset from `assetLibrary` via `assetId` |
| `scene_reference` | Reuses background from another scene via `sourceSceneId` |

#### Validation rules

- `mode='url'` requires non-empty `url`.
- `mode='upload'` requires `url` to be a data URL.
- `mode='asset'` requires valid `assetId`.
- `mode='scene_reference'` requires valid `sourceSceneId` and must not self-reference the same scene.

---

### SceneGroup

```typescript
interface SceneGroup {
  id: string;
  name: string;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  collapsed: boolean;
}
```

#### Notes

- MVP uses groups as visual organizational containers on canvas.
- `collapsed` is reserved for post-MVP group collapsing, but kept in the model now.
- Group membership is controlled from `Scene.groupId`.

---

## Narrative content models

### DialoguePage

```typescript
interface DialoguePage {
  id: string;
  speakerId: string | null;
  text: string;
}
```

#### Notes

- `speakerId = null` means narrator text.
- When `speakerId` is set, it should point to `Character.id`.
- Pages are displayed sequentially before choices appear.
- Order in the array is significant.

---

### Choice

```typescript
interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditions: Condition[];
  effects: Effect[];
}
```

#### Notes

- `targetSceneId = null` means the choice is not connected yet and should be flagged by validation.
- `conditions` must all pass for the choice to be available.
- `effects` are applied immediately after the choice is selected.
- Conditions and effects are currently modeled but not implemented in UI yet.

---

## Character and resource models

### Character

```typescript
interface Character {
  id: string;
  name: string;
  attributes: CharacterAttribute[];
}
```

#### Notes

- Characters can be used as dialogue speakers.
- Characters can later be used as logic targets.
- `name` is user-facing display text.
- Characters are stored in `Project.characters`.

---

### CharacterAttribute

```typescript
interface CharacterAttribute {
  key: string;
  defaultValue: number;
}
```

#### Notes

- Character attributes are flexible numeric stats, e.g. `reputation`, `trust`, `fear`.
- `key` is the logic-facing identifier within a character.
- `defaultValue` seeds runtime state at story start.
- Negative and decimal default values are allowed.
- Invalid numeric editor input should be stored as `0`.
- Attribute keys must be unique within a single character.
- Attribute keys do not need to be unique across different characters.
- Duplicate attribute keys should be resolved with suffixes such as `trust_2`, `trust_3`.
- Current implementation identifies attributes by array index. Consider adding an `id` field before advanced Story Logic, reordering, or migration-sensitive references.

---

### Resource

```typescript
interface Resource {
  id: string;
  key: string;
  defaultValue: number;
}
```

#### Notes

- Resources are project-global numeric values, e.g. `gold`, `health`, `energy`.
- Resources are stored in `Project.resources`.
- `key` is the canonical logic-facing identifier.
- Use `Resource.key`, not `Resource.name`.
- `defaultValue` seeds runtime state at story start.
- Negative and decimal default values are allowed.
- Invalid numeric editor input should be stored as `0`.
- Resource keys must be unique project-wide.
- Duplicate resource keys should be resolved with suffixes such as `gold_2`, `gold_3`.

---

## Story logic models

Story Logic is planned in EPIC 6. The current model already contains `Condition` and `Effect`, but product behavior and UX should be reviewed before implementation.

### Condition

```typescript
interface Condition {
  id: string;
  type: 'resource' | 'character_attr';
  targetId: string;
  attribute?: string;
  operator: '>=' | '<=' | '==' | '>' | '<' | '!=';
  value: number;
  hintText: string;
}
```

#### Notes

- `type='resource'` uses `targetId = Resource.id`.
- `type='character_attr'` uses `targetId = Character.id` and requires `attribute`.
- For `character_attr`, `attribute` currently refers to `CharacterAttribute.key`.
- `hintText` is shown when the condition is not met; the choice stays visible but disabled.
- Future implementation should validate references after resource, character, or attribute deletion.

---

### Effect

```typescript
interface Effect {
  id: string;
  type: 'resource' | 'character_attr';
  targetId: string;
  attribute?: string;
  operation: '+=' | '-=' | '=';
  value: number;
}
```

#### Notes

- Effects modify runtime state only.
- `type='resource'` uses `targetId = Resource.id`.
- `type='character_attr'` uses `targetId = Character.id` and requires `attribute`.
- For `character_attr`, `attribute` currently refers to `CharacterAttribute.key`.
- `operation='='` sets an absolute value.
- Multiple effects can be attached to one choice.
- Future implementation should validate references after resource, character, or attribute deletion.

---

## Asset library model

### AssetLibraryItem

```typescript
interface AssetLibraryItem {
  id: string;
  kind: 'background';
  name: string;
  sourceType: 'upload' | 'url';
  url: string;
  createdAt: string;
}
```

#### Notes

- MVP supports background assets only.
- Uploaded assets are stored as base64 data URLs in `url`.
- URL assets store their external URL directly.

---

## Project settings

### ProjectSettings

```typescript
interface ProjectSettings {
  allowSessionSaveLoad: boolean;
}
```

#### Notes

- Governs whether exported player exposes save/load UI.
- In MVP this should default to `true`.

---

## Runtime models

### RuntimeState

```typescript
interface RuntimeState {
  currentSceneId: string;
  currentPageIndex: number;
  variables: {
    resources: Record<string, number>;
    characterAttrs: Record<string, Record<string, number>>;
  };
  saveSlots?: RuntimeSaveSlot[];
}
```

#### Notes

- Runtime state is built from `Project` defaults when preview starts.
- `variables.resources` should be seeded from `Project.resources`.
- `variables.characterAttrs` should be seeded from `Project.characters[].attributes`.
- Resource runtime keys should be derived from `Resource.key`.
- Character attribute runtime keys should be derived from `CharacterAttribute.key`.

---

### RuntimeSaveSlot

```typescript
interface RuntimeSaveSlot {
  id: string;
  savedAt: string;
  snapshot: Omit<RuntimeState, 'saveSlots'>;
}
```

#### Notes

- `saveSlots` exist only when save/load is enabled.
- Exported HTML player persists slots using localStorage.

---

## Storage layout

| Key | Purpose |
|---|---|
| `narrium_workspace` | Serialized `WorkspaceState` |
| `narrium_project_{id}` | Serialized `Project` |
| `narrium_player_save_{projectId}` | Exported player runtime save data |

---

## Validation checklist

A valid project should satisfy all of the following:

- `Project.startSceneId` points to an existing scene, unless the project has no scenes yet.
- Every `Scene.id`, `Choice.id`, `DialoguePage.id`, `Character.id`, `Resource.id`, `SceneGroup.id`, and `AssetLibraryItem.id` is unique within its collection.
- Every `Choice.targetSceneId`, when present, points to an existing scene.
- Every `Condition.targetId` and `Effect.targetId` points to an existing resource or character depending on type.
- Every `Condition.attribute` / `Effect.attribute` for `character_attr` exists on the target character.
- Every `Scene.groupId`, when present, points to an existing group.
- Every `SceneBackground.assetId` or `sourceSceneId`, when used, points to an existing entity.
- Every `CharacterAttribute.key` is unique within its character.
- Every `Resource.key` is unique project-wide.

---

## MVP defaults

Recommended defaults when creating a new project:

- Project name: `Untitled Project`
- Empty scene list is currently allowed.
- Empty character list.
- Empty resource list.
- Empty asset library.
- `settings.allowSessionSaveLoad = true`
- Auto-generated thumbnail from starter scene once a background is assigned in future.

Recommended defaults when creating editor entities:

- Character name: `New Character`
- Character attributes: `[]`
- Character attribute key: `New Attribute`
- Character attribute default value: `0`
- Resource key: `New Resource`
- Resource default value: `0`
