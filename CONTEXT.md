# Context — Narrium

> This file is used to resume work on Narrium in a new AI session.  
> Paste this file at the beginning of a new conversation before asking for planning, review, or implementation prompts.

---

## What is this project

Narrium is a **no-code, browser-based visual novel editor**.

Authors build branching interactive stories by connecting scene tiles on a visual canvas — no programming required. Each scene can contain a background image, ordered dialogue pages, and response choices. Choices can carry declarative condition groups and declarative effects.

The finished story can be previewed in the browser and exported as a standalone HTML player file.

Target user:
- non-technical authors
- writers
- game designers
- hobbyists
- people who want to create branching narratives without coding

Platform:
- browser-only web app for MVP
- no mobile app for now

---

## Repository

- **URL:** https://github.com/cisiur/Narrium
- **Active branch:** `main`
- **Do not use:** `dev` branch
- **Source:** `/src/`
- **Docs:** `/docs/`

Workflow:
- Active development happens directly on `main`.
- Do not create or target a `dev` branch unless the project owner explicitly changes the workflow.
- The assistant acts as PM.
- Codex implements.
- The project owner makes product decisions.
- The assistant should not generate implementation code directly unless explicitly asked.
- First provide plan and rationale.
- Codex prompts are created only after product-owner acceptance.
- Codex prompts must be in English and ready to paste.
- After each push, review the implementation against the accepted scope.
- Current Codex prompts should include:
  - implement scoped task only
  - run `npm.cmd test` when tests are relevant or already exist
  - run `npm.cmd run build`
  - create a commit with the specified message
  - push to `main` after tests/build pass
- After confirmed task batches, update documentation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React + TypeScript |
| Canvas / graph | React Flow (`reactflow` ^11) |
| State management | Zustand |
| Styling | Tailwind CSS v3 |
| Storage | localStorage for MVP |
| Project format | JSON-compatible `Project` object |
| Runtime player | Embedded React Preview player |
| Exported player | Standalone HTML file with embedded Project + minimal runtime |
| Tests | Vitest |
| Bundler | Vite |

---

## Current Project Status

### Completed major areas

```text
Workspace Management       ██████████ 100%
Canvas Graph Editor        ██████████ 100%
Scene Editor Basics        ██████████ 100%
Background System          ██████████ 100%
Canvas / Choice UX         ██████████ 100%
Characters & Resources     ██████████ 100%
Story Logic — Conditions   ██████████ 100%
Story Logic — Effects      ██████████ 100%
Story Logic — Runtime      ██████████ 100%
Post-Audit Stabilization   ██████████ 100%
Story Player Preview       ██████████ 100%
Save / Export              ███████░░░  70%
Polish & Production UX     ████░░░░░░  40%
```

Current state:
Narrium has a usable local multi-project workspace, project settings sidebar, project thumbnails, React Flow scene graph editor, right-side scene editor, background system, asset library support, SceneNode thumbnails, ordered dialogue pages, character speaker selection, choice target editing, edge-to-choice navigation, project-level Characters, Character attributes, project-level Resources, complete Story Logic Conditions, complete Story Logic Effects, runtime helper functions for condition/effect execution, a functional in-browser Story Player Preview, JSON project export/import, and a standalone HTML story export foundation with runtime parity.

Completed milestones:
- EPIC 6 — Story Logic is complete for the MVP editor/runtime-helper layer.
- Post-EPIC 6 UX Polish Sprint is complete.
- Post-Audit Stabilization Sprint after `docs/AUDIT_EPIC_6_TO_7.md` is complete.
- EPIC 7 — Story Player MVP is complete.
- EPIC 8 JSON export/import is complete.
- EPIC 8 standalone HTML export foundation and runtime parity are complete.

Current recommended next milestone:
- **E8-04C — Standalone HTML polish**
- then **E8-05 — Exported player save/load slots**

---

## Current Implementation Status

### Workspace / Projects

- My Projects screen.
- Create local project.
- Open existing local project.
- Return from canvas to My Projects.
- Project card grid.
- Project settings opened from a `...` button.
- Right-side Project Settings sidebar.
- Rename project from Project Settings.
- Delete project with confirmation.
- Project thumbnail upload.
- Project thumbnail preview on Project Card.
- Replace project thumbnail.
- Remove project thumbnail.
- Active project name displayed in canvas header.
- Multiple local projects.
- Workspace persistence:
  - `narrium_workspace`
  - `narrium_project_{id}`
