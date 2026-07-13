# Changelog — Narrium

This changelog records milestone-level project changes. It is intentionally concise and complements git history.

---

## Unreleased / Next

### Security - Harden desktop asset protocol

Changes:
- Restricted the Tauri asset protocol from a broad `**` filesystem scope to desktop local background image files under `**/assets/backgrounds/*.png`, `*.jpg`, `*.jpeg`, and `*.webp`.
- Local background display still resolves through the existing `resolve_local_asset_file` Rust command before producing an asset protocol URL.
- Project serialization, exports, asset library behavior, and browser mode are unchanged.

### Fixed - Dirty native close dialog workflow

Changes:
- Dirty native desktop close now uses an app-owned Tauri command for the Save / Don't Save / Cancel confirmation dialog because the installed JS dialog `confirm()` helper invokes a command not exposed by the resolved Rust dialog plugin ACL.
- Native close decision failures now keep the app open, reset close-pending state, and surface the error through the existing project-file error state.

### Fixed - Native close dirty protection

Changes:
- Native desktop window close now protects dirty projects instead of bypassing dirty-state checks.
- Clean projects close without prompting.
- Dirty projects use the same Save / Don't Save / Cancel decision as guarded Open Project File and Create Project.
- Save runs normal Save for file-backed projects and Save As for drafts without a known `.narrium` path.
- Save As cancellation, save failure, and Cancel keep the app open and preserve dirty state.
- Don't Save closes without saving.
- Repeated native close events while a prompt or save is pending do not create duplicate prompts or duplicate saves.
- Approved native close destroys the window directly instead of requesting another close cycle.
- Browser/Vite execution remains unaffected.

Validation:
- `npm.cmd test` -> 27 test files passed, 233 tests passed.
- `npm.cmd run build` -> passed.
- `npm.cmd run desktop:build` -> passed after rerunning with escalation so the WiX bundler under AppData could execute; the first non-escalated attempt built the app binary but failed during MSI bundling at `light.exe`.

### Fixed - Save As project naming

Changes:
- Successful Save As now updates `Project.name` from the selected `.narrium` filename without its extension.
- The renamed project is written into the destination `.narrium` file and reflected immediately in active project state, workspace metadata, and recent projects.
- Normal Save does not force the project name to match the file name.
- Canceled or failed Save As attempts leave the project name and active file path unchanged.

Validation:
- Added tests for filename-derived project names, cancellation/failure safety, normal Save name preservation, and Save As metadata propagation.

### Added - Local background asset files

Changes:
- Added `storageType: "local"` for background assets.
- Desktop file-backed `.narrium` projects now import uploaded background images into `assets/backgrounds/` beside the project file.
- `.narrium` stores only project-relative local asset paths with forward slashes, not absolute paths or embedded file data.
- Desktop draft uploads are blocked until the project is saved as a `.narrium` file.
- Browser uploads continue to create embedded Data URL assets.
- Remote URL assets remain catalog assets and are not downloaded or cached.
- Background Source UI now shows only None, Scene Reference, and Asset Library; URL/upload creation lives inside Asset Library.
- Save As copies referenced local background files to the new project directory before writing the relocated `.narrium`.
- Deleting a catalog asset still clears scene references but does not delete the physical file.
- Local asset standalone export packaging, physical cleanup, orphan detection, hashing, compression, and broad asset management remain future work.
- Native close dirty protection is handled separately by the current native-close lifecycle guard.

Validation:
- Added tests for UI option cleanup, local asset normalization, local path serialization, Save As asset relocation success/failure, and continued browser/draft storage behavior.

### Fixed - Desktop project storage stabilization

Changes:
- File-backed desktop `.narrium` projects no longer mirror the full Project JSON into BrowserProjectStorage/localStorage after open, edit, Save, or Save As.
- `.narrium` is now the persistent source of truth for full file-backed desktop projects.
- Active file-backed projects stay in memory, mark dirty on edits, and write the full Project only through Save or Save As.
- Workspace metadata, recent project metadata, project file association, and thumbnails remain stored separately.
- LocalStorage-backed drafts and the browser workflow still persist full Project JSON through BrowserProjectStorage.
- Save As removes any old draft payload for the project id after the `.narrium` file is written.
- Browser draft quota failures now surface a clear storage-full error instead of failing silently.
- Kept local asset files, `assets/` directories, filesystem copying, Blob URLs, autosave, playable export changes, and Project model redesign out of scope.

