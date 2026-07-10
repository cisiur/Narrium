# Data Model — Narrium

This document defines the canonical data structures for Narrium. It is the primary reference for implementation in React, Zustand stores, player runtime, JSON import/export, standalone HTML export, and future migrations.

---

## Principles

- The model must be JSON-serializable without transformation.
- The same `Project` object is the source of truth for editor, Preview player, JSON export/import, and exported standalone HTML player.
- Scene logic is declarative only: conditions and effects, no scripting language.
- Background assets are cataloged in `Project.assetLibrary`.
- Current background asset sources remain embedded Data URLs or remote URLs.
- Future desktop project storage should keep large imported assets as local files behind the asset catalog instead of embedding them as Data URLs.
- Project thumbnails are stored in the full `Project` and mirrored into workspace metadata for fast project listing.
- Workspace metadata is stored separately from full project payload.
- Characters, Resources, and Variables are project data, not separate stores.
- React Flow is a projection of `Project.scenes` and editor-only `Project.groups`.
- Choice execution separates **effects** from **navigation**.
- Resources are intended as player-facing numeric story values.
- Variables are intended as hidden/internal numeric story-state values.
- Exported standalone player save/load stores runtime snapshots only, not the embedded Project.

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

Notes:
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

Notes:
- Stored under `narrium_workspace` in localStorage.
- `activeProjectId` indicates the currently opened project in the editor.
- Only one project can be active at a time.
- In desktop-first development, workspace remains a compatibility/app-state concept and should not become the long-term project database.

---

### Desktop App Preferences

Desktop-only app preferences are separate from `WorkspaceState` and `Project`.

Current preference data:

```typescript
interface RecentProject {
  name: string;
  filePath: string;
  lastOpenedAt: string;
}

interface AppPreferences {
  recentProjects: RecentProject[];
  lastOpenedProjectFilePath: string | null;
}
```

Notes:
- Recent projects are application preferences, not story data.
- Recent projects are capped at 10 entries.
- `lastOpenedProjectFilePath` is used to offer reopening the last project; Narrium does not automatically reopen it.
- These preferences do not change the canonical `Project` model or `.narrium` file wrapper.

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
  variables: Variable[];
  groups: SceneGroup[];
  assetLibrary: AssetLibraryItem[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}
