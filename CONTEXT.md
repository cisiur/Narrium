# Context — Narrium

> This file is used to resume work on Narrium in a new AI session.  
> Paste this file at the beginning of a new conversation before asking for planning, review, or implementation prompts.

---

## Current Desktop Architecture Review Status

Authoritative implementation plan:
- `docs/reviews/DESKTOP_ARCHITECTURE_REVIEW_2026-07.md`

Current status:
- Narrium is desktop-first for the central project workflow: `.narrium` files are the persistent source of truth for file-backed desktop projects, local desktop background assets are stored beside the project with relative paths, and full file-backed Project payloads are no longer mirrored into WebView localStorage.
- Browser compatibility remains intentional for Vite/browser mode, local drafts, imported JSON drafts before Save As, and standalone exported player runtime save slots.
- Accepted implementation baseline for E11-10A: `10398892ab338527e18fd6e9afd84e8754deeb31`.
- This documentation synchronization pass will create a later documentation-only commit on top of that baseline.

Completed review recommendations:
- Native close dirty protection: implemented. Dirty native window close uses Save / Don't Save / Cancel; clean close proceeds immediately.
- Tauri asset protocol hardening: implemented. Asset protocol scope is restricted to local background image paths under `assets/backgrounds/`.
- Rust filesystem validation and session trust: implemented for the current project-file and local background command surface. Rust validates project extensions, project-relative asset paths, traversal, destinations, project read size, session-trusted source files, and pending Save As destinations.
- Desktop app preferences backend: implemented. Desktop recent projects and last-opened project are stored in native Tauri app data with one-time migration from WebView localStorage.
- Export preflight validation: implemented. Standalone HTML export warns for referenced local desktop assets and blocks when referenced local assets cannot be resolved.
- Export preflight selection fix: implemented. Unused Asset Library entries no longer affect standalone HTML export preflight.
- Desktop-native JSON export: implemented. Browser JSON export still uses the Blob/download flow; desktop JSON export uses a native Save dialog and writes raw full `Project` JSON.
- Playable folder export foundation: implemented for desktop local background assets. Desktop builds expose a separate Export Playable Folder action that creates a portable folder with `index.html` and referenced local background files under `assets/backgrounds/`; browser/Vite mode does not expose the desktop action.
- Image size validation and thumbnail optimization: implemented. Thumbnail uploads are validated and resized/compressed through an image-processing service; background uploads/imports enforce size limits without background compression.
- Background asset display boundary: implemented. `BackgroundAssetDisplayService` is the service-level boundary for resolving embedded, remote, and desktop local background display sources.
- Embedded background migration: implemented. Desktop Save and Save As plan embedded background migration, materialize files through Rust, rewrite background asset references to local project-relative paths, and write the final `.narrium`.
- Local background cleanup: implemented. File-backed desktop projects can preview orphaned physical background files, confirm deletion, revalidate references immediately before deletion, and delete only verified supported files under `assets/backgrounds/`.
- Local background duplicate detection: implemented as diagnostics only. File-backed desktop projects can fingerprint direct local background files with SHA-256 and report duplicate content groups without deleting, merging, or rewriting references.
- Performance instrumentation foundation: implemented. Platform-neutral in-memory metrics cover project size, Save/Save As timings, cleanup and duplicate timings, background import and thumbnail timings, and undo/redo history metrics with bounded retention.

Partially completed recommendations:
- Standalone export local-asset handling: legacy single-file standalone HTML remains a browser/compatibility export and still does not package local files by design. The production-direction desktop playable folder export now packages referenced local background assets.

Next unresolved architecture topics:
- Replace/overwrite workflow for existing playable export folders.
- ZIP/package/executable distribution options.
- Packaging asset categories beyond backgrounds and broader local asset lifecycle work.
- Performance optimization and developer tooling that can consume the collected instrumentation.
- PlatformService split only when clearer ownership is needed for new file/asset surfaces.
- Format-version planning before removing legacy direct scene background fields.
- Autosave.

Important remaining known limitations:
- Standalone single-file HTML export does not package local desktop assets; it remains a compatibility feature separate from desktop playable folder export.
- Playable folder export currently packages referenced local backgrounds only; ZIP export, custom packages, executable players, installers, replacement of existing output folders, remote downloads, embedded Data URL extraction into export files, and non-background asset packaging remain future work.
- General local asset storage beyond backgrounds remains future work.
- Duplicate consolidation, automatic duplicate cleanup, autosave, performance optimization, developer tooling, format-version planning, and platform-service split remain future work.
- Legacy direct scene background fields remain for compatibility and should only be removed after migration and format-version planning.
- Some browser file APIs remain in UI components for browser compatibility and transitional import/upload paths.

