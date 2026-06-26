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
| E0-07 | Workspace store skeleton: `WorkspaceStore`, `ProjectStore`, `UIStore` | [BOTH] | ⏳ Pending |
| E0-08 | TypeScript types: `Project`, `Scene`, `SceneGroup`, `DialoguePage`, `Choice`, `Condition`, `Effect`, `Character`, `Resource`, `AssetLibraryItem` | [BOTH] | ⏳ Pending |

---

## EPIC 1 — Workspace & Canvas Foundations (M1)

> Goal: user can manage multiple local projects and edit one active project on a visual canvas.

| ID | Task | Who | Status |
|---|---|---|---|
| E1-01 | "My Projects" start screen: create, rename, open, delete project cards | [BOTH] | ⏳ Pending |
| E1-02 | Workspace persistence in localStorage for multiple projects | [AI] | ⏳ Pending |
| E1-03 | Integrate React Flow; render empty canvas with toolbar | [AI] | ⏳ Pending |
| E1-04 | `SceneNode` component: tile with scene name, background thumbnail, choice count | [BOTH] | ⏳ Pending |
| E1-05 | Add scene: click "+" → new tile placed on canvas | [AI] | ⏳ Pending |
| E1-06 | Connect scenes: drag from choice port → target scene port | [AI] | ⏳ Pending |
| E1-07 | Delete scene tile (with confirmation if has connections) | [AI] | ⏳ Pending |
| E1-08 | Select scene: click tile → opens editor panel | [AI] | ⏳ Pending |
| E1-09 | Scene tile shows unconnected choice indicators (orange dot) | [AI] | ⏳ Pending |
| E1-10 | Canvas: zoom, pan, fit-to-screen | [AI] | ⏳ Pending |
| E1-11 | Persist canvas layout (node positions) | [AI] | ⏳ Pending |
| E1-12 | Scene groups / containers: create named group area on canvas and assign scenes to it | [BOTH] | ⏳ Pending |

---

## EPIC 2 — Scene Editor Panel (M2)

> Goal: author can fully configure a selected scene from the right sidebar.

| ID | Task | Who | Status |
|---|---|---|---|
| E2-01 | Right sidebar panel: opens when scene is selected | [AI] | ⏳ Pending |
| E2-02 | Scene meta: name input, background picker with URL, local upload, project asset selection, and reuse from another scene | [BOTH] | ⏳ Pending |
| E2-03 | Asset library panel for reusable project backgrounds | [BOTH] | ⏳ Pending |
| E2-04 | Dialogue pages list: add page, delete page, reorder pages | [AI] | ⏳ Pending |
| E2-05 | Dialogue page editor: speaker selector (from Characters list), text field | [AI] | ⏳ Pending |
| E2-06 | Choices list: add choice, delete choice | [AI] | ⏳ Pending |
| E2-07 | Choice editor: choice text, target scene selector | [BOTH] | ⏳ Pending |
| E2-08 | Choice editor: conditions (add/remove/edit `resource >= N`, `character_attr >= N`) | [BOTH] | ⏳ Pending |
| E2-09 | Choice editor: effects (add/remove/edit `resource += N`, `character_attr += N`) | [BOTH] | ⏳ Pending |
| E2-10 | Validation: warn if choice has no target scene set | [AI] | ⏳ Pending |

---

## EPIC 3 — Characters & Resources (M3)

> Goal: author can define characters with attributes, and global resources, used in conditions and effects.

| ID | Task | Who | Status |
|---|---|---|---|
| E3-01 | Characters tab: list of defined characters | [AI] | ⏳ Pending |
| E3-02 | Add / edit / delete character: name, attributes (e.g. `reputation`) with default value | [BOTH] | ⏳ Pending |
| E3-03 | Resources tab: list of global resources | [AI] | ⏳ Pending |
| E3-04 | Add / edit / delete resource: name, default value | [AI] | ⏳ Pending |
| E3-05 | Condition builder uses defined characters and resources as selectable fields | [BOTH] | ⏳ Pending |
| E3-06 | Effect builder uses defined characters and resources as selectable fields | [BOTH] | ⏳ Pending |
| E3-07 | Validation: warn if condition/effect references a deleted character or resource | [AI] | ⏳ Pending |