Validation:
- Added tests proving file-backed desktop open/edit/Save/Save As do not call BrowserProjectStorage.saveProject, browser drafts still do, workspace metadata still persists, quota errors surface, and repeated embedded asset edits do not write full Project JSON to localStorage.

### Changed - Background asset catalog foundation

Changes:
- Made `Project.assetLibrary` the canonical catalog for newly added background sources.
- Updated background assets to use `storageType: "embedded" | "remote"` and `source`.
- New uploaded backgrounds create embedded Data URL assets.
- New URL backgrounds create remote URL assets.
- Scene assignments now use `mode: "asset"` plus `assetId` without duplicating the source URL on the scene.
- Legacy direct scene `upload`/`url` backgrounds normalize into catalog assets where practical.
- Legacy `AssetLibraryItem.sourceType`/`url` data normalizes into the current asset shape.
- Duplicate legacy background sources reuse one migrated asset, and migration is idempotent.
- Added a platform-neutral asset display resolver used by editor, canvas thumbnails, preview, and export rendering paths.
- Deleting a referenced asset clears affected scene background assignments.
- Kept local asset files, `assets/` directories, filesystem copying, Blob URLs, Data URL extraction, autosave, playable export changes, and native close interception out of scope.

Validation:
- Added tests for legacy asset normalization, direct scene Data URL and remote URL migration, duplicate-source reuse, idempotence, embedded/remote asset creation, asset assignment without URL duplication, shared asset assignment, resolver behavior, referenced-asset deletion safety, and `.narrium` serialization.

### Fixed - My Projects file-backed cards

Changes:
- Project cards now open the associated `.narrium` file when recent-project metadata links the card to a file-backed project.
- Recent project metadata now records `projectId` when projects are opened or saved, with a safe unique-name fallback for older recent entries.
- File-backed cards show a `.narrium file` label and truncated file path; unassociated localStorage cards show `Local draft`.
- Removed the single-item `WORKSPACE > My Projects` sidebar from the landing screen while preserving editor navigation.
- Kept local asset storage, playable export, autosave, Project model redesign, and native close interception out of scope.

Validation:
- Added tests for file-backed card association, draft fallback, recent metadata `projectId`, card labels, Save state coverage, and removal of the landing Workspace sidebar.

### Added - Native Narrium project file workflow

Changes:
- Added `.narrium` as the desktop project file extension.
- `.narrium` files are JSON internally and wrap the current Project JSON with `format: "narrium.project"` and `formatVersion: 1`.
- Replaced the default desktop folder workflow with Open Project File, Save, and Save As against explicit project file paths.
- Kept raw legacy Project JSON openable as a compatibility fallback, including old `project.narrium.json` files when selected as files.
- LocalStorage My Projects remain transitional drafts until Save As creates a `.narrium` file.
- Recent projects now store file paths instead of folder paths.
- Kept local asset folders, image copying, Data URL migration, autosave, playable export changes, and Project model redesign out of scope.

Validation:
- Added tests for `.narrium` serialization and parsing, raw legacy JSON parsing, Save-enabled file-backed projects, draft Save-disabled state, Save As file path activation, recent project file paths, and avoiding `project.narrium.json` as the default save target.

### Fixed - Native desktop window close

Changes:
- Disabled native desktop close interception so clicking the window X always closes the app.
- Kept explicit dirty checks for Open Project File and Create Project drafts.
- Kept dirty state, Save, Save As, and recent projects intact.
- Documented that native close dirty protection needs a dedicated redesign before it is restored.
- Superseded by the current native close dirty protection entry above.

Validation:
- Added a platform test covering that desktop lifecycle close handling no longer invokes or blocks through the native close guard.

### Added - Desktop project workflow hardening

Changes:
- Added dirty-state tracking for desktop project edits.
- Added guarded desktop Open/Create workflows for dirty projects with Save, Don't Save, and Cancel paths.
- Added lightweight desktop app preferences for up to 10 recent projects and the last opened project.
- Added a My Projects offer to reopen the last project without automatically reopening it.
- Added current path display and `*` dirty indicator in the project header.
- Disabled Save until a desktop project has a known path while keeping Save As available.
- Moved project-file read path joining into the platform/Rust layer to match project-file writes.
- Preserved browser/localStorage compatibility, Project data, asset handling, Preview, JSON export/import, and standalone HTML export.
- Kept asset folders, image copying, local image references, autosave, Git integration, cloud sync, and playable export changes out of scope.

Validation:
- Added tests for dirty-state transitions, recent-project ordering and maximum count, and platform-owned project-file path handling.

### Added - Local project folder foundation

