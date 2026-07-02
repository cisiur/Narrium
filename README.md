# Narrium - Visual Novel Editor

A no-code, desktop-first visual novel editor. Authors build branching stories by connecting scene tiles on a visual canvas, no programming required.

The completed browser MVP is archived on branch `MVP_web_legacy`. Active development on `main` is moving toward a desktop-first editor with local project folders, local asset files, and future playable exports.

## What is Narrium?

Narrium is a story editor for creators who want to make branching interactive narratives without writing a single line of code. The author works on a **visual canvas of scene tiles** connected by arrows. Each scene holds a background, dialogue pages, and response choices. Each choice leads to the next scene, can carry effects, and can require conditions to be available.

The validated web MVP runs stories in the browser and can export standalone HTML. The future desktop direction keeps that foundation while moving production storage toward local project folders and local asset files.

---

## Core Concepts

| Concept | Description |
|---|---|
| **Scene** | A tile on the canvas that holds background, dialogue, choices, and logic |
| **Dialogue Page** | One page of dialogue inside a scene, with multiple speakers supported |
| **Choice** | A response option at the end of a scene's dialogue; points to a target scene or performs an action |
| **Condition** | A requirement on a Choice, such as `gold >= 10`; choice is disabled with a hint if unmet |
| **Effect** | A change applied when a Choice is selected, such as `reputation_guard += 3` |
| **Character** | A named person with tracked attributes |
| **Resource** | A global numeric value tracked across the story, such as gold or health |
| **Variable** | A hidden/internal numeric story-state value |

---

## MVP Status

The browser MVP delivers a working story editor and player with:

- Visual canvas: add, move, connect, and delete scene tiles
- Scene editor panel: background, dialogue pages, choices
- Choice editor: target scene, conditions, effects
- Characters, Resources, and Variables screens
- Live preview player: play through the story in-browser
- JSON export/import
- Standalone HTML export

This MVP is complete and archived on `MVP_web_legacy`.

See `docs/ROADMAP.md` for the full task breakdown.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React + TypeScript |
| Canvas / graph | React Flow |
| State management | Zustand |
| Styling | Tailwind CSS |
| Storage | localStorage in archived web MVP; local project folders planned for desktop |
| Runtime player | Embedded React component |
| Bundler | Vite |

---

## Repository Structure

```text
narrium/
  src/
    app/
    components/
    features/
    store/
    types/
    utils/
  docs/
    ROADMAP.md
    DATA_MODEL.md
    DESKTOP_ARCHITECTURE.md
    SCREENS.md
  CONTEXT.md
  README.md
```

---

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser for the current web-based development UI.

---

## Project Status

**Current direction:** desktop-first pivot on `main`.

See `CONTEXT.md`, `docs/ROADMAP.md`, and `docs/DESKTOP_ARCHITECTURE.md` for current status and next steps.

---

## License

MIT