- Import project from JSON:
  - available from My Projects
  - imports a valid Narrium `Project` JSON
  - normalizes imported project data
  - creates a new project id
  - refreshes created/updated timestamps
  - creates workspace metadata
  - saves the imported project
  - opens the imported project
  - invalid import shows `Invalid Narrium project file.`

### Project Navigation

- Project-level view state:
  - `canvas`
  - `characters`
  - `resources`
- Left project sidebar switches between Canvas, Characters, and Resources.
- Opening a project defaults to Canvas.
- Canvas keeps the right Scene Editor panel.
- Characters and Resources use full-width main screens without the Scene Editor panel.
- Obsolete My Projects Inspector placeholder has been removed.
- Canvas toolbar includes Preview entry point for Story Player.
- Project header includes:
  - My Projects
  - Add Scene
  - Preview
  - Export JSON
  - Export HTML

### Shared UI

- Reusable `RightSidebar` component:
  - overlay
  - slide-in panel
  - close button
  - outside click close
  - Escape close
  - title/subtitle/footer slots
- Project Settings uses `RightSidebar`.
- Scene Editor still uses its existing dedicated panel.

### Canvas Graph Editor

- React Flow canvas.
- Background dots.
- Controls.
- MiniMap.
- Empty state.
- Scene nodes.
- Node drag persists `scene.position`.
- Add scene from toolbar.
- Edge creation.
- Edge deletion.
- Left-to-right handles:
  - input / target: left
  - output / source: right
- Dragging an edge always creates a new Choice.
- Edge label comes from Choice text.
- Clicking an edge opens the corresponding Choice inside Scene Editor.
- Deleting an edge clears `choice.targetSceneId`.
- Deleting a scene clears incoming `choice.targetSceneId` references.
- Deleting the start scene repairs `Project.startSceneId`.
- Deleting a scene resets dangling `scene_reference` backgrounds that pointed to the deleted scene.

### Scene Editor

- Right sidebar panel.
- Scene name inline editing.
- Background, Dialogue Pages, and Choices sections start collapsed by default.
- Sections expand/collapse on click.
- Dialogue pages:
  - add
  - edit text
  - delete
  - last page cannot be deleted
  - speaker selector
  - Narrator support through `speakerId: null`
  - Character speaker support through `speakerId: Character.id`
  - missing/deleted character speaker warning
  - move page up
  - move page down
  - order persists in `scene.dialoguePages`
- Dialogue page order is runtime order.
- Choices:
  - add
  - edit text
  - delete
  - show target scene
  - target scene dropdown
  - edge-click highlight + scroll into view
  - condition editor embedded under each Choice
  - effects editor embedded under each Choice

### Background System

- Background picker modes:
  - `none`
  - `url`
  - `upload`
  - `asset`
  - `scene_reference`
- External image URL preview.
- Local upload stored as Data URL.
- Scene reference background mode.
- Project Asset Library:
  - add URL asset
  - add upload asset
  - list background assets
  - use asset as scene background
  - delete asset
  - reset scenes using deleted asset
- SceneNode background thumbnails:
  - URL
  - upload
  - asset
  - one-level scene reference
  - placeholders for missing/no background
- Story Player and standalone HTML background rendering supports:
  - URL
  - upload
  - asset
  - one-level scene reference
  - no background fallback

### Characters

- Characters project view.
- Character list.
- Add character.
- Rename character inline.
- Delete character.
- Character attributes section per character.
- Add character attribute.
- Rename attribute key inline.
- Renaming a Character Attribute cascades matching Story Logic references from old key to new key.
- Edit numeric attribute default value.
- Negative and decimal attribute values are supported.
- Invalid attribute values are stored as `0`.
- Delete character attribute.
- Duplicate attribute keys are resolved per character with suffixes such as `strength_2`, `strength_3`.
- Character mutations use `workspaceStore.updateActiveProject()`.
- Deleting a Character used by Story Logic shows a warning before deletion.
- Deleting a Character Attribute used by Story Logic shows a warning before deletion.

### Resources

- Resources project view.
- Resource list.
- Add resource.
- Rename resource key inline.
- Edit numeric resource default value.
- Negative and decimal resource values are supported.
- Invalid resource values are stored as `0`.
- Delete resource.
- Duplicate resource keys are resolved project-wide with suffixes such as `gold_2`, `gold_3`.
- Resource mutations use `workspaceStore.updateActiveProject()`.

### Story Logic — Conditions

