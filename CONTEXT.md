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
Narrium has a usable local multi-project workspace, project settings sidebar, project thumbnails, React Flow scene graph editor, right-side scene editor, background system, asset library support, SceneNode thumbnails, ordered dialogue pages, character speaker selection, choice target editing, edge-to-choice navigation, project-level Characters, Character attributes, project-level Resources, complete Story Logic Conditions, complete Story Logic Effects, runtime helper functions for condition/effect execution, a functional in-browser Story Player Preview, JSON project export/import, standalone HTML story export with runtime parity, polished standalone HTML playback, and exported standalone player save/load persistence.

Completed milestones:
- EPIC 6 — Story Logic is complete for the MVP editor/runtime-helper layer.
- Post-EPIC 6 UX Polish Sprint is complete.
- Post-Audit Stabilization Sprint after `docs/AUDIT_EPIC_6_TO_7.md` is complete.
- EPIC 7 — Story Player MVP is complete.
- EPIC 8 JSON export/import is complete.
- EPIC 8 standalone HTML export foundation, runtime parity, action choices, standalone player polish, and exported player save/load are complete.

Current recommended next milestone:
- **EPIC 9 — Polish & Production UX**
- Recommended next task should be selected by the project owner.

Good candidates:
- `E9-01` — Keyboard shortcuts: Delete selected node/choice, Esc close/cancel
- `E9-06` — Full project validation panel
- `E9-08` — Empty/error states polish
- `E9-15` — Warn on targetless choices with no effects

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
- Canvas keeps the right Scene Editor panel.
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

Status: **complete for MVP project portability, standalone playback, and exported player save/load**.

Completed:
- `E8-01` — Auto-save active project to `narrium_project_{id}`
- `E8-02` — Export project as JSON
- `E8-03` — Import project from JSON
- `E8-04A` — Standalone HTML export foundation
- `E8-04B` — Standalone runtime parity
- `E8-04D` — Action choices without navigation
- `E8-04E` — Standalone HTML UX fix for hiding Next during choices
- `E8-04C` — Standalone HTML player polish
- `E8-05` — Exported player save/load

Completed commits:
- `7d3f228` — `feat: export active project as json`
- `75f1bc3` — `feat: import project from json`
- `169d62c` — `feat: add standalone html export foundation`
- `6312286` — `feat: add standalone runtime parity`
- `3819863` — `feat: support action choices without navigation`
- `989d1f0` — `fix: hide standalone next button during choices`
- `9846109` — `feat: polish standalone html player`
- `15bfbf4` — `feat: add standalone html save load`

Important:
- The exported HTML player should keep using the current full `Project` model.
- Do not introduce a second export data model.
- Preserve embedded Data URLs already stored in Project fields.
- Exported standalone save/load is implemented for MVP through localStorage runtime snapshots.

Next recommended task:
1. Continue into `EPIC 9 — Polish & Production UX`

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