---

## What is this project

Narrium is a **no-code, desktop-first visual novel editor**.

Authors build branching interactive stories by connecting scene tiles on a visual canvas — no programming required. Each scene can contain a background image, ordered dialogue pages, and response choices. Choices can carry declarative condition groups and declarative effects.

The completed browser-based MVP is preserved as a validated reference implementation on branch `MVP_web_legacy`. Active development on `main` now targets a desktop-first Narrium editor with local project folders, local asset files, and portable desktop playable exports.

The validated web MVP can preview stories in the browser, export/import JSON, and export a standalone HTML player file. These features remain useful foundation and compatibility references, but standalone browser export is no longer the final production direction by itself.

Target user:
- non-technical authors
- writers
- game designers
- hobbyists
- people who want to create branching narratives without coding

Platform:
- desktop-first editor on `main`
- Tauri v2 desktop shell around the existing React/TypeScript UI
- local project folders and local asset file storage are the near-term production direction
- browser-only web MVP is complete and archived on `MVP_web_legacy`
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
- `main` is for the future desktop-first Narrium editor direction.
- The browser MVP snapshot is archived on branch `MVP_web_legacy`.
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
| Desktop shell | Tauri v2 foundation |
| Storage | `ProjectStorage` service boundary for browser/localStorage plus desktop project-file service for `.narrium` files |
| Project format | `.narrium` desktop project files are JSON internally and wrap the current `Project` object |
| Runtime player | Embedded React Preview player |
| Exported player | Legacy single-file standalone HTML plus desktop-only playable folder export for referenced local backgrounds |
| Tests | Vitest |
| Bundler | Vite |

---

## Current Project Status

Strategic status:
- The browser-based web MVP is complete, validated, and archived on branch `MVP_web_legacy`.
- Active development on `main` now targets a desktop-first editor.
- The existing React/TypeScript editor, canonical `Project` model, story logic runtime, preview, validation, JSON import/export, and standalone HTML export remain the validated MVP foundation.
- A minimal Tauri v2 desktop shell foundation exists on `main` and loads the existing Vite/React UI.
- Workspace/project persistence now goes through a `ProjectStorage` service boundary.
- Browser projects and local desktop drafts still use browser/localStorage through the legacy web MVP keys/data format.
- Project normalization/migration logic now lives in `src/domain/project/`, not `src/store/`.
- Runtime execution helpers and runtime-state initialization now live in `src/domain/runtime/`.
- Standalone HTML export generation now lives in `src/services/export/`.
- JSON import accepts legacy choices with `conditions` and missing `effects`, then normalizes to the current `conditionGroups`/`effects` shape.
- Platform identity now goes through `src/services/platform/`; future desktop APIs must be added behind that service boundary.
- Desktop builds now use native `.narrium` project files for Open Project File, Save, and Save As.
- Desktop project workflow hardening is implemented: dirty state, guarded Open/Create, recent project files, last-opened offer, platform-owned file read/write, file path display, and dirty `*` indicator.
- Desktop file-backed `.narrium` projects no longer mirror full Project JSON into BrowserProjectStorage/localStorage.
- For file-backed desktop projects, the active Project stays in memory and the `.narrium` file is the persistent source of truth.
- Native window close dirty protection is implemented through the platform lifecycle boundary; explicit Open/Create dirty checks remain active.
- `.narrium` files are JSON internally and use `{ format: "narrium.project", formatVersion: 1, project }`.
- Legacy raw Project JSON and old `project.narrium.json` files remain openable as compatibility fallbacks when selected as files.
- My Projects cards open associated `.narrium` files directly when recent-project metadata links the card to a file-backed project.
- LocalStorage cards without a file association remain local drafts.
- The old single-item `WORKSPACE > My Projects` landing sidebar has been removed; editor navigation remains.
- Current intended dependency direction is UI/features -> stores -> services -> domain -> types.
- Local desktop background asset storage is implemented for file-backed projects: uploaded backgrounds are copied into `assets/backgrounds/` beside the `.narrium` file and stored as project-relative local assets.
- Desktop Save and Save As migrate eligible embedded background assets into `assets/backgrounds/` and update the saved and active project to local project-relative references. Browser projects and desktop drafts before Save As continue to use embedded background assets.
- The Tauri asset protocol is hardened to local background image paths, and Rust filesystem commands validate supported extensions, local asset paths, destinations, project file size, and process-memory session trust for project-relative file operations.
- Desktop app preferences now use native app-data storage instead of WebView localStorage, with browser localStorage preserved for browser mode.
- Standalone HTML export now has preflight validation: referenced local desktop assets warn, missing referenced local assets block, and unused Asset Library entries are ignored.
- Desktop playable folder export is implemented as a separate desktop-only action. It creates an export-only project snapshot, rewrites referenced local background sources to portable `assets/backgrounds/...` paths, reuses the standalone player runtime, and writes a staged folder containing `index.html` plus required local background files.
- Desktop JSON export now uses a native Save dialog; browser JSON export remains browser-compatible.
- Thumbnail image processing now validates image type/size and writes optimized thumbnails; browser and desktop background imports enforce size limits without background compression.
- Local background cleanup and SHA-256 duplicate detection are implemented as separate desktop-only Asset Library maintenance actions for file-backed projects.
- Platform-neutral performance instrumentation now records in-memory metrics for project size, Save/Save As, background import, thumbnail generation, cleanup, duplicate detection, and undo/redo history. Retention is bounded and no metrics are persisted.
- General local asset storage beyond backgrounds, duplicate consolidation, automatic duplicate cleanup, autosave, performance optimization/tooling, replacement of existing playable export folders, ZIP/package/executable distribution, and non-background export packaging remain future work.

