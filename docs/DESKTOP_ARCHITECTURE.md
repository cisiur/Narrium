# Desktop Architecture - Narrium

This document describes the intended desktop-first direction for Narrium after completion of the browser MVP.

The browser MVP remains archived on branch `MVP_web_legacy` as a validated prototype and reference implementation. Active development on `main` should now move toward a desktop-first visual novel editor with local project folders, local asset files, and future playable exports.

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

A desktop shell such as Tauri is the likely target because it can wrap the existing web UI while providing local filesystem access. This is a recommended direction, not an implemented decision. Framework choice should remain open until the first desktop shell foundation task confirms project constraints, packaging needs, filesystem APIs, and build workflow.

Near-term desktop work should focus on:
- shelling the existing editor into a desktop app,
- introducing local filesystem project operations,
- replacing long-term localStorage persistence with project-folder persistence,
- keeping the validated domain model recognizable.

---

## Project storage model

Future Narrium desktop projects should be folders:

```text
MyStory/
  project.narrium.json
  assets/
    backgrounds/
    characters/
    audio/
    ui/
```

`project.narrium.json` should store the Narrium `Project` data: scenes, choices, characters, resources, variables, groups, settings, and asset metadata.

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

The exact export format should be designed later after the desktop project folder model is stable.

---

## Non-goals for this documentation task

This documentation update does not implement:
- a desktop shell,
- Tauri or any other desktop framework,
- local filesystem project create/open/save,
- storage refactoring,
- asset extraction,
- migration tooling,
- desktop preview changes,
- a new playable export format.

No application code or dependencies should change as part of this task.
