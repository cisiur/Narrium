# Changelog — Narrium

This changelog records milestone-level project changes. It is intentionally concise and complements git history.

---

## Unreleased / Next

### Completed - EPIC 9 keyboard shortcuts and undo/redo MVP

Commit:
- `3f69732` — `feat: add keyboard shortcuts and basic undo redo`

Changes:
- Added Canvas-only keyboard shortcuts for deleting selected choices/scenes.
- Added Escape handling to clear selected choices/scenes while editing the Canvas view.
- Added basic snapshot-based active-project undo/redo with a 50-snapshot history cap.
- Added keyboard shortcuts for undo/redo:
  - `Ctrl+Z`
  - `Ctrl+Y`
  - `Ctrl+Shift+Z`
- Added history tests for snapshot push, undo/redo replay, project isolation, and history size limits.

Validation:
- `npm.cmd test`
- `npm.cmd run build`

### Completed - EPIC 9 confirmation dialog and safe character deletion

Commit:
- `90fa035` — `feat: add confirmation dialog and safe character deletion`

Changes:
- Added a reusable application confirmation dialog.
- Replaced native browser confirmations from existing delete flows.
- Added Escape-to-cancel, focus trapping, and focus restoration for confirmation dialogs.
- Added safe character deletion when a character is used as a dialogue speaker.
- Confirmed deletion clears affected `DialoguePage.speakerId` values while keeping dialogue pages intact.
- Added character deletion tests for unused deletion, referenced deletion, dialogue speaker cleanup, and cancellation.

Validation:
- `npm.cmd test`
- `npm.cmd run build`

### Completed - EPIC 9 validation batch

Reference:
- `docs/EPIC9_VALIDATION.md`

Commits:
- `56a8304`
- `87d08ba`
- `a90c866`
- `c25e3ea`
- `8098139`
- `922eb5f`

Changes:
- Added an inline Scene Editor warning for targetless choices with no effects.
- Introduced shared project validation infrastructure through `validateProject(project)`.
- Added validation rules for broken choice targets, missing dialogue speakers, broken scene background references, and broken asset background references.
- Added the Project Validation panel in the canvas right sidebar.
- Polished the right sidebar layout so Project Validation stays visible above the Scene Editor, with a neutral empty state when no scene is selected.

### Planned

- EPIC 9 - Polish & Production UX
  - Empty/error states polish
  - Story Player component-level tests
  - Future undo/redo refinements beyond the snapshot-based MVP
  - Future validation extension: Story Logic missing reference rules / export preflight

### Backlog / Product polish

- Story Player component-level tests.
- Story Logic missing reference validation rules.
- Export preflight validation.

---

## v0.8.0 — EPIC 8 Project Portability + Standalone HTML Runtime

Status: **completed**

Purpose:
- Make Narrium projects portable through JSON export/import.
- Add standalone HTML story export.
- Keep the current full `Project` model as the single source of truth.
- Preserve uploaded/Data URL assets.
- Bring standalone HTML runtime behavior close to Preview behavior.
- Introduce action choices where effects can run without scene navigation.
- Polish the standalone HTML player experience.
- Add exported standalone player save/load persistence.

Completed:

### Export project as JSON

Commit:
- `7d3f228` — `feat: export active project as json`

Changes:
- Added `Export JSON` action in the project header.
- Exports the active full `Project` object as formatted JSON.
- Preserves embedded Data URLs.
- Uses a safe filename derived from project name.
- Does not mutate Project data or localStorage.

Validation:
- `npm.cmd test`
- `npm.cmd run build`

### Import project from JSON

Commit:
- `75f1bc3` — `feat: import project from json`

Changes:
- Added `Import JSON` action on My Projects.
- Reads selected `.json` files.
- Validates the file as a Narrium Project shape.
- Runs imported data through `normalizeProject()`.
- Imports as a new local project.
- Replaces only:
  - `Project.id`
  - `createdAt`
  - `updatedAt`
