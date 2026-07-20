# Desktop Architecture - Narrium

This document describes the intended desktop-first direction for Narrium after completion of the browser MVP.

The browser MVP remains archived on branch `MVP_web_legacy` as a validated prototype and reference implementation. Active development on `main` now moves toward a desktop-first visual novel editor with native project files, local asset files, and portable desktop playable exports.

Current implementation status:
- A minimal Tauri v2 desktop shell foundation exists under `src-tauri/`.
- The shell loads the existing Vite/React UI in development and points at the Vite `dist` output for desktop builds.
- Browser development remains available through the existing Vite workflow.
- Workspace/project persistence now goes through a synchronous `ProjectStorage` service boundary.
- The current `BrowserProjectStorage` backend still uses `narrium_workspace` and `narrium_project_{id}` for browser projects and local desktop drafts.
- File-backed desktop `.narrium` projects do not mirror full Project JSON into BrowserProjectStorage/localStorage.
- Project normalization/migration code now lives in `src/domain/project/`.
- Runtime execution helpers and runtime-state initialization now live in `src/domain/runtime/`.
- Standalone HTML export generation now lives in `src/services/export/`.
- Legacy JSON import accepts old `Choice.conditions` and missing `effects`, then normalizes to the current shape.
- Platform identity now goes through `src/services/platform/`.
- A native `.narrium` project-file workflow exists for desktop builds: Open Project File, Save, and Save As read/write `.narrium` files.
- Desktop project workflow hardening exists for dirty state, guarded Open/Create, recent projects, and last-opened project offers.
- Native window close dirty protection is implemented through the platform lifecycle boundary.
- Desktop app preferences now persist through Tauri native app data instead of WebView localStorage.
- Tauri asset protocol scope is restricted to local background image files under `assets/backgrounds/`.
- Rust filesystem commands validate project extensions, local asset relative paths, destinations, project file size, and process-memory session trust for project-relative operations.
- The background asset catalog now stores newly added background sources as embedded Data URL, remote URL, or desktop local project-relative background assets.
- Standalone HTML export has preflight validation for referenced local desktop assets, but the legacy single-file export still does not package local asset files by design.
- Desktop playable folder export is implemented as a separate desktop-only action. It packages referenced local background assets beside a generated `index.html` while reusing the standalone player runtime.
- Browser JSON export still uses the browser-style Blob download path; desktop JSON export uses a native Save dialog and writes raw full `Project` JSON.
- Image size validation and thumbnail optimization are implemented through the image-processing service.
- Desktop Save and Save As migrate eligible embedded background assets into local project-relative files under `assets/backgrounds/`.
- Local background cleanup and orphan detection are implemented as a preview-first, confirmed, file-backed desktop maintenance action.
- Local background duplicate detection is implemented as diagnostic-only SHA-256 fingerprint reporting.
- Performance instrumentation is implemented as centralized platform-neutral in-memory metrics with bounded retention.
- Services can depend on domain code, but domain code must stay independent from stores, services, UI, and Tauri APIs.
- Local desktop background asset storage and playable folder export for referenced local backgrounds are implemented; general asset categories beyond backgrounds, duplicate consolidation, automatic duplicate cleanup, autosave, performance optimization/tooling, existing-folder replacement, ZIP/package/executable distribution, and non-background export packaging remain planned future work.

---

## Product direction

Narrium becomes a desktop-first visual novel editor.

Authors should be able to create and manage projects as native `.narrium` files on their machine. Imported images and other media should later live as normal local files referenced by the project instead of being embedded into browser storage or long JSON payloads.

The existing browser MVP validated the core product shape:
- visual scene canvas,
- scene editor,
- backgrounds and asset library,
- characters, resources, and variables,
- declarative story logic,
- in-editor preview,
- JSON import/export,
- standalone HTML export.

Those MVP systems should be treated as foundation and migration reference, not as the final production storage or export direction.

---

## Recommended technical direction

The existing React/TypeScript UI should be preserved where practical. The current editor surface, stores, validation, story logic helpers, and preview runtime represent useful implementation work that should not be discarded casually.

Tauri v2 is now the desktop shell foundation. It wraps the existing web UI while preserving the browser development workflow.