```

Notes:
- `thumbnail` is a Data URL or `null`.
- `thumbnail` is part of the full project so JSON export/import can preserve it.
- `startSceneId` is the story entry point for preview and export.
- Current implementation allows `startSceneId` to be an empty string when the project has no scenes yet.
- `groups` are editor-only canvas organization metadata.
- `assetLibrary` stores reusable project-level background assets.
- `characters` stores project-level speaker/logic entities.
- `resources` stores project-wide numeric values intended for player-facing state such as gold, health, or inventory-like counts.
- `variables` stores project-wide numeric values intended for hidden/internal story state such as flags, suspicion, visited states, or quest stages.
- `updatedAt` must be refreshed on every meaningful editor change.
- JSON export uses the full `Project` object.
- Standalone HTML export embeds the full `Project` object.
- Old projects without `variables` are normalized to `variables: []`.

---

## Desktop-first project format

The current MVP `Project` object remains the validated domain model for scenes, choices, story logic, characters, resources, variables, groups, settings, and runtime initialization.

The desktop project artifact is now a `.narrium` file:

```text
MyStory.narrium
```

Current implementation rules:
- `.narrium` files are JSON internally and wrap the normalized JSON-compatible `Project` data.
- The wrapper shape is `{ "format": "narrium.project", "formatVersion": 1, "project": { ... } }`.
- Open Project File, Save, and Save As operate on `.narrium` files in desktop builds.
- Create Project creates a transitional localStorage draft until Save As creates a `.narrium` file.
- Dirty state and recent project files are desktop app state, not fields inside `Project`.
- Browser/Vite workflow still uses the existing localStorage-backed workspace for compatibility.
- Local asset folders are not implemented yet.
- Uploaded background images are stored as embedded Data URL assets in `assetLibrary` until a later asset-storage task.
- Remote background URLs are stored as remote URL assets in `assetLibrary`.
- Newly assigned scene backgrounds should reference catalog assets by `assetId` instead of duplicating source URLs on scenes.
- Legacy raw Project JSON, including old `project.narrium.json`, remains openable as a compatibility fallback when selected as a file.

Intended storage rules:
- `.narrium` stores the JSON-compatible `Project` data inside the wrapper.
- Asset references inside the project file should eventually add a local storage backend with relative paths such as `assets/castle.png`.
- Imported or uploaded files should eventually be copied into local project asset storage.
- Large uploaded image Data URLs should not be stored inside the long-term saved project file.
- The exact local asset file layout remains future work.

Compatibility:
- Current web MVP exports may still contain embedded Data URLs in `Project.thumbnail`, legacy `SceneBackground.url`, or legacy `AssetLibraryItem.url`.
- Desktop import should accept legacy web MVP JSON.
- Current normalization migrates legacy direct scene background URLs into `assetLibrary` where practical.
- A future migration step should extract embedded Data URLs into local files where practical, then rewrite asset sources to a future local storage representation.
- The canonical story model should remain recognizable so existing validation, preview, and runtime logic can be reused.

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

Notes:
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

Mode behavior:

| Mode | Meaning |
|---|---|
| `none` | No background assigned |
| `url` | Uses external URL stored in `url` |
| `upload` | Uses data URL stored in `url` |
| `asset` | Uses reusable project asset from `assetLibrary` via `assetId` |
| `scene_reference` | Reuses background from another scene via `sourceSceneId` |

Validation rules:
- `mode='url'` requires non-empty `url`.
- `mode='upload'` requires `url` to be a data URL.
- `mode='asset'` requires valid `assetId`.
- `mode='scene_reference'` requires valid `sourceSceneId` and must not self-reference the same scene.
- Preview and standalone HTML player support one-level `scene_reference` resolution.
- `url` and `upload` remain legacy-compatible modes. New background assignments should create an asset and set `mode='asset'`.
- For new asset-backed backgrounds, `url` should be empty so the source is stored once in `AssetLibraryItem.source`.

---

### SceneGroup

Scene Groups use these Project model fields:

```typescript
Project.groups: SceneGroup[]
Scene.groupId: string | null
```

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

Notes:
- `Project.groups: SceneGroup[]` stores editor-only canvas organization.
- `Scene.groupId: string | null` assigns a scene to one group; `null` means the scene is ungrouped.
- Scene Groups do not affect runtime, Preview, standalone HTML playback, or Story Logic.
- Group membership must not change `Choice.targetSceneId`, condition groups, conditions, effects, dialogue pages, or runtime state.
- `collapsed` affects canvas rendering only.
- Expanded groups render as visual frames around their member scenes.
- Collapsed groups render as one canvas group node while member scene nodes are hidden.
- `position` and `size` are canvas presentation metadata used for expanded group frames and collapsed group node placement.
- Collapsed group edge projection is visual only. Projected canvas edges may render against a group node, but the underlying `Choice.targetSceneId` remains the real scene id.
- Group membership is controlled from `Scene.groupId`; `SceneGroup` does not duplicate member scene ids.

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

Notes:
- `speakerId = null` means narrator text.
- When `speakerId` is set, it should point to `Character.id`.
- If the referenced character is deleted, the editor should show a missing character warning.
- Confirmed deletion of a character used as a speaker clears affected `speakerId` values while keeping dialogue pages intact.
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

Notes:
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
- A targetless choice with no effects is authoring-valid but receives a validation warning because it does nothing.
- Legacy project data may contain `conditions: Condition[]`; `projectMigrations` normalizes those into `conditionGroups`.

---

## Character, Resource, and Variable models

### Character

```typescript
interface Character {
  id: string;
  name: string;
  attributes: CharacterAttribute[];
}
```

Notes:
- Characters can be used as dialogue speakers.
- Characters can be used as logic targets.
- `name` is user-facing display text.
- Characters are stored in `Project.characters`.
- Deleting a character used by Story Logic should show a warning before deletion.
- Deleting a character used as a dialogue speaker should show a confirmation dialog and clear affected speaker references on confirmation.

---

### CharacterAttribute

```typescript
interface CharacterAttribute {
  key: string;
  defaultValue: number;
}
```

Notes:
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
  displayName: string;
  icon: string;
  visible: boolean;
  defaultValue: number;
}
```

