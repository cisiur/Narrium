# Context — Narrium

> This file is used to resume work on Narrium in a new AI session.  
> Paste this file at the beginning of a new conversation before asking for planning, review, or implementation prompts.

---

## What is this project

Narrium is a **no-code, browser-based visual novel editor**.

Authors build branching interactive stories by connecting scene tiles on a visual canvas — no programming required. Each scene can contain a background image, ordered dialogue pages, and response choices. Choices can carry declarative condition groups and declarative effects.

The finished story can be previewed in the browser, exported/imported as JSON, and exported as a standalone HTML player file.

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
| Storage | localStorage for MVP workspace and exported-player saves |
| Project format | JSON-compatible `Project` object |
| Runtime player | Embedded React Preview player |
| Exported player | Standalone HTML file with embedded Project + inline runtime |
| Tests | Vitest |
| Bundler | Vite |

---

## Current Project Status

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
Save / Export              ██████████ 100%
Polish & Production UX     ████░░░░░░  40%
```

Current state:
Narrium has a usable local multi-project workspace, project settings sidebar, project thumbnails, React Flow scene graph editor, Canvas-only keyboard shortcuts, snapshot-based active-project undo/redo MVP, reusable application confirmation dialog, right-side scene editor with Project Validation, shared validation infrastructure, background system, asset library support, SceneNode thumbnails, ordered dialogue pages, character speaker selection, safe character deletion with dialogue speaker cleanup, choice target editing, edge-to-choice navigation, project-level Characters, Character attributes, project-level Resources, complete Story Logic Conditions, complete Story Logic Effects, runtime helper functions for condition/effect execution, a functional in-browser Story Player Preview, JSON project export/import, standalone HTML story export with runtime parity, polished standalone HTML playback, and exported standalone player save/load persistence.

Completed milestones:
- EPIC 6 — Story Logic is complete for the MVP editor/runtime-helper layer.
- Post-EPIC 6 UX Polish Sprint is complete.
- Post-Audit Stabilization Sprint after `docs/AUDIT_EPIC_6_TO_7.md` is complete.
- EPIC 7 — Story Player MVP is complete.
- EPIC 8 JSON export/import is complete.
- EPIC 8 standalone HTML export foundation, runtime parity, action choices, standalone player polish, and exported player save/load are complete.
- EPIC 9 validation batch is complete: inline targetless-choice warning, shared validation infrastructure, validation rules, Project Validation panel, and sidebar layout polish.
- EPIC 9 keyboard shortcuts are complete: Delete/Backspace for selected canvas items and Escape selection clearing.
- EPIC 9 basic snapshot-based project undo/redo MVP is complete (`E9-02A`).
- EPIC 9 reusable confirmation dialog is complete and native browser confirmations have been removed.
- EPIC 9 safe character deletion is complete, including dialogue speaker cleanup after confirmation.

Current recommended next milestone:
- **EPIC 9 — Polish & Production UX**
- Recommended next task should be selected by the project owner.

Good candidates:
- `E9-08` — Empty/error states polish
- `E9-14` — Story Player component-level tests
- `E9-02` future enhancements — finer-grained undo/redo UX beyond the snapshot-based MVP
- Future validation extension — Story Logic missing reference rules / export preflight

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
- Project thumbnail upload, preview, replace, and remove.
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
- Canvas keeps the right sidebar visible with Project Validation at the top and the Scene Editor below it when a scene is selected.
- Characters and Resources use full-width main screens without the Scene Editor panel.
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
- Scene Editor still uses its existing dedicated panel within the canvas right sidebar.
- Reusable `ConfirmationDialog` component:
  - title and message/body
  - Confirm / Cancel actions
  - Escape cancels
  - focus trap while open
  - focus restore after close
  - used instead of native `window.confirm`

### Project History

- Basic active-project undo/redo implemented as `E9-02A`.
- Snapshot-based history stored in memory.
- Maximum history size is 50 snapshots.
- History resets when a different project becomes active.
- `Ctrl+Z` undoes active-project edits.
- `Ctrl+Y` and `Ctrl+Shift+Z` redo active-project edits.
- Undo/redo shortcuts ignore text-editing targets.
- Undo/redo persists restored project snapshots to localStorage and synchronizes the canvas.

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
- Canvas-only keyboard shortcuts:
  - `Delete` / `Backspace` delete the selected choice first, otherwise the selected scene
  - `Escape` clears selected choice first, otherwise clears selected scene and returns to canvas mode
  - shortcuts ignore input, textarea, select, and contenteditable targets

### Scene Editor

- Right sidebar panel.
- Scene name inline editing.
- Background, Dialogue Pages, and Choices sections start collapsed by default.
- Dialogue pages:
  - add/edit/delete
  - last page cannot be deleted
  - speaker selector
  - Narrator support through `speakerId: null`
  - Character speaker support through `speakerId: Character.id`
  - missing/deleted character speaker warning
  - move page up/down
  - order persists in `scene.dialoguePages`
- Choices:
  - add/edit/delete
  - show target scene
  - target scene dropdown
  - edge-click highlight + scroll into view
  - condition editor embedded under each Choice
  - effects editor embedded under each Choice
  - inline warning for choices with no target and no effects

### Project Validation

- Shared validation infrastructure lives in `src/features/validation/projectValidation.ts`.
- `validateProject(project)` is the single source of truth for editor validation issues.
- Validation currently covers:
  - targetless choices with no effects
  - broken choice targets
  - missing dialogue speakers
  - broken scene background references
  - broken asset background references
- Project Validation panel lives in `src/features/validation/ProjectValidationPanel.tsx`.
- Canvas right sidebar keeps Project Validation visible at the top.
- Scene Editor appears below Project Validation when a scene is selected.
- When no scene is selected, the sidebar shows `Select a scene to edit its content.`
- Clicking a validation issue opens the related scene and selects the related choice when `choiceId` exists.
- Detailed validation batch documentation lives in `docs/EPIC9_VALIDATION.md`.

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
- SceneNode background thumbnails support URL, upload, asset, one-level scene reference, and placeholders.
- Story Player and standalone HTML background rendering supports URL, upload, asset, one-level scene reference, and no background fallback.

### Characters

- Characters project view.
- Character list.
- Add/rename/delete character.
- Character attributes per character.
- Add/rename/delete attribute.
- Numeric default value editing supports negative and decimal values.
- Invalid attribute values are stored as `0`.
- Duplicate attribute keys are resolved per character with suffixes such as `strength_2`, `strength_3`.
- Character mutations use `workspaceStore.updateActiveProject()`.
- Deleting a Character or Character Attribute used by Story Logic shows a warning before deletion.
- Deleting a Character used as a dialogue speaker shows a confirmation dialog.
- Confirmed Character deletion clears affected `DialoguePage.speakerId` values while keeping dialogue pages intact.
- Renaming a Character Attribute cascades matching Story Logic references from old key to new key.

### Resources

- Resources project view.
- Resource list.
- Add/delete resource.
- Rename resource key inline.
- Edit numeric resource default value.
- Negative and decimal resource values are supported.
- Invalid resource values are stored as `0`.
- Duplicate resource keys are resolved project-wide with suffixes such as `gold_2`, `gold_3`.
- Resource mutations use `workspaceStore.updateActiveProject()`.

### Story Logic — Conditions

- `ConditionGroup` data model added.
- `Choice.conditions` migrated to `Choice.conditionGroups`.
- Backward compatibility exists for old localStorage projects that still contain legacy `conditions`.
- Condition groups represent:
  - OR between groups
  - AND inside each group
- Runtime semantics:
  - no groups means choice is available
  - empty group passes
- Choice editor includes a Conditions section.
- Resource conditions target `Resource.id` and display `Resource.key`.
- Character Attribute conditions target `Character.id` + `CharacterAttribute.key`.
- Condition value input supports integers, decimals, and negative numbers.
- Missing references fail at runtime and show visual warnings in the editor.

### Story Logic — Effects

- `Choice.effects` data model accepted and implemented.
- Resource effects target `Resource.id`.
- Character Attribute effects target `Character.id` + `CharacterAttribute.key`.
- Effect operations are stored as `+=`, `-=`, and `=`.
- Editor displays operation labels as `+`, `-`, and `=`.
- Effect value input supports numeric values.
- Missing effect references are skipped at runtime and show visual warnings in the editor.
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
- Choices with `targetSceneId: null` can act as action choices: apply effects, stay on the current scene/page, and allow the player to re-render with updated runtime variables.
- Choices with invalid non-null `targetSceneId` do nothing and should be disabled in player UI.
- Runtime helpers are pure and do not mutate Project or RuntimeState.
- Runtime helpers have focused Vitest coverage.

### Story Player / Preview

Implemented in `src/features/player/`:

- `runtimeState.ts`
- `StoryPlayer.tsx`
- `StoryPlayerHeader.tsx`
- `DialoguePanel.tsx`
- `ChoiceList.tsx`
- `playerHelpers.ts`
- `runtimeState.test.ts`

Player behavior:
- Preview can be opened from the canvas toolbar.
- Preview can be exited back to the editor.
- Preview can be restarted without reloading the app.
- Runtime starts at `Project.startSceneId`.
- Resources initialize from `Resource.key` + `Resource.defaultValue`.
- Character attributes initialize from `Character.id` + `CharacterAttribute.key` + `defaultValue`.
- Current scene background renders for supported modes.
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
- Exported standalone HTML player save/load persistence.

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
  - polished standalone player UI and responsive layout
  - manual Save, Load, and Clear Save controls when `project.settings.allowSessionSaveLoad !== false`
  - localStorage runtime persistence using `narrium_player_save_{projectId}`
- `E8-04C` standalone HTML polish is complete.
- `E8-05` exported player save/load is complete for MVP.

### Tests

Implemented:
- Vitest added.
- `npm.cmd test` runs `vitest run`.
- Current test count: 38 tests across 6 test files.
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
- `projectValidation.test.ts` covers shared validation rules.
- `ProjectValidationPanel.test.tsx` covers panel rendering, issue ordering, and validation issue navigation helpers.
- `projectHistory.test.ts` covers snapshot push, undo/redo replay, project isolation, and the 50-snapshot cap.
- `characterDeletion.test.ts` covers unused character deletion, referenced character deletion, speaker reference cleanup, and cancellation.

---

## Current Milestone

### EPIC 9 - Polish & Production UX

Status: **validation batch complete; broader polish continues**.

Completed validation batch:
- `E9-15` - Warn on targetless choices with no effects
- `E9-16` - Validation infrastructure
- `E9-17` - Validation rules batch
- `E9-18` - Project Validation Panel MVP
- `E9-18B` - Validation Panel Layout Polish

Completed polish / production UX tasks:
- `E9-01` - Keyboard shortcuts: Delete selected node/choice, Esc close/cancel
- `E9-02A` - Basic snapshot-based project undo/redo MVP
- `E9-03` - Reusable confirmation dialog replacing native browser confirmations
- `E9-10` - Safe character deletion when used as dialogue speaker

Detailed documentation:
- `docs/EPIC9_VALIDATION.md`

Important:
- Validation must continue to use `validateProject(project)` as the single source of truth.
- Do not duplicate validation logic in UI components.
- Validation UI must not change runtime, Preview, JSON import/export, standalone HTML export, or the Project data model.

Next recommended tasks:
1. `E9-08` - Empty/error states polish
2. `E9-14` - Story Player component-level tests
3. `E9-02` future enhancements - finer-grained undo/redo UX beyond the snapshot-based MVP
4. Future validation extension - Story Logic missing reference rules / export preflight
---

## Core Architecture Principles

1. **Project is the single source of truth** — all meaningful story data belongs to the `Project` object.
2. **React Flow is a projection** — React Flow nodes and edges are generated from `Project.scenes`.
3. **Choice is the source of truth for connections and choice logic** — edges are projections of `Choice.targetSceneId`.
4. **Choice execution separates effects from navigation** — effects apply first, navigation is optional.
5. **DialoguePage order is runtime order** — pages should be played sequentially by array index.
6. **Editors modify Project data** — editor screens should update active Project through store actions.
7. **Persistence lives in workspaceStore** — `workspaceStore.updateActiveProject()` persists full project changes.
8. **Canvas store synchronizes from Project** — after graph mutations, call `syncFromProject()`.
9. **Characters and Resources do not need their own domain stores** — they belong directly to Project.
10. **Story Logic remains declarative** — no scripting in MVP.
11. **Runtime helpers stay pure** — do not mutate Project or RuntimeState.
12. **Story Player keeps runtime local for Preview** — do not persist Preview runtime state.
13. **Exported HTML is standalone** — one file, embedded Project, direct-from-disk, no server.
14. **Exported save/load is standalone-only** — localStorage runtime snapshots are used only in exported HTML.
15. **Keep implementation prompts scoped** — list relevant files, acceptance criteria, validation commands, commit and push instructions.

---

## Source Structure

```text
src/
  app/
    App.tsx
    index.ts

  components/
    AppShell.tsx
    ConfirmationDialog.tsx
    RightSidebar.tsx

  features/
    workspace/
      MyProjectsScreen.tsx

    canvas/
      SceneCanvas.tsx
      SceneNode.tsx

    editor/
      SceneEditorPanel.tsx

    validation/
      projectValidation.ts
      projectValidation.test.ts
      ProjectValidationPanel.tsx
      ProjectValidationPanel.test.tsx

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
      characterDeletion.ts
      characterDeletion.test.ts

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

  store/
    projectHistory.ts
    projectHistory.test.ts
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
- Story Player code lives under `src/features/player/`.
- Story Logic editing and runtime helper code lives under `src/features/story-logic/`.
- Project JSON export/import and standalone HTML export helpers live under `src/utils/`.
- Standalone HTML runtime logic is duplicated inside the exported inline script because the output is a single HTML file without a bundler; keep semantics synchronized with `src/features/story-logic/runtimeLogic.ts`.

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

interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditionGroups: ConditionGroup[];
  effects: Effect[];
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
- `Choice.targetSceneId = null` is valid for action choices.
- Exported standalone player save/load stores runtime snapshots only, not Project data.