```text
Workspace Management       ██████████ 100%
Canvas Graph Editor        ██████████ 100%
Scene Editor Basics        ██████████ 100%
Background System          ██████████ 100%
Canvas / Choice UX         ██████████ 100%
Characters & Resources     ██████████ 100%
Variables                  ██████████ 100%
Story Logic — Conditions   ██████████ 100%
Story Logic — Effects      ██████████ 100%
Story Logic — Runtime      ██████████ 100%
Post-Audit Stabilization   ██████████ 100%
Story Player Preview       ██████████ 100%
Save / Export              ██████████ 100%
Polish & Production UX     ██████░░░░  60%
```

Validated web MVP state:
Narrium has a usable local multi-project workspace, project settings sidebar, project thumbnails, React Flow scene graph editor, editor-only Canvas Scene Groups, Canvas-only keyboard shortcuts, Choice copy/paste, snapshot-based active-project undo/redo MVP, reusable application confirmation dialog, right-side scene editor with Project Validation, shared validation infrastructure including Story Logic reference validation, background system, asset library support, SceneNode thumbnails, ordered dialogue pages, character speaker selection, safe character deletion with dialogue speaker cleanup, choice target editing, edge-to-choice navigation, project-level Characters, Character attributes, project-level Resources with player-facing presentation metadata, project-level Variables, complete Story Logic Conditions including Variables, complete Story Logic Effects including Variables, runtime helper functions for condition/effect execution, a functional in-browser Story Player Preview with Resource HUD, JSON project export/import, standalone HTML story export with runtime parity and Resource HUD, polished standalone HTML playback, and exported standalone player save/load persistence including variable runtime values.

Canvas Scene Groups now support:
- selecting multiple scenes,
- creating a new group from selected scenes,
- adding selected scenes to an existing group,
- removing selected scenes from their current group,
- naming and renaming groups,
- expanded group frames,
- collapsed group nodes,
- expand/collapse,
- ungrouping whole groups,
- projected visual edges for collapsed groups,
- automatic removal of empty groups.

Scene Groups are editor-only. Grouping does not change Story Logic, and runtime, Preview, and standalone HTML playback are unchanged by grouping.

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
- Project Variables foundation is complete.
- Variables are integrated into Story Logic Conditions, Story Logic Effects, Preview runtime, standalone HTML runtime, and standalone save/load snapshots.
- Player-facing Resources are implemented with display name, icon, visibility, and Resource HUDs in Preview and standalone HTML.
- Project Validation detects broken Story Logic references in Conditions and Effects.
- Choice Copy / Paste is implemented for session-local authoring productivity.
- EPIC 10 - Canvas Scene Groups is complete: architecture helpers, multi-selection, group creation/ungroup, expanded frames, rename, collapsed nodes, expand/collapse, visual edge projection, and UX polish.

