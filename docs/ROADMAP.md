# Roadmap — Narrium

## Role Legend

| Symbol | Who | When |
|---|---|---|
| [ME] | Perplexity (planning) | Architecture, data schemas, task breakdown, UX review, spec writing |
| [AI] | Codex / Claude Code (implementation) | TypeScript/React code, components, tests, repo files, fixes |
| [BOTH] | Perplexity spec → AI impl | Complex mechanics requiring spec-first approach |
| [MANUAL] | Project owner | Product decisions, UX acceptance, asset selection, publishing, priorities |

---

## EPIC 0 — Documentation & Foundation

| ID | Task | Who | Status |
|---|---|---|---|
| E0-01 | Create GitHub repo, README.md | [MANUAL] | ✅ Done |
| E0-02 | ROADMAP.md, CONTEXT.md | [ME] | ✅ Done |
| E0-03 | Data model specification (`docs/DATA_MODEL.md`) | [ME] | ⏳ Pending |
| E0-04 | Editor screens description (`docs/SCREENS.md`) | [ME] | ⏳ Pending |
| E0-05 | Vite + React + TypeScript project scaffold | [AI] | ⏳ Pending |
| E0-06 | Tailwind CSS setup + base tokens | [AI] | ⏳ Pending |
| E0-07 | Zustand store skeleton: `WorkspaceStore`, `ProjectStore`, `UIStore` | [BOTH] | ⏳ Pending |
| E0-08 | TypeScript types: `Project`, `Scene`, `SceneGroup`, `SceneBackground`, `DialoguePage`, `Choice`, `Condition`, `Effect`, `Character`, `Resource`, `AssetLibraryItem`, `ProjectSettings`, `RuntimeState` | [BOTH] | ⏳ Pending |

---

## EPIC 1 — Workspace & Canvas Foundations (M1)

> Goal: user can manage multiple local projects and edit one active project on a visual canvas.

| ID | Task | Who | Status |
|---|---|---|---|
| E1-01 | "My Projects" start screen: create new, open, rename, delete project cards | [BOTH] | ⏳ Pending |
| E1-02 | Workspace persistence: multiple project metas in localStorage (`narrium_workspace`) | [AI] | ⏳ Pending |
| E1-03 | Integrate React Flow; render empty canvas with toolbar | [AI] | ⏳ Pending |
| E1-04 | `SceneNode` component: tile with scene name, background thumbnail, choice count | [BOTH] | ⏳ Pending |
| E1-05 | Add scene: click "+" → new tile placed on canvas | [AI] | ⏳ Pending |
| E1-06 | Connect scenes: drag from choice port → target scene port (creates edge + sets `targetSceneId`) | [AI] | ⏳ Pending |
| E1-07 | Delete scene tile (confirmation dialog if has connections) | [AI] | ⏳ Pending |
| E1-08 | Select scene: click tile → opens scene editor panel | [AI] | ⏳ Pending |
| E1-09 | Scene tile: orange dot indicator for each unconnected choice | [AI] | ⏳ Pending |
| E1-10 | Canvas: zoom in/out, pan, fit-to-screen button | [AI] | ⏳ Pending |
| E1-11 | Persist canvas layout (node positions) in `ProjectStore` | [AI] | ⏳ Pending |
| E1-12 | Scene groups: create named group container on canvas; assign/unassign scenes | [BOTH] | ⏳ Pending |

---

## EPIC 2 — Scene Editor Panel (M2)

> Goal: author can fully configure a selected scene from the right sidebar.

| ID | Task | Who | Status |
|---|---|---|---|
| E2-01 | Right sidebar panel skeleton: opens when scene is selected, closes when deselected | [AI] | ⏳ Pending |
| E2-02 | Scene meta: name input, background picker with 4 modes: URL, local upload, asset library, scene reference | [BOTH] | ⏳ Pending |
| E2-03 | Asset library panel: add asset (URL or upload), list assets, select for scene background | [BOTH] | ⏳ Pending |
| E2-04 | Dialogue pages list: add, delete, reorder (drag or arrow buttons) | [AI] | ⏳ Pending |
| E2-05 | Dialogue page editor: speaker selector (from Characters) + text field | [AI] | ⏳ Pending |
| E2-06 | Choices list: add choice, delete choice | [AI] | ⏳ Pending |
| E2-07 | Choice editor: label text, target scene selector (dropdown from all scenes) | [BOTH] | ⏳ Pending |
| E2-08 | Choice editor: condition builder (add/remove/edit `resource >= N` or `character_attr >= N`) | [BOTH] | ⏳ Pending |
| E2-09 | Choice editor: effect builder (add/remove/edit `resource += N` or `character_attr += N`) | [BOTH] | ⏳ Pending |
| E2-10 | Inline validation: warn on unconnected choice (no targetSceneId) | [AI] | ⏳ Pending |

---

## EPIC 3 — Characters & Resources (M3)

> Goal: author can define characters with attributes, and global resources, used in conditions and effects.

