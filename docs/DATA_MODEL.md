# Data Model — Narrium

This document defines the canonical data structures for Narrium. It is the primary reference for implementation in React, Zustand stores, player runtime, JSON import/export, standalone HTML export, and future migrations.

---

## Principles

- The model must be JSON-serializable without transformation.
- The same `Project` object is the source of truth for editor, Preview player, JSON export/import, and exported standalone HTML player.
- Scene logic is declarative only: conditions and effects, no scripting language.
- Background assets are portable inside exported/imported project JSON.
- Project thumbnails are stored in the full `Project` and mirrored into workspace metadata for fast project listing.
- Workspace metadata is stored separately from full project payload.
- Characters and Resources are project data, not separate stores.
- React Flow is a projection of `Project.scenes`.
- Choice execution separates **effects** from **navigation**.

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
- `thumbnailDataUrl` mirrors `Project.thumbnail` for fast rendering on My Projects.
- The full project is stored separately under `narrium_project_{id}`.
- Workspace metadata should not become the source of truth for story data.

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
  thumbnail: string | null;
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

- `thumbnail` is a Data URL or `null`.
- `thumbnail` is part of the full project so JSON export/import can preserve it.
- `startSceneId` is the story entry point for preview and export.
- Current implementation allows `startSceneId` to be an empty string when the project has no scenes yet.
- `groups` are canvas-only organizational containers in MVP.
- `assetLibrary` stores reusable project-level backgrounds.
- `characters` stores project-level speaker/logic entities.
- `resources` stores project-wide numeric variables.
- `updatedAt` must be refreshed on every meaningful editor change.
- JSON export uses the full `Project` object.
- Standalone HTML export embeds the full `Project` object.

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
- `dialoguePages` order is significant and is the runtime playback order.
- Choices appear after the final dialogue page.
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
- Preview and standalone HTML player support one-level `scene_reference` resolution.

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
- If the referenced character is deleted, the editor should show a missing character warning.
- Pages are displayed sequentially before choices appear.
- Order in the array is significant.
- Current editor supports moving pages up/down.
- Drag-and-drop reordering is backlog.

---

### Choice

```typescript
interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditionGroups: ConditionGroup[];
  effects: Effect[];
}
```

#### Notes

- `conditionGroups` stores OR groups for choice availability.
- Conditions inside one group use AND semantics.
- Condition groups use OR semantics between groups.
- `effects` are applied immediately after an available choice is selected.
- Effects apply in array order.
- `targetSceneId` controls optional navigation:
  - valid scene id: apply effects, navigate to that scene, reset `currentPageIndex` to `0`
  - `null`: apply effects and stay on the current scene/page
  - invalid non-null scene id: choice should be disabled and effects should not run
- `targetSceneId = null` is valid for **action choices** such as `Take Key`, `Search Bookshelf`, or `Ask About Castle`.
- A targetless choice with no effects is currently runtime-valid but should receive a future validation warning because it does nothing.
- Legacy project data may contain `conditions: Condition[]`; `projectMigrations` normalizes those into `conditionGroups`.

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
- Characters can be used as logic targets.
- `name` is user-facing display text.
- Characters are stored in `Project.characters`.
- Deleting a character used by Story Logic should show a warning before deletion.

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
- Conditions/effects reference attributes by `Character.id` + `CharacterAttribute.key`.
- Deleting an attribute used by Story Logic should show a warning before deletion.
- Current implementation identifies attributes by key. Consider adding an `id` field only if future requirements need stable attribute identity across renames.

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
- Conditions/effects reference resources by `Resource.id`.
- Runtime state stores resources by `Resource.key`.
- Deleting a resource used by Story Logic should show a warning before deletion.

---

## Story logic models

Story Logic conditions and effects are modeled on choices through `ConditionGroup[]` and `Effect[]`.

### ConditionGroup

```typescript
interface ConditionGroup {
  id: string;
  conditions: Condition[];
}
```

#### Notes

- `Choice.conditionGroups` is the canonical choice condition model.
- Conditions inside one group all need to pass for that group to pass.
- A choice with multiple groups is available if at least one group passes.
- Legacy `Choice.conditions` exists only for migration compatibility and is normalized into one condition group when needed.
- Empty condition groups pass in runtime helper semantics.

---

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
- The editor shows lightweight validation warnings for missing or deleted resource, character, and attribute references.
- Missing references fail in runtime condition evaluation.
- Condition validation is visual only and should not auto-fix data.

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
- `operation='+='` adds a value.
- `operation='-='` subtracts a value.
- `operation='='` sets an absolute value.
- The editor may display user-friendly operation labels `+`, `-`, `=`, but the stored model remains `+=`, `-=`, `=`.
- Multiple effects can be attached to one choice.
- Effects are applied in array order.
- Effects are independent from navigation.
- The editor shows lightweight validation warnings for missing or deleted resource, character, and attribute references.
- Broken effects are skipped by runtime helper semantics.

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
- JSON project export/import preserves asset library items.
- Standalone HTML export embeds the full Project, so uploaded asset Data URLs remain available in the exported player.

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
- Exported player save/load slots are not implemented yet.

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

