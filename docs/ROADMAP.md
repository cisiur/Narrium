# Roadmap — Narrium

> **Version:** v11 documentation refresh after Project Variables foundation and Variables Story Logic/runtime integration  
> **Workflow:** active development happens directly on `main`. Do not use a `dev` branch unless the project owner explicitly changes this workflow.

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

Current state:
Narrium has a usable local multi-project workspace, project settings sidebar, project thumbnails, React Flow scene graph editor, Canvas-only keyboard shortcuts, snapshot-based active-project undo/redo MVP, reusable application confirmation dialog, right-side scene editor with Project Validation, shared validation infrastructure, background system, asset library support, SceneNode thumbnails, ordered dialogue pages, character speaker selection, safe character deletion with dialogue speaker cleanup, choice target editing, edge-to-choice navigation, project-level Characters, Character attributes, project-level Resources, project-level Variables, complete Story Logic Conditions including Variables, complete Story Logic Effects including Variables, runtime helper functions for condition/effect execution, a functional in-browser Story Player preview, JSON project export/import, standalone HTML story export with runtime parity, polished standalone HTML playback, and exported standalone player save/load persistence including variable runtime values.

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
- preview can be restarted.

Standalone HTML export is complete for EPIC 8 and updated for Variables:
- exports a single self-contained `.html` file,
- embeds the active full `Project`,
- preserves embedded Data URLs,
- opens directly from disk,
- supports dialogue, choices, conditions, effects, action choices, restart, end state, and supported backgrounds,
- includes polished standalone player layout and responsive behavior,
- supports resource, variable, and character attribute Story Logic,
- supports standalone runtime save/load persistence through localStorage when enabled by project settings,
- save/load snapshots include resources, variables, and character attributes.

Runtime helper tests are present through Vitest.

Detailed documentation for the completed EPIC 9 validation batch lives in `docs/EPIC9_VALIDATION.md`.

Next major roadmap area:
**EPIC 9 — Polish & Production UX**, continuing with targeted authoring and production-readiness improvements.

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
| E2-09 | Scene groups: create named group container on canvas | [BOTH] | ⏳ Pending |
| E2-10 | Group collapse into single tile | [BOTH] | Backlog |

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

Deliverable status:
- Project has complete Characters, Resources, and Variables data needed by Story Logic, Story Player, and standalone export.
- Character attributes are implemented as per-character numeric keyed values.
- Resources are implemented as project-wide numeric keyed values intended for player-facing state.
- Variables are implemented as project-wide numeric keyed values intended for hidden/internal state.
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
2. Prioritize player-facing Resource display, validation extensions, and production-readiness improvements.

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
| E9-21 | Player-facing Resource display in Preview and standalone HTML | [BOTH] | Recommended next |
| E9-22 | Story Logic missing reference validation rules / export preflight | [BOTH] | Good candidate |

Validation batch details:
- See `docs/EPIC9_VALIDATION.md`.

---

## Next Immediate Step

Continue into **EPIC 9 — Polish & Production UX**.

Recommended next task should be selected by the project owner.

Good candidates:
- `E9-21` — Player-facing Resource display in Preview and standalone HTML.
- `E9-22` — Story Logic missing reference validation rules / export preflight.
- `E9-08` — Empty/error states polish.
- `E9-14` — Story Player component-level tests.
- `E9-02` future enhancements — finer-grained undo/redo UX beyond the snapshot-based MVP.