Current recommended next milestone:
- **EPIC 11 - Desktop Pivot & Local Project System**
- E11-10A playable folder export foundation is complete at accepted implementation baseline `10398892ab338527e18fd6e9afd84e8754deeb31`.
- No single next implementation task is approved yet. PM prioritization is needed among the remaining documented candidates: existing-folder replacement workflow, ZIP/package/executable distribution, non-background asset lifecycle/export packaging, performance optimization/tooling, PlatformService split when needed, and format-version planning.

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
  - old projects receive missing modern fields such as `variables: []`
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
  - `variables`
- Left project sidebar switches between Canvas, Characters, Resources, and Variables.
- Opening a project defaults to Canvas.
- Canvas keeps the right sidebar visible with Project Validation at the top and the Scene Editor below it when a scene is selected.
- Characters, Resources, and Variables use full-width main screens without the Scene Editor panel.
- Project header includes:
  - My Projects
  - Add Scene
  - Preview
  - Save / Save As in desktop project-file capable builds
  - Export JSON
  - Export HTML

### Desktop Project Files

- Desktop project-file workflow exists for JSON-only `.narrium` projects.
- Supported desktop actions:
  - Open Project File
  - Save
  - Save As
- Create Project creates a localStorage-backed draft with no project file path until Save As.
- `.narrium` files contain JSON with `format`, `formatVersion`, and `project` fields.
- Opening a `.narrium` file reads and normalizes the wrapped `project`.
- Raw legacy Project JSON remains openable through Open Project File when selected as a `.json` file.
- Old `project.narrium.json` files are legacy/transitional and are no longer the default desktop save target.
- Invalid project files show a project-file error in the My Projects screen.
- Browser/Vite workflow still uses `narrium_workspace` and `narrium_project_{id}` in localStorage.
- The workspace store currently keeps the active desktop project file path while a file-backed project is open.
- Desktop file-backed projects become dirty after edits and clean after successful Save or Save As.
- Successful desktop Save As synchronizes `Project.name` with the selected `.narrium` filename without its extension.
- Normal Save preserves the current in-app project name and does not force it back to the file name.
- Canceled or failed Save As attempts leave the active project name and file path unchanged.
- Desktop file-backed project edits, undo, redo, Save, and Save As do not write the full Project payload to localStorage.
- Workspace metadata, recent-project metadata, file associations, and thumbnails remain persisted separately.
- Save As removes any old local draft payload for that project id once the `.narrium` file is written.
- Browser/localStorage projects and desktop drafts still persist full Project JSON as transitional draft storage.
- Draft storage quota failures now surface a clear storage-full error instead of silently failing.
- Desktop Open Project File and local draft Create Project prompt before discarding dirty changes.
- Native window close uses the same Save / Don't Save / Cancel dirty decision as guarded Open Project File and Create Project flows.
- If Save succeeds, native close continues; if Save As is canceled or saving fails, the app remains open and dirty state is preserved.
- Recent project files are stored as app preferences, not as workspace project data.
- Desktop app preferences are stored in Tauri native app data as `preferences.json`; browser preferences continue using `narrium_app_preferences` in localStorage.
- The recent project list stores project id when known, project name, file path, and last opened timestamp.
- The recent project list is capped at 10 entries.
- The last opened desktop project is offered on launch but is not reopened automatically.
- Opening through Open Project File, Recent Projects, Last Opened Project, or a file-backed project card registers explicit process-memory trust before reading the project file. Loading preferences alone does not trust stored paths.
- Project cards associated with recent `.narrium` files open through the file-backed path, so Save is enabled immediately and the header shows the file path.
- Project cards without a file association open as localStorage drafts, so Save stays disabled until Save As.
- The background asset library is now the canonical catalog for newly added scene backgrounds.
- New uploaded backgrounds are stored once as embedded Data URL assets; new remote backgrounds are stored once as remote URL assets.
- Desktop file-backed uploaded backgrounds are copied into `assets/backgrounds/` beside the `.narrium` file and stored as `storageType: 'local'` with a relative path.
- Browser uploaded backgrounds remain embedded Data URL assets.
- Desktop drafts must be saved as `.narrium` before importing local background assets.
- New scene background assignments use `scene.background.mode = 'asset'` plus `assetId` and do not duplicate the source URL on the scene.
- Legacy direct scene backgrounds using `mode: 'upload'` or `mode: 'url'` are normalized into catalog assets when projects load or save.
- Asset display goes through a platform-neutral resolver in `src/domain/assets/`; it does not access Tauri, filesystem paths, Blob URLs, or project file paths.
- The project header shows the current file path and appends `*` to dirty project names.
- Drafts with no known file path show `Unsaved draft - use Save As to create a .narrium file`.
- Save is disabled until a desktop project has a known file path; Save As remains available.
- Workspace/localStorage remains a compatibility layer for metadata and drafts, not the long-term desktop project database.
- Local background asset folders, background image copying, and project-relative background asset paths exist for file-backed desktop projects.
- Standalone HTML export preflight validates only local assets referenced by scene backgrounds, including one-level scene background references. Unused local Asset Library entries do not warn or block export.
- Local background cleanup, SHA-256 duplicate diagnostics, session trust, and performance instrumentation are implemented.
- General local asset categories beyond backgrounds, duplicate consolidation, autosave, performance optimization/tooling, ZIP/package/executable distribution, and playable export replacement workflow remain future work.

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
- Undo/redo persists restored project snapshots to localStorage for browser/draft projects and keeps file-backed desktop projects in memory until Save.

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
  - `Ctrl+C` copies the selected Choice when focus is not in a text-editing target
  - `Ctrl+V` pastes the copied Choice into the current Scene when focus is not in a text-editing target
  - shortcuts ignore input, textarea, select, and contenteditable targets
