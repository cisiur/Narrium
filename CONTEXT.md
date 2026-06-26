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
- ✅ ROADMAP.md written (docs/ROADMAP.md)
- ✅ CONTEXT.md written
- ⏳ DATA_MODEL.md (E0-03) — pending
- ⏳ SCREENS.md (E0-04) — pending
- ⏳ Vite + React + TS scaffold (E0-05) — pending
- ⏳ Tailwind setup (E0-06) — pending
- ⏳ Zustand store skeleton (E0-07) — pending
- ⏳ TypeScript types (E0-08) — pending

**Next task:** E0-03 DATA_MODEL.md (spec by Perplexity) → then E0-05 project scaffold (AI implementation).

**No code has been written yet.**

---

## Data Model (canonical)

> This is the authoritative reference. All code must use these exact field names.

```typescript
interface Project {
  id: string;
  name: string;
  startSceneId: string;
  scenes: Scene[];
  characters: Character[];
  resources: Resource[];
}

interface Scene {
  id: string;
  name: string;
  backgroundUrl: string;
  position: { x: number; y: number };   // canvas position
  dialoguePages: DialoguePage[];
  choices: Choice[];
}

interface DialoguePage {
  id: string;
  speakerId: string | null;             // null = narrator
  text: string;
}

interface Choice {
  id: string;
  text: string;                         // button label
  targetSceneId: string | null;         // null = unconnected
  conditions: Condition[];
  effects: Effect[];
}

interface Condition {
  id: string;
  type: 'resource' | 'character_attr';
  targetId: string;                     // resourceId or characterId
  attribute?: string;                   // for character_attr: attribute name
  operator: '>=' | '<=' | '==' | '>' | '<' | '!=';
  value: number;
  hintText: string;                     // shown to player when condition is not met
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
  key: string;                          // e.g. "reputation"
  defaultValue: number;
}

interface Resource {
  id: string;
  name: string;                         // e.g. "gold"
  defaultValue: number;
}
```

---

## Runtime State (Player)

```typescript
interface RuntimeState {
  currentSceneId: string;
  currentPageIndex: number;
  variables: {
    resources: Record<string, number>;        // resourceId → current value
    characterAttrs: Record<string, Record<string, number>>;  // characterId → attr → value
  };
}
```

---

## Key Design Decisions

| Topic | Decision |
|---|---|
| Canvas library | React Flow — node-based graph, edge routing, built-in drag/pan/zoom |
| State | Zustand — single `ProjectStore` (project data) + `UIStore` (selected scene, panel state) |
| Storage MVP | localStorage auto-save; JSON export/import for portability |
| Condition unmet | Choice is rendered greyed-out with `hintText` — never hidden |
| Multiple speakers | DialoguePage has `speakerId`; null = narrator voice |
| Player exported | Standalone HTML file with embedded JS + project JSON — no server needed |
| No scripting | No custom scripting language; all logic is declarative conditions and effects |
| First scene | `Project.startSceneId` defines entry point; set to first created scene by default |

---

## Open Questions (to be decided)

- [ ] Should scene backgrounds support local file upload (MVP) or URL-only?
- [ ] Should the canvas support scene groups / folders for large projects?
- [ ] Should the exported HTML player support save/load within a session?
- [ ] What's the target monetization model (SaaS subscription, one-time, free)?
- [ ] Should Narrium support multiple simultaneous projects, or one project per session (MVP)?

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

1. **Verify repo state first** — before starting any task, check the latest commits on `dev` via GitHub API to confirm what was actually implemented.

2. **Deliver ready-to-paste AI prompts, not specs** — when a task is [AI] or [BOTH], provide a complete prompt in English that can be pasted directly into Codex or Claude Code without editing. Format: markdown code block with context header, existing type inventory, task description with exact interface/component signatures, requirements, and test or acceptance criteria list. The prompt IS the spec.

3. **Ask before every step if there are doubts** — before generating a prompt for the next task, check:
   - Are there design decisions to clarify?
   - Does anything in the previous implementation look unexpected?
   - Are there naming or architecture concerns?
   If yes, ask the project owner first. Do not assume.

4. **Update CONTEXT.md and ROADMAP.md after every completed task** — commit both files to `dev` after a task is confirmed done.

5. **Keep prompts self-contained** — every AI prompt must include enough context (types, existing component names, relevant store fields) that the AI does not need to read any other file to complete the task.

---

## Roadmap Summary

| Milestone | Goal | Status |
|---|---|---|
| M0 | Documentation & Foundation | 🔲 In progress |
| M1 | Canvas (scene tiles, connections) | 🔲 Pending |
| M2 | Scene Editor Panel | 🔲 Pending |
| M3 | Characters & Resources | 🔲 Pending |
| M4 | Story Player | 🔲 Pending |
| M5 | Save, Load, Export | 🔲 Pending |
| M6 | Polish & UX | 🔲 Pending |

---

## Next Up

**E0-03** [ME] — Write `docs/DATA_MODEL.md` (detailed data model documentation for AI sessions)  
**E0-04** [ME] — Write `docs/SCREENS.md` (editor screen breakdown)  
**E0-05** [AI] — Scaffold Vite + React + TypeScript project

When resuming:
1. Paste this file as the first message in a new Perplexity session
2. Tell Perplexity which task to start (e.g. „Start E0-05”)