- `ConditionGroup` data model added.
- `Choice.conditions` migrated to `Choice.conditionGroups`.
- Backward compatibility exists for old localStorage projects that still contain legacy `conditions`.
- Legacy non-empty `conditions` migrate into one default condition group.
- Legacy empty `conditions` migrate into `conditionGroups: []`.
- Condition groups represent:
  - OR between groups
  - AND inside each group
- Runtime semantics:
  - no groups means choice is available
  - empty group passes
- Editor UX safety:
  - `+ Add OR Group` creates a group with one default condition
  - empty groups display an inline warning: `This group has no conditions and will always pass.`
- Choice editor includes a Conditions section.
- Add/delete OR condition groups.
- Add/delete condition rows inside groups.
- Resource conditions:
  - select project Resource
  - display `Resource.key`
  - store `Resource.id` in `condition.targetId`
  - edit operator, value, and hint text
  - visual warnings for missing/deleted resources
- Character Attribute conditions:
  - select Character
  - display `Character.name`
  - store `Character.id` in `condition.targetId`
  - select Character Attribute
  - display/store `CharacterAttribute.key` in `condition.attribute`
  - edit operator, value, and hint text
  - visual warnings for missing/deleted characters and attributes
- Condition value input supports integers, decimals, and negative numbers.
- Invalid numeric condition values are stored as `0`.
- Condition validation is visual only.
- Condition validation does not auto-fix stored data.
- Condition editor code lives in `src/features/story-logic/`.

### Story Logic — Effects

- Effect data model accepted.
- Choice editor includes an Effects section.
- Add/delete effects.
- Resource effects:
  - select project Resource
  - display `Resource.key`
  - store `Resource.id` in `effect.targetId`
  - edit operation and value
  - visual warnings for missing/deleted resources
- Character Attribute effects:
  - select Character
  - display `Character.name`
  - store `Character.id` in `effect.targetId`
  - select Character Attribute
  - display/store `CharacterAttribute.key` in `effect.attribute`
  - edit operation and value
  - visual warnings for missing/deleted characters and attributes
- Effect operations are stored as:
  - `+=`
  - `-=`
  - `=`
- Effect operation labels are displayed in the editor as:
  - `+`
  - `-`
  - `=`
- Effect value input supports numeric values.
- Invalid numeric effect values are stored as `0`.
- Effect validation is visual only.
- Effect validation does not auto-fix stored data.
- Character Attribute effects are preserved across attribute key renames through cascade reference updates.

### Story Logic — Runtime Helpers

Implemented in `src/features/story-logic/runtimeLogic.ts`:

- `compareNumbers()`
- `evaluateCondition()`
- `isChoiceAvailable()`
- `resolveUnavailableChoiceHint()`
- `applyNumericOperation()`
- `applyEffects()`
- `advanceRuntimeForChoice()`

Runtime helper behavior:
- A choice with no condition groups is available.
- OR between condition groups.
- AND inside a condition group.
- Empty condition group passes.
- Missing condition references fail.
- Missing effect references are skipped.
- Resource runtime values are keyed by `Resource.key`.
- Character attribute runtime values are keyed by `character.id` and `attribute.key`.
- Missing runtime values used by effects start at `0`.
- Effects apply in array order.
- Effects are independent from navigation.
- Choices with valid non-null `targetSceneId` apply effects, navigate, and reset `currentPageIndex` to `0`.
- Choices with `targetSceneId: null` can act as **action choices**: apply effects, stay on the current scene/page, and allow the player to re-render with updated runtime variables.
- Choices with invalid non-null `targetSceneId` do nothing and should be disabled in player UI.
- Runtime helpers are pure and do not mutate Project or RuntimeState.
- Runtime helpers have focused Vitest coverage.

### Story Logic — Reference Usage Warnings

Implemented in `src/features/story-logic/referenceUsage.ts`:

- Finds Story Logic references to:
  - Resources
  - Characters
  - Character Attributes
- Checks both:
  - `choice.conditionGroups`
  - `choice.effects`
- Used before deleting Resources, Characters, and Character Attributes.
- Deletion is not blocked.
- Confirmation cancel aborts deletion.
- Confirmation accept deletes and leaves broken references visible through existing warnings.

### Project Migrations / Normalization

Implemented in `src/store/projectMigrations.ts`:

- Normalizes legacy `Choice.conditions` into canonical `Choice.conditionGroups`.
- Ensures `Project.thumbnail` exists.
- Ensures full current Project shape exists on load:
  - `startSceneId`
  - `scenes`
  - `characters`
  - `resources`
  - `groups`
  - `assetLibrary`
  - `settings`
