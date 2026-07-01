# Changelog — Narrium

This changelog records milestone-level project changes. It is intentionally concise and complements git history.

---

## Unreleased / Next

### Completed - Project Variables foundation

Commit:
- `77019ec` — `feat: add project variables foundation`

Changes:
- Added `Variable` and `Project.variables` to the canonical data model.
- New projects now initialize with `variables: []`.
- Imported and normalized old projects now receive `variables: []` when missing.
- Added a new Variables project tab below Resources.
- Added a Variables screen with:
  - add variable,
  - rename variable,
  - edit numeric default value,
  - delete variable,
  - empty state,
  - duplicate key handling.
- Kept Story Logic, runtime, Preview, and standalone runtime untouched in this foundation batch.
- Added tests for migration, new project creation, and variable key helpers.

Validation:
- `npm.cmd test` → 45 tests passed
- `npm.cmd run build` → passed

### Completed - Variables in Story Logic and runtime

Commit:
- `678114a` — `feat: add variables support to story logic and runtime`

Changes:
- Added `variable` as a Story Logic condition target.
- Added `variable` as a Story Logic effect target.
- Added Variables selection to the Condition editor.
- Added Variables selection to the Effects editor.
- RuntimeState now initializes variable values from `Project.variables[].defaultValue`.
- RuntimeState now stores variable runtime values under `variables.variables`.
- Preview supports variable conditions and variable effects through shared runtime helpers.
- Standalone HTML runtime supports variable conditions and variable effects.
- Standalone save/load snapshots preserve variable runtime values.
- Missing variable conditions evaluate to false.
- Missing variable effects are ignored.
- Added tests for:
  - variable runtime initialization,
  - variable condition evaluation,
  - variable effects,
  - missing variable behavior,
  - standalone save/load template coverage.

Validation:
- `npm.cmd test` → 51 tests passed
- `npm.cmd run build` → passed

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
  - Player-facing Resource display in Preview and standalone HTML player
  - Empty/error states polish
  - Story Player component-level tests
  - Future undo/redo refinements beyond the snapshot-based MVP
  - Future validation extension: Story Logic missing reference rules / export preflight

### Backlog / Product polish

- Story Player component-level tests.
- Story Logic missing reference validation rules.
- Export preflight validation.
- Player-facing Resource display.
- Fine-grained undo/redo UX improvements.

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
- Later Variables integration extended standalone runtime and save/load snapshots to support `variables.variables`.
- Remaining work continues in EPIC 9 polish and production UX.

---

## v0.7.0 — Story Player MVP

Status: **completed**

Purpose:
- Add a playable in-browser Preview mode that executes the existing Project model.
- Reuse Story Logic runtime helpers from EPIC 6.
- Keep the Preview runtime local and non-persistent for now.

Completed highlights:
- Runtime initialization.
- Preview shell.
- Current scene rendering.
- Multi-page dialogue.
- Choice rendering and navigation.
- Effects on choice selection.
- Conditions and unavailable hints.
- End-of-story state.
- Preview restart.

Result:
- EPIC 7 Story Player MVP is complete.
- Later updates extended Preview with action choices, standalone parity, and Variables.

---

## v0.7.1 — Player Stabilization

Status: **completed**

Purpose:
- Add focused test coverage for runtime/player foundations.
- Improve Story Player maintainability before EPIC 8.

Completed:
- Vitest setup.
- Runtime and Story Logic tests.
- Story Player split into reusable components.

Result:
- Runtime foundation is covered by focused automated tests.
- Story Player is easier to extend for future Save/Load and export work.