The current Tauri foundation is intentionally minimal:
- it exposes narrow desktop project-file, local background asset, lifecycle, trust, and app-preference APIs,
- it does not change the `Project` model.

The current storage abstraction is also intentionally minimal:
- it preserves the existing localStorage data format,
- it keeps persistence synchronous for compatibility with the current Zustand store,
- it creates a future backend seam without implementing Tauri filesystem or dialog APIs.

Current dependency direction:

```text
UI/features -> stores -> services -> domain -> types
```

The important boundary for desktop work is that services must not import from stores. Domain modules should hold platform-neutral project rules such as normalization and defaults.

Runtime/export boundary status:
- Editor Preview uses reusable domain runtime helpers.
- Standalone HTML export generation is isolated under `services/export`.
- Desktop playable folder export reuses the same standalone HTML generator/runtime in an explicit mode that allows rewritten local relative asset sources.
- The platform-neutral playable export planner lives under export services and builds the export plan before filesystem writes begin.
- Standalone HTML remains the single-file browser/legacy compatibility export and keeps its default behavior unchanged.

Platform boundary status:
- `PlatformService` exposes platform identity and the narrow project-file operations required by the current desktop file workflow.
- `BrowserPlatformService` reports the browser runtime.
- `DesktopPlatformService` reports the Tauri desktop runtime.
- `getPlatformService()` owns Tauri runtime detection using injected Tauri globals.
- Future Tauri APIs must be introduced behind `services/platform/`; React components and Zustand stores must not import Tauri directly.
- Current Tauri usage is limited to file open/save dialogs, unsaved-change confirmation, selected project-file reads/writes, desktop JSON export writing, playable folder destination selection/writing, and local background asset file import/display/relocation through service boundaries.
- Native close dirty protection uses the same Save / Don't Save / Cancel orchestration as guarded Open/Create flows and prevents duplicate close decisions while a prompt or save is pending.
- Project file reads and writes operate on paths explicitly trusted in the current process. Native Open registers selected existing project files, explicit Recent Projects / Last Opened / file-backed card actions register trust before read, and Save As registers a pending destination before write.
- Rust validation enforces supported project extensions, local asset traversal protection, destination validation, a 25 MiB project-read size limit, session trust for existing project files, and pending destination trust for Save As.
- No unrestricted filesystem, clipboard, shell, notifications, drag-and-drop, autosave, ZIP/package/executable export, or existing-folder replacement APIs are implemented.