- Ensures each scene has:
  - `background`
  - `position`
  - `dialoguePages`
  - `choices`
  - `groupId`
- Ensures each choice has:
  - `conditionGroups`
  - `effects`
- Ensures each dialogue page has:
  - `speakerId`
- Enforces valid `startSceneId` invariant:
  - if scenes exist, `startSceneId` points to an existing scene
  - if no scenes exist, `startSceneId` is `''`

### Story Player / Preview

Implemented in `src/features/player/`:

- `runtimeState.ts`
  - `createInitialRuntimeState(project)`
  - initializes runtime from `Project.startSceneId`, `Project.resources`, and `Project.characters[].attributes`
- `StoryPlayer.tsx`
  - owns local `RuntimeState`
  - coordinates player flow
  - composes child components
  - uses `advanceRuntimeForChoice()` for choice execution
- `StoryPlayerHeader.tsx`
  - Preview header
  - Restart
  - Exit Preview
- `DialoguePanel.tsx`
  - missing scene placeholder
  - missing dialogue page placeholder
  - speaker + text rendering
  - end-of-story panel
  - Next button
- `ChoiceList.tsx`
  - available/unavailable choice button rendering
  - unavailable hint display
- `playerHelpers.ts`
  - background resolving
  - speaker resolving
  - choice view model creation
- `runtimeState.test.ts`
  - tests `createInitialRuntimeState()`

Player behavior:
- Preview can be opened from the canvas toolbar.
- Preview can be exited back to the editor.
- Preview can be restarted without reloading the app.
- Runtime starts at `Project.startSceneId`.
- `currentPageIndex` starts at `0`.
- Resources initialize from `Resource.key` + `Resource.defaultValue`.
- Character attributes initialize from `Character.id` + `CharacterAttribute.key` + `defaultValue`.
- Current scene background renders for supported modes:
  - `url`
  - `upload`
  - `asset`
  - one-level `scene_reference`
- Speaker display:
  - `speakerId: null` → `Narrator`
  - valid `Character.id` → character name
  - missing/deleted speaker → `Unknown Speaker`
- Dialogue pages play sequentially.
- `Next` appears only when another dialogue page exists.
- Choices appear only after the final dialogue page.
- Available choices can navigate to a valid target scene and reset `currentPageIndex` to `0`.
- Targetless choices can be used as action choices: effects apply and the story stays on the current scene/page.
- Choice effects apply before optional navigation.
- Choice conditions disable unavailable choices.
- Unavailable choices remain visible and display the first available `hintText`.
- Final scene with no choices displays an end-of-story panel.

### Save / Export

Implemented:
- Active project auto-save to `narrium_project_{id}`.
- Export active project as formatted JSON.
- Import Narrium project JSON as a new workspace project.
- Export active story as standalone HTML player.

JSON export:
- Exports the current full `Project` object.
- Uses formatted JSON.
- Preserves embedded Data URLs.
- Does not mutate Project or localStorage.

JSON import:
- Parses a Narrium Project JSON.
- Performs conservative structure validation.
- Passes data through `normalizeProject()`.
- Creates a new `Project.id`.
- Replaces `createdAt` and `updatedAt`.
- Preserves story content, scenes, choices, Story Logic, asset library, backgrounds, thumbnails, and Data URLs.
- Creates workspace metadata.
- Opens the imported project.
- Invalid files show `Invalid Narrium project file.`

Standalone HTML export:
- Exports a single `.html` file.
- Embeds the full active `Project`.
- Preserves embedded Data URLs.
- Opens directly from disk.
- Does not require Narrium, npm, Vite, React dev server, or a local server.
- Does not write to localStorage.
- Supports:
  - start scene
  - dialogue pages
  - Next button only while more dialogue pages exist
  - speaker names
  - choices after final dialogue page
  - conditions
  - unavailable hints
  - resource effects
  - character attribute effects
  - targetless action choices
  - valid target navigation
  - invalid target disabled behavior
  - restart
  - end state
  - URL/upload/asset/one-level scene-reference backgrounds
- Remaining polish is tracked as `E8-04C`.
- Exported save/load slots remain pending as `E8-05`.

### Tests

Implemented:
- Vitest added.
- `npm.cmd test` runs `vitest run`.
- `runtimeState.test.ts` covers initial RuntimeState creation.
- `runtimeLogic.test.ts` covers representative behavior for:
  - `applyEffects()`
  - `isChoiceAvailable()`
  - `resolveUnavailableChoiceHint()`
  - `advanceRuntimeForChoice()`
  - navigation with valid target
  - targetless action choices
  - invalid non-null targets
  - action choices enabling gated choices after runtime update