Notes:
- Resources are project-global numeric values, e.g. `gold`, `health`, `energy`, `food`, or `wood`.
- Resources are stored in `Project.resources`.
- Resources are intended as player-facing values and can be displayed in the player Resource HUD.
- `key` is the canonical internal logic-facing identifier.
- `displayName` is the player-facing label shown in Preview and standalone HTML Resource HUDs.
- `icon` is presentation metadata selected from the built-in icon list.
- `visible` controls whether the resource appears in the player Resource HUD.
- Use `Resource.key`, not `Resource.name`.
- `defaultValue` seeds runtime state at story start.
- Negative and decimal default values are allowed.
- Invalid numeric editor input should be stored as `0`.
- Resource keys must be unique project-wide.
- Duplicate resource keys should be resolved with suffixes such as `gold_2`, `gold_3`.
- Conditions/effects reference resources by `Resource.id`.
- Runtime state stores resources by `Resource.key`.
- Deleting a resource used by Story Logic should show a warning before deletion.
- Old projects without presentation metadata are normalized with:
  - `displayName = key`
  - `icon = 'circle'`
  - `visible = true`

---

### Variable

```typescript
interface Variable {
  id: string;
  key: string;
  defaultValue: number;
}
```

Notes:
- Variables are project-global numeric values intended for hidden/internal story state.
- Examples: `visited_forest`, `knows_secret`, `guard_suspicion`, `quest_stage`, `has_seen_intro`.
- Variables are stored in `Project.variables`.
- `key` is the canonical logic-facing identifier.
- `defaultValue` seeds runtime state at story start.
- Negative and decimal default values are allowed.
- Invalid numeric editor input should be stored as `0`.
- Variable keys must be unique project-wide within `Project.variables`.
- Duplicate variable keys should be resolved with suffixes such as `visited_forest_2`, `visited_forest_3`.
- Conditions/effects reference variables by `Variable.id`.
- Runtime state stores variables by `Variable.key`.
- Variables are not normally shown to the player.
- Variables are never displayed in the Resource HUD.
- Variables are useful for flags and progression state; boolean-like values should be represented as `0` / `1` in the MVP.

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