Changes:
- Added a desktop project-folder service for JSON-only local project folders.
- Added Create Project Folder, Open Project Folder, Save, and Save As flows for `project.narrium.json`.
- Added narrow Tauri dialog and command usage behind service/platform boundaries.
- Added Rust commands for reading and writing project JSON files.
- Added `@tauri-apps/api` and `@tauri-apps/plugin-dialog` as the minimum desktop dependencies needed for command invocation and folder selection.
- Moved JSON import parsing into `src/domain/project/` and kept the existing `src/utils/projectImport` wrapper.
- Preserved browser localStorage workflow, JSON import/export, standalone HTML export, preview, story logic, and the Project model.
- Kept asset folders, image copying, local asset paths, autosave, recent projects, playable export packages, cloud sync, and Git integration out of scope.

Validation:
- Added tests for project-folder JSON serialization, invalid JSON handling, normalization on open, create-folder writing, and open-folder reading.

### Added - Platform service boundary

Changes:
- Added `src/services/platform/` as the boundary for future platform-specific APIs.
- Added `PlatformService` with platform identity methods only.
- Added browser and desktop platform service implementations.
- Added `getPlatformService()` as the resolver and only Tauri runtime detection point.
- Kept filesystem, dialogs, clipboard, shell, notifications, drag-and-drop, asset loading, project folders, storage, and Project model changes out of scope.

Validation:
- Added tests for browser/desktop platform identity and resolver behavior.

### Changed - Runtime and export boundaries

Changes:
- Moved reusable runtime execution helpers into `src/domain/runtime/`.
- Moved runtime-state initialization into `src/domain/runtime/`.
- Moved standalone HTML export generation into `src/services/export/`.
- Added compatibility wrappers for existing runtime/export import paths.
- Updated JSON import validation so legacy choices with `conditions` and missing `effects` are accepted and normalized.
- Kept Preview behavior, story logic behavior, standalone HTML output, save/load behavior, export format, Project model, filesystem work, and Tauri APIs unchanged.

Validation:
- Added import tests for current choices, legacy `conditions`, missing `effects`, and invalid choice rejection.

### Changed - Domain and service boundaries

Changes:
- Added `src/domain/project/` as the initial neutral project domain area.
- Moved project normalization/migration logic out of `src/store/`.
- Removed the service-to-store dependency from `BrowserProjectStorage`.
- Kept `src/services/project-storage/` as the concrete service subarea currently justified by the codebase.
- Documented the dependency direction: UI/features -> stores -> services -> domain -> types.
- Kept local filesystem, Tauri APIs, project folders, dialogs, asset storage, export behavior, and Project model changes out of scope.

Validation:
- No user-visible behavior changes intended.

### Changed - Project storage abstraction foundation

Changes:
- Added a synchronous `ProjectStorage` interface for workspace/project persistence.
- Added `BrowserProjectStorage` as the current localStorage-backed implementation.
- Added `getProjectStorage()` as the default resolver for future backend substitution.
- Refactored `useWorkspaceStore` so workspace/project persistence goes through the storage service instead of direct `window.localStorage` calls.
- Preserved the existing `narrium_workspace` and `narrium_project_{id}` keys and data format.
- Kept local project folders, Tauri filesystem APIs, asset storage refactors, and Project data model changes out of scope.

Validation:
- Added storage service tests for workspace/project round trips, delete behavior, key compatibility, corrupt data handling, and normalization save-back.

### Added - Desktop shell foundation

Changes:
- Added a minimal Tauri v2 desktop shell under `src-tauri/`.
- Added desktop scripts: `tauri`, `desktop:dev`, and `desktop:build`.
- Configured the desktop app metadata with product name `Narrium`, window title `Narrium`, and a 1400x900 default editor window.
- Kept the existing Vite/browser entry point and web scripts intact.
- Kept storage, project data, asset handling, preview behavior, story logic, and standalone HTML export unchanged.

Validation:
- Desktop native build requires Rust/Cargo and Visual Studio Build Tools in the local environment.

### Documentation - Desktop-first pivot

Changes:
- Documented that the completed browser MVP is archived on branch `MVP_web_legacy`.
- Documented that active development on `main` is pivoting toward a desktop-first Narrium editor.
- Added desktop-first direction for local project folders, `project.narrium.json`, local asset files, and future playable exports.
- Added `docs/DESKTOP_ARCHITECTURE.md` as the initial architecture reference for the desktop pivot.
- Kept the validated web MVP implementation history intact as foundation and migration reference.

