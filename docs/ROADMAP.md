# Roadmap — Narrium

> **Version:** v3 documentation refresh after EPIC 5  
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
Story Logic                ░░░░░░░░░░   0%
Story Player               ░░░░░░░░░░   0%
Save / Export              █░░░░░░░░░  15%
Polish & Production UX     ██░░░░░░░░  20%
```

Current state: the project has a usable local multi-project workspace, a React Flow scene graph editor, a right-side scene editor, a complete background system, asset library support, SceneNode thumbnails, choice target editing, edge-to-choice navigation, project-level Characters management, Character attributes, and project-level Resources management.

---

## EPIC 0 — Documentation & Foundation

> Goal: define the product, data model, screens, and technical foundation.

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

> Goal: user can manage multiple local projects and open one active project on the canvas.

| ID | Task | Who | Status |
|---|---|---|---|
| E1-01 | My Projects screen: project cards grid | [AI] | ✅ Done |
| E1-02 | Create new project | [AI] | ✅ Done |
| E1-03 | Open existing project from My Projects | [AI] | ✅ Done |
| E1-04 | Workspace persistence: `narrium_workspace` + `narrium_project_{id}` in localStorage | [AI] | ✅ Done |
| E1-05 | Return from canvas to My Projects without deleting project | [AI] | ✅ Done |
| E1-06 | Rename project from My Projects screen | [AI] | ✅ Done |
| E1-07 | Show active project name in canvas header | [AI] | ✅ Done |
| E1-08 | Delete project from My Projects screen | [AI] | ⏳ Pending |
| E1-09 | Duplicate project | [AI] | ⏳ Pending |
| E1-10 | Project thumbnail preview in My Projects | [BOTH] | ⏳ Pending |

Notes:
- Active project can be closed by setting `activeProjectId` and `activeProject` to `null`.
- Closing a project does not delete project data.
- My Projects is the project hub.

---

## EPIC 2 — Canvas Graph Editor

> Goal: user can create, arrange, connect, and inspect story scenes on a visual graph.

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

> Goal: author can configure a selected scene from the right sidebar.

| ID | Task | Who | Status |
|---|---|---|---|
| E3-01 | Right sidebar panel: opens on scene select, closes on deselect, slide-in transition | [AI] | ✅ Done |
| E3-02 | Scene name: inline editable | [AI] | ✅ Done |
| E3-03 | Dialogue pages: add, edit, delete; delete disabled on last page | [AI] | ✅ Done |
| E3-04 | Choices: add, edit text, delete; shows target scene name | [AI] | ✅ Done |
| E3-05 | Choice Target dropdown: None + all other scenes | [AI] | ✅ Done |
| E3-06 | Selected Choice highlight and scroll after edge click | [AI] | ✅ Done |
| E3-07 | Dialogue page speaker selector | [AI] | ⏳ Pending (needs Characters integration) |
| E3-08 | Inline validation: warn on unconnected choice | [AI] | ⏳ Pending |

---

## EPIC 4 — Background System

> Goal: each scene can have a reusable visual background source and node thumbnail.

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

Notes:
- Background modes: `none`, `url`, `upload`, `asset`, `scene_reference`.
- Uploaded images are stored as Data URLs inside project JSON for MVP.
- Asset Library belongs to `Project`.
- Scene stores `assetId`, not duplicated asset data.

---

## EPIC 5 — Characters & Resources

> Goal: author can define characters and global resources used later by story logic.

| ID | Task | Who | Status |
|---|---|---|---|
| E5-01 | Characters tab/screen foundation | [AI] | ✅ Done |
| E5-02 | Character list | [AI] | ✅ Done |
| E5-03 | Add / edit / delete character | [BOTH] | ✅ Done |
| E5-04 | Character attributes: add/edit/delete key + default value | [BOTH] | ✅ Done |
| E5-05 | Resources tab/screen foundation | [AI] | ✅ Done |
| E5-06 | Resource list | [AI] | ✅ Done |
| E5-07 | Add / edit / delete resource: key + default value | [AI] | ✅ Done |
| E5-08 | Validation for duplicate character/resource keys | [AI] | ✅ Done |

Deliverable status:
- Project has complete Characters and Resources data needed by Story Logic.
- Character attributes are implemented as per-character numeric keyed values.
- Resources are implemented as project-wide numeric keyed values.
- Duplicate character attribute keys are resolved per character.
- Duplicate resource keys are resolved project-wide.
- Negative and decimal numeric defaults are supported.
- No conditions/effects UI yet.

---

## EPIC 6 — Story Logic

> Goal: author can define declarative conditions and effects on choices.

| ID | Task | Who | Status |
|---|---|---|---|
| E6-01 | Condition data model review and final acceptance | [PM] | ⏳ Pending |
| E6-02 | Choice condition list UI | [BOTH] | ⏳ Pending |
| E6-03 | Add/edit/delete resource conditions | [BOTH] | ⏳ Pending |
| E6-04 | Add/edit/delete character attribute conditions | [BOTH] | ⏳ Pending |
| E6-05 | Effect data model review and final acceptance | [PM] | ⏳ Pending |
| E6-06 | Choice effect list UI | [BOTH] | ⏳ Pending |
| E6-07 | Add/edit/delete resource effects | [BOTH] | ⏳ Pending |
| E6-08 | Add/edit/delete character attribute effects | [BOTH] | ⏳ Pending |
| E6-09 | Validation for deleted resource/character references | [AI] | ⏳ Pending |
| E6-10 | Inline warning for choices with invalid logic references | [AI] | ⏳ Pending |

Notes:
- Story Logic is separated from Characters & Resources because it is a larger module.
- Conditions and effects should use already implemented Characters, Character Attributes, and Resources.
- `Resource.key` is the canonical resource identifier field for editor UI and future logic UX.
- Current TypeScript types include `Condition` and `Effect`, but the final product behavior should be reviewed before implementation.

---

## EPIC 7 — Story Player

> Goal: author can preview/play the story in-browser.

| ID | Task | Who | Status |
|---|---|---|---|
| E7-01 | Player runtime: initialize `RuntimeState` from `Project` | [BOTH] | ⏳ Pending |
| E7-02 | Player UI: background, dialogue page, speaker, text, choices | [AI] | ⏳ Pending |
| E7-03 | Multi-page dialogue: Next button before choices | [AI] | ⏳ Pending |
| E7-04 | Choice navigation: advance to `targetSceneId` | [AI] | ⏳ Pending |
| E7-05 | Apply effects on choice selection | [AI] | ⏳ Pending |
| E7-06 | Evaluate conditions and grey out unavailable choices | [BOTH] | ⏳ Pending |
| E7-07 | Show `hintText` when condition fails | [AI] | ⏳ Pending |
| E7-08 | End state for scene with no choices | [AI] | ⏳ Pending |
| E7-09 | Preview button on canvas toolbar | [AI] | ⏳ Pending |
| E7-10 | Restart preview | [AI] | ⏳ Pending |

---

## EPIC 8 — Save, Load, Export

> Goal: author can save, import/export, and eventually package a playable story.

| ID | Task | Who | Status |
|---|---|---|---|
| E8-01 | Auto-save active project to `narrium_project_{id}` | [AI] | ✅ Done |
| E8-02 | Export project as JSON | [BOTH] | ⏳ Pending |
| E8-03 | Import project from JSON | [AI] | ⏳ Pending |
| E8-04 | Export story as standalone HTML player | [BOTH] | ⏳ Pending |
| E8-05 | Exported player save/load slots | [BOTH] | ⏳ Pending |

---

## EPIC 9 — Polish & Production UX

> Goal: smooth, production-quality UX before first public demo.

| ID | Task | Who | Status |
|---|---|---|---|
| E9-01 | Keyboard shortcuts: Delete selected node/choice, Esc close/cancel | [AI] | ⏳ Pending |
| E9-02 | Undo/redo for scene and project edits | [BOTH] | ⏳ Pending |
| E9-03 | Onboarding tutorial overlay for first project | [BOTH] | ⏳ Pending |
| E9-04 | Project-wide validation panel | [BOTH] | ⏳ Pending |
| E9-05 | Dark / light mode toggle | [AI] | ⏳ Pending |
| E9-06 | Responsive layout: desktop-first, minimum 1280px | [AI] | ⏳ Pending |
| E9-07 | Freemium limit hooks: scene count gate in UI | [BOTH] | ⏳ Pending |
| E9-08 | Large project performance review | [AI] | ⏳ Pending |
| E9-09 | Accessibility pass for keyboard navigation and labels | [AI] | ⏳ Pending |

---

## Backlog

| Task | Notes |
|---|---|
| Cloud save | Supabase/Firebase or custom backend |
| Collaborative editing | Requires cloud data model |
| Publish story to sharable URL | Requires backend |
| Sound/music per scene | Add audio fields to Scene |
| Character portraits in player | Add portrait fields to Character |
| Localization/multi-language story variants | Larger post-MVP feature |
| Branching analytics | Requires runtime event tracking |
| Advanced asset manager | Search, tags, folders, batch import |
| Canvas auto-layout | Useful for large graphs |
| Multiple node handle positions | Reconsider after graph complexity increases |
| CharacterAttribute IDs | Consider before advanced Story Logic, import/export, or reorderable attributes |

---

## Workflow Rules

1. **[PM]** writes spec / data model / acceptance criteria.
2. **[AI]** implements according to spec.
3. **[PM]** reviews implementation after push.
4. **[MANUAL]** validates important UX decisions in browser.
5. Larger completed batches should update `ROADMAP.md`, `CONTEXT.md`, and when needed `docs/DATA_MODEL.md`.

Important branch rule:
- Work directly on `main`.
- Do not create, use, or target `dev` unless the project owner explicitly changes the workflow.