---

## Current Milestone

### EPIC 8 — Save, Load, Export

Status: **in progress, mostly complete for project portability and standalone playback**.

Completed:
- `E8-01` — Auto-save active project to `narrium_project_{id}`
- `E8-02` — Export project as JSON
- `E8-03` — Import project from JSON
- `E8-04A` — Standalone HTML export foundation
- `E8-04B` — Standalone runtime parity
- `E8-04D` — Action choices without navigation
- `E8-04E` — Standalone HTML UX fix for hiding Next during choices

Next recommended task:
1. `E8-04C — Standalone HTML polish`

Important:
- The exported HTML player should keep using the current full `Project` model.
- Do not introduce a second export data model.
- Preserve embedded Data URLs already stored in Project fields.
- Save/load slots should remain scoped to `E8-05`.

---

## Core Architecture Principles

These rules are important. Future agents should preserve them.

### 1. Project is the single source of truth

All meaningful story data belongs to the `Project` object.

React state, React Flow nodes, and UI selections are derived from project state where possible.

### 2. React Flow is a projection

React Flow nodes and edges are generated from `Project.scenes`.

Do not store domain data in React Flow nodes/edges as the source of truth.

### 3. Choice is the source of truth for connections and choice logic

A React Flow edge is not a domain object.

Edges are projections of:

```typescript
Choice.targetSceneId
```

Current edge id format:

```typescript
`${scene.id}:${choice.id}`
```

Clicking an edge should navigate to the corresponding Choice editor.

Deleting an edge clears `choice.targetSceneId`.

Dragging a new edge creates a new Choice.

Choice logic is stored on `Choice`:

```typescript
Choice.conditionGroups
Choice.effects
```

### 4. Choice execution separates effects from navigation

Selecting an available choice applies effects first.

Navigation is optional:
- if `targetSceneId` points to a valid scene, the player navigates and resets page index to `0`
- if `targetSceneId` is `null`, the player remains in the current scene/page after applying effects
- if `targetSceneId` is non-null but invalid, the choice should be disabled and runtime should not apply effects

This enables targetless **action choices** such as `Take Key`, `Search Bookshelf`, or `Ask About Castle`.

### 5. DialoguePage order is runtime order

Dialogue pages are stored in:

```typescript
Scene.dialoguePages
```

They should be played sequentially by index.

The editor supports moving pages up/down.

### 6. Editors modify Project data

Editor panels and project data screens should call store actions that update the active Project.

Do not duplicate persistence logic inside UI components.

### 7. Persistence lives in workspaceStore

`workspaceStore.updateActiveProject()` is responsible for:
- updating active project
- updating `updatedAt`
- persisting full project to `narrium_project_{id}`
- updating project metadata in `narrium_workspace`

### 8. Canvas store synchronizes from Project

`useCanvasStore.syncFromProject()` rebuilds:
- nodes
- edges
- selection validity

After a mutation that changes scene graph data, call `syncFromProject()`.

### 9. Characters and Resources do not need their own domain stores

Character and Resource data belongs directly to `Project`.

Characters and Resources screens should mutate data through `workspaceStore.updateActiveProject()`.

UI-only state such as which row is being edited, which character is expanded, or which tab is active may live in local component state or small UI stores.

### 10. Story Logic remains declarative

Story Logic must not introduce scripting in MVP.

Conditions and effects should remain typed, explicit, and editor-friendly.

### 11. Runtime helpers stay pure

Story Logic runtime helpers should not mutate `Project` or `RuntimeState`.

Player code should call helpers and then store the returned runtime state where needed.

### 12. Story Player keeps runtime local for Preview

Preview currently keeps `RuntimeState` local inside `StoryPlayer`.

Do not persist Preview runtime state until Save/Load is explicitly scoped.

### 13. Exported HTML is standalone

The exported HTML player should:
- be a single HTML file
- embed the full `Project`
- preserve Data URLs
- open directly from disk
- avoid localStorage until save/load slots are explicitly implemented
- keep runtime behavior aligned with Preview

### 14. Keep implementation prompts scoped

Each Codex prompt should:
- work directly on `main`
- avoid unrelated refactors
- list relevant files
- include acceptance criteria
- say whether docs should or should not be updated
- include `npm.cmd test` when relevant
- include `npm.cmd run build`
- include a commit instruction
- include push-to-`main` after tests/build pass
- state which `ROADMAP.md` and `STORY_LOGIC.md` section it implements when applicable