Project file status:
- `src/services/project-file/` owns desktop project-file orchestration.
- Desktop projects currently use `.narrium` files.
- `.narrium` files are JSON internally and contain `{ "format": "narrium.project", "formatVersion": 1, "project": { ... } }`.
- Rust project-file reads accept `.narrium` and legacy `.json` files.
- Rust project-file writes accept `.narrium` only.
- Rust rejects project files larger than 25 MiB before reading them into memory; this comfortably exceeds current local-asset desktop projects while preventing arbitrarily large JSON reads.
- Rust local-asset commands reject absolute asset paths, parent-directory traversal, empty paths, and paths that resolve outside the project directory.
- Rust Save As asset copying validates the destination `.narrium` path before creating asset directories.
- Session trust is process-memory-only and resets on restart. Loading preferences alone does not trust stored paths.
- Successful Save As writes promote the pending destination to trusted.
- Legacy raw Project JSON and old `project.narrium.json` files remain openable when selected as files, but new desktop saves use `.narrium`.
- `project.narrium.json` is legacy/transitional and is no longer the default desktop save target.
- The browser workflow still uses the `ProjectStorage` localStorage backend and legacy keys.
- The workspace store carries the current desktop project file path only while a file-backed project is open.
- For file-backed desktop projects, the active Project is held in memory and `.narrium` is the persistent source of truth.
- File-backed project edits, undo, redo, Save, and Save As do not call BrowserProjectStorage.saveProject.
- Workspace metadata, recent-project metadata, file associations, and thumbnails remain persisted separately.
- LocalStorage-backed drafts and browser projects continue to store full Project JSON as transitional draft/browser storage.
- Save As removes any stale local draft Project payload for that project id after writing the `.narrium` file.
- Browser/draft quota errors are surfaced as clear storage-full errors.
- The workspace store tracks dirty state for active projects.
- Dirty desktop projects prompt before Open Project File and local draft Create Project.
- Native window close prompts for dirty projects; explicit Open/Create dirty checks remain active.
- Clean projects close without prompting.
- Choosing Save runs normal Save for file-backed projects and Save As for drafts; Save As cancellation or save failure keeps the app open and dirty.
- Choosing Don't Save closes without saving, and choosing Cancel keeps the app open with dirty state preserved.
- Successful Save and Save As mark the project clean.
- The project header displays the current file path and dirty `*` indicator.
- Drafts without a project file path show `Unsaved draft - use Save As to create a .narrium file`.
- `src/services/app-preferences/` stores recent project file paths and the last opened project as app preferences.
- Browser app preferences continue to use the `narrium_app_preferences` localStorage key.
- Desktop app preferences are stored in Tauri's native application data directory as `preferences.json`, outside WebView localStorage.
- On desktop startup, if native preferences already exist they are used directly; otherwise existing WebView localStorage preferences are migrated once into the native backend.
- Recent project metadata stores `projectId` when known so My Projects cards can reopen associated `.narrium` files directly.
- Cards without a file association remain localStorage drafts.
- Older recent metadata may associate by unique project name only; duplicate names do not auto-open a file.
- File-backed cards display a `.narrium file` label and path, while drafts display `Local draft`.
- Recent projects are capped at 10 entries and are not workspace project records.
- The last opened project is offered on launch, not reopened automatically.
- Clicking a Recent Project, Last Opened Project offer, or existing file-backed project card is treated as explicit user intent and registers trust before the project is read.
- The My Projects landing screen no longer renders the single-item `WORKSPACE > My Projects` sidebar.
- The long-term workspace direction remains app preferences and recent projects, not the primary project database.

Near-term desktop work should focus on:
- replacement or overwrite workflow for existing playable export folders,
- ZIP/package/executable distribution options if product priorities require them,
- performance optimization and developer tooling based on collected instrumentation,
- extending local asset file storage beyond backgrounds,
- keeping localStorage limited to browser projects, temporary drafts, and lightweight workspace/app metadata,
- keeping the validated domain model recognizable.

---

## Project storage model

Current Narrium desktop projects are `.narrium` files:

```text
MyStory.narrium
```

`.narrium` files are JSON internally:

```json
{
  "format": "narrium.project",
  "formatVersion": 1,
  "project": {}
}
```

The wrapped `project` value stores the current Narrium `Project` data: scenes, choices, characters, resources, variables, groups, settings, and asset metadata.

Current implementation:
- opens a `.narrium` file selected by the author,
- saves to the known `.narrium` file path,
- uses Save As to create or overwrite a selected `.narrium` file,
- normalizes opened project JSON,
- stores newly added background sources once in `project.assetLibrary`,
- stores scene background assignments as `assetId` references where possible,
- does not mirror full file-backed Project JSON into localStorage,
- stores desktop-imported local background assets as relative paths such as `assets/backgrounds/forest.png`,
- migrates eligible embedded background assets to local project-relative files during desktop Save and Save As,
- also accepts raw legacy Project JSON as an open/import fallback,
- creates `assets/backgrounds/` lazily when a desktop local background import or embedded-background materialization succeeds.

Local background asset files live beside the project file under `assets/backgrounds/`.

Local asset references in the JSON use relative paths:

```json
{
  "id": "asset_123",
  "kind": "background",
  "name": "Castle Hall",
  "storageType": "local",
  "source": "assets/backgrounds/castle-hall.png",
  "createdAt": "2026-07-02T00:00:00.000Z"
}
```

Future asset work should continue behind this same asset catalog, rather than returning to direct scene URLs or broad filesystem APIs.

Playable folder export uses a generated runtime-only snapshot of this same Project shape. In that snapshot, referenced local background asset sources are rewritten to portable relative paths such as `assets/backgrounds/forest.png` inside the export folder. Embedded Data URL backgrounds remain embedded, remote URL backgrounds remain remote URLs, and unused Asset Library entries are not needed by the exported runtime. The snapshot is not written back to the active Project, `.narrium`, workspace metadata, recent-project metadata, dirty state, or undo/redo history.