- Scene Groups:
  - multi-scene selection is tracked without breaking single-scene editor navigation
  - selected scenes can create a new named `SceneGroup`
  - selected scenes can be added to an existing `SceneGroup`
  - selected scenes can be removed from their current group
  - groups can be renamed, collapsed, expanded, and ungrouped as whole groups
  - groups with no member scenes are removed automatically
  - expanded groups render as visual frames behind their member scenes
  - collapsed groups render as one special group node using `group:{groupId}`
  - scenes inside collapsed groups are hidden from normal scene-node rendering
  - canvas edges project visually to collapsed group nodes where needed
  - internal edges within one collapsed group are hidden
  - duplicate projected edges remain separate
  - grouping does not mutate `Choice.targetSceneId`, Story Logic, Preview, runtime, or standalone HTML behavior

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
  - copy/paste a Choice within the current editor session
  - paste appends to the current Scene and regenerates Choice, Condition Group, Condition, and Effect ids
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
  - broken Resource references in Conditions and Effects
  - broken Variable references in Conditions and Effects
  - broken Character references in Conditions and Effects
  - broken Character Attribute references in Conditions and Effects
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
  - add remote URL asset
  - add embedded browser upload asset
  - add local desktop file-backed upload asset
  - list background assets
  - use asset as scene background
  - delete asset
  - reset scenes using deleted asset
- `AssetLibraryItem` is the canonical runtime catalog for new background sources:
  - `storageType: 'embedded'` stores a Data URL in `source`
  - `storageType: 'remote'` stores an external URL in `source`
  - `storageType: 'local'` stores a project-relative path such as `assets/backgrounds/forest.png` in `source`
- Newly uploaded or URL-assigned scene backgrounds create or use an asset and set `SceneBackground.mode = 'asset'`.
- Legacy scene backgrounds with direct `SceneBackground.url` still load and render, and normalization migrates them into asset references where practical.
- Multiple scenes can reference the same background asset without duplicating its source data.
- Deleting a referenced asset clears affected scene background assignments.
- Deleting a local asset entry does not delete the physical file automatically.
- Asset Library is the only new UI entry point for URL/upload backgrounds; direct scene URL/upload modes remain legacy-compatible but hidden.
- Save As copies referenced local background files to the new project directory before writing the relocated `.narrium`.
- Desktop Save and Save As automatically migrate eligible embedded background assets to local files and keep asset ids and scene references stable.
- Asset Library cleanup detects orphan physical background files only when no local background Asset Library entry references the normalized project-relative path. Scene usage is irrelevant, cleanup is preview-first and confirmed, and deletion revalidates references before touching files.
- Duplicate detection fingerprints direct supported files under `assets/backgrounds/` with SHA-256 and reports same-content groups as diagnostics only. It does not select a canonical file, merge assets, rewrite references, or delete files.
- Legacy standalone HTML local-asset packaging remains out of scope by design. Desktop playable folder export packages referenced local backgrounds; duplicate consolidation, automatic duplicate cleanup, non-background assets, remote downloads, ZIP/package/executable distribution, and replacement of existing export folders remain future work.
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
- Edit player-facing display name.
- Edit built-in presentation icon.
- Toggle player HUD visibility.
- Edit numeric resource default value.
- Negative and decimal resource values are supported.
- Invalid resource values are stored as `0`.
- Duplicate resource keys are resolved project-wide with suffixes such as `gold_2`, `gold_3`.
- Resource mutations use `workspaceStore.updateActiveProject()`.
- Resource conditions target `Resource.id` and runtime values are keyed by `Resource.key`.
- Resource effects target `Resource.id`.
- Resource presentation metadata includes `displayName`, `icon`, and `visible`.
- Old projects receive `displayName = key`, `icon = "circle"`, and `visible = true` during normalization.
- Resources are player-facing values displayed in Preview and standalone HTML Resource HUDs when `visible` is true.