- Runtime state is built from `Project` defaults when preview or standalone player starts.
- `currentSceneId` points to the currently displayed scene.
- `currentPageIndex` points to the current dialogue page within the current scene.
- `variables.resources` should be seeded from `Project.resources`.
- `variables.characterAttrs` should be seeded from `Project.characters[].attributes`.
- Resource runtime keys should be derived from `Resource.key`.
- Character attribute runtime keys should be derived from `CharacterAttribute.key`.
- Character attributes are nested under `Character.id`.
- Preview runtime state is local and not persisted.
- Standalone HTML runtime state is local and not persisted until `E8-05`.

Example:

```typescript
runtimeState.variables.resources.gold = 10;
runtimeState.variables.characterAttrs[aliceId].trust = 5;
```

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
- Exported HTML player save/load slots are planned for `E8-05`.
- Future exported player persistence should use localStorage with a key such as `narrium_player_save_{projectId}`.

---

## Storage layout

| Key | Purpose |
|---|---|
| `narrium_workspace` | Serialized `WorkspaceState` |
| `narrium_project_{id}` | Serialized `Project` |
| `narrium_player_save_{projectId}` | Future exported player runtime save data |

---

## Import / Export behavior

### JSON project export

- Exports the active full `Project` object as formatted JSON.
- Uses the same canonical model as editor state.
- Preserves Data URLs.
- Does not mutate Project data.
- Does not update localStorage.

### JSON project import

- Accepts a Narrium Project JSON file.
- Parses and validates the file conservatively.
- Passes parsed data through project normalization.
- Creates a **new** project:
  - new `Project.id`
  - new `createdAt`
  - new `updatedAt`
- Preserves all story content and portable assets.
- Creates matching `WorkspaceProjectMeta`.
- Saves the imported project to localStorage.
- Opens the imported project.
- Invalid files do not crash the app and show `Invalid Narrium project file.`

### Standalone HTML export

- Exports a single `.html` file.
- Embeds the active full `Project` object.
- Preserves Data URLs.
- Opens directly from disk.
- Does not require the Narrium app, npm, Vite, React dev server, or a local server.
- Does not use localStorage yet.
- Supports Preview-equivalent runtime behavior for:
  - dialogue pages
  - speaker names
  - choices
  - conditions
  - unavailable hints
  - resource effects
  - character attribute effects
  - targetless action choices
  - valid target navigation
  - invalid target disabled behavior
  - restart
  - end state
  - supported backgrounds

---

## Migration rules

Current implemented migrations:

- Legacy `Choice.conditions` is normalized into `Choice.conditionGroups`.
- Missing `Project.thumbnail` is normalized to `null`.
- Missing `WorkspaceProjectMeta.thumbnailDataUrl` is normalized to `null` when loading workspace metadata.
- Full current `Project` shape is normalized on load/import:
  - collections
  - settings
  - scene backgrounds
  - dialogue pages
  - choices
  - condition groups
  - effects

Migration principles:

- Migrations should be centralized in `projectMigrations.ts` when they affect full Project payloads.
- Workspace metadata normalization can live in `workspaceStore` if it only affects the workspace list.
- Migrations should preserve author data whenever possible.
- Migrations should mark changed projects for persistence after loading.

---

## Validation checklist

A valid project should satisfy all of the following:

- `Project.startSceneId` points to an existing scene, unless the project has no scenes yet.
- Every `Scene.id`, `Choice.id`, `DialoguePage.id`, `Character.id`, `Resource.id`, `SceneGroup.id`, and `AssetLibraryItem.id` is unique within its collection.
- Every `DialoguePage.speakerId`, when present, points to an existing `Character.id`.
- Every non-null `Choice.targetSceneId` points to an existing scene.
- `Choice.targetSceneId = null` is allowed for targetless action choices.
- A targetless choice without effects should eventually receive a validation warning because it does nothing.
- Every `Condition.targetId` and `Effect.targetId` points to an existing resource or character depending on type.
- Every `Condition.attribute` / `Effect.attribute` for `character_attr` exists on the target character.
- Every `Scene.groupId`, when present, points to an existing group.
- Every `SceneBackground.assetId` or `sourceSceneId`, when used, points to an existing entity.
- Every `CharacterAttribute.key` is unique within its character.
- Every `Resource.key` is unique project-wide.
- `Project.thumbnail`, when present, should be a Data URL.

---

## MVP defaults

Recommended defaults when creating a new project:

```typescript
Project.thumbnail = null
Project.startSceneId = ''
Project.scenes = []
Project.characters = []
Project.resources = []
Project.groups = []
Project.assetLibrary = []
Project.settings.allowSessionSaveLoad = true
```

Recommended defaults when creating a new scene:

```typescript
Scene.background = {
  mode: 'none',
  assetId: null,
  sourceSceneId: null,
  url: ''
}
Scene.dialoguePages = [
  {
    id: crypto.randomUUID(),
    speakerId: null,
    text: ''
  }
]
Scene.choices = []
Scene.groupId = null
```

Recommended defaults when creating a new choice:

```typescript
Choice.targetSceneId = null
Choice.conditionGroups = []
Choice.effects = []
```

Recommended defaults when creating a new condition group:

```typescript
ConditionGroup.conditions = [
  defaultCondition
]
```

Recommended defaults when creating a new effect:

```typescript
Effect.type = 'resource'
Effect.targetId = ''
Effect.operation = '+='
Effect.value = 0
```