Runtime-only maintenance and diagnostics:
- cleanup reports, duplicate reports, session trust, and performance metrics are not part of `Project` and are not written to `.narrium`,
- duplicate content hashes are computed for diagnostics and are not cached in the Asset Library,
- undo/redo snapshot byte sizes are runtime metadata stored beside history stacks, not project data.

---

## Asset handling

Current E11-05A behavior:
- uploaded background images create `storageType: "embedded"` assets whose `source` is a Data URL,
- remote background URLs create `storageType: "remote"` assets whose `source` is the external URL,
- scenes reference those assets by `SceneBackground.assetId`,
- legacy direct scene Data URLs and remote URLs normalize into catalog assets where practical,
- duplicate legacy sources reuse one asset,
- display code resolves assets through a platform-neutral helper that has no Tauri, filesystem, Blob URL, or project-path knowledge.

Current E11-05B behavior:
- desktop file-backed background uploads use a native image picker for PNG, JPG, JPEG, and WEBP,
- copied files are placed under `assets/backgrounds/` beside the `.narrium` file,
- the project stores `storageType: "local"` and a forward-slash relative source path,
- Rust local-asset commands reject absolute asset paths, parent-directory traversal, empty paths, and paths that resolve outside the project directory,
- the Tauri asset protocol is scoped to `**/assets/backgrounds/*.png`, `*.jpg`, `*.jpeg`, and `*.webp`,
- desktop drafts must be saved as `.narrium` before local asset import,
- browser uploads continue to store embedded Data URLs,
- remote URL assets remain URLs and are not downloaded,
- Save As copies referenced local background files to the new project directory before writing the relocated `.narrium`,
- Save and Save As plan eligible embedded background migration, materialize embedded image Data URLs through Rust, update matching asset entries from `storageType: "embedded"` to `storageType: "local"`, and then write the final `.narrium`,
- Open does not migrate assets and remains side-effect free,
- Rust materialization validates supported image payloads, writes through a staging directory, moves staged files into `assets/backgrounds/`, and performs rollback/cleanup for current-batch files when staging, finalization, or staging cleanup fails,
- local asset display is resolved through the platform service and never through raw `file://` URLs,
- deleting a catalog asset clears scene references but does not delete the physical file.

The project JSON should store asset metadata and relative paths. This avoids browser storage limits, reduces JSON bloat, improves portability, and makes projects easier to inspect, back up, and version.

Browser mode and the archived web MVP still use Data URLs for uploaded background images. That behavior remains intentional for browser compatibility and should not define long-term desktop file-backed storage.

Local background cleanup:
- A physical file is an orphan only when it exists directly under the current file-backed project's `assets/backgrounds/` directory and no local background Asset Library entry references its normalized project-relative path.
- Scene usage does not determine orphan status. A local Asset Library entry protects its physical file even when no scene currently uses that asset.
- Embedded and remote assets do not protect filesystem paths.
- Cleanup reports distinguish referenced physical files, orphaned physical files, and missing referenced files.
- Relative path comparison normalizes separators and redundant segments and uses case-insensitive comparison for protection.
- Reports are bound to the scanned project id and project file path; changing either invalidates the report.
- Deletion is preview-first and requires explicit confirmation through the application confirmation flow.
- Immediately before deletion, the service obtains the latest Project, recomputes protected paths, skips files that became referenced, and invokes one safe Rust batch delete command.
- Cleanup does not delete Asset Library entries, clear scene backgrounds, update `Project.updatedAt`, mark the project dirty, trigger Save/Save As, modify browser projects, modify desktop drafts, or run automatically when an Asset Library entry is deleted.

Local background duplicate detection:
- The duplicate scanner fingerprints direct PNG, JPG, JPEG, and WEBP files under `assets/backgrounds/` with SHA-256.
- The scan is non-recursive and ignores unsupported entries.
- Duplicate groups contain physical files with identical content hashes; filename, extension, Asset Library id, scene usage, and metadata do not define duplicate identity.
- Referenced/unreferenced status is derived from local background Asset Library paths using the same normalized case-insensitive comparison as cleanup.
- Duplicate reports are bound to project id and project file path and are replaced by a fresh scan.
- Duplicate detection is diagnostic only. It does not choose a canonical file, merge Asset Library entries, rewrite scene references, move files, rename files, or delete files.

