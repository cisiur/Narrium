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
| E0-03 | Data model specification (`docs/DATA_MODEL.md`) | [ME] | ✅ Done |
| E0-04 | Editor screens description (`docs/SCREENS.md`) | [ME] | ✅ Done |
| E0-05 | Vite + React + TypeScript project scaffold | [AI] | ✅ Done |
| E0-06 | Tailwind CSS setup + base tokens | [AI] | ✅ Done |
| E0-07 | Zustand store skeleton: `useWorkspaceStore`, `useCanvasStore` | [AI] | ✅ Done |
| E0-08 | TypeScript types: all canonical interfaces in `src/types/index.ts` | [AI] | ✅ Done |

---

## EPIC 1 — Workspace & Canvas Foundations

> Goal: user can manage multiple local projects and edit one active project on a visual canvas.

| ID | Task | Who | Status |
|---|---|---|---|
| E1-01 | "My Projects" screen: create new project, open, project cards grid | [AI] | ✅ Done |
| E1-02 | Workspace persistence: `narrium_workspace` + `narrium_project_{id}` in localStorage | [AI] | ✅ Done |
| E1-03 | React Flow canvas: Background, Controls, MiniMap, empty state overlay | [AI] | ✅ Done |
| E1-04 | `SceneNode` component: name, page count, choice count, selected highlight | [AI] | ✅ Done |
| E1-05 | Add scene: "+ Add Scene" toolbar button → new node auto-positioned | [AI] | ✅ Done |
| E1-06 | Connect scenes: drag edge → sets `targetSceneId`; reuses first free choice | [AI] | ✅ Done |
| E1-07 | Delete edge: clears `targetSceneId` on corresponding choice | [AI] | ✅ Done |
| E1-08 | Select scene: click node → `selectedSceneId` set, editor panel opens | [AI] | ✅ Done |
| E1-09 | Persist canvas layout: node drag updates `scene.position` in store + localStorage | [AI] | ✅ Done |
| E1-10 | Canvas zoom/pan/fit: provided by React Flow Controls | [AI] | ✅ Done |
| E1-11 | `useCanvasStore.syncFromProject()`: rebuilds nodes + edges from active project | [AI] | ✅ Done |
| E1-12 | Scene groups: create named group container on canvas | [BOTH] | ⏳ Pending |

---

## EPIC 2 — Scene Editor Panel

> Goal: author can fully configure a selected scene from the right sidebar.

| ID | Task | Who | Status |
|---|---|---|---|
| E2-01 | Right sidebar panel: opens on scene select, closes on deselect, slide-in transition | [AI] | ✅ Done |
| E2-02 | Scene name: inline editable (click to edit, Enter/blur to save) | [AI] | ✅ Done |
| E2-03 | Dialogue pages: add, edit (textarea inline), delete (disabled on last page) | [AI] | ✅ Done |
| E2-04 | Choices: add, edit text inline, delete; shows target scene name | [AI] | ✅ Done |
| E2-05 | Background picker: URL / local upload / asset library / scene reference modes | [BOTH] | ⏳ Pending |
| E2-06 | Asset library panel: add asset (URL or upload), list, select for background | [BOTH] | ⏳ Pending |
| E2-07 | SceneNode background thumbnail preview from scene background | [AI] | ⏳ Pending |
| E2-08 | Dialogue page speaker selector (from Characters list) | [AI] | ⏳ Pending (needs E3) |
| E2-09 | Choice editor: condition builder (add/remove/edit `resource >= N` or `char_attr >= N`) | [BOTH] | ⏳ Pending (needs E3) |
| E2-10 | Choice editor: effect builder (add/remove/edit `resource += N` or `char_attr += N`) | [BOTH] | ⏳ Pending (needs E3) |
| E2-11 | Choice target dropdown: select target scene from list (alternative to canvas edge) | [AI] | ⏳ Pending |
| E2-12 | Inline validation: warn on unconnected choice (no `targetSceneId`) | [AI] | ⏳ Pending |

---

## EPIC 3 — Characters & Resources

> Goal: author can define characters with attributes, and global resources, used in conditions and effects.

