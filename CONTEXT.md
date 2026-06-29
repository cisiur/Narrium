# Context — Narrium

> This file is used to resume work on Narrium in a new AI session.  
> Paste this file at the beginning of a new conversation before asking for planning, review, or implementation prompts.

---

## What is this project

Narrium is a **no-code, browser-based visual novel editor**.

Authors build branching interactive stories by connecting scene tiles on a visual canvas — no programming required. Each scene can contain a background image, ordered dialogue pages, and response choices. Choices can carry declarative condition groups and declarative effects.

The finished story should eventually be playable in the browser and exportable as a standalone HTML file.

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
- Prompts for Codex should include:
  - implement scoped task only
  - run `npm.cmd run build`
  - create a commit with the specified message
  - do not push
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
| Runtime player | Future embedded React player |
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
Story Player               ░░░░░░░░░░   0%
Save / Export              █░░░░░░░░░  15%
Polish & Production UX     ████░░░░░░  40%
```

Current state:
Narrium has a usable local multi-project workspace, project settings sidebar, project thumbnails, React Flow scene graph editor, right-side scene editor, background system, asset library support, SceneNode thumbnails, ordered dialogue pages, character speaker selection, choice target editing, edge-to-choice navigation, project-level Characters, Character attributes, project-level Resources, complete Story Logic Conditions, complete Story Logic Effects, and runtime helper functions for condition/effect execution.

EPIC 6 is complete for the MVP editor/runtime-helper layer.

The Post-EPIC 6 UX Polish Sprint is complete.

The Post-Audit Stabilization Sprint after `docs/AUDIT_EPIC_6_TO_7.md` is complete.

The project is ready to begin **EPIC 7 — Story Player**, starting with `E7-01 — Player runtime: initialize RuntimeState from Project`.

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
- Deleting a Resource used by Story Logic shows a warning before deletion.

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
- Runtime helpers are pure and do not mutate Project or RuntimeState.

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

---

## Current Milestone

### EPIC 6 — Story Logic

Status: **completed for MVP editor + runtime helper layer**.

Completed:
- Conditions editor
- Effects editor
- missing-reference warnings
- runtime condition evaluation helper
- unavailable hint helper
- runtime effect application helper
- Story Logic reference usage warnings on deletion

### Post-EPIC 6 UX Polish Sprint

Status: **completed**.

Completed:
- collapsible Scene Editor sections start closed
- Project Settings sidebar
- reusable right sidebar shell
- project delete
- project thumbnail upload/remove/display
- obsolete Inspector placeholder removed
- dialogue speaker selector
- dialogue page reorder buttons
- effect operator labels simplified

### Post-Audit Stabilization Sprint

Status: **completed**.

Source audit:
- `docs/AUDIT_EPIC_6_TO_7.md`

Completed:
- start scene deletion integrity:
  - deleting the start scene repairs `Project.startSceneId`
  - deleting the final scene sets `startSceneId` to `''`
- scene reference cleanup:
  - deleting a scene resets dangling `scene_reference` backgrounds
- fuller project normalization:
  - old localStorage projects are normalized to the current Project shape on load
  - invalid `startSceneId` is repaired during normalization
- safe Character Attribute renames:
  - matching Story Logic condition/effect references are cascade-updated
- empty condition group UX safety:
  - new OR groups start with one default condition
  - empty groups show an informational always-pass warning

### Recommended next milestone

### EPIC 7 — Story Player

Goal:
Build an in-browser preview/player that executes the existing Project model.

Recommended first task:
1. `E7-01 — Player runtime: initialize RuntimeState from Project`

Recommended EPIC 7 order:
1. Initialize `RuntimeState` from `Project`.
2. Add Story Player shell / preview mode.
3. Render current scene background.
4. Render dialogue pages in array order.
5. Advance through dialogue pages before choices.
6. Render choices after the final dialogue page.
7. Use `isChoiceAvailable()` to disable unavailable choices.
8. Use `resolveUnavailableChoiceHint()` to display unavailable-choice hint.
9. Use `applyEffects()` when a choice is selected.
10. Navigate to `choice.targetSceneId`.
11. Add end state and restart preview.

Important:
- Story Player should consume the existing Project model.
- Do not introduce a second story/runtime data model.
- Reuse Story Logic helpers from `runtimeLogic.ts`.
- Dialogue page order in `scene.dialoguePages` is runtime order.
- `speakerId: null` means Narrator.
- `speakerId: Character.id` means Character speaker.
- Choices appear after the final dialogue page.
- EPIC 7 can assume projects loaded through `normalizeProject()` have the current baseline shape.
- EPIC 7 can assume `Project.startSceneId` points to an existing scene when scenes exist.

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

### 4. DialoguePage order is runtime order

Dialogue pages are stored in:

```typescript
Scene.dialoguePages
```

They should be played sequentially by index.

The editor supports moving pages up/down.

### 5. Editors modify Project data

Editor panels and project data screens should call store actions that update the active Project.

Do not duplicate persistence logic inside UI components.

### 6. Persistence lives in workspaceStore

`workspaceStore.updateActiveProject()` is responsible for:
- updating active project
- updating `updatedAt`
- persisting full project to `narrium_project_{id}`
- updating project metadata in `narrium_workspace`

### 7. Canvas store synchronizes from Project

`useCanvasStore.syncFromProject()` rebuilds:
- nodes
- edges
- selection validity

After a mutation that changes scene graph data, call `syncFromProject()`.

### 8. Characters and Resources do not need their own domain stores

Character and Resource data belongs directly to `Project`.

Characters and Resources screens should mutate data through `workspaceStore.updateActiveProject()`.

UI-only state such as which row is being edited, which character is expanded, or which tab is active may live in local component state or small UI stores.

### 9. Story Logic remains declarative

Story Logic must not introduce scripting in MVP.

Conditions and effects should remain typed, explicit, and editor-friendly.

### 10. Runtime helpers stay pure

Story Logic runtime helpers should not mutate `Project` or `RuntimeState`.

Player code should call helpers and then store the returned runtime state where needed.

### 11. Keep implementation prompts scoped

Each Codex prompt should:
- work directly on `main`
- avoid unrelated refactors
- list relevant files
- include acceptance criteria
- say whether docs should or should not be updated
- include `npm.cmd run build`
- include a commit instruction
- explicitly say `Do NOT push`
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

    characters/
      CharactersScreen.tsx

    resources/
      ResourcesScreen.tsx

    player/
      empty / future E7

    assets/
      empty or future extraction area

  store/
    projectMigrations.ts
    workspaceStore.ts
    useCanvasStore.ts
    useProjectViewStore.ts

  types/
    index.ts

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
- `src/features/player/` is reserved for EPIC 7.

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
- Resource conditions/effects store `Resource.id`.
- Character Attribute conditions/effects store `Character.id` plus `CharacterAttribute.key`.
- Runtime resources use `Resource.key`.
- Runtime character attributes use `variables.characterAttrs[character.id][attribute.key]`.

---

## Known Limitations / Backlog

- Story Player / Preview is not implemented yet.
- JSON export/import is not implemented yet.
- Standalone HTML export is not implemented yet.
- Dialogue page drag-and-drop reorder is not implemented; only up/down buttons exist.
- Thumbnail upload does not resize or compress images yet.
- Confirmation dialogs currently use native `window.confirm`.
- Scene groups are still pending.
- Undo/redo is not implemented yet.
- Full project validation pass is not implemented yet.
- Runtime helper coverage is not backed by visible tests yet.
- Character deletion warns about Story Logic references but not dialogue speaker references.
- Workspace metadata can still drift from normalized project data on load.
- Active workspace id can still point to a missing project until cleaned up.
- Resource key rename implications for future save/runtime state are not solved yet.

---

## Resume Checklist for Next Session

When resuming work:

1. Confirm current branch is `main`.
2. Read:
   - `CONTEXT.md`
   - `docs/ROADMAP.md`
   - `docs/DATA_MODEL.md`
   - `docs/STORY_LOGIC.md`
   - `docs/AUDIT_EPIC_6_TO_7.md`
   - `docs/CHANGELOG.md`
3. Confirm EPIC 6 is complete.
4. Confirm Post-EPIC 6 UX Polish Sprint is complete.
5. Confirm Post-Audit Stabilization Sprint is complete.
6. Start planning EPIC 7 — Story Player.
7. First recommended task: `E7-01 — Player runtime: initialize RuntimeState from Project`.
8. Do not generate implementation code directly.
9. Prepare English Codex prompts only after product-owner acceptance.