### Variables

- Variables project view.
- Variable list.
- Add/delete variable.
- Rename variable key inline.
- Edit numeric variable default value.
- Negative and decimal variable values are supported.
- Invalid variable values are stored as `0`.
- Duplicate variable keys are resolved project-wide with suffixes such as `visited_forest_2`, `visited_forest_3`.
- Variable mutations use `workspaceStore.updateActiveProject()`.
- Variable conditions target `Variable.id` and runtime values are keyed by `Variable.key`.
- Variable effects target `Variable.id`.
- Variables are hidden/internal story-state values intended for logic and progression, not normal player display.

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
- Variable conditions target `Variable.id` and display `Variable.key`.
- Character Attribute conditions target `Character.id` + `CharacterAttribute.key`.
- Condition value input supports integers, decimals, and negative numbers.
- Missing references fail at runtime and show visual warnings in the editor.

### Story Logic — Effects

- `Choice.effects` data model accepted and implemented.
- Resource effects target `Resource.id`.
- Variable effects target `Variable.id`.
- Character Attribute effects target `Character.id` + `CharacterAttribute.key`.
- Effect operations are stored as `+=`, `-=`, and `=`.
- Editor displays operation labels as `+`, `-`, and `=`.
- Effect value input supports numeric values.
- Missing effect references are skipped at runtime and show visual warnings in the editor.
- Character Attribute effects are preserved across attribute key renames through cascade reference updates.

### Story Logic — Runtime Helpers

Implemented in `src/domain/runtime/runtimeLogic.ts`:

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
- Variable runtime values are keyed by `Variable.key`.
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

Preview supports:
- runtime initialization from Project defaults
- resources
- Resource HUD for visible resources
- variables
- character attributes
- dialogue page navigation
- choice rendering
- conditions and unavailable hints
- resource effects
- variable effects
- character attribute effects
- action choices
- restart
- ending states
- supported backgrounds

### JSON Import / Export

- JSON export exports the full active `Project` object.
- Browser JSON export uses the browser-style Blob download path.
- Desktop JSON export uses a native Save dialog and writes raw full `Project` JSON with the existing filename convention.
- JSON import validates a Narrium Project-like object and normalizes it.
- Uploaded Data URLs are preserved.
- `Project.variables` is included naturally because it is part of the Project model.
- Old imports that do not contain `variables` are normalized to `variables: []`.

### Standalone HTML Export

Standalone HTML export:
- creates a single self-contained `.html` file
- embeds the full Project
- preserves Data URLs
- opens directly from disk
- does not require Narrium, npm, Vite, React, or a dev server
- supports start scene, dialogue, choices, restart, end state, supported backgrounds
- supports resource conditions/effects
- supports visible Resource HUD display
- supports variable conditions/effects
- supports character attribute conditions/effects
- supports targetless action choices
- supports invalid-target disabled behavior
- supports standalone runtime save/load when enabled by project settings
- runs export preflight before generation
- warns when referenced local desktop assets are present because standalone HTML does not package those files
- blocks when referenced local desktop assets cannot be resolved
- ignores unused local Asset Library entries

### Playable Folder Export