---

## EPIC 4 — Story Player (M4)

> Goal: author can play through their story in-browser as a reader.

| ID | Task | Who | Status |
|---|---|---|---|
| E4-01 | Player runtime: data model → runtime state (current scene, current page, variable state) | [BOTH] | ⏳ Pending |
| E4-02 | Player UI: scene background, dialogue page display (speaker + text), choices | [AI] | ⏳ Pending |
| E4-03 | Choice logic: apply effects, advance to target scene | [AI] | ⏳ Pending |
| E4-04 | Condition evaluation: grey out choices that fail conditions; show hint text | [BOTH] | ⏳ Pending |
| E4-05 | Multi-page dialogue: Next button advances within scene before showing choices | [AI] | ⏳ Pending |
| E4-06 | End state: detect scene with no outgoing choices → show End screen | [AI] | ⏳ Pending |
| E4-07 | Preview button on canvas: opens player in modal/overlay | [AI] | ⏳ Pending |
| E4-08 | Player: restart button | [AI] | ⏳ Pending |
| E4-09 | Exported player save/load within session | [BOTH] | ⏳ Pending |

---

## EPIC 5 — Save, Load, Export (M5)

> Goal: author can save their project, reload it, and export the story as a playable file.

| ID | Task | Who | Status |
|---|---|---|---|
| E5-01 | Auto-save active project to localStorage on every change | [AI] | ⏳ Pending |
| E5-02 | Export project as JSON (full project file, including assets references/settings) | [BOTH] | ⏳ Pending |
| E5-03 | Import project from JSON file | [AI] | ⏳ Pending |
| E5-04 | Export story as standalone HTML player (self-contained file) | [BOTH] | ⏳ Pending |
| E5-05 | New project flow from "My Projects" screen | [AI] | ⏳ Pending |
| E5-06 | Project thumbnail + updatedAt metadata on project cards | [BOTH] | ⏳ Pending |

---

## EPIC 6 — Polish & UX (M6)

> Goal: smooth, production-quality UX. No rough edges before first public demo.

| ID | Task | Who | Status |
|---|---|---|---|
| E6-01 | Keyboard shortcuts: Delete = delete selected node, Ctrl+Z = undo | [AI] | ⏳ Pending |
| E6-02 | Canvas: minimap for large projects | [AI] | ⏳ Pending |
| E6-03 | Undo/redo for scene edits | [BOTH] | ⏳ Pending |
| E6-04 | Onboarding: empty state with 3-step tutorial overlay | [BOTH] | ⏳ Pending |
| E6-05 | Validate entire project: report all unconnected choices, missing targets, asset issues | [BOTH] | ⏳ Pending |
| E6-06 | Dark / light mode toggle | [AI] | ⏳ Pending |
| E6-07 | Responsive layout (desktop-first, minimum usable width 1280px) | [AI] | ⏳ Pending |
| E6-08 | Freemium limit hooks in UI (documented or enforced depending on decision) | [BOTH] | ⏳ Pending |
| E6-09 | Group collapse UX for scene containers (post-MVP candidate) | [BOTH] | 📦 Backlog |

---

## Backlog (unassigned)

| Task | Who (preliminary) |
|---|---|
| Group collapse into one tile/card on canvas | [BOTH] |
| Cloud save (Supabase or Firebase) | [BOTH] |
| Collaborative editing | [BOTH] |
| Character portrait images in player | [AI] |
| Sound / music per scene | [BOTH] |
| Localization / multi-language stories | [BOTH] |
| Publish story to sharable URL | [BOTH] |
| Mobile-friendly player output | [AI] |
| Branching stats / analytics (which paths are taken) | [BOTH] |

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
2. **[AI]** — implement in the Narrium project according to spec
3. **[ME]** — review architecture, flow, UX and flag issues
4. **[AI]** — fixes and refactors
5. **[MANUAL]** — product decision, acceptance, merge to main

> After every completed task: update status in this file and in `CONTEXT.md`.