- Preserves scenes, choices, backgrounds, asset library, Story Logic, thumbnail, and Data URLs.
- Creates workspace metadata.
- Saves and opens the imported project.
- Shows `Invalid Narrium project file.` on invalid import.

Validation:
- `npm.cmd test`
- `npm.cmd run build`

### Standalone HTML export foundation

Commit:
- `169d62c` — `feat: add standalone html export foundation`

Changes:
- Added `Export HTML` action in the project header.
- Added standalone HTML export helper.
- Exports a single `.html` file.
- Embeds the active full `Project`.
- Preserves embedded Data URLs.
- Opens directly from disk.
- Does not require Narrium, npm, Vite, React dev server, or a local server.
- Does not write to localStorage.
- Initial standalone player supported:
  - start scene
  - dialogue pages
  - Next button
  - choices
  - valid target navigation
  - restart
  - end state
  - speaker names
  - basic backgrounds

Validation:
- `npm.cmd test`
- `npm.cmd run build`

### Standalone runtime parity

Commit:
- `6312286` — `feat: add standalone runtime parity`

Changes:
- Added shared `advanceRuntimeForChoice()` helper in `runtimeLogic.ts`.
- Preview now uses `advanceRuntimeForChoice()` for choice selection.
- Standalone HTML runtime gained:
  - runtime variables
  - resource conditions
  - character attribute conditions
  - condition groups
  - disabled unavailable choices
  - hint text
  - resource effects
  - character attribute effects
  - invalid target handling
- Added runtime tests for choice advancement/effects and invalid target behavior.

Validation:
- `npm.cmd test`
- `npm.cmd run build`

### Action choices: effects without navigation

Commit:
- `3819863` — `feat: support action choices without navigation`

Changes:
- `advanceRuntimeForChoice()` now applies effects independently from navigation.
- Targetless choices can execute effects and remain on the current scene/page.
- Runtime variables update after targetless actions.
- Re-render can enable newly available choices.
- Preview and standalone choice view models now allow valid targetless action choices.
- Invalid non-null targets remain disabled and do not execute effects.
- Added tests for:
  - targetless effects
  - runtime updates
  - newly available choices after re-render
  - invalid non-null targets
  - existing navigation behavior

Validation:
- `npm.cmd test`
- `npm.cmd run build`

### Standalone HTML UX fix

Commit:
- `989d1f0` — `fix: hide standalone next button during choices`

Changes:
- Fixed exported standalone HTML where `Next` remained visible when choices/actions were displayed.
- Added `[hidden] { display: none !important; }` inside the exported HTML template.
- Preserved existing standalone runtime behavior.
- `Next` is now visible only while another dialogue page exists.

Validation:
- `npm.cmd test`
- `npm.cmd run build`

### Standalone HTML player polish

Commit:
- `9846109` — `feat: polish standalone html player`

Changes:
- Improved exported standalone player layout, spacing, typography, and visual hierarchy.
- Improved dialogue panel styling.
- Improved button styling for Restart, Next, choices, and disabled choices.
- Improved unavailable hint and end/error state presentation.
- Added responsive polish for narrow/mobile screens.
- Added lightweight Narrium Player branding.
- Added page metadata description.
- Preserved existing standalone runtime behavior.

Validation:
- `npm.cmd test`
- `npm.cmd run build`

### Exported player save/load

Commit:
- `15bfbf4` — `feat: add standalone html save load`

Changes:
- Added standalone-only Save, Load, and Clear Save controls.
- Save/load controls render only when `project.settings.allowSessionSaveLoad !== false`.
- Runtime snapshots are saved to localStorage using `narrium_player_save_{projectId}`.
- Saved snapshots include:
  - `currentSceneId`
  - `currentPageIndex`
  - `variables.resources`
  - `variables.characterAttrs`
- The embedded Project is not saved to localStorage.
- Added defensive load validation for missing, invalid, corrupted, or unsafe save data.
- Added lightweight status feedback for save/load actions.
- Preserved dialogue flow, choices, effects, restart behavior, backgrounds, Preview behavior, editor behavior, and Project interfaces.

Validation:
- `npm.cmd test`
- `npm.cmd run build`

