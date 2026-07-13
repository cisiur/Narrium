# Desktop Architecture - Narrium

This document describes the intended desktop-first direction for Narrium after completion of the browser MVP.

The browser MVP remains archived on branch `MVP_web_legacy` as a validated prototype and reference implementation. Active development on `main` should now move toward a desktop-first visual novel editor with native project files, local asset files, and future playable exports.

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
- Rust filesystem commands validate project extensions, local asset relative paths, destinations, and project file size.
- The background asset catalog now stores newly added background sources as embedded Data URL, remote URL, or desktop local project-relative background assets.
- Standalone HTML export has preflight validation for referenced local desktop assets, but it still does not package local asset files.
- JSON export still uses the browser-style Blob download path in desktop builds; desktop-native JSON export Save dialog support is the next implementation task.
- Services can depend on domain code, but domain code must stay independent from stores, services, UI, and Tauri APIs.
- Local desktop background asset storage is implemented; general asset categories beyond backgrounds, embedded-to-local migration, asset cleanup, duplicate detection, autosave, and playable export packaging are still planned future work.

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
- it does not add desktop-specific application behavior,
- it does not introduce filesystem project storage,
- it exposes only narrow local background asset import, display, and Save As relocation APIs,
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
- Future playable desktop export work can build from these boundaries later.
- No new playable export format exists yet.

Platform boundary status:
- `PlatformService` exposes platform identity and the narrow project-file operations required by the current desktop file workflow.
- `BrowserPlatformService` reports the browser runtime.
- `DesktopPlatformService` reports the Tauri desktop runtime.
- `getPlatformService()` owns Tauri runtime detection using injected Tauri globals.
- Future Tauri APIs must be introduced behind `services/platform/`; React components and Zustand stores must not import Tauri directly.
- Current Tauri usage is limited to file open/save dialogs, unsaved-change confirmation, selected project-file reads/writes, and local background asset file import/display/relocation through service boundaries.
- Native close dirty protection uses the same Save / Don't Save / Cancel orchestration as guarded Open/Create flows and prevents duplicate close decisions while a prompt or save is pending.
- Project file reads and writes operate on explicit file paths selected by the user.
- Rust validation currently enforces supported project extensions, local asset traversal protection, destination validation, and a 25 MiB project-read size limit. Session allowlists for dialog-selected paths remain future work.
- No unrestricted filesystem, clipboard, shell, notifications, drag-and-drop, autosave, or playable package APIs are implemented.

Project file status:
- `src/services/project-file/` owns desktop project-file orchestration.
- Desktop projects currently use `.narrium` files.
- `.narrium` files are JSON internally and contain `{ "format": "narrium.project", "formatVersion": 1, "project": { ... } }`.
- Rust project-file reads accept `.narrium` and legacy `.json` files.
- Rust project-file writes accept `.narrium` only.
- Rust rejects project files larger than 25 MiB before reading them into memory; this comfortably exceeds current local-asset desktop projects while preventing arbitrarily large JSON reads.
- Rust local-asset commands reject absolute asset paths, parent-directory traversal, empty paths, and paths that resolve outside the project directory.
- Rust Save As asset copying validates the destination `.narrium` path before creating asset directories.
- Session allowlists for dialog-selected paths are not implemented yet.
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
- The My Projects landing screen no longer renders the single-item `WORKSPACE > My Projects` sidebar.
- The long-term workspace direction remains app preferences and recent projects, not the primary project database.

Near-term desktop work should focus on:
- extending local asset file storage beyond background imports,
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
- also accepts raw legacy Project JSON as an open/import fallback,
- creates `assets/backgrounds/` lazily only when a desktop local background import succeeds.

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
- local asset display is resolved through the platform service and never through raw `file://` URLs,
- deleting a catalog asset clears scene references but does not delete the physical file.

The project JSON should store asset metadata and relative paths. This avoids browser storage limits, reduces JSON bloat, improves portability, and makes projects easier to inspect, back up, and version.

The archived web MVP may still use Data URLs for uploaded images. That behavior is legacy/MVP behavior and should not define long-term desktop storage.

Automatic embedded-to-local migration, standalone local-asset packaging, orphan cleanup, physical deletion, hashing, duplicate detection, and non-background asset categories remain future work.

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

Legacy embedded Data URLs should eventually be extracted into local files where practical:
- decode the Data URL,
- choose a stable filename,
- write the file into the future local asset location,
- replace the embedded Data URL with a relative path,
- keep enough metadata to avoid losing author-facing asset names.

Migration does not need to happen in this documentation task. It is a future implementation area.

---

## Runtime and export direction

The current standalone HTML export belongs to the archived browser MVP. It is useful as a reference and compatibility feature, but it is not the final desktop requirement by itself.

Standalone HTML export does not package desktop local asset files. Before export, Narrium warns when referenced local assets are present because exported backgrounds may be missing, and blocks export when referenced local assets cannot be resolved. Unused local Asset Library entries are ignored by preflight. This preflight only protects the current export path; it does not add local asset packaging.

JSON export still uses the browser-style Blob URL and temporary download-anchor path in both browser and desktop builds. Desktop-native JSON export Save dialog support is the next approved implementation task. Browser JSON export should remain compatible.

Future playable export may be a playable folder or packaged build rather than one standalone HTML file. A folder/package export can include:
- a runtime player,
- a `.narrium` file, JSON payload, or compiled story payload,
- copied asset files,
- save/load support appropriate for the target runtime.

The exact export format should be designed later after the desktop project-file model is stable. Current boundary work only separates reusable runtime helpers and standalone HTML export generation; it does not add a new desktop playable export.

---

## Non-goals for the current project-file foundation

The current project-file foundation does not implement:
- general asset folder creation beyond desktop background imports,
- image file copying beyond desktop background imports,
- local asset path migration beyond current background asset references,
- asset extraction,
- asset cleanup or duplicate detection,
- autosave,
- desktop-native JSON export Save dialogs,
- standalone local-asset packaging,
- a new playable export format.