Legacy standalone HTML local-asset packaging remains out of scope by design. Desktop playable folder export packages referenced local backgrounds only. Duplicate consolidation, automatic duplicate cleanup, non-background asset categories, remote downloads, embedded Data URL extraction into export files, ZIP/package/executable distribution, and existing-folder replacement remain future work.

---

## Migration path

Desktop Narrium should be able to import current web MVP project JSON.

Migration should preserve:
- scenes,
- dialogue pages,
- choices,
- conditions and effects,
- characters,
- resources,
- variables,
- scene groups,
- settings,
- asset library entries.

Legacy embedded background Data URLs are extracted into local files during desktop Save and Save As where practical:
- decode the Data URL,
- choose a stable filename,
- write the file into `assets/backgrounds/`,
- replace the embedded Data URL with a relative path,
- keep enough metadata to avoid losing author-facing asset names.

This migration is storage-only: asset ids remain stable, scene references remain unchanged, and the `Project` model and `.narrium` wrapper format do not change. Browser mode and Open remain side-effect free.

Known limitation:
- If embedded asset materialization succeeds but writing the final `.narrium` fails afterward, Narrium currently reports the write failure but does not roll back the already-materialized files. Broader project-directory transaction handling remains future work.

---

## Runtime and export direction

The current standalone HTML export belongs to the archived browser MVP. It is useful as a reference and compatibility feature, but it is not the final desktop requirement by itself.

Standalone HTML export does not package desktop local asset files. Before export, Narrium warns when referenced local assets are present because exported backgrounds may be missing, and blocks export when referenced local assets cannot be resolved. Unused local Asset Library entries are ignored by preflight. This preflight only protects the current export path; it does not add local asset packaging.

JSON export uses a browser-style Blob URL and temporary download-anchor path in browser builds. Desktop JSON export uses a native Save dialog and writes raw full `Project` JSON through the desktop service boundary. Standalone HTML export still uses the browser-style download path.

Desktop playable folder export is a separate desktop-only action. It is hidden or unavailable in browser/Vite mode and remains separate from `.narrium` Save/Save As, JSON export, and legacy single-file standalone HTML export.

Playable folder export uses a native destination directory dialog and writes a portable folder:

```text
project-name/
  index.html
  assets/
    backgrounds/
      ...
```

The generated `index.html` can be opened directly from disk without a server. Generated local asset URLs use forward-slash relative paths under `assets/backgrounds/...`; raw `file://` paths are not written into the export.

A platform-neutral playable export planner determines all required data before filesystem writes begin:
- it collects only background assets referenced by runtime scenes,
- it supports direct scene `assetId` assignments and existing one-level `scene_reference` background behavior,
- it ignores unused Asset Library entries,
- it distinguishes embedded, remote, and local assets,
- it deduplicates repeated references to the same local source file,
- it produces deterministic copy destinations and handles filename collisions without silent overwrite,
- it validates supported local background paths and extensions,
- it does not mutate the input `Project`.

The referenced-background collection logic is shared with standalone export preflight so both export paths use the same definition of referenced local assets.

Playable folder export creates an export-only Project snapshot for the generated runtime. Embedded Data URL backgrounds remain embedded, remote URL backgrounds remain remote URLs, and referenced local background sources are rewritten to portable paths such as `assets/backgrounds/forest.png`. This generated snapshot is runtime-only; it is not written back to the active Project, `.narrium`, workspace metadata, recent-project metadata, dirty-state history, or undo/redo history. It introduces no persisted Project fields, no `.narrium` wrapper change, and no `formatVersion` change.

The folder export reuses the existing standalone HTML player generator/runtime. The single-file standalone HTML export keeps its default behavior unchanged; folder export opts into the mode that allows the same runtime to resolve rewritten local relative asset sources. Runtime parity therefore remains tied to the standalone player behavior for dialogue, speakers, choices, conditions, effects, targetless action choices, resources and Resource HUD, variables, character attributes, restart, end state, save/load, and one-level scene background references.