---

## Source Structure

```text
src/
  app/
    App.tsx
    index.ts

  components/
    AppShell.tsx
    RightSidebar.tsx

  features/
    workspace/
      MyProjectsScreen.tsx

    canvas/
      SceneCanvas.tsx
      SceneNode.tsx

    editor/
      SceneEditorPanel.tsx

    story-logic/
      ConditionGroupsEditor.tsx
      ConditionGroupCard.tsx
      ConditionRow.tsx
      EffectsEditor.tsx
      EffectCard.tsx
      referenceUsage.ts
      runtimeLogic.ts
      runtimeLogic.test.ts

    characters/
      CharactersScreen.tsx

    resources/
      ResourcesScreen.tsx

    player/
      ChoiceList.tsx
      DialoguePanel.tsx
      playerHelpers.ts
      runtimeState.ts
      runtimeState.test.ts
      StoryPlayer.tsx
      StoryPlayerHeader.tsx

    assets/
      empty or future extraction area

  store/
    projectMigrations.ts
    workspaceStore.ts
    useCanvasStore.ts
    useProjectViewStore.ts

  types/
    index.ts

  utils/
    projectExport.ts
    projectImport.ts
    standaloneHtmlExport.ts

  styles/
    index.css

  main.tsx
```

Notes:
- The background asset management UI currently lives inside `SceneEditorPanel.tsx`.
- This is acceptable for MVP but may later be extracted into smaller components.
- The Scene Editor right panel is dedicated to scene editing.
- Project Settings uses shared `RightSidebar`.
- Story Logic editing and runtime helper code lives under `src/features/story-logic/`.
- Characters and Resources are full-screen project views inside the project shell.
- Story Player code lives under `src/features/player/`.
- Project JSON export/import and standalone HTML export helpers live under `src/utils/`.

---

## Data Model — Canonical Summary

The authoritative TypeScript definitions live in:

```text
src/types/index.ts
```

Important structures:

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

interface DialoguePage {
  id: string;
  speakerId: string | null;
  text: string;
}

interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditionGroups: ConditionGroup[];
  effects: Effect[];
}

interface ConditionGroup {
  id: string;
  conditions: Condition[];
}

interface Condition {
  id: string;
  type: 'resource' | 'character_attr';
  targetId: string;
  attribute?: string;
  operator: '>=' | '<=' | '==' | '>' | '<' | '!=';
  value: number;
  hintText: string;
}

interface Effect {
  id: string;
  type: 'resource' | 'character_attr';
  targetId: string;
  attribute?: string;
  operation: '+=' | '-=' | '=';
  value: number;
}

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

Important notes:
- `Project.thumbnail` stores project thumbnail as a Data URL or `null`.
- `WorkspaceProjectMeta.thumbnailDataUrl` mirrors project thumbnail for fast My Projects rendering.
- `Project.startSceneId` is the runtime entry point.
- If a project has scenes, `startSceneId` should point to an existing scene.
- If a project has no scenes, `startSceneId` should be `''`.
- `DialoguePage.speakerId = null` means Narrator.
- `DialoguePage.speakerId = Character.id` means Character speaker.
- Dialogue pages are played in array order.
- `Choice.targetSceneId = null` is valid for action choices that execute effects without navigation.
- Resource conditions/effects store `Resource.id`.
- Character Attribute conditions/effects store `Character.id` plus `CharacterAttribute.key`.
- Runtime resources use `Resource.key`.
- Runtime character attributes use `variables.characterAttrs[character.id][attribute.key]`.

---

## Known Limitations / Backlog

- Standalone HTML polish is still pending:
  - layout polish
  - responsive polish
  - metadata
  - favicon/title polish
  - visual refinement
- Exported player save/load slots are not implemented yet.
- Dialogue page drag-and-drop reorder is not implemented; only up/down buttons exist.
- Thumbnail upload does not resize or compress images yet.
- Confirmation dialogs currently use native `window.confirm`.
- Scene groups are still pending.
- Undo/redo is not implemented yet.
- Full project validation panel is not implemented yet.
- Story Player component-level tests are not implemented yet.
- Character deletion warns about Story Logic references but not dialogue speaker references.
- Workspace metadata can still drift from normalized project data on load.
- Active workspace id can still point to a missing project until cleaned by a future task.
- Targetless choice without effects is currently allowed by runtime but should likely receive a future validation warning because it does nothing.
