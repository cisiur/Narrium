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
| Canvas / graph | React Flow |
| State management | Zustand |
| Styling | Tailwind CSS |
| Storage | localStorage (MVP); JSON export/import |
| Runtime player | Embedded React component |
| Bundler | Vite |

---

## Repository

- **URL:** https://github.com/cisiur/Narrium
- **Branch main:** documentation + stable releases
- **Branch dev:** active development
- **Source:** `/src/`
- **Documents:** `/docs/`

---

## Current project status

- ✅ GitHub repo created
- ✅ README.md written
- ✅ ROADMAP.md written (`docs/ROADMAP.md`)
- ✅ CONTEXT.md written
- ✅ All MVP product decisions resolved
- ⏳ DATA_MODEL.md (E0-03) — pending
- ⏳ SCREENS.md (E0-04) — pending
- ⏳ Vite + React + TS scaffold (E0-05) — pending
- ⏳ Tailwind setup (E0-06) — pending
- ⏳ Zustand store skeleton (E0-07) — pending
- ⏳ TypeScript types (E0-08) — pending

**Next task:** E0-03 DATA_MODEL.md (spec by Perplexity) → E0-04 SCREENS.md → E0-05 scaffold.

**No code has been written yet.**

---

## Data Model (canonical)

> This is the authoritative reference. All code must use these exact field names.

```typescript
interface WorkspaceProjectMeta {
  id: string;
  name: string;
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
  thumbnailDataUrl: string | null; // auto-generated from startScene background; user can override
}

interface Project {
  id: string;
  name: string;
  startSceneId: string;
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
  // mode determines which field is active
  mode: 'upload' | 'url' | 'asset' | 'scene_reference' | 'none';
  assetId: string | null;          // mode='asset': references AssetLibraryItem.id
  sourceSceneId: string | null;    // mode='scene_reference': copies background from another scene
  url: string;                     // mode='url': external URL; mode='upload': data URL (base64)
}

interface DialoguePage {
  id: string;
  speakerId: string | null;        // null = narrator
  text: string;
}

interface Choice {
  id: string;
  text: string;                    // button label shown to reader
  targetSceneId: string | null;    // null = unconnected (flagged in validation)
  conditions: Condition[];
  effects: Effect[];
}

interface Condition {
  id: string;
  type: 'resource' | 'character_attr';
  targetId: string;                // resourceId or characterId
  attribute?: string;              // character attribute key, only for type='character_attr'
  operator: '>=' | '<=' | '==' | '>' | '<' | '!=';
  value: number;
  hintText: string;                // shown to reader when condition is not met (choice greyed out)
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
  key: string;                     // e.g. "reputation"
  defaultValue: number;
}

interface Resource {
  id: string;
  name: string;                    // e.g. "gold"
  defaultValue: number;
}

interface SceneGroup {
  id: string;
  name: string;
  color: string;                   // hex, used for group border/label on canvas
  position: { x: number; y: number };
  size: { width: number; height: number };
  collapsed: boolean;              // post-MVP: collapse to single tile; field reserved now
}

interface AssetLibraryItem {
  id: string;
  kind: 'background';
  name: string;
  sourceType: 'upload' | 'url';
  // For 'upload': url contains data URL (base64). For 'url': url is external URL.
  url: string;
  createdAt: string;
}

interface ProjectSettings {
  allowSessionSaveLoad: boolean;   // exported HTML player supports save/load via localStorage
}
```

---

## Runtime State (Player)

```typescript
interface RuntimeState {
  currentSceneId: string;
  currentPageIndex: number;
  variables: {
    resources: Record<string, number>;                         // resourceId → current value
    characterAttrs: Record<string, Record<string, number>>;    // characterId → attr key → value
  };
  saveSlots?: RuntimeSaveSlot[];   // only present when ProjectSettings.allowSessionSaveLoad = true
}

interface RuntimeSaveSlot {
  id: string;
  savedAt: string;
  snapshot: Omit<RuntimeState, 'saveSlots'>;
}
```