| ID | Task | Who | Status |
|---|---|---|---|
| E3-01 | Characters tab: list all defined characters | [AI] | ⏳ Pending |
| E3-02 | Add / edit / delete character: name + attributes with default values | [BOTH] | ⏳ Pending |
| E3-03 | Resources tab: list all defined resources | [AI] | ⏳ Pending |
| E3-04 | Add / edit / delete resource: name + default value | [AI] | ⏳ Pending |
| E3-05 | Condition builder: character and resource selectors populated from store | [BOTH] | ⏳ Pending |
| E3-06 | Effect builder: character and resource selectors populated from store | [BOTH] | ⏳ Pending |
| E3-07 | Validation: warn if condition/effect references a deleted character or resource | [AI] | ⏳ Pending |

---

## EPIC 4 — Story Player (M4)

> Goal: author can preview their story in-browser as a reader.

| ID | Task | Who | Status |
|---|---|---|---|
| E4-01 | Player runtime: initialize `RuntimeState` from `Project` (resources + char attrs at defaults) | [BOTH] | ⏳ Pending |
| E4-02 | Player UI: background, dialogue page (speaker + text), choice buttons | [AI] | ⏳ Pending |
| E4-03 | Choice logic: apply effects, advance to `targetSceneId`, reset page index | [AI] | ⏳ Pending |
| E4-04 | Condition evaluation: grey out + show `hintText` when condition fails | [BOTH] | ⏳ Pending |
| E4-05 | Multi-page dialogue: Next button within scene before showing choices | [AI] | ⏳ Pending |
| E4-06 | End state: scene with 0 choices → End screen with restart button | [AI] | ⏳ Pending |
| E4-07 | Preview button on canvas toolbar: open player in modal overlay | [AI] | ⏳ Pending |
| E4-08 | Player restart button | [AI] | ⏳ Pending |
| E4-09 | Exported player save/load: save runtime snapshot to localStorage; load from slot | [BOTH] | ⏳ Pending |

---

## EPIC 5 — Save, Load, Export (M5)

> Goal: author can save their project, reload it, and export the story as a playable file.

| ID | Task | Who | Status |
|---|---|---|---|
| E5-01 | Auto-save active project to `narrium_project_{id}` on every store change | [AI] | ⏳ Pending |
| E5-02 | Export project as JSON (full `Project` object) | [BOTH] | ⏳ Pending |
| E5-03 | Import project from JSON (validates schema, assigns new id, adds to workspace) | [AI] | ⏳ Pending |
| E5-04 | Export story as standalone HTML player (embedded React build + project JSON) | [BOTH] | ⏳ Pending |
| E5-05 | "New project" flow from My Projects screen | [AI] | ⏳ Pending |
| E5-06 | Project thumbnail: auto-generate from `startScene` background; allow manual override via image upload or URL | [BOTH] | ⏳ Pending |

---

## EPIC 6 — Polish & UX (M6)

> Goal: smooth, production-quality UX. No rough edges before first public demo.

| ID | Task | Who | Status |
|---|---|---|---|
| E6-01 | Keyboard shortcuts: `Delete` = delete selected node, `Ctrl+Z` = undo | [AI] | ⏳ Pending |
| E6-02 | Canvas minimap | [AI] | ⏳ Pending |
| E6-03 | Undo/redo for scene and project edits | [BOTH] | ⏳ Pending |
| E6-04 | Onboarding: empty state with 3-step tutorial overlay on first project open | [BOTH] | ⏳ Pending |
| E6-05 | Project-wide validation report: unconnected choices, missing targets, broken asset refs | [BOTH] | ⏳ Pending |
| E6-06 | Dark / light mode toggle | [AI] | ⏳ Pending |
| E6-07 | Responsive layout: desktop-first, minimum usable at 1280px width | [AI] | ⏳ Pending |
| E6-08 | Freemium limit hooks: scene count gate in UI (documented, not enforced in MVP) | [BOTH] | ⏳ Pending |

---

## Backlog (post-MVP)

| Task | Notes |
|---|---|
| Group collapse into single tile on canvas | `SceneGroup.collapsed` field already in model |
| Cloud save (Supabase or Firebase) | Replaces localStorage |
| Collaborative editing | Requires cloud |
| Character portrait images in player | Add `portraitUrl` to `Character` |
| Sound / music per scene | Add `audioUrl` to `Scene` |
| Localization / multi-language stories | Per-scene language variants |
| Publish story to sharable URL | Requires backend |
| Mobile-friendly player output | CSS overhaul for small screens |
| Branching analytics (paths taken) | Requires backend or embedded counter |

---

## General Progress

```
EPIC 0  Documentation & Foundation       ██░░░░░░░░   20%  (E0-01, E0-02 done)
EPIC 1  Workspace & Canvas Foundations   ░░░░░░░░░░    0%
EPIC 2  Scene Editor Panel               ░░░░░░░░░░    0%
EPIC 3  Characters & Resources           ░░░░░░░░░░    0%
EPIC 4  Story Player                     ░░░░░░░░░░    0%
EPIC 5  Save, Load, Export               ░░░░░░░░░░    0%
EPIC 6  Polish & UX                      ░░░░░░░░░░    0%
```

---

## Workflow Rules

1. **[ME]** — write spec / data model / acceptance criteria
2. **[AI]** — implement according to spec
3. **[ME]** — review architecture, flow, UX; flag issues
4. **[AI]** — fixes and refactors
5. **[MANUAL]** — product decision, acceptance, merge to main

> After every completed task: update status in ROADMAP.md and CONTEXT.md, commit to `dev`.