Notes:
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
  type: 'resource' | 'character_attr' | 'variable';
  targetId: string;
  attribute?: string;
  operator: '>=' | '<=' | '==' | '>' | '<' | '!=';
  value: number;
  hintText: string;
}
```

Notes:
- `type='resource'` uses `targetId = Resource.id`.
- `type='variable'` uses `targetId = Variable.id`.
- `type='character_attr'` uses `targetId = Character.id` and requires `attribute`.
- For `character_attr`, `attribute` currently refers to `CharacterAttribute.key`.
- `hintText` is shown when the condition is not met; the choice stays visible but disabled.
- The editor shows lightweight validation warnings for missing or deleted resource, variable, character, and attribute references.
- Missing references fail in runtime condition evaluation.
- Condition validation is visual only and should not auto-fix data.

---

### Effect

```typescript
interface Effect {
  id: string;
  type: 'resource' | 'character_attr' | 'variable';
  targetId: string;
  attribute?: string;
  operation: '+=' | '-=' | '=';
  value: number;
}
```

Notes:
- Effects modify runtime state only.
- `type='resource'` uses `targetId = Resource.id`.
- `type='variable'` uses `targetId = Variable.id`.
- `type='character_attr'` uses `targetId = Character.id` and requires `attribute`.
- For `character_attr`, `attribute` currently refers to `CharacterAttribute.key`.
- `operation='+='` adds a value.
- `operation='-='` subtracts a value.
- `operation='='` sets an absolute value.
- The editor may display user-friendly operation labels `+`, `-`, `=`, but the stored model remains `+=`, `-=`, `=`.
- Multiple effects can be attached to one choice.
- Effects are applied in array order.
- Effects are independent from navigation.
- The editor shows lightweight validation warnings for missing or deleted resource, variable, character, and attribute references.
- Broken effects are skipped by runtime helper semantics.

---

## Asset library model

### AssetLibraryItem

```typescript
interface AssetLibraryItem {
  id: string;
  kind: 'background';
  name: string;
  storageType: 'embedded' | 'remote';
  source: string;
  createdAt: string;
  metadata?: {
    mimeType?: string;
    width?: number;
    height?: number;
    fileSize?: number;
  };
}
```

Notes:
- Narrium currently supports background assets only.
- `storageType='embedded'` stores a Data URL in `source`.
- `storageType='remote'` stores an external URL in `source`.
- New uploaded and URL backgrounds are stored in `Project.assetLibrary`, and scenes reference them through `SceneBackground.assetId`.
- Multiple scenes can reference the same asset without duplicating the source data.
- JSON project export/import preserves asset library items.
- `.narrium` saves the normalized asset catalog inside the wrapped Project.
- Standalone HTML export embeds the full Project, so embedded Data URL assets remain available in the exported player.
- A platform-neutral asset source resolver is responsible for turning an asset into a display source for thumbnails, preview, and playback.
- Deleting a referenced asset clears affected scene background assignments.

Compatibility and future desktop direction:
- Legacy serialized assets with `sourceType` and `url` normalize into `storageType` and `source`.
- Legacy scene backgrounds with direct `mode='upload'` or `mode='url'` normalize into catalog assets where practical.
- Future E11-05B should add local file storage as a new backend behind this same catalog model.
- No local asset files, filesystem paths, `assets/` directory, Blob URLs, or checksums are part of the current model.

---

## Project settings

### ProjectSettings

```typescript
interface ProjectSettings {
  allowSessionSaveLoad: boolean;
}
```

Notes:
- Governs whether exported standalone player exposes save/load UI.
- In MVP this should default to `true`.
- Exported player save/load is implemented for standalone HTML exports.
- If `allowSessionSaveLoad !== false`, the standalone player exposes Save, Load, and Clear Save controls.
- Preview runtime state remains local and non-persistent.

---

## Runtime models

### RuntimeState

```typescript
interface RuntimeState {
  currentSceneId: string;
  currentPageIndex: number;
  variables: {
    resources: Record<string, number>;
    variables: Record<string, number>;
    characterAttrs: Record<string, Record<string, number>>;
  };
  saveSlots?: RuntimeSaveSlot[];
}
```

Notes:
- `currentSceneId` is the scene currently being played.
- `currentPageIndex` is the active dialogue page index in the current scene.
- RuntimeState stores resources, variables, and character attributes.
- `variables.resources` stores runtime resource values by `Resource.key`.
- `variables.variables` stores runtime variable values by `Variable.key`.
- `variables.characterAttrs` stores runtime character attributes by `Character.id` and `CharacterAttribute.key`.
- RuntimeState is derived from `Project` defaults when Preview or exported standalone player starts.
- RuntimeState is mutated by effects during playback.
- RuntimeState should not mutate the editor `Project`.

---

### RuntimeSaveSlot

```typescript
interface RuntimeSaveSlot {
  id: string;
  savedAt: string;
  snapshot: Omit<RuntimeState, 'saveSlots'>;
}
```

Notes:
- Reserved for runtime save slot representation.
- Standalone HTML export currently persists runtime snapshots in localStorage.
- Standalone runtime snapshots include resources, variables, and character attributes.

---

## Migration and compatibility rules

`normalizeProject(project)` is responsible for keeping older localStorage and imported project JSON compatible with the current model.

Current normalization responsibilities include:
- adding missing `thumbnail`
- repairing missing/invalid `startSceneId`
- normalizing scenes
- normalizing backgrounds
- normalizing dialogue pages with missing `speakerId`
- migrating legacy `Choice.conditions` into `Choice.conditionGroups`
- adding missing `effects`
- adding missing Resource presentation metadata:
  - `displayName`
  - `icon`
  - `visible`
- adding missing project collections:
  - `scenes`
  - `characters`
  - `resources`
  - `variables`
  - `groups`
  - `assetLibrary`
- adding missing `settings.allowSessionSaveLoad`
- normalizing legacy `AssetLibraryItem.sourceType`/`url` into `storageType`/`source`
- migrating legacy direct scene background Data URLs and remote URLs into reusable background assets
- reusing one migrated asset for duplicate legacy background sources
- keeping background migration idempotent

Compatibility requirement:
- Old projects without `variables` must load as valid projects with `variables: []`.
- Old projects with direct scene background URLs must still load and render, then save in the normalized catalog form where practical.
