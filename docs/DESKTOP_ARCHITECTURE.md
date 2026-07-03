# Desktop Architecture - Narrium

This document describes the intended desktop-first direction for Narrium after completion of the browser MVP.

The browser MVP remains archived on branch `MVP_web_legacy` as a validated prototype and reference implementation. Active development on `main` should now move toward a desktop-first visual novel editor with local project folders, local asset files, and future playable exports.

Current implementation status:
- A minimal Tauri v2 desktop shell foundation exists under `src-tauri/`.
- The shell loads the existing Vite/React UI in development and points at the Vite `dist` output for desktop builds.
- Browser development remains available through the existing Vite workflow.
- Workspace/project persistence now goes through a synchronous `ProjectStorage` service boundary.
- The current `BrowserProjectStorage` backend still uses `narrium_workspace` and `narrium_project_{id}` in browser localStorage.
- Project normalization/migration code now lives in `src/domain/project/`.
- Runtime execution helpers and runtime-state initialization now live in `src/domain/runtime/`.
- Standalone HTML export generation now lives in `src/services/export/`.
- Legacy JSON import accepts old `Choice.conditions` and missing `effects`, then normalizes to the current shape.
- Platform identity now goes through `src/services/platform/`.
- A JSON-only local project folder foundation exists for desktop builds: create/open/save/save-as writes `project.narrium.json`.
- Services can depend on domain code, but domain code must stay independent from stores, services, UI, and Tauri APIs.
- Local asset storage, asset migration, recent projects, autosave, and playable export packaging are still planned future work.

---

## Product direction

Narrium becomes a desktop-first visual novel editor.

Authors should be able to create and manage projects as local folders on their machine. Imported images and other media should live as normal files inside the project folder instead of being embedded into browser storage or long JSON payloads.

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
- it does not expose local asset import APIs,
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
- `PlatformService` exposes platform identity and the narrow project-file operations required by the current desktop folder workflow.
- `BrowserPlatformService` reports the browser runtime.
- `DesktopPlatformService` reports the Tauri desktop runtime.
- `getPlatformService()` owns Tauri runtime detection using injected Tauri globals.
- Future Tauri APIs must be introduced behind `services/platform/`; React components and Zustand stores must not import Tauri directly.
- Current Tauri usage is limited to folder selection and reading/writing `project.narrium.json` through service boundaries.
- No asset loading, image copying, clipboard, shell, notifications, drag-and-drop, autosave, recent projects, or playable package APIs are implemented.

Project folder status:
- `src/services/project-folder/` owns desktop project-folder orchestration.
- Desktop projects currently use a folder containing `project.narrium.json`.
- The saved file contains the normalized current `Project` JSON.
- The browser workflow still uses the `ProjectStorage` localStorage backend and legacy keys.
- The workspace store carries transitional current-folder metadata only while a desktop project is open.
- The long-term workspace direction remains app preferences and recent projects, not the primary project database.

Near-term desktop work should focus on:
- adding local asset file storage under project folders,
- replacing remaining long-term localStorage assumptions with project-folder persistence,
- keeping the validated domain model recognizable.

---

## Project storage model

Future Narrium desktop projects should be folders:

```text
MyStory/
  project.narrium.json
```

`project.narrium.json` should store the Narrium `Project` data: scenes, choices, characters, resources, variables, groups, settings, and asset metadata.

Current implementation:
- creates or opens a folder selected by the author,
- reads or writes `project.narrium.json`,
- normalizes opened project JSON,
- does not create an `assets/` folder yet.

Future asset-enabled folders should add:

```text
MyStory/
  project.narrium.json
  assets/
    backgrounds/
    characters/
    audio/
    ui/
```

Asset references in the JSON should use relative paths:

```json
{
  "id": "asset_123",
  "kind": "background",
  "name": "Castle Hall",
  "sourceType": "upload",
  "url": "assets/backgrounds/castle-hall.png",
  "createdAt": "2026-07-02T00:00:00.000Z"
}
```

The exact field name can evolve, but the important rule is that the project file should refer to local files by relative path instead of embedding large image Data URLs.

---

## Asset handling

When an author imports or uploads a file, the desktop editor should copy it into the project folder.

Recommended behavior:
- background images go under `assets/backgrounds/`,
- character art can later go under `assets/characters/`,
- audio can later go under `assets/audio/`,
- future UI/theme assets can later go under `assets/ui/`.

The project JSON should store asset metadata and relative paths. This avoids browser storage limits, reduces JSON bloat, improves portability, and makes project folders easier to inspect, back up, and version.

The archived web MVP may still use Data URLs for uploaded images. That behavior is legacy/MVP behavior and should not define long-term desktop storage.

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
- write the file into the relevant `assets/` folder,
- replace the embedded Data URL with a relative path,
- keep enough metadata to avoid losing author-facing asset names.

Migration does not need to happen in this documentation task. It is a future implementation area.

---

## Runtime and export direction

The current standalone HTML export belongs to the archived browser MVP. It is useful as a reference and compatibility feature, but it is not the final desktop requirement by itself.

Future playable export may be a playable folder or packaged build rather than one standalone HTML file. A folder/package export can include:
- a runtime player,
- `project.narrium.json` or a compiled story payload,
- copied asset files,
- save/load support appropriate for the target runtime.

The exact export format should be designed later after the desktop project folder model is stable. Current boundary work only separates reusable runtime helpers and standalone HTML export generation; it does not add a new desktop playable export.

---

## Non-goals for the current project-folder foundation

The current project-folder foundation does not implement:
- asset folder creation,
- image file copying,
- local asset path migration,
- asset extraction,
- recent projects,
- autosave,
- a new playable export format.
