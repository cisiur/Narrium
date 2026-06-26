# Context — Narrium

> This file is used to resume work on the project in a new AI session (Claude Code, Codex, Perplexity, ChatGPT, etc.).
> Paste the contents of this file at the beginning of a new conversation.

---

## What is this project

Narrium is a **no-code, browser-based visual novel editor**.

Authors build branching interactive stories by connecting scene tiles on a visual canvas — no programming required. Each scene has a background image, dialogue pages (speaker + text), and response choices. Each choice can carry conditions (e.g. `gold >= 10`) and effects (e.g. `reputation_guard += 3`). The finished story can be played in the browser or exported as a standalone HTML file.

Target user: non-technical authors (writers, game designers, hobbyists) who want to create branching narratives without code.

Platform: **web app (browser only)**. No mobile app for now.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React + TypeScript |
| Canvas / graph | React Flow (`reactflow` ^11) |
| State management | Zustand |
| Styling | Tailwind CSS v3 |
| Storage | localStorage (MVP); JSON export/import |
| Runtime player | Embedded React component |
| Bundler | Vite |

---

## Repository

- **URL:** https://github.com/cisiur/Narrium
- **Branch main:** active development, documentation, and stable project state
- **Branch dev:** not used; do not create or target a `dev` branch unless the project owner changes the workflow
- **Source:** `/src/`
- **Documents:** `/docs/`

---

## Current project status

### ✅ Completed

| Task | Notes |
|---|---|
| E0-01 GitHub repo, README.md | Done |
| E0-02 ROADMAP.md, CONTEXT.md | Done |
| E0-03 `docs/DATA_MODEL.md` | Done |
| E0-04 `docs/SCREENS.md` | Done |
| E0-05 Vite + React + TS scaffold | Done — `npm run dev` works, full folder structure |
| E0-06 Tailwind CSS setup | Done — `tailwind.config.ts`, `postcss.config.cjs`, base CSS |
| E0-07 Zustand store skeleton | Done — `workspaceStore.ts`, `useCanvasStore.ts` |
| E0-08 TypeScript types | Done — `src/types/index.ts` (all canonical interfaces) |
| E1 My Projects screen | Done — `MyProjectsScreen.tsx`, create/open project, card grid |
| E1 Workspace persistence | Done — `narrium_workspace` + `narrium_project_{id}` in localStorage |
| E1 React Flow canvas | Done — `SceneCanvas.tsx`, Background, Controls, MiniMap, empty state overlay |
| E1 SceneNode component | Done — `SceneNode.tsx`, page count, choice count, selected state |
| E1 Add scene | Done — "+ Add Scene" toolbar button, auto-positioned nodes |
| E1 Connect scenes | Done — drag edge → `targetSceneId` set on choice; first free choice reused |
| E1 Delete edge | Done — removes `targetSceneId` from corresponding choice |
| E1 Select scene | Done — click node → `selectedSceneId` set, editor panel opens |
| E1 Canvas persist layout | Done — node drag updates `scene.position` in store + localStorage |
| E2 Scene editor panel | Done — `SceneEditorPanel.tsx`, slide-in, collapsible sections |
| E2 Scene name edit | Done — inline editable, Enter/blur to save |
| E2 Dialogue pages | Done — add, edit (textarea), delete (disabled on last page) |
| E2 Choices | Done — add, edit text, delete; shows target scene name or "→ not connected" |

### ⏳ Next up

**E2 — Background System** (E2-05, E2-06, E2-07): background picker (URL / local upload / asset library), asset library panel, background preview on SceneNode thumbnail.

---

## Source structure

```
src/
  app/
    App.tsx                   ← root component, routes between MyProjects and canvas
    index.ts
  components/
    AppShell.tsx              ← top toolbar, left nav strip (48px), right panel slot
  features/
    workspace/
      MyProjectsScreen.tsx    ← "My Projects" grid, create project button
      index.ts
    canvas/
      SceneCanvas.tsx         ← React Flow canvas, empty state overlay
      SceneNode.tsx           ← custom node: name, page count, choice count
    editor/
      SceneEditorPanel.tsx    ← right panel: name, background (stub), pages, choices
    player/                   ← empty, E4
    characters/               ← empty, E3
    resources/                ← empty, E3
    assets/                   ← empty, E2-06
  store/
    workspaceStore.ts         ← Zustand: projects[], activeProject, createProject, updateActiveProject
    useCanvasStore.ts         ← Zustand: nodes, edges, selectedSceneId, all scene/page/choice mutations
  types/
    index.ts                  ← all canonical TypeScript interfaces
  styles/
    index.css                 ← Tailwind directives + base reset
  main.tsx
```