Desktop playable folder export:
- is a separate desktop-only action named Export Playable Folder
- is hidden or unavailable in browser/Vite mode
- remains separate from `.narrium` Save/Save As, JSON export, and legacy single-file standalone HTML export
- uses a native destination folder dialog
- creates a deterministic output folder containing `index.html` and referenced local background files under `assets/backgrounds/`
- reuses the existing standalone HTML player generator/runtime
- opens directly from disk without a server
- builds a platform-neutral export plan before filesystem writes begin
- uses the same referenced-background collection logic as standalone export preflight
- includes direct `assetId` scene backgrounds and one-level `scene_reference` backgrounds
- ignores unused Asset Library entries
- keeps embedded Data URL backgrounds embedded and remote URL backgrounds remote
- rewrites referenced local background sources only in an export-only Project snapshot
- does not mutate the active Project, dirty state, `.narrium`, workspace metadata, recent-project metadata, or undo/redo history
- copies only referenced local PNG, JPG, JPEG, and WEBP background files
- deduplicates repeated references to the same source file
- handles filename collisions with deterministic collision-safe output names
- writes through a Rust-staged operation and rejects existing output folders instead of merging with or deleting them
- requires the source `.narrium` project file to be trusted in the current session and validates source paths, destination parent paths, generated folder names, duplicate copy entries, missing files, traversal, and boundary escapes in Rust

Standalone save/load snapshots include:
- `currentSceneId`
- `currentPageIndex`
- `variables.resources`
- `variables.variables`
- `variables.characterAttrs`

### Tests

Implemented:
- Vitest added.
- `npm.cmd test` runs `vitest run`.
- Current validation commands:
  - `npm.cmd test`
  - `npm.cmd run build`
  - `npm.cmd run desktop:build`
- `runtimeState.test.ts` covers initial RuntimeState creation, including Variables.
- `runtimeLogic.test.ts` covers representative behavior for:
  - `applyEffects()`
  - `isChoiceAvailable()`
  - `resolveUnavailableChoiceHint()`
  - condition groups
  - missing references
  - resource effects
  - variable effects
  - character attribute effects
  - action choices enabling gated choices after runtime update
- `projectValidation.test.ts` covers shared validation rules.
- `ProjectValidationPanel.test.tsx` covers panel rendering, issue ordering, and validation issue navigation helpers.
- `projectHistory.test.ts` covers snapshot push, undo/redo replay, project isolation, and the 50-snapshot cap.
- `projectHistory.test.ts` also covers runtime-only snapshot size metadata used for efficient undo/redo history metrics.
- `characterDeletion.test.ts` covers unused character deletion, referenced character deletion, speaker reference cleanup, and cancellation.
- `variableHelpers.test.ts` covers variable key resolution.
- `projectMigrations.test.ts` covers missing `variables` migration, existing variables preservation, legacy asset item normalization, legacy direct scene background migration, duplicate-source reuse, and idempotence.
- Standalone HTML export tests include variable save/load/runtime template coverage.
- `ResourceHud.test.tsx` covers Preview Resource HUD display and runtime updates.
- `useCanvasStore.test.ts` covers Choice copy/paste, id regeneration, Story Logic preservation, clipboard lifetime, undo history behavior, background asset creation, shared scene assignment, and referenced-asset deletion safety.
- Background asset cleanup tests cover orphan detection, case-insensitive local path protection, project-bound reports, race revalidation, browser/draft no-op behavior, successful cleanup, partial failures, and refresh-error handling.
- Background duplicate tests cover SHA-256 report planning, referenced/unreferenced classification, deterministic ordering, browser/draft no-op behavior, and non-mutating diagnostic results.
- Performance instrumentation tests cover project metrics, embedded byte counts, operation timing, Save/Save As metrics, cleanup and duplicate metrics, bounded retention, and efficient history size reuse.
- Playable folder export tests cover referenced-background collection, direct asset references, one-level scene references, unused asset exclusion, embedded/remote/local classification, missing and invalid local assets, duplicate source reuse, filename collision handling, deterministic planning, relative URL rewriting, no source Project mutation, cancellation, orchestration success, write/copy failure handling, staging cleanup/finalization behavior, browser-mode unavailability, and unchanged standalone HTML default behavior.

---

## Current EPIC 9 Status

EPIC 9 status is preserved here as validated web MVP history. It is not the current strategic roadmap focus on `main`.

Completed validation batch:
- `E9-15` - Warn on targetless choices with no effects
- `E9-16` - Validation infrastructure
- `E9-17` - Validation rules batch
- `E9-18` - Project Validation Panel MVP
- `E9-18B` - Validation Panel Layout Polish
- Story Logic reference validation for Resources, Variables, Characters, and Character Attributes

Completed polish / production UX tasks:
- `E9-01` - Keyboard shortcuts: Delete selected node/choice, Esc close/cancel
- `E9-02A` - Basic snapshot-based project undo/redo MVP
- `E9-03` - Reusable confirmation dialog replacing native browser confirmations
- `E9-10` - Safe character deletion when used as dialogue speaker
- Choice Copy / Paste

