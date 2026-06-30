# Roadmap — Narrium

> **Version:** v7 documentation refresh after EPIC 7 Story Player MVP + player stabilization  
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
Story Logic — Conditions   ██████████ 100%
Story Logic — Effects      ██████████ 100%
Story Logic — Runtime      ██████████ 100%
Post-Audit Stabilization   ██████████ 100%
Story Player               ██████████ 100%
Save / Export              █░░░░░░░░░  15%
Polish & Production UX     ████░░░░░░  40%
```

Current state:
Narrium has a usable local multi-project workspace, project settings sidebar, project thumbnails, React Flow scene graph editor, right-side scene editor, background system, asset library support, SceneNode thumbnails, ordered dialogue pages, character speaker selection, choice target editing, edge-to-choice navigation, project-level Characters, Character attributes, project-level Resources, complete Story Logic Conditions, complete Story Logic Effects, runtime helper functions for condition/effect execution, and a functional in-browser Story Player preview.

Story Player MVP is complete:
- preview mode can be entered from the canvas toolbar,
- runtime state initializes from the active Project,
- current scene backgrounds render,
- dialogue pages render in order,
- speaker names resolve,
- choices render after the final dialogue page,
- choices navigate to target scenes,
- effects apply on selection,
- conditions disable unavailable choices,
- unavailable-choice hints display,
- scenes with no choices can end the story,
- preview can be restarted.

Runtime helper tests are now present through Vitest.

Next major roadmap area:
**EPIC 8 — Save, Load, Export**.

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
- Scene deletion preserves graph integrity by repairing `Project.startSceneId`, clearing incoming choice targets, and resetting dangling scene-reference backgrounds.

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
| E3-08 | Inline validation: warn on unconnected choice | [AI] | ⏳ Pending |
| E3-09 | Dialogue page reorder buttons | [AI] | ✅ Done |
| E3-10 | Collapsible sections default closed | [AI] | ✅ Done |

Deliverable status:
- Scene Editor is ready for Story Player MVP.
- Dialogue pages are ordered and playable sequentially.
- Choices contain target scene, conditions, and effects.

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
- Background system is ready for Story Player background rendering.
- Story Player can render URL, upload, asset, and one-level scene-reference backgrounds.
- Deleting a scene resets other scenes whose `scene_reference` background pointed to the deleted scene.

---

## EPIC 5 — Characters & Resources

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

Deliverable status:
- Project has complete Characters and Resources data needed by Story Logic and Story Player.
- Character attributes are implemented as per-character numeric keyed values.
- Resources are implemented as project-wide numeric keyed values.
- Duplicate character attribute keys are resolved per character.
- Duplicate resource keys are resolved project-wide.
- Negative and decimal numeric defaults are supported.
- Deletion warnings protect Story Logic references.
- Character Attribute key renames preserve matching condition/effect references for the same character.

---

## EPIC 6 — Story Logic

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

Deliverable status:
- Condition groups implement OR between groups and AND inside a group.
- `Choice.conditionGroups` is canonical.
- Legacy `Choice.conditions` is migrated on project load for localStorage compatibility.
- Resource conditions can select Project Resources by `Resource.id` while displaying `Resource.key`.
- Character Attribute conditions can select Character by `Character.id` and attribute by `CharacterAttribute.key`.
- Operators supported: `>=`, `<=`, `==`, `>`, `<`, `!=`.
- Numeric condition values support integers, decimals, and negative numbers.
- Hint text is editable per condition.
- Inline visual warnings exist for missing/deleted resource, character, and attribute references.
- Validation is visual only.
- `+ Add OR Group` creates a group with one default condition.
- Empty condition groups remain legal but display an informational always-pass warning.

### EPIC 6B — Effects

| ID | Task | Who | Status |
|---|---|---|---|
| E6-10 | Effect data model review and final acceptance | [PM] | ✅ Done |
| E6-11 | Choice effects UI foundation | [BOTH] | ✅ Done |
| E6-12 | Add/edit/delete resource effects | [BOTH] | ✅ Done |
| E6-13 | Add/edit/delete character attribute effects | [BOTH] | ✅ Done |
| E6-14 | Effects validation for deleted/missing references | [AI] | ✅ Done |

Deliverable status:
- Effects are stored on `Choice.effects`.
- Resource effects target `Resource.id`.
- Character Attribute effects target `Character.id` + `CharacterAttribute.key`.
- Effects support `+=`, `-=`, and `=`.
- The editor displays effect operation labels as `+`, `-`, and `=`.
- Effects validation is visual only.
- Broken references are not auto-fixed.
- Character Attribute key renames preserve matching effect references for the same character.

### EPIC 6C — Logic Runtime Helpers

| ID | Task | Who | Status |
|---|---|---|---|
| E6-15 | Runtime condition evaluation helper: `isChoiceAvailable` | [BOTH] | ✅ Done |
| E6-16 | Unavailable choice hint resolution helper | [BOTH] | ✅ Done |
| E6-17 | Runtime effect application helper: `applyEffects` | [BOTH] | ✅ Done |

Deliverable status:
- `runtimeLogic.ts` contains pure helper functions for Story Player integration.
- Conditions can be evaluated against `RuntimeState`.
- Unavailable choice hint can be resolved from failing conditions.
- Effects can be applied to `RuntimeState` without mutating inputs.
- Runtime helpers now have focused Vitest coverage.

Notes:
- Story Logic is separated from Characters & Resources because it is a larger module.
- Conditions and effects use already implemented Characters, Character Attributes, and Resources.
- `Resource.key` is the canonical editor-facing resource identifier.
- Resource conditions/effects store `Resource.id`.
- Character Attribute conditions/effects store `Character.id` and `CharacterAttribute.key`.
- Follow `docs/STORY_LOGIC.md`.

---

## EPIC 6D — Post-EPIC UX Polish Sprint

| ID | Task | Who | Status |
|---|---|---|---|
| UX-01 | Collapse Scene Editor sections by default | [AI] | ✅ Done |
| UX-02 | Project Settings sidebar from Project Card `...` menu | [AI] | ✅ Done |
| UX-02B | Extract reusable `RightSidebar` component | [AI] | ✅ Done |
| UX-03 | Warn before deleting referenced Resources / Characters | [AI] | ✅ Done |
| BUG-01 | Project thumbnail upload / preview / remove | [AI] | ✅ Done |
| BUG-02 | Remove obsolete Inspector placeholder | [AI] | ✅ Done |
| BUG-03 | Warn before deleting referenced Character Attributes | [AI] | ✅ Done |
| BUG-04 | Dialogue page character speaker selector | [AI] | ✅ Done |
| UX-04 | Friendly Effect operation labels | [AI] | ✅ Done |
| UX-05 | Dialogue page reorder buttons | [AI] | ✅ Done |

Deliverable status:
- Editor UX is ready for Story Player work.
- Manual QA pass completed by project owner.
- Remaining polish items moved to backlog.

---

## EPIC 6E — Post-Audit Stabilization Sprint

Source:
- `docs/AUDIT_EPIC_6_TO_7.md`

Goal:
Fix targeted data consistency and authoring safety issues before starting EPIC 7.

| ID | Task | Who | Status |
|---|---|---|---|
| PA-01 | Preserve valid `Project.startSceneId` after scene deletion | [AI] | ✅ Done |
| PA-02 | Reset dangling `scene_reference` backgrounds after scene deletion | [AI] | ✅ Done |
| PA-03 | Add minimal `startSceneId` invariant to project normalization | [AI] | ✅ Done |
| PA-04 | Normalize full current Project shape on load | [AI] | ✅ Done |
| PA-05 | Preserve Character Attribute Story Logic references on rename | [AI] | ✅ Done |
| PA-06 | Improve empty condition group authoring UX | [AI] | ✅ Done |

Completed commits:
- `472e268` — `fix: preserve valid start scene after scene deletion`
- `b9ed4db` — `fix: preserve character attribute references on rename`
- `53e21d5` — `ux: improve empty condition group authoring`

Deliverable status:
- EPIC 7 blockers from the audit are resolved.
- Story Player implementation can assume a normalized Project model after load.
- Story Player implementation can assume `Project.startSceneId` is valid when scenes exist.
- Scene deletion keeps scene graph and scene-reference backgrounds consistent.
- Character Attribute renames no longer silently break Story Logic.
- Empty condition groups remain semantically valid but are safer to author.

---

## EPIC 7 — Story Player

All blockers identified in `docs/AUDIT_EPIC_6_TO_7.md` have been resolved. Story Player MVP is implemented and refactored into focused player modules.

| ID | Task | Who | Status |
|---|---|---|---|
| E7-01 | Player runtime: initialize `RuntimeState` from `Project` | [BOTH] | ✅ Done |
| E7-02 | Player shell / Preview mode | [BOTH] | ✅ Done |
| E7-03 | Player UI: background, dialogue page, speaker, text, choices | [AI] | ✅ Done |
| E7-04 | Multi-page dialogue: Next button before choices | [AI] | ✅ Done |
| E7-05 | Choice navigation: advance to `targetSceneId` | [AI] | ✅ Done |
| E7-06 | Apply effects on choice selection | [AI] | ✅ Done |
| E7-07 | Evaluate conditions and disable unavailable choices | [BOTH] | ✅ Done |
| E7-08 | Show `hintText` when condition fails | [AI] | ✅ Done |
| E7-09 | End state for scene with no choices | [AI] | ✅ Done |
| E7-10 | Preview button on canvas toolbar | [AI] | ✅ Done |
| E7-11 | Restart preview | [AI] | ✅ Done |

Completed commits:
- `9d3da3d` — `feat: initialize player runtime state from project`
- `bfc9642` — `feat: add story player preview shell`
- `61c1bef` — `feat: render current scene in story player`
- `7a61d8b` — `feat: support multi-page dialogue in story player`
- `26e2cd6` — `feat: render story choices`
- `58b0693` — `feat: support story choice navigation`
- `7f9b679` — `feat: apply story choice effects`
- `5a504ca` — `feat: integrate story choice conditions`
- `9a07171` — `feat: add story end state`
- `18e08f4` — `feat: add preview restart`

Stabilization commits:
- `4c9d9d7` — `test: add runtime and story logic tests`
- `4f9974e` — `refactor: split story player into reusable components`

Deliverable status:
- Preview mode is available from the canvas toolbar.
- Story Player initializes local `RuntimeState` from `Project`.
- Current scene background is resolved from URL, upload, asset, or one-level scene reference.
- Dialogue pages render in runtime order.
- `speakerId: null` displays Narrator.
- Missing speakers display `Unknown Speaker`.
- Choices display after the final dialogue page.
- Choices with valid targets navigate to target scenes and reset page index to `0`.
- Choices with missing/null targets are disabled.
- Effects apply before navigation through `applyEffects()`.
- Conditions are evaluated through `isChoiceAvailable()`.
- Unavailable choices remain visible, disabled, and can display `hintText` through `resolveUnavailableChoiceHint()`.
- Scenes with no choices show an end-of-story panel.
- Preview can be restarted without reloading the app.
- Player code has been split into smaller components/helpers:
  - `StoryPlayer.tsx`
  - `StoryPlayerHeader.tsx`
  - `DialoguePanel.tsx`
  - `ChoiceList.tsx`
  - `playerHelpers.ts`
  - `runtimeState.ts`
- Runtime and Story Logic helper tests are covered with Vitest.

---

## EPIC 8 — Save, Load, Export

| ID | Task | Who | Status |
|---|---|---|---|
| E8-01 | Auto-save active project to `narrium_project_{id}` | [AI] | ✅ Done |
| E8-02 | Export project as JSON | [BOTH] | ⏳ Pending |
| E8-03 | Import project from JSON | [AI] | ⏳ Pending |
| E8-04 | Export story as standalone HTML player | [BOTH] | ⏳ Pending |
| E8-05 | Exported player save/load slots | [BOTH] | ⏳ Pending |

Recommended implementation order:
1. Export project as JSON.
2. Import project from JSON.
3. Export story as standalone HTML player.
4. Add exported player save/load slots.

---

## EPIC 9 — Polish & Production UX

| ID | Task | Who | Status |
|---|---|---|---|
| E9-01 | Keyboard shortcuts: Delete selected node/choice, Esc close/cancel | [AI] | ⏳ Pending |
| E9-02 | Undo/redo for scene and project edits | [BOTH] | ⏳ Pending |
| E9-03 | Better custom confirmation dialogs instead of `window.confirm` | [BOTH] | Backlog |
| E9-04 | Drag-and-drop Dialogue Page reorder | [AI] | Backlog |
| E9-05 | Thumbnail image resizing/compression before localStorage save | [BOTH] | Backlog |
| E9-06 | Full project validation panel | [BOTH] | Backlog |
| E9-07 | Asset library extraction and filtering | [AI] | Backlog |
| E9-08 | Empty/error states polish | [AI] | Backlog |
| E9-09 | Accessibility review | [BOTH] | Backlog |
| E9-10 | Warn on character deletion when used as dialogue speaker | [AI] | Backlog |
| E9-11 | Synchronize workspace metadata from normalized project data on load | [AI] | Backlog |
| E9-12 | Clear missing/corrupt active workspace project id on load | [AI] | Backlog |
| E9-13 | Runtime helper unit tests | [BOTH] | ✅ Done |
| E9-14 | Story Player component-level tests | [BOTH] | Backlog |

---

## Next Immediate Step

Start **EPIC 8 — Save, Load, Export**.

First recommended task:

### E8-02 — Export project as JSON

Acceptance direction:
- Add a safe export action for the active Project.
- Export the current full `Project` object as formatted JSON.
- Preserve embedded Data URLs already stored in the Project.
- Do not implement import in the same task.
- Do not implement standalone HTML export yet.
- Run `npm.cmd test` and `npm.cmd run build`.