---

## Data Model (canonical)

> This is the authoritative reference. All code must use these exact field names and types.
> Defined in `src/types/index.ts`.

```typescript
interface WorkspaceProjectMeta {
  id: string;
  name: string;
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
  thumbnailDataUrl: string | null;
}

interface WorkspaceState {
  projects: WorkspaceProjectMeta[];
  activeProjectId: string | null;
}

interface Project {
  id: string;
  name: string;
  startSceneId: string;          // '' when no scenes yet; set to first scene's id on addScene
  scenes: Scene[];
  characters: Character[];
  resources: Resource[];
  groups: SceneGroup[];
  assetLibrary: AssetLibraryItem[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

interface Scene {
  id: string;
  name: string;
  background: SceneBackground;
  position: { x: number; y: number };
  dialoguePages: DialoguePage[];
  choices: Choice[];
  groupId: string | null;
}

interface SceneBackground {
  mode: 'upload' | 'url' | 'asset' | 'scene_reference' | 'none';
  assetId: string | null;        // ref to AssetLibraryItem.id when mode='asset'
  sourceSceneId: string | null;  // ref to Scene.id when mode='scene_reference'
  url: string;                   // data URL (upload) or external URL (url mode)
}

interface DialoguePage {
  id: string;
  speakerId: string | null;      // null = Narrator
  text: string;
}

interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditions: Condition[];
  effects: Effect[];
}

interface Condition {
  id: string;
  type: 'resource' | 'character_attr';
  targetId: string;
  attribute?: string;            // required when type='character_attr'
  operator: '>=' | '<=' | '==' | '>' | '<' | '!=';
  value: number;
  hintText: string;
}

interface Effect {
  id: string;
  type: 'resource' | 'character_attr';
  targetId: string;
  attribute?: string;
  operation: '+=' | '-=' | '=';
  value: number;
}

interface Character {
  id: string;
  name: string;
  attributes: CharacterAttribute[];
}

interface CharacterAttribute {
  key: string;
  defaultValue: number;
}

interface Resource {
  id: string;
  name: string;
  defaultValue: number;
}

interface SceneGroup {
  id: string;
  name: string;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  collapsed: boolean;            // reserved for post-MVP
}

interface AssetLibraryItem {
  id: string;
  kind: 'background';
  name: string;
  sourceType: 'upload' | 'url';
  url: string;                   // data URL (upload) or external URL
  createdAt: string;
}

interface ProjectSettings {
  allowSessionSaveLoad: boolean;
}

interface RuntimeState {
  currentSceneId: string;
  currentPageIndex: number;
  variables: {
    resources: Record<string, number>;
    characterAttrs: Record<string, Record<string, number>>;
  };
  saveSlots?: RuntimeSaveSlot[];
}

interface RuntimeSaveSlot {
  id: string;
  savedAt: string;
  snapshot: Omit<RuntimeState, 'saveSlots'>;
}
```

---

## Store Architecture

### `workspaceStore.ts` — `useWorkspaceStore`

```typescript
interface WorkspaceStore extends WorkspaceState {
  activeProject: Project | null;
  createProject: () => WorkspaceProjectMeta;
  updateActiveProject: (updater: (project: Project) => Project) => void;
}
```

- Persists `narrium_workspace` (project metas list) + `narrium_project_{id}` (full project) to localStorage on every mutation.
- `updateActiveProject` auto-updates `updatedAt`.

### `useCanvasStore.ts` — `useCanvasStore`

```typescript
interface CanvasStore {
  nodes: Node<SceneNodeData>[];
  edges: Edge[];
  selectedSceneId: string | null;
  activeView: 'canvas' | 'editor';
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addScene(name: string): void;
  deleteScene(id: string): void;
  selectScene(id: string | null): void;
  openEditor(id: string): void;
  syncFromProject(): void;
  updateSceneName(sceneId: string, name: string): void;
  addDialoguePage(sceneId: string): void;
  updateDialoguePage(sceneId: string, pageId: string, text: string): void;
  deleteDialoguePage(sceneId: string, pageId: string): void;
  addChoice(sceneId: string): void;
  updateChoiceText(sceneId: string, choiceId: string, text: string): void;
  deleteChoice(sceneId: string, choiceId: string): void;
}
```