Completed Variables work:
- `E9-19` - Project Variables tab foundation
- `E9-20` - Variables in Story Logic and runtime

Completed Resources work:
- Player-facing Resource presentation metadata
- Resource HUD in Preview
- Resource HUD in standalone HTML

Completed Scene Groups work:
- `SG-01` - Scene Group architecture helpers
- `SG-02` - Multi-selection and group creation workflow
- `SG-03` - Expanded group rendering and rename
- `SG-04` - Collapsed Scene Group nodes
- `SG-05` - Collapsed group edge projection
- `SG-06` - Scene Group UX polish
- `SG-07` - Documentation update

Important:
- Validation UI must not change runtime, Preview, JSON import/export, standalone HTML export, or the Project data model unless explicitly scoped.
- Variables are intentionally hidden/internal.
- Resources are player-facing numeric values when marked visible.

Next recommended tasks:
1. PM prioritization among the remaining documented EPIC 11 candidates.
2. Replacement or overwrite workflow for existing playable export folders.
3. ZIP/package/executable distribution options.
4. Performance optimization and developer tooling based on collected metrics.
5. PlatformService split only when the next desktop file/asset feature needs clearer ownership.
6. Format-version planning and eventual legacy direct scene background removal.
7. General local asset storage and lifecycle work beyond backgrounds.

---

## Important Source Map

```text
src/
  app/
    App.tsx

  components/
    AppShell.tsx
    ConfirmationDialog.tsx
    RightSidebar.tsx

  features/
    canvas/
      SceneCanvas.tsx
      SceneNode.tsx
      SceneGroupFrame.tsx
      SceneGroupNode.tsx
      sceneGroups.ts

    editor/
      SceneEditorPanel.tsx
      DialoguePagesEditor.tsx
      ChoicesEditor.tsx
      BackgroundPicker.tsx
      AssetLibrarySection.tsx

    story-logic/
      ConditionGroupsEditor.tsx
      ConditionGroupCard.tsx
      ConditionRow.tsx
      EffectsEditor.tsx
      EffectCard.tsx
      referenceUsage.ts

    validation/
      projectValidation.ts
      projectValidation.test.ts
      ProjectValidationPanel.tsx
      ProjectValidationPanel.test.tsx

    characters/
      CharactersScreen.tsx
      characterDeletion.ts
      characterDeletion.test.ts

    resources/
      ResourcesScreen.tsx
      resourcePresentation.ts

    variables/
      VariablesScreen.tsx
      variableHelpers.ts
      variableHelpers.test.ts

    player/
      ResourceHud.tsx
      ResourceHud.test.tsx
      StoryPlayer.tsx
      DialoguePanel.tsx
      ChoiceList.tsx
      playerHelpers.ts
      StoryPlayerHeader.tsx

  store/
    projectHistory.ts
    projectHistory.test.ts
    workspaceStore.ts
    useCanvasStore.ts
    useCanvasStore.test.ts
    useProjectViewStore.ts

  domain/
    assets/
      assetSources.ts
      assetSources.test.ts
    project/
      projectDefaults.ts
      projectMigrations.ts
      projectMigrations.test.ts
      index.ts
    runtime/
      choiceViewModels.ts
      runtimeLogic.ts
      runtimeLogic.test.ts
      runtimeState.ts
      runtimeState.test.ts
      index.ts

  services/
    app-preferences/
      AppPreferencesService.ts
      AppPreferencesService.test.ts
      getAppPreferencesService.ts
      index.ts
    project-storage/
      ProjectStorage.ts
      BrowserProjectStorage.ts
      BrowserProjectStorage.test.ts
      getProjectStorage.ts
      index.ts
    project-file/
      ProjectFileService.ts
      ProjectFileService.test.ts
      getProjectFileService.ts
      index.ts
    platform/
      PlatformService.ts
      BrowserPlatformService.ts
      DesktopPlatformService.ts
      getPlatformService.ts
      getPlatformService.test.ts
      index.ts
    export/
      standaloneHtmlExport.ts
      standaloneHtmlExport.test.ts
      index.ts

  utils/
    projectExport.ts
    standaloneHtmlExport.ts
    projectImport.ts
    projectImport.test.ts

  types/
    index.ts

src-tauri/
  tauri.conf.json
  Cargo.toml
  build.rs
  src/
    main.rs
    lib.rs
  capabilities/
    default.json
```
