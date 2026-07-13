# Roadmap — Narrium

> **Version:** v14 desktop architecture preparation  
> **Workflow:** active development happens directly on `main`. Do not use a `dev` branch unless the project owner explicitly changes this workflow.

> **Strategic pivot:** the completed browser MVP is archived on branch `MVP_web_legacy`. Active development on `main` now targets a desktop-first Narrium editor with local project folders, local asset files, and future playable exports.

---

## Role Legend

| Symbol | Who | When |
|---|---|---|
| [PM] | Product / architecture planning | Roadmap, specs, acceptance criteria, UX review, implementation review |
| [AI] | Codex / Claude Code | TypeScript/React implementation, repo edits, build fixes |
| [BOTH] | PM spec → AI implementation | Larger mechanics requiring spec-first work |
| [MANUAL] | Project owner | Product decisions, manual testing, UX acceptance, priorities |

---

## Current MVP Status

Status note:
- The browser-based MVP is validated and archived on `MVP_web_legacy`.
- Completed MVP epics remain the product foundation and reference implementation.
- A minimal Tauri v2 desktop shell foundation exists on `main`.
- A native `.narrium` desktop project file workflow exists on `main`; files are JSON internally and wrap the current `Project`.
- The background asset library is now the canonical catalog for newly added backgrounds; sources may be embedded Data URLs, remote URLs, or desktop local project-relative background files.
- Desktop file-backed background uploads are copied into `assets/backgrounds/` beside the `.narrium` file.
- General local asset storage beyond backgrounds, embedded-to-local migration, asset cleanup, duplicate detection, autosave, and playable export packaging remain future work.

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
Desktop Shell Foundation   ████░░░░░░  40%
```

Validated web MVP state:
Narrium has a usable local multi-project workspace, project settings sidebar, project thumbnails, React Flow scene graph editor with editor-only Canvas Scene Groups, Canvas-only keyboard shortcuts, Choice copy/paste, snapshot-based active-project undo/redo MVP, reusable application confirmation dialog, right-side scene editor with Project Validation, shared validation infrastructure including Story Logic reference validation, background system, asset library support, SceneNode thumbnails, ordered dialogue pages, character speaker selection, safe character deletion with dialogue speaker cleanup, choice target editing, edge-to-choice navigation, project-level Characters, Character attributes, project-level Resources with player-facing presentation metadata, project-level Variables, complete Story Logic Conditions including Variables, complete Story Logic Effects including Variables, runtime helper functions for condition/effect execution, a functional in-browser Story Player preview with Resource HUD, JSON project export/import, standalone HTML story export with runtime parity and Resource HUD, polished standalone HTML playback, and exported standalone player save/load persistence including variable runtime values.

Story Player Preview is complete:
- preview mode can be entered from the canvas toolbar,
- runtime state initializes from the active Project,
- current scene backgrounds render,
- dialogue pages render in order,
- speaker names resolve,
- choices render after the final dialogue page,
- choices navigate to target scenes,
- targetless action choices execute effects without navigation,
- effects apply on selection,
- resource, variable, and character attribute effects are supported,
- resource, variable, and character attribute conditions are supported,
- conditions disable unavailable choices,
- unavailable-choice hints display,
- scenes with no choices can end the story,
- preview can be restarted,
- visible resources render in the Preview Resource HUD.

Standalone HTML export is complete for EPIC 8 and updated for Variables:
- exports a single self-contained `.html` file,
- embeds the active full `Project`,
- preserves embedded Data URLs,
- opens directly from disk,
- supports dialogue, choices, conditions, effects, action choices, restart, end state, and supported backgrounds,
- includes polished standalone player layout and responsive behavior,
- supports resource, variable, and character attribute Story Logic,
- supports visible Resource HUD display,
- supports standalone runtime save/load persistence through localStorage when enabled by project settings,
- save/load snapshots include resources, variables, and character attributes.

Runtime helper tests are present through Vitest.

Detailed documentation for the completed EPIC 9 validation batch lives in `docs/EPIC9_VALIDATION.md`.

Next major roadmap area:
**EPIC 11A - Architecture Cleanup & Service Boundaries**, preparing the validated MVP codebase for durable desktop project storage.

---

## EPIC 0 — Documentation & Foundation

| ID | Task | Who | Status |
|---|---|---|---|
| E0-01 | Create GitHub repo, README.md | [MANUAL] | ✅ Done |
| E0-02 | ROADMAP.md, CONTEXT.md | [PM] | ✅ Done |
| E0-03 | Data model specification (`docs/DATA_MODEL.md`) | [PM] | ✅ Done |
| E0-04 | Editor screens description (`docs/SCREENS.md`) | [PM] | ✅ Done |
| E0-05 | Vite + React + TypeScript project scaffold | [AI] | ✅ Done |
| E0-06 | Tailwind CSS setup + base tokens | [AI] | ✅ Done |
| E0-07 | Zustand store skeleton: `useWorkspaceStore`, `useCanvasStore` | [AI] | ✅ Done |
| E0-08 | TypeScript types: canonical interfaces in `src/types/index.ts` | [AI] | ✅ Done |

---

## EPIC 1 — Workspace & Project Management

| ID | Task | Who | Status |
|---|---|---|---|
| E1-01 | My Projects screen: project cards grid | [AI] | ✅ Done |
| E1-02 | Create new project | [AI] | ✅ Done |
| E1-03 | Open existing project from My Projects | [AI] | ✅ Done |
| E1-04 | Workspace persistence: `narrium_workspace` + `narrium_project_{id}` in localStorage | [AI] | ✅ Done |
| E1-05 | Return from canvas to My Projects without deleting project | [AI] | ✅ Done |
| E1-06 | Rename project | [AI] | ✅ Done |
| E1-07 | Show active project name in canvas header | [AI] | ✅ Done |
| E1-08 | Delete project from My Projects / Project Settings | [AI] | ✅ Done |
| E1-09 | Duplicate project | [AI] | ⏳ Pending |
| E1-10 | Project thumbnail preview in My Projects | [BOTH] | ✅ Done |
| E1-11 | Project Settings right sidebar | [BOTH] | ✅ Done |

Deliverable status:
- Project management is complete for MVP.
- Project thumbnails are stored in `Project.thumbnail` and mirrored in `WorkspaceProjectMeta.thumbnailDataUrl`.
- Duplicate project remains backlog.

---

## EPIC 2 — Canvas Graph Editor

| ID | Task | Who | Status |
|---|---|---|---|
| E2-01 | React Flow canvas: Background, Controls, MiniMap, empty state overlay | [AI] | ✅ Done |
| E2-02 | SceneNode component: name, page count, choice count, selected highlight | [AI] | ✅ Done |
| E2-03 | Add scene from toolbar | [AI] | ✅ Done |
| E2-04 | Persist canvas layout: node drag updates `scene.position` | [AI] | ✅ Done |
| E2-05 | Drag edge creates a new Choice | [AI] | ✅ Done |
| E2-06 | Edge handles moved to left/right for left-to-right story flow | [AI] | ✅ Done |
| E2-07 | Delete edge clears corresponding `choice.targetSceneId` | [AI] | ✅ Done |
| E2-08 | Click edge → open corresponding Choice in Scene Editor | [AI] | ✅ Done |
| E2-09 | Scene groups: create named group container on canvas | [BOTH] | Done via EPIC 10 |
| E2-10 | Group collapse into single tile | [BOTH] | Done via EPIC 10 |

Architecture note:
- React Flow edges are not domain objects.
- Edges are projections of `Choice.targetSceneId`.
- `Choice` is the single source of truth for connections.

---

## EPIC 3 — Scene Editor Panel

| ID | Task | Who | Status |
|---|---|---|---|
| E3-01 | Right sidebar panel: opens on scene select, closes on deselect, slide-in transition | [AI] | ✅ Done |
| E3-02 | Scene name: inline editable | [AI] | ✅ Done |
| E3-03 | Dialogue pages: add, edit, delete; delete disabled on last page | [AI] | ✅ Done |
| E3-04 | Choices: add, edit text, delete; shows target scene name | [AI] | ✅ Done |
| E3-05 | Choice Target dropdown: None + all other scenes | [AI] | ✅ Done |
| E3-06 | Selected Choice highlight and scroll after edge click | [AI] | ✅ Done |
| E3-07 | Dialogue page speaker selector | [AI] | ✅ Done |
| E3-08 | Inline validation: warn on unconnected choice | [AI] | ✅ Done via E9-15/E9-16 |
| E3-09 | Dialogue page reorder buttons | [AI] | ✅ Done |
| E3-10 | Collapsible sections default closed | [AI] | ✅ Done |

Deliverable status:
- Scene Editor is ready for Story Player and export work.
- Dialogue pages are ordered and playable sequentially.
- Choices contain target scene, conditions, and effects.
- Targetless choices can be valid action choices when used to apply effects without navigation.

---

## EPIC 4 — Background System

| ID | Task | Who | Status |
|---|---|---|---|
| E4-01 | Background Picker Core: None / URL / Upload / Scene Reference | [BOTH] | ✅ Done |
| E4-02 | Asset Library: add background asset by URL or upload | [BOTH] | ✅ Done |
| E4-03 | Assign asset as scene background | [BOTH] | ✅ Done |
| E4-04 | Delete asset and reset scenes using that asset | [AI] | ✅ Done |
| E4-05 | SceneNode background thumbnail preview | [AI] | ✅ Done |
| E4-06 | One-level Scene Reference thumbnail resolution | [AI] | ✅ Done |
| E4-07 | Asset search/filtering for large libraries | [AI] | Backlog |
| E4-08 | Image compression / resizing before localStorage save | [BOTH] | Backlog |

Deliverable status:
- Background system is ready for Story Player and standalone HTML background rendering.
- Story Player and standalone HTML can render URL, upload, asset, and one-level scene-reference backgrounds.
- Deleting a scene resets other scenes whose `scene_reference` background pointed to the deleted scene.

---

## EPIC 5 — Characters, Resources & Variables

| ID | Task | Who | Status |
|---|---|---|---|
| E5-01 | Characters tab/screen foundation | [AI] | ✅ Done |
| E5-02 | Character list | [AI] | ✅ Done |
| E5-03 | Add / edit / delete character | [BOTH] | ✅ Done |
| E5-04 | Character attributes: add/edit/delete key + default value | [BOTH] | ✅ Done |
| E5-05 | Resources tab/screen foundation | [AI] | ✅ Done |
| E5-06 | Resource list | [AI] | ✅ Done |
| E5-07 | Add / edit / delete resource: key + default value | [AI] | ✅ Done |
| E5-08 | Validation for duplicate character attribute/resource keys | [AI] | ✅ Done |
| E5-09 | Warn before deleting referenced Resource / Character / Character Attribute | [AI] | ✅ Done |
| E5-10 | Cascade Story Logic references on Character Attribute key rename | [AI] | ✅ Done |
| E5-11 | Variables tab/screen foundation | [BOTH] | ✅ Done via E9-19 |
| E5-12 | Variable list and numeric default editing | [AI] | ✅ Done via E9-19 |
| E5-13 | Duplicate variable key handling | [AI] | ✅ Done via E9-19 |
| E5-14 | Resource presentation metadata: display name, icon, visibility | [AI] | ✅ Done via E9-21 |

Deliverable status:
- Project has complete Characters, Resources, and Variables data needed by Story Logic, Story Player, and standalone export.
- Character attributes are implemented as per-character numeric keyed values.
- Resources are implemented as project-wide numeric values intended for player-facing state, with presentation metadata for display name, icon, and HUD visibility.
- Variables are implemented as project-wide numeric values intended for hidden/internal state.
- Deletion warnings protect existing Story Logic references where implemented.

---

## EPIC 6 — Story Logic

EPIC 6 is complete for MVP, with later Variables support added after EPIC 9 Variables foundation.

### EPIC 6A — Conditions

| ID | Task | Who | Status |
|---|---|---|---|
| E6-01 | Condition data model review and final acceptance | [PM] | ✅ Done |
| E6-02 | Introduce `ConditionGroup` data model and legacy `conditions` migration | [AI] | ✅ Done |
| E6-03 | Choice condition groups UI foundation | [AI] | ✅ Done |
| E6-04 | Condition row editor foundation | [AI] | ✅ Done |
| E6-05 | Resource condition selector | [AI] | ✅ Done |
| E6-06 | Resource condition validation warnings | [AI] | ✅ Done |
| E6-07 | Character Attribute condition selector | [AI] | ✅ Done |
| E6-08 | Character Attribute condition validation warnings | [AI] | ✅ Done |
| E6-09 | Refactor condition editor components into `src/features/story-logic/` | [AI] | ✅ Done |
| E6-09B | Empty condition group authoring UX safety | [AI] | ✅ Done |
| E6-09C | Variable condition selector and warnings | [AI] | ✅ Done via E9-20 |

### EPIC 6B — Effects

| ID | Task | Who | Status |
|---|---|---|---|
| E6-10 | Effect data model review and final acceptance | [PM] | ✅ Done |
| E6-11 | Choice effects UI foundation | [BOTH] | ✅ Done |
| E6-12 | Add/edit/delete resource effects | [BOTH] | ✅ Done |
| E6-13 | Add/edit/delete character attribute effects | [BOTH] | ✅ Done |
| E6-14 | Effects validation for deleted/missing references | [AI] | ✅ Done |
| E6-14B | Add/edit/delete variable effects | [AI] | ✅ Done via E9-20 |

### EPIC 6C — Logic Runtime Helpers

| ID | Task | Who | Status |
|---|---|---|---|
| E6-15 | Runtime condition evaluation helper: `isChoiceAvailable` | [BOTH] | ✅ Done |
| E6-16 | Unavailable choice hint resolution helper | [BOTH] | ✅ Done |
| E6-17 | Runtime effect application helper: `applyEffects` | [BOTH] | ✅ Done |
| E6-18 | Shared choice advancement helper: `advanceRuntimeForChoice` | [AI] | ✅ Done |
| E6-19 | Action choices: effects without navigation | [BOTH] | ✅ Done |
| E6-20 | Variable runtime condition/effect support | [AI] | ✅ Done via E9-20 |

---

## EPIC 7 — Story Player MVP

Status: **complete for MVP**.

Completed features:
- Preview mode from canvas toolbar.
- Runtime state initialization from Project.
- Current scene rendering.
- Multi-page dialogue.
- Choice rendering.
- Choice navigation.
- Resource, Variable, and Character Attribute conditions.
- Resource, Variable, and Character Attribute effects.
- Unavailable choice hints.
- Action choices.
- End-of-story state.
- Preview restart.
- Resource HUD for visible resources.

---

## EPIC 8 — Save, Load, Export

Status: **complete for MVP**.

| ID | Task | Who | Status |
|---|---|---|---|
| E8-01 | Auto-save active project to `narrium_project_{id}` | [AI] | ✅ Done |
| E8-02 | Export project as JSON | [BOTH] | ✅ Done |
| E8-03 | Import project from JSON | [AI] | ✅ Done |
| E8-04A | Export story as standalone HTML player — foundation | [BOTH] | ✅ Done |
| E8-04B | Standalone HTML player runtime parity | [BOTH] | ✅ Done |
| E8-04C | Standalone HTML player polish | [BOTH] | ✅ Done |
| E8-04D | Action choices: effects without navigation | [BOTH] | ✅ Done |
| E8-04E | Standalone HTML UX fix: hide Next during choices | [AI] | ✅ Done |
| E8-05 | Exported player save/load slots | [BOTH] | ✅ Done |
| E8-06 | Standalone HTML runtime parity for Variables | [AI] | ✅ Done via E9-20 |
| E8-07 | Standalone HTML Resource HUD parity | [AI] | ✅ Done via E9-21 |

Deliverable status:
- Active project can be exported as formatted JSON.
- Imported JSON creates a new local project and preserves story content.
- Standalone HTML export creates one self-contained `.html` file.
- Exported HTML embeds the full Project and preserves Data URLs.
- Exported HTML opens directly from disk without Narrium, npm, Vite, or a dev server.
- Exported HTML supports:
  - start scene
  - dialogue pages
  - Next button only when another dialogue page exists
  - speaker names
  - choices
  - resource, variable, and character attribute conditions
  - unavailable hints
  - resource, variable, and character attribute effects
  - visible Resource HUD display
  - targetless action choices
  - valid target navigation
  - invalid target disabled behavior
  - restart
  - end state
  - URL/upload/asset/one-level scene-reference backgrounds
- Exported HTML includes polished standalone player UI and responsive behavior.
- Exported HTML supports manual Save, Load, and Clear Save controls when `project.settings.allowSessionSaveLoad !== false`.
- Exported player save/load persists runtime snapshots to localStorage using `narrium_player_save_{projectId}`.
- Save/load snapshots include runtime state only, not the embedded Project.
- Save/load snapshots include resources, variables, and character attributes.

Recommended implementation order from here:
1. Continue into EPIC 9 — Polish & Production UX.
2. Prioritize authoring polish, Story Player component-level tests, export preflight, and production-readiness improvements.

---

## EPIC 9 — Polish & Production UX

| ID | Task | Who | Status |
|---|---|---|---|
| E9-01 | Keyboard shortcuts: Delete selected node/choice, Esc close/cancel | [AI] | ✅ Done |
| E9-02 | Undo/redo for scene and project edits | [BOTH] | Partially Complete — snapshot-based MVP (`E9-02A`) is done; future refinements remain possible |
| E9-03 | Better custom confirmation dialogs instead of `window.confirm` | [BOTH] | ✅ Done |
| E9-04 | Drag-and-drop Dialogue Page reorder | [AI] | Backlog |
| E9-05 | Thumbnail image resizing/compression before localStorage save | [BOTH] | Backlog |
| E9-06 | Full project validation panel | [BOTH] | ✅ Done via E9-16/E9-17/E9-18 |
| E9-07 | Asset library extraction and filtering | [AI] | Backlog |
| E9-08 | Empty/error states polish | [AI] | Backlog |
| E9-09 | Accessibility review | [BOTH] | Backlog |
| E9-10 | Warn on character deletion when used as dialogue speaker | [AI] | ✅ Done |
| E9-11 | Synchronize workspace metadata from normalized project data on load | [AI] | Backlog |
| E9-12 | Clear missing/corrupt active workspace project id on load | [AI] | Backlog |
| E9-13 | Runtime helper unit tests | [BOTH] | ✅ Done |
| E9-14 | Story Player component-level tests | [BOTH] | Backlog |
| E9-15 | Warn on targetless choices with no effects | [BOTH] | ✅ Done |
| E9-16 | Validation infrastructure | [AI] | ✅ Done |
| E9-17 | Validation rules batch | [AI] | ✅ Done |
| E9-18 | Project Validation Panel MVP | [AI] | ✅ Done |
| E9-18B | Validation Panel Layout Polish | [AI] | ✅ Done |
| E9-19 | Project Variables tab foundation | [BOTH] | ✅ Done |
| E9-20 | Variables in Story Logic and runtime | [BOTH] | ✅ Done |
| E9-21 | Player-facing Resource display in Preview and standalone HTML | [BOTH] | ✅ Done |
| E9-22 | Story Logic missing reference validation rules | [BOTH] | ✅ Done |
| E9-23 | Choice Copy / Paste | [AI] | ✅ Done |
| E9-24 | Export preflight using validation results | [BOTH] | Backlog |

Validation batch details:
- See `docs/EPIC9_VALIDATION.md`.

---

## EPIC 10 - Canvas Scene Groups

Status: **completed**.

Completed tasks:
- SG-01 - Scene Group architecture helpers
- SG-02 - Multi-selection and group creation workflow
- SG-03 - Expanded group rendering and rename
- SG-04 - Collapsed Scene Group nodes
- SG-05 - Collapsed group edge projection
- SG-06 - Scene Group UX polish
- SG-07 - Documentation update

Deliverable status:
- Authors can select multiple scenes and group them on the canvas.
- Groups can be renamed, collapsed, expanded, and ungrouped.
- Expanded groups render as visual frames behind member scenes.
- Collapsed groups render as one group node while member scene nodes are hidden.
- Canvas edges project visually to collapsed group nodes without modifying `Choice.targetSceneId`.
- Scene Groups are editor-only and do not affect Story Logic, Preview, runtime, or standalone HTML export behavior.

---

## EPIC 11A - Architecture Cleanup & Service Boundaries

Status: **complete**.

Purpose:
- Prepare the validated MVP codebase for durable desktop development before adding filesystem-heavy features.
- Introduce service boundaries so UI, Zustand stores, story runtime, and export code do not directly depend on Tauri APIs.
- Make storage and platform behavior replaceable while preserving the current browser workflow.
- Avoid a large rewrite by extracting seams around existing behavior first, then implementing desktop-specific behavior behind those seams.

Architecture rule:
- React components must not import Tauri APIs directly.
- Zustand stores must not import Tauri APIs directly.
- Story runtime and validation code must stay platform-agnostic.
- Desktop APIs should be isolated behind a thin `services/platform` or equivalent platform layer.

| ID | Task | Who | Status |
|---|---|---|---|
| E11A-01 | Storage abstraction foundation: introduce a ProjectStorage interface and browser/localStorage implementation without changing behavior | [BOTH] | Done |
| E11A-02 | Services layer structure: organize storage, platform, assets, export, and runtime service boundaries | [BOTH] | Done |
| E11A-03 | Runtime/export separation: make editor preview, future desktop runtime, and exported runtime boundaries explicit | [BOTH] | Done |
| E11A-04 | Platform service boundary: isolate Tauri-specific calls behind a desktop platform adapter | [BOTH] | Done |
| E11A-05 | Architecture documentation update after service boundaries are in place | [PM] | Done via E11A documentation updates |

Deliverable intent:
- The current app still behaves like the validated MVP.
- Browser `npm run dev`, tests, and web build remain supported.
- Existing localStorage persistence remains functional through a browser storage adapter.
- Future desktop filesystem features can be added without importing Tauri directly into UI, stores, story runtime, validation, or export code.

Current E11A-01 deliverable:
- Added `ProjectStorage` as a synchronous persistence interface.
- Added `BrowserProjectStorage` as the current localStorage-backed implementation.
- Added `getProjectStorage()` as the default resolver.
- Refactored `useWorkspaceStore` to call the storage service instead of `window.localStorage` directly.
- Preserved `narrium_workspace` and `narrium_project_{id}` keys and the current saved data format.
- Desktop filesystem storage remains future work.

Current E11A-02 deliverable:
- Added an initial `src/domain/project/` area for project normalization and domain defaults.
- Moved `normalizeProject()` out of `src/store/` so services no longer depend on stores.
- Kept `src/services/project-storage/` as the only concrete service subarea needed today.
- Established the current dependency direction: UI/features -> stores -> services -> domain -> types.
- Kept Tauri filesystem APIs, dialogs, project folders, export changes, asset storage changes, and Project model changes out of scope.

Current E11A-03 deliverable:
- Moved reusable runtime execution helpers and runtime-state initialization into `src/domain/runtime/`.
- Moved standalone HTML export generation into `src/services/export/`.
- Left compatibility wrappers for existing runtime/export import paths to avoid broad churn.
- Updated JSON import validation so legacy choices with `conditions` and missing `effects` can be normalized instead of rejected.
- Kept standalone HTML output behavior, Preview behavior, save/load behavior, export format, Project model, and Tauri APIs unchanged.

Current E11A-04 deliverable:
- Added `PlatformService` as a narrow platform identity interface.
- Added `BrowserPlatformService` and `DesktopPlatformService`.
- Added `getPlatformService()` as the only place that detects Tauri runtime identity.
- Kept filesystem, dialogs, clipboard, shell, notifications, drag-and-drop, asset loading, storage, and project folders out of scope.
- Future desktop APIs must be introduced behind `src/services/platform/`, not directly in React components or Zustand stores.

E11A completion note:
- E11A is complete.
- E11A-05 was satisfied through architecture documentation updates made across E11A-01 through E11A-04.
- Future desktop implementation work should continue in EPIC 11.

---

## EPIC 11 - Desktop Pivot & Local Project System

Status: **in progress**.

Purpose:
- Pivot `main` from browser-only MVP continuation to the future desktop-first Narrium editor.
- Preserve the validated React/TypeScript UI and `Project` domain model where practical.
- Replace long-term browser/localStorage assumptions with local project folders and local asset files.
- Prepare for future playable exports without treating standalone HTML export as the final requirement.

| ID | Task | Who | Status |
|---|---|---|---|
| E11-01 | Documentation and architecture pivot | [PM] | Done |
| E11-02 | Desktop shell foundation using Tauri v2 around the existing Vite/React UI | [BOTH] | Done |
| E11-03A | Local project folder foundation: create/open/save/save-as `project.narrium.json` only | [BOTH] | Done |
| E11-03B | Local project workflow hardening: recent projects, unsaved state, project-folder UX refinements | [BOTH] | Done |
| E11-03C | Native Narrium project file workflow using `.narrium` files | [BOTH] | Done |
| E11-03D | My Projects file-backed card UX cleanup | [BOTH] | Done |
| E11-04 | `project.narrium.json` storage format using the validated `Project` domain model | [BOTH] | Done for JSON-only project folders |
| E11-05A | Background asset catalog foundation using embedded/remote sources | [BOTH] | Done |
| E11-05A.1 | Desktop storage stabilization: stop mirroring file-backed projects into localStorage | [BOTH] | Done |
| E11-05B | Local background asset files under project `assets/backgrounds/` folders | [BOTH] | Done |
| E11-05B.2 | Synchronize project name with Save As `.narrium` filename | [BOTH] | Done |
| E11-05B.3 | Safe native-close dirty protection | [BOTH] | Done |
| E11-06 | Relative asset paths in project JSON | [BOTH] | Planned |
| E11-07 | Migration/import from legacy web MVP JSON | [BOTH] | Planned |
| E11-08 | Extract legacy embedded Data URLs into local asset files during migration where practical | [BOTH] | Planned |
| E11-09 | Desktop preview parity with validated web MVP preview behavior | [BOTH] | Planned |
| E11-10 | Playable export foundation for folder/package-based exports | [BOTH] | Planned |

Current E11-02 deliverable:
- Tauri v2 shell scaffold exists under `src-tauri/`.
- Desktop scripts exist for dev/build entry points.
- The desktop shell loads the existing Vite/React UI.
- Browser development, test, and web build scripts remain unchanged.
- Workspace/project persistence now goes through a `ProjectStorage` service boundary.
- The browser storage implementation still uses the legacy web MVP localStorage keys and data format.

Current E11-03A deliverable:
- Desktop builds can create a selected project folder and write `project.narrium.json`.
- Desktop builds can open a selected project folder containing `project.narrium.json`.
- Desktop builds can save the active project back to its known folder.
- Desktop builds can Save As to another selected folder.
- `project.narrium.json` contains normalized current `Project` JSON.
- Browser/Vite project creation, localStorage loading, JSON import/export, standalone HTML export, preview, story logic, and undo/redo remain supported.
- No asset folder creation, image copying, local asset paths, autosave, cloud sync, Git integration, or playable package export exists yet.

Current E11-03B deliverable:
- Project file reads and writes now delegate path joining to the platform/Rust layer.
- Desktop projects track dirty state after edits and return clean after successful Save or Save As.
- Desktop Open/Create flows prompt before discarding dirty changes.
- Native window close dirty protection uses the same Save / Don't Save / Cancel decision as guarded Open/Create flows.
- Desktop app preferences now keep up to 10 recent projects and the last opened project.
- The My Projects screen offers to reopen the last project instead of reopening it automatically.
- The project header shows the current project path and a `*` dirty indicator.
- Save is disabled until the active desktop project has a known path; Save As remains available.
- Browser/Vite workflow remains compatible.
- General asset folders beyond backgrounds, embedded-to-local migration, asset cleanup, duplicate detection, autosave, Git integration, cloud sync, and playable export changes remain planned future work.

Current E11-03C deliverable:
- Desktop Open Project File uses a native file picker for `.narrium` files and legacy `.json` files.
- Save As targets a `.narrium` file path instead of asking for a folder.
- `.narrium` files are JSON internally and use `{ "format": "narrium.project", "formatVersion": 1, "project": { ... } }`.
- Raw legacy Project JSON remains openable as a compatibility fallback.
- Old `project.narrium.json` files are legacy/transitional and are no longer the default save target.
- LocalStorage My Projects remain transitional drafts until Save As creates a `.narrium` file.
- Recent projects now store file paths, not folder paths.
- No asset folders, image copying, local asset path migration, playable export changes, autosave, or Project model redesign were added.

Current E11-03D deliverable:
- My Projects cards open an associated `.narrium` file directly when recent-project metadata contains a matching project id.
- Older recent metadata can associate by unique project name only; duplicate names do not auto-open a file to avoid the wrong match.
- Cards without a file association remain localStorage drafts.
- File-backed cards show a `.narrium file` label and file path; draft cards show `Local draft`.
- The old single-item `WORKSPACE > My Projects` landing sidebar was removed.
- Native window close no longer bypasses dirty-state protection.
- Local asset storage, autosave, playable export changes, and Project model redesign remain out of scope.

Current E11-05A deliverable:
- `AssetLibraryItem` now uses `storageType: 'embedded' | 'remote'` and `source`.
- New uploaded backgrounds create embedded Data URL assets.
- New URL backgrounds create remote URL assets.
- New scene background assignments use `mode: 'asset'` and `assetId` without duplicating source URLs in scenes.
- Legacy direct scene backgrounds and legacy `sourceType`/`url` asset entries normalize into the canonical catalog.
- Duplicate legacy sources reuse one migrated asset, and migration is idempotent.
- Background rendering uses a platform-neutral asset display resolver.
- Deleting a referenced background asset clears affected scene backgrounds.
- No local asset files, `assets/` directory, filesystem copying, Blob URLs, autosave, or playable export changes were added.

Current E11-05A.1 deliverable:
- Desktop file-backed `.narrium` projects no longer write full Project JSON into BrowserProjectStorage/localStorage after open, edit, Save, or Save As.
- File-backed desktop projects keep the active Project in memory and persist it only through explicit `.narrium` Save or Save As.
- Workspace metadata, recent-project metadata, file associations, and thumbnails remain stored separately.
- Browser projects and local desktop drafts still use BrowserProjectStorage for full Project JSON.
- Save As removes any stale local draft payload for the saved project id.
- Draft storage quota failures surface a clear error instead of silently failing.
- Future local asset file work remains focused on migration, packaging, cleanup, and non-background asset categories.

Current E11-05B deliverable:
- Desktop file-backed projects import uploaded background images into `assets/backgrounds/` beside the `.narrium` file.
- `AssetLibraryItem.storageType` supports `local`, and local asset `source` values are project-relative paths with forward slashes.
- Desktop drafts must be saved as `.narrium` before importing local assets.
- Browser uploads remain embedded Data URL assets.
- Remote URL assets remain remote catalog entries and are not downloaded.
- Asset Library is the only UI entry point for URL/upload backgrounds; direct scene URL/upload modes remain legacy-compatible but hidden.
- Save As copies referenced local background files to the new project directory before writing the relocated `.narrium`.
- Deleting a catalog asset clears scene references but does not delete physical files.
- Standalone local-asset packaging remains future work.

Current E11-05B.2 deliverable:
- Successful Save As updates `Project.name` to the selected `.narrium` filename without its extension.
- The renamed project is written to the destination `.narrium`, reflected immediately in active state, workspace metadata, and recent-project metadata.
- Normal Save preserves the current in-app project name.
- Canceled or failed Save As attempts leave the active project name and file path unchanged.

Current E11-05B.3 deliverable:
- Native desktop close protects dirty projects with the same Save / Don't Save / Cancel decision as guarded Open Project File and Create Project.
- Clean projects close without prompting.
- File-backed projects use normal Save before closing.
- Drafts without a known `.narrium` path use Save As before closing.
- Save As cancellation, save failure, and Cancel keep the app open and preserve dirty state.
- Repeated native close events while a close decision is pending do not create duplicate prompts or duplicate saves.
- Programmatic close after Save or Don't Save is allowed through without re-entering the dirty guard.

Full EPIC 11 deliverable intent:
- A desktop app can create drafts, open `.narrium` files, save known project files, and preview Narrium projects.
- Imported assets are copied into the project folder instead of being stored as large Data URLs in the long-term project file.
- Legacy web MVP JSON remains importable as a migration path.
- Future playable export work can build on the same project folder and relative asset path model.

---

## Next Immediate Step

Continue EPIC 11 desktop project system work after the native `.narrium` project-file workflow.

Current approved task:
- E11-05B.3 - Safe native-close dirty protection.

Later candidates:
- E11-07/E11-08 - Legacy web MVP JSON migration and Data URL extraction.