| ID | Task | Who | Status |
|---|---|---|---|
| E3-01 | Characters tab: list all defined characters | [AI] | ⏳ Pending |
| E3-02 | Add / edit / delete character: name + attributes with default values | [BOTH] | ⏳ Pending |
| E3-03 | Resources tab: list all defined resources | [AI] | ⏳ Pending |
| E3-04 | Add / edit / delete resource: name + default value | [AI] | ⏳ Pending |
| E3-05 | Condition builder: character and resource selectors from store | [BOTH] | ⏳ Pending |
| E3-06 | Effect builder: character and resource selectors from store | [BOTH] | ⏳ Pending |
| E3-07 | Validation: warn if condition/effect references deleted character or resource | [AI] | ⏳ Pending |

---

## EPIC 4 — Story Player

> Goal: author can preview their story in-browser as a reader.

| ID | Task | Who | Status |
|---|---|---|---|
| E4-01 | Player runtime: initialize `RuntimeState` from `Project` | [BOTH] | ⏳ Pending |
| E4-02 | Player UI: background, dialogue page (speaker + text), choice buttons | [AI] | ⏳ Pending |
| E4-03 | Choice logic: apply effects, advance to `targetSceneId`, reset page index | [AI] | ⏳ Pending |
| E4-04 | Condition evaluation: grey out + show `hintText` when condition fails | [BOTH] | ⏳ Pending |
| E4-05 | Multi-page dialogue: Next button within scene before showing choices | [AI] | ⏳ Pending |
| E4-06 | End state: scene with 0 choices → End screen + restart button | [AI] | ⏳ Pending |
| E4-07 | Preview button on canvas toolbar: open player in modal overlay | [AI] | ⏳ Pending |
| E4-08 | Player restart button | [AI] | ⏳ Pending |
| E4-09 | Exported player save/load: save/load `RuntimeState` to localStorage slots | [BOTH] | ⏳ Pending |

---

## EPIC 5 — Save, Load, Export

> Goal: author can save their project, reload it, and export the story as a playable file.

| ID | Task | Who | Status |
|---|---|---|---|
| E5-01 | Auto-save active project to `narrium_project_{id}` on every store change | [AI] | ✅ Done (in `workspaceStore.updateActiveProject`) |
| E5-02 | Export project as JSON (full `Project` object download) | [BOTH] | ⏳ Pending |
| E5-03 | Import project from JSON (validate schema, assign new id, add to workspace) | [AI] | ⏳ Pending |
| E5-04 | Export story as standalone HTML player (embedded build + project JSON) | [BOTH] | ⏳ Pending |
| E5-05 | Rename / delete project from My Projects screen | [AI] | ⏳ Pending |
| E5-06 | Project thumbnail: auto-generate from `startScene` background; manual override | [BOTH] | ⏳ Pending |

---

## EPIC 6 — Polish & UX

> Goal: smooth, production-quality UX. No rough edges before first public demo.

| ID | Task | Who | Status |
|---|---|---|---|
| E6-01 | Keyboard shortcuts: `Delete` = delete selected node, `Ctrl+Z` = undo | [AI] | ⏳ Pending |
| E6-02 | Canvas minimap | [AI] | ✅ Done (React Flow MiniMap) |
| E6-03 | Undo/redo for scene and project edits | [BOTH] | ⏳ Pending |
| E6-04 | Onboarding: empty state with tutorial overlay on first project open | [BOTH] | ⏳ Pending |
| E6-05 | Project-wide validation: unconnected choices, missing targets, broken asset refs | [BOTH] | ⏳ Pending |
| E6-06 | Dark / light mode toggle | [AI] | ⏳ Pending |
| E6-07 | Responsive layout: desktop-first, minimum 1280px | [AI] | ⏳ Pending |
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

```text
EPIC 0  Documentation & Foundation       ██████████  100%  (all done)
EPIC 1  Workspace & Canvas Foundations   █████████░   92%  (E1-12 scene groups pending)
EPIC 2  Scene Editor Panel               ███░░░░░░░   33%  (basic panel done; background, conditions, effects pending)
EPIC 3  Characters & Resources           ░░░░░░░░░░    0%
EPIC 4  Story Player                     ░░░░░░░░░░    0%
EPIC 5  Save, Load, Export               █░░░░░░░░░   17%  (auto-save done)
EPIC 6  Polish & UX                      █░░░░░░░░░   12%  (minimap done)
```

---

## Workflow Rules

1. **[ME]** — write spec / data model / acceptance criteria
2. **[AI]** — implement according to spec
3. **[ME]** — review architecture, flow, UX; flag issues
4. **[AI]** — fixes and refactors
5. **[MANUAL]** — product decision, acceptance, merge to main

> After every completed task: update status in ROADMAP.md and CONTEXT.md, commit to `dev`.