Validation:
- Documentation-only change.
- No desktop implementation, storage refactor, dependency change, or export format implementation is included.

### Completed - Canvas Scene Groups

Commits:
- `0e50f0b` - `docs: add scene groups epic plan`
- `8235dcb` - `feat: add scene group canvas helpers`
- `63a7e59` - `feat: add scene group creation workflow`
- `7679b69` - `feat: render expanded scene groups`
- `1acd4ff` - `feat: add collapsed scene group nodes`
- `022a764` - `feat: project edges for collapsed scene groups`
- `c9dc75f` - `feat: polish scene group interactions`

Changes:
- Added editor-only Canvas Scene Groups.
- Authors can multi-select scenes and group them on the canvas.
- Groups can be renamed, collapsed, expanded, and ungrouped.
- Expanded groups render as visual frames behind member scene nodes.
- Collapsed groups render as a single special group node.
- Edges to and from collapsed groups remain visible through visual projection.
- Internal edges inside one collapsed group are hidden.
- Duplicate projected edges remain separate.
- Grouping is non-destructive and does not modify Story Logic or `Choice.targetSceneId`.
- Runtime, Preview, and standalone HTML playback are unchanged by grouping.

Validation:
- `npm.cmd test` -> 128 tests passed
- `npm.cmd run build` -> passed

### Completed - Scene Groups final UX improvements

Commits:
- `347bf48` - `fix: restore scene group frame interactions`
- `0eefef2` - `fix: remove empty scene groups automatically`
- `c39dbc3` - `feat: assign selected scenes to existing groups`
- `45729b8` - `feat: ungroup selected scenes`

Changes:
- Scene Group controls are now fully interactive inside React Flow.
- Empty groups are removed automatically after scene membership changes.
- Authors can move selected scenes between existing groups.
- Authors can remove only selected scenes from a group without ungrouping the whole group.
- Scene Group bounds are recomputed after membership changes.
- Scene Group workflow is now considered feature-complete for EPIC 10.

Validation:
- `npm.cmd test` -> 146 tests passed
- `npm.cmd run build` -> passed

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

### Completed - Player-facing Resources

Commit:
- `ee4cb95` — `feat: add player-facing resource presentation`

Changes:
- Extended `Resource` with player-facing presentation metadata:
  - `displayName`,
  - `icon`,
  - `visible`.
- Added migration defaults for old resources:
  - `displayName = key`,
  - `icon = "circle"`,
  - `visible = true`.
- Extended the Resources screen to edit key, display name, icon, visibility, and default value.
- Added a Resource HUD to Preview.
- Added matching Resource HUD support to standalone HTML export.
- Kept Story Logic references on `Resource.id` and runtime lookup by `Resource.key`.
- Added tests for migration defaults, Resource HUD rendering, runtime updates, hidden Variables, and standalone template support.

Validation:
- `npm.cmd test` → 57 tests passed
- `npm.cmd run build` → passed

### Completed - Story Logic reference validation

Commit:
- `feeee43` — `feat: validate broken story logic references`

Changes:
- Extended `validateProject(project)` to detect broken Story Logic references in Conditions and Effects.
- Added validation codes for missing Resource, Variable, Character, and Character Attribute references.
- Validation issues retain `sceneId` and `choiceId`, so existing Project Validation navigation continues to work.
- Runtime behavior, Preview, and standalone runtime were not changed.
- Added tests covering all requested missing reference cases.

Validation:
- `npm.cmd test` → 65 tests passed
- `npm.cmd run build` → passed

### Completed - Choice Copy / Paste

Commit:
- `b00ca57` — `feat: add choice copy and paste`

Changes:
- Added a session-local in-memory Choice clipboard.
- Added Copy action for Choices and Paste Choice action for the current Scene.
- Added `Ctrl+C` for selected Choice and `Ctrl+V` to paste into the current Scene when focus is not in a text-editing target.
- Paste appends to the current Scene and regenerates Choice, Condition Group, Condition, and Effect ids.
- Copy does not create undo history; paste creates a normal undo step.
- Clipboard is project-scoped and is not stored in Project, localStorage, or exports.
- Added tests for copy, paste, regenerated ids, Story Logic preservation, clipboard lifetime, and undo history behavior.

Validation:
- `npm.cmd test` → 70 tests passed
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
  - Empty/error states polish
  - Story Player component-level tests
  - Future undo/redo refinements beyond the snapshot-based MVP
  - Export preflight using Project Validation

### Backlog / Product polish

- Story Player component-level tests.
- Export preflight validation.
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
