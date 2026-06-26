# Data Model — Narrium

This document defines the canonical data structures for Narrium. It is the primary reference for implementation in React, Zustand stores, player runtime, JSON import/export, and future migrations.

## Principles

- The model must be JSON-serializable without transformation.
- The same `Project` object is the source of truth for editor and exported player.
- Scene logic is declarative only: conditions and effects, no scripting language.
- Background assets are portable inside exported/imported project JSON.
- Workspace metadata is stored separately from full project payload.

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
- `thumbnailDataUrl` is auto-generated from the start scene background by default, but the user can override it manually.
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
- `groups` are canvas-only organizational containers in MVP.
- `assetLibrary` stores reusable project-level backgrounds.
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
- `hintText` is shown when the condition is not met; the choice stays visible but disabled.

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
- `operation='='` sets an absolute value.
- Multiple effects can be attached to one choice.

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

### CharacterAttribute

```typescript
interface CharacterAttribute {
  key: string;
  defaultValue: number;
}
```

### Resource

```typescript
interface Resource {
  id: string;
  name: string;
  defaultValue: number;
}
```

#### Notes

- Character attributes are flexible numeric stats, e.g. `reputation`, `trust`, `fear`.
- Resources are project-global numeric values, e.g. `gold`, `health`, `energy`.
- These defaults seed the runtime state at story start.

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

### RuntimeSaveSlot

```typescript
interface RuntimeSaveSlot {
  id: string;
  savedAt: string;
  snapshot: Omit<RuntimeState, 'saveSlots'>;
}
```

#### Notes

- Runtime state is built from `Project` defaults when preview starts.
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

- `Project.startSceneId` points to an existing scene.
- Every `Scene.id`, `Choice.id`, `DialoguePage.id`, `Character.id`, `Resource.id`, `SceneGroup.id`, and `AssetLibraryItem.id` is unique within its collection.
- Every `Choice.targetSceneId`, when present, points to an existing scene.
- Every `Condition.targetId` and `Effect.targetId` points to an existing resource or character depending on type.
- Every `Condition.attribute` / `Effect.attribute` for `character_attr` exists on the target character.
- Every `Scene.groupId`, when present, points to an existing group.
- Every `SceneBackground.assetId` or `sourceSceneId`, when used, points to an existing entity.

---

## MVP defaults

Recommended defaults when creating a new project:

- Project name: `Untitled Project`
- One starter scene created automatically
- Starter scene becomes `startSceneId`
- Empty character list
- Empty resource list
- Empty asset library
- `settings.allowSessionSaveLoad = true`
- Auto-generated thumbnail from starter scene once a background is assigned