- All mutations call `updateActiveProject()` then `syncFromProject()`.
- `syncFromProject()` rebuilds `nodes[]` and `edges[]` from `activeProject.scenes`.
- Node drag updates `scene.position` via `onNodesChange`.
- Edge removal clears `choice.targetSceneId` via `onEdgesChange`.
- `onConnect` reuses first unconnected choice; otherwise creates new choice.

---

## Known Issues / Technical Debt

| Issue | Severity | Notes |
|---|---|---|
| `startSceneId: ''` on new project | Low | Empty string instead of `null`; fine for now but consider `string \| null` in type |
| `activeView` not used in App.tsx routing | Low | Currently layout is driven by `selectedSceneId`; `activeView` is redundant until E4+ |

---

## Product Decisions (all resolved)

| Topic | Decision |
|---|---|
| Canvas library | React Flow — node-based graph, edge routing, drag/pan/zoom |
| State | Zustand — `useWorkspaceStore` + `useCanvasStore` |
| Storage | localStorage auto-save; JSON export/import |
| Multiple projects | Yes, "My Projects" screen; one active project at a time |
| Background sources | Local upload (base64 data URL) + external URL + asset library reuse + scene reference |
| Uploaded assets storage | Stored as base64 data URL inside project JSON — no separate file storage in MVP |
| Condition unmet | Choice is greyed-out with `hintText` — never hidden |
| Multiple speakers | `DialoguePage.speakerId`; null = narrator |
| Player exported | Standalone HTML with embedded JS + project JSON |
| Exported player save/load | Supported via localStorage |
| No scripting language | All logic is declarative conditions and effects |
| First scene | `Project.startSceneId`; set to first created scene's id by `addScene` |
| Scene groups | Named visual containers on canvas; `collapsed` reserved for post-MVP |
| Free-tier limit | Counts scenes only |
| Freemium enforcement | Not enforced in MVP code — hooks added in E6-08 |
| Project thumbnail | Auto-generated from `startSceneId` background; user can manually override |

---

## Open Questions

*All MVP product questions resolved. No open items.*

---

## AI Role Breakdown

| Symbol | Who | When |
|---|---|---|
| [ME] | Perplexity replacement / PM planning | Architecture, specs, data model, task breakdown, UX review |
| [AI] | Codex / Claude Code (implementation) | TypeScript/React code, components, store, tests, repo files |
| [BOTH] | PM spec → AI impl | Complex mechanics (condition logic, effect engine, player runtime) |
| [MANUAL] | Project owner | Product decisions, UX acceptance, asset choices, priorities, publishing |

**All prompts and instructions to Codex / Claude Code must be written in English.**

---

## PM Workflow Instructions

1. **Verify repo state first** — check latest commits via GitHub API before starting any task.
2. **Work directly on `main`** — do not use, create, or target a `dev` branch unless the project owner explicitly changes the workflow.
3. **Deliver ready-to-paste prompts** — for [AI] / [BOTH] tasks: a complete English prompt for Codex/Claude Code, self-contained with types, component names, and acceptance criteria.
4. **Ask before assuming** — if design decisions are unclear, ask the project owner first.
5. **Update both files after every confirmed task** — commit CONTEXT.md + ROADMAP.md to `main`.
6. **Keep prompts self-contained** — include enough context that the AI needs no other file to complete the task.

---

## Roadmap Summary

| Milestone | Goal | Status |
|---|---|---|
| M0 | Documentation & Foundation | ✅ Done |
| M1 | Workspace & Canvas Foundations | ✅ Done |
| M2 | Scene Editor Panel | 🔲 In progress (background system next) |
| M3 | Characters & Resources | 🔲 Pending |
| M4 | Story Player | 🔲 Pending |
| M5 | Save, Load, Export | 🔲 Pending |
| M6 | Polish & UX | 🔲 Pending |

---

## Next Up

**E2-05 + E2-06 + E2-07** [BOTH/AI] — Background picker (URL / upload / asset library) + Asset Library panel + SceneNode background thumbnail preview.

When resuming: paste this file as the first message, then tell the PM which task to start.