---

## Workspace Model (My Projects)

```typescript
interface WorkspaceState {
  projects: WorkspaceProjectMeta[];
  activeProjectId: string | null;
}
```

Narrium has a **"My Projects"** start screen (Figma-style). The user works on **one active project at a time**; all projects are stored in localStorage. Full project data lives under key `narrium_project_{id}`; the workspace index lives under `narrium_workspace`.

---

## Product Decisions (all resolved)

| Topic | Decision |
|---|---|
| Canvas library | React Flow — node-based graph, edge routing, drag/pan/zoom |
| State | Zustand — `WorkspaceStore` + `ProjectStore` + `UIStore` |
| Storage | localStorage auto-save; JSON export/import |
| Multiple projects | Yes, "My Projects" screen; one active project at a time |
| Background sources | Local upload (base64 data URL in JSON) + external URL + asset library reuse + scene reference |
| Uploaded assets storage | Stored as base64 data URL inside project JSON — no separate file storage in MVP |
| Condition unmet | Choice is greyed-out with `hintText` — never hidden |
| Multiple speakers | `DialoguePage.speakerId`; null = narrator |
| Player exported | Standalone HTML with embedded JS + project JSON |
| Exported player save/load | Supported via localStorage; persists through browser refresh |
| No scripting language | All logic is declarative conditions and effects |
| First scene | `Project.startSceneId`; set to first created scene by default |
| Scene groups | Named visual containers on canvas in MVP; `collapsed` field reserved for post-MVP |
| Group collapse to tile | Post-MVP (backlog) |
| Free-tier limit | Counts **scenes only** (simplest, most legible to user) |
| Freemium enforcement | **Not enforced in MVP code** — documented only; hooks added in E6-08 |
| Monetization direction | Freemium → one-time per project or SaaS subscription later |
| Project thumbnail | Auto-generated from `startSceneId` background; user can manually override |

---

## Open Questions

*All MVP product questions resolved. No open items.*

---

## AI Role Breakdown

| Symbol | Who | When |
|---|---|---|
| [ME] | Perplexity (planning) | Architecture, specs, data model, task breakdown, UX review |
| [AI] | Codex / Claude Code (implementation) | TypeScript/React code, components, store, tests, repo files |
| [BOTH] | Perplexity spec → AI impl | Complex mechanics (condition logic, effect engine, player runtime) |
| [MANUAL] | Project owner | Product decisions, UX acceptance, asset choices, priorities, publishing |

**All prompts and instructions to Codex / Claude Code must be written in English.**

---

## Perplexity Workflow Instructions

> These instructions apply to every new Perplexity session working on this project.

1. **Verify repo state first** — check latest commits on `dev` via GitHub API before starting any task.
2. **Deliver ready-to-paste prompts** — for [AI] / [BOTH] tasks: a complete English prompt for Codex/Claude Code, self-contained with types, component names, and acceptance criteria.
3. **Ask before assuming** — if design decisions are unclear, ask the project owner first.
4. **Update both files after every task** — commit CONTEXT.md + ROADMAP.md to `dev` after each confirmed task.
5. **Keep prompts self-contained** — include enough context that the AI needs no other file to complete the task.

---

## Roadmap Summary

| Milestone | Goal | Status |
|---|---|---|
| M0 | Documentation & Foundation | 🔲 In progress |
| M1 | Workspace & Canvas Foundations | 🔲 Pending |
| M2 | Scene Editor Panel | 🔲 Pending |
| M3 | Characters & Resources | 🔲 Pending |
| M4 | Story Player | 🔲 Pending |
| M5 | Save, Load, Export | 🔲 Pending |
| M6 | Polish & UX | 🔲 Pending |

---

## Next Up

**E0-03** [ME] — Write `docs/DATA_MODEL.md`  
**E0-04** [ME] — Write `docs/SCREENS.md`  
**E0-05** [AI] — Scaffold Vite + React + TypeScript project

When resuming: paste this file as the first message, then tell Perplexity which task to start.