The current folder export packages only referenced local background files. It does not copy unused local Asset Library entries, extract embedded Data URLs into files, download remote URLs, or package asset categories other than backgrounds.

---

## Filesystem security

Rust owns filesystem validation for project-relative desktop operations:
- existing project files must be valid supported project files before they can be trusted,
- project reads accept `.narrium` and legacy `.json`; project writes require `.narrium`,
- local background asset paths must be project-relative, non-empty, non-absolute, non-traversing paths under `assets/backgrounds/`,
- local background listing, cleanup deletion, and duplicate fingerprinting operate only on direct supported PNG, JPG, JPEG, and WEBP files under `assets/backgrounds/`,
- missing `assets/backgrounds/` directories are treated as empty for listing and fingerprinting,
- cleanup deletion revalidates every candidate in Rust and returns structured deleted, skipped, and failed entries.
- playable folder export requires the source `.narrium` project file to be trusted in the current session,
- playable folder export validates the selected destination parent directory and generated folder name,
- playable folder export rejects traversal and paths escaping the expected project and export boundaries,
- playable folder export rejects duplicate source copy entries and duplicate copy destinations,
- playable folder export rejects missing source assets before finalization,
- playable folder export rejects an already existing output folder instead of merging with or deleting it.

Playable folder export is staged:
- create the complete export plan before writes,
- create a temporary staging directory,
- write `index.html`,
- copy required local background files,
- finalize by renaming the completed staging directory to the final output folder,
- attempt to clean staging after failure,
- never report success after a partial failure.

Session allowlists are synchronized in memory only:
- native Open and explicit reopen actions register existing project files,
- Save As registers a pending destination before write,
- successful writes promote pending destinations to trusted files,
- trust resets when the process restarts,
- app preferences do not create trust during startup.

App preferences and raw JSON export are outside the project-relative allowlist where appropriate. Preferences are app data, not project-relative assets, and desktop JSON export writes a user-selected raw `Project` JSON file through its own narrow command.

No persistent trusted-path store exists.

---

## Performance instrumentation

Performance instrumentation is centralized in a platform-neutral service:
- it has no React, Zustand, Tauri, filesystem, logging, telemetry, persistence, or UI dependency,
- elapsed timings use a monotonic clock when available, with injectable clocks for deterministic tests,
- all metrics remain in memory,
- each metric category uses bounded FIFO retention of 250 entries,
- `getSnapshot()` returns copies and `clear()` clears all stored metrics.

Current metric coverage:
- project metrics: serialized JSON size, scene count, character count, resource count, variable count, group count, asset count, embedded asset count, and total embedded bytes,
- Save: serialization duration, embedded materialization duration, write duration, and total save duration,
- Save As: serialization duration, local asset copy duration, embedded materialization duration, write duration, and total Save As duration,
- background import and thumbnail generation durations,
- cleanup scan/delete durations, scanned file count, and deleted file count,
- duplicate fingerprint duration, scanned file count, and duplicate group count,
- undo/redo history metrics: snapshot count, undo/redo counts, latest serialized snapshot size, and total retained history size.

Undo/redo history remains snapshot-based with a 50-snapshot limit. Snapshot byte sizes are runtime-only metadata stored alongside the undo and redo stacks, moved with snapshots during undo/redo, and trimmed with the corresponding stack. This avoids repeatedly serializing retained history for metrics and has no `Project` model or `.narrium` format impact.

---

## Non-goals for the current project-file foundation

The current project-file foundation does not implement:
- general asset folder creation beyond desktop background imports, embedded-background materialization, and playable folder export output,
- image file copying beyond desktop background imports, Save As background relocation, embedded-background materialization, and playable folder export background copies,
- local asset path migration beyond current background asset references and desktop Save/Save As embedded-background materialization,
- duplicate consolidation or automatic duplicate cleanup,
- cleanup or duplicate detection for asset categories other than backgrounds,
- performance optimization, telemetry, persisted metrics, or developer metrics UI,
- autosave,
- replacing or overwriting an existing playable export folder,
- ZIP export, custom package format, standalone executable player, or installers,
- remote asset downloading,
- packaging asset categories other than backgrounds,
- standalone single-file local-asset packaging.