Result:
- EPIC 8 is complete for MVP.
- Project portability is functional through JSON export/import.
- Standalone HTML export is functional, polished, playable, and directly portable.
- Exported HTML runtime supports the same core Story Logic behavior as Preview.
- Exported standalone player supports manual runtime save/load persistence when enabled by project settings.
- Remaining work moves to EPIC 9 polish and production UX.

---

## v0.7.0 — Story Player MVP

Status: **completed**

Purpose:
- Add a playable in-browser Preview mode that executes the existing Project model.
- Reuse Story Logic runtime helpers from EPIC 6.
- Keep the Preview runtime local and non-persistent for now.

Completed:

### Runtime initialization

Commit:
- `9d3da3d` — `feat: initialize player runtime state from project`

Changes:
- Added `createInitialRuntimeState(project)`.
- Initializes:
  - `currentSceneId` from `Project.startSceneId`
  - `currentPageIndex` to `0`
  - runtime resources from `Resource.key` + `Resource.defaultValue`
  - runtime character attributes from `Character.id` + `CharacterAttribute.key` + `defaultValue`
- Helper is pure and does not mutate Project data.

### Preview shell

Commit:
- `bfc9642` — `feat: add story player preview shell`

Changes:
- Added initial `StoryPlayer`.
- Added Preview mode entry from the editor shell.
- Preview owns local runtime state.
- Preview can exit back to the editor.

### Current scene rendering

Commit:
- `61c1bef` — `feat: render current scene in story player`

Changes:
- Story Player resolves the current scene from runtime state.
- Renders current scene background, speaker name, and dialogue text.
- Supports URL, upload, asset, and one-level scene-reference backgrounds.
- Missing scene/page states render placeholders.
- `speakerId: null` displays Narrator.
- Missing speakers display `Unknown Speaker`.

### Multi-page dialogue

Commit:
- `7a61d8b` — `feat: support multi-page dialogue in story player`

Changes:
- Added `Next` button.
- `Next` advances `currentPageIndex`.
- Page index is bounded.
- `Next` appears only when another dialogue page exists.

### Choice rendering

Commit:
- `26e2cd6` — `feat: render story choices`

Changes:
- Choices render after the final dialogue page.

### Choice navigation

Commit:
- `58b0693` — `feat: support story choice navigation`

Changes:
- Choices became clickable buttons.
- Valid `targetSceneId` navigates to the target scene.
- Navigation resets `currentPageIndex` to `0`.
- Targetless action choices were added later in v0.8.0.

### Effects on choice selection

Commit:
- `7f9b679` — `feat: apply story choice effects`

Changes:
- Story Player uses existing `applyEffects()` helper.
- Effects apply before scene navigation.
- Runtime state remains local to Preview.

### Conditions and unavailable hints

Commit:
- `5a504ca` — `feat: integrate story choice conditions`

Changes:
- Story Player uses:
  - `isChoiceAvailable()`
  - `resolveUnavailableChoiceHint()`
- All choices remain visible.
- Unavailable choices are disabled.
- Unavailable choices show hint text when available.

### End-of-story state

Commit:
- `9a07171` — `feat: add story end state`

Changes:
- Scenes with no choices on the final dialogue page display a simple end panel.

### Preview restart

Commit:
- `18e08f4` — `feat: add preview restart`

Changes:
- Added `Restart` button to Preview header.
- Restart recreates runtime state through `createInitialRuntimeState(project)`.
- Restart returns to the project start scene and resets resources, character attributes, and page index.

Result:
- EPIC 7 Story Player MVP is complete.

---

## v0.7.1 — Player Stabilization

Status: **completed**

Purpose:
- Add focused test coverage for runtime/player foundations.
- Improve Story Player maintainability before EPIC 8.

Completed:

### Runtime and Story Logic tests

Commit:
- `4c9d9d7` — `test: add runtime and story logic tests`

Changes:
- Added Vitest.
- Added `npm.cmd test` script through `vitest run`.
- Added tests for `createInitialRuntimeState()`.
- Added tests for Story Logic runtime helpers:
  - `applyEffects()`
  - `isChoiceAvailable()`
  - `resolveUnavailableChoiceHint()`

