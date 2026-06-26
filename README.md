# Narrium — Visual Novel Editor

A no-code, browser-based visual novel editor. Authors build branching stories by connecting scene tiles on a visual canvas — no programming required.

## What is Narrium?

Narrium is a web-based story editor for creators who want to make branching interactive narratives without writing a single line of code. The author works on a **visual canvas of scene tiles** connected by arrows. Each scene holds a background, dialogue pages, and response choices. Each choice leads to the next scene, can carry effects (resource change, reputation change) and can require conditions (minimum resource or reputation) to be available.

The finished story runs as a self-contained interactive player in the browser, or is exported as a standalone HTML file.

---

## Core Concepts

| Concept | Description |
|---|---|
| **Scene** | A tile on the canvas — holds background, dialogue, choices, and logic |
| **Dialogue Page** | One page of dialogue inside a scene (multiple speakers supported) |
| **Choice** | A response option at the end of a scene's dialogue; points to a target scene |
| **Condition** | A requirement on a Choice (e.g. `gold >= 10`); choice is greyed out with a hint if unmet |
| **Effect** | A change applied when a Choice is selected (e.g. `reputation_guard + 3`) |
| **Character** | A named person with tracked attributes (e.g. reputation) |
| **Resource** | A global numeric value tracked across the story (e.g. gold, health) |

---

## MVP Scope

The MVP delivers a working story editor and player with:

- Visual canvas: add, move, connect, and delete scene tiles
- Scene editor panel (right sidebar): background, dialogue pages, choices
- Choice editor: target scene, conditions, effects
- Character & Resource definition screen (separate tab)
- Live preview player: play through the story in-browser
- JSON export / import

See `docs/ROADMAP.md` for the full task breakdown.

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

## Repository Structure

```
narrium/
├── src/
│   ├── canvas/           — canvas, node rendering, edge logic
│   ├── editor/           — scene editor panel, dialogue editor, choice editor
│   ├── player/           — story player / preview runtime
│   ├── store/            — Zustand state: project, scenes, characters, resources
│   ├── types/            — TypeScript types: Scene, Choice, Effect, Condition, etc.
│   └── App.tsx
├── docs/
│   ├── ROADMAP.md        — milestones, epics, task breakdown
│   ├── DATA_MODEL.md     — canonical data model reference
│   └── SCREENS.md        — editor screen descriptions
├── CONTEXT.md            — AI session resume file
└── README.md
```

---

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Project Status

**Current milestone:** M0 — Documentation & Foundation  
See `CONTEXT.md` for current task status and `docs/ROADMAP.md` for the full plan.

---

## License

MIT