Validation:
- `npm.cmd test`
- `npm.cmd run build`

### Story Player refactor

Commit:
- `4f9974e` — `refactor: split story player into reusable components`

Changes:
- Refactored Story Player into focused modules:
  - `StoryPlayer.tsx`
  - `StoryPlayerHeader.tsx`
  - `DialoguePanel.tsx`
  - `ChoiceList.tsx`
  - `playerHelpers.ts`
  - `runtimeState.ts`
- Behavior and UI classes were preserved.

Validation:
- `npm.cmd test`
- `npm.cmd run build`

Result:
- Runtime foundation is covered by focused automated tests.
- Story Player is easier to extend for future Save/Load and export work.

---

## v0.6.1 — Post-Audit Stabilization Sprint

Status: **completed**

Source audit:
- `docs/AUDIT_EPIC_6_TO_7.md`

Purpose:
- Remove targeted blockers and high-priority data consistency risks before starting EPIC 7 — Story Player.

Completed:

### Scene deletion integrity

Commit:
- `472e268` — `fix: preserve valid start scene after scene deletion`

Changes:
- Deleting a scene preserves existing behavior of clearing incoming `choice.targetSceneId` references.
- If the deleted scene was `Project.startSceneId`, the project now selects the first remaining scene as start scene.
- If no scenes remain, `Project.startSceneId` becomes `''`.
- Deleting a scene resets dangling `scene_reference` backgrounds that pointed to the deleted scene.
- `normalizeProject()` enforces the valid `startSceneId` invariant.

### Full project shape normalization

Changes:
- `normalizeProject()` normalizes the current Project shape more completely.
- Project-level collections are defaulted when missing.
- Project settings are normalized.
- Scenes are normalized to include background, position, dialogue pages, choices, and group id.
- Dialogue pages are normalized to include `speakerId`.
- Choices are normalized to include `conditionGroups` and `effects`.
- Legacy `conditions` migration remains supported.

### Character Attribute rename safety

Commit:
- `b9ed4db` — `fix: preserve character attribute references on rename`

Changes:
- Character Attribute key renames cascade matching Story Logic references.
- Matching `character_attr` conditions are updated from old key to new key.
- Matching `character_attr` effects are updated from old key to new key.
- Updates are limited to the renamed character.

### Empty condition group authoring UX

Commit:
- `53e21d5` — `ux: improve empty condition group authoring`

Changes:
- `+ Add OR Group` creates a group with one default condition.
- Empty groups still remain valid according to runtime semantics.
- Empty groups display an inline warning:
  - `This group has no conditions and will always pass.`

Result:
- EPIC 7 blockers from the audit are resolved.
- Project data consistency is safer.
- Story Logic authoring is safer.
- Story Player implementation can start.

---

## v0.6.0 — EPIC 6 Story Logic + UX Polish

Status: **completed**

Completed:

### Story Logic — Conditions

- `ConditionGroup` model added.
- Canonical `Choice.conditionGroups` implemented.
- Legacy `Choice.conditions` migration supported.
- Condition groups implement OR between groups and AND inside one group.
- Resource conditions implemented.
- Character Attribute conditions implemented.
- Numeric operators implemented.
- Missing-reference warnings implemented.
- Condition editor components live in `src/features/story-logic/`.

### Story Logic — Effects

- `Choice.effects` implemented.
- Resource effects implemented.
- Character Attribute effects implemented.
- Effect operations implemented:
  - `+=`
  - `-=`
  - `=`
- User-facing operation labels simplified to `+`, `-`, and `=`.
- Missing-reference warnings implemented.

### Story Logic — Runtime Helpers

Implemented in `src/features/story-logic/runtimeLogic.ts`:
- `compareNumbers()`
- `evaluateCondition()`
- `isChoiceAvailable()`
- `resolveUnavailableChoiceHint()`
- `applyNumericOperation()`
- `applyEffects()`
- `advanceRuntimeForChoice()`

