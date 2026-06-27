# Context — Narrium

> This file is used to resume work on Narrium in a new AI session.  
> Paste this file at the beginning of a new conversation before asking for planning, review, or implementation prompts.

---

## What is this project

Narrium is a **no-code, browser-based visual novel editor**.

Authors build branching interactive stories by connecting scene tiles on a visual canvas — no programming required. Each scene can contain a background image, dialogue pages, and response choices. Each choice can later carry declarative conditions and effects.

The finished story should eventually be playable in the browser and exportable as a standalone HTML file.

Target user:
- non-technical authors
- writers
- game designers
- hobbyists
- people who want to create branching narratives without coding

Platform:
- browser-only web app for MVP
- no mobile app for now

---

## Repository

- **URL:** https://github.com/cisiur/Narrium
- **Active branch:** `main`
- **Do not use:** `dev` branch
- **Source:** `/src/`
- **Docs:** `/docs/`

Workflow:
- Active development happens directly on `main`.
- Do not create or target a `dev` branch unless the project owner explicitly changes the workflow.
- After confirmed task batches, update both `ROADMAP.md` and `CONTEXT.md`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React + TypeScript |
| Canvas / graph | React Flow (`reactflow` ^11) |
| State management | Zustand |
| Styling | Tailwind CSS v3 |
| Storage | localStorage for MVP |
| Project format | JSON-compatible `Project` object |
| Runtime player | Future embedded React player |
| Bundler | Vite |

---

## Current Implementation Status

### Completed

#### Workspace / Projects

- My Projects screen.
- Create local project.
- Open existing local project.
- Return from canvas to My Projects.
- Rename project from My Projects.
- Active project name displayed in canvas header.
- Workspace persistence:
  - `narrium_workspace`
  - `narrium_project_{id}`
- Multiple local projects.

#### Canvas Graph Editor

- React Flow canvas.
- Background dots.
- Controls.
- MiniMap.
- Empty state.
- Scene nodes.
- Node drag persists `scene.position`.
- Add scene from toolbar.
- Edge creation.
- Edge deletion.
- Left-to-right handles:
  - input / target: left
  - output / source: right
- Dragging an edge always creates a new Choice.
- Edge label comes from Choice text.
- Clicking an edge opens the corresponding Choice inside Scene Editor.

#### Scene Editor

- Right sidebar panel.
- Scene name inline editing.
- Dialogue pages:
  - add
  - edit
  - delete
  - last page cannot be deleted
- Choices:
  - add
  - edit text
  - delete
  - show target scene
  - target scene dropdown
  - edge-click highlight + scroll into view

#### Background System

- Background picker modes:
  - `none`
  - `url`
  - `upload`
  - `asset`
  - `scene_reference`
- External image URL preview.
- Local upload stored as Data URL.
- Scene reference background mode.
- Project Asset Library:
  - add URL asset
  - add upload asset
  - list background assets
  - use asset as scene background
  - delete asset
  - reset scenes using deleted asset
- SceneNode background thumbnails:
  - URL
  - upload
  - asset
  - one-level scene reference
  - placeholders for missing/no background

---

## Next Milestone

### EPIC 5 — Characters & Resources

Goal:
Complete the data model and UI foundation required for later Story Logic.

Next recommended work:
1. Characters tab/screen foundation.
2. Character list.
3. Add/edit/delete character.
4. Character attributes.
5. Resources tab/screen foundation.
6. Resource list.
7. Add/edit/delete resource.

Important:
- Do **not** start Conditions or Effects until Characters and Resources are implemented.
- Story Logic is now a separate epic because it is more complex than the basic data setup.

---

## Core Architecture Principles

These rules are important. Future agents should preserve them.

### 1. Project is the single source of truth

All meaningful story data belongs to the `Project` object.

React state, React Flow nodes, and UI selections are derived from project state where possible.

### 2. React Flow is a projection

React Flow nodes and edges are generated from `Project.scenes`.

Do not store domain data in React Flow nodes/edges as the source of truth.

### 3. Choice is the source of truth for connections

A React Flow edge is not a domain object.

Edges are projections of:

```typescript
Choice.targetSceneId
```

Current edge id format:

```typescript
`${scene.id}:${choice.id}`
```

Clicking an edge should navigate to the corresponding Choice editor.

Deleting an edge clears `choice.targetSceneId`.

Dragging a new edge creates a new Choice.

### 4. Editors modify Project data

Editor panels should call store actions that update the active Project.

Do not duplicate persistence logic inside UI components.

### 5. Persistence lives in workspaceStore

`workspaceStore.updateActiveProject()` is responsible for:
- updating active project
- updating `updatedAt`
- persisting full project to `narrium_project_{id}`
- updating project metadata in `narrium_workspace`

### 6. Canvas store synchronizes from Project

`useCanvasStore.syncFromProject()` rebuilds:
- nodes
- edges
- selection validity

After a mutation that changes scene graph data, call `syncFromProject()`.

### 7. Keep implementation prompts scoped

Each Codex prompt should:
- work directly on `main`
- avoid unrelated refactors
- list relevant files
- include acceptance criteria
- say whether docs should or should not be updated

---

## Source Structure

```text
src/
  app/
    App.tsx
    index.ts

  components/
    AppShell.tsx

  features/
    workspace/
      MyProjectsScreen.tsx

    canvas/
      SceneCanvas.tsx
      SceneNode.tsx

    editor/
      SceneEditorPanel.tsx

    player/
      empty / future E7

    characters/
      empty / future E5

    resources/
      empty / future E5

    assets/
      empty or future extraction area

  store/
    workspaceStore.ts
    useCanvasStore.ts

  types/
    index.ts

  styles/
    index.css

  main.tsx
```

Notes:
- The background asset management UI currently lives inside `SceneEditorPanel.tsx`.
- This is acceptable for MVP but may later be extracted into smaller components.
- The right sidebar is currently used for scene editing and choice editing.

---

## Data Model — Canonical Summary

The authoritative TypeScript definitions live in:

```text
src/types/index.ts
```

Important structures:

```typescript
interface WorkspaceProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnailDataUrl: string | null;
}

interface WorkspaceState {
  projects: WorkspaceProjectMeta[];
  activeProjectId: string | null;
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
  mode: 'upload' | 'url' | 'asset' | 'scene_reference' | 'none';
  assetId: string | null;
  sourceSceneId: string | null;
  url: string;
}

interface DialoguePage {
  id: string;
  speakerId: string | null;
  text: string;
}

interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditions: Condition[];
  effects: Effect[];
}

interface AssetLibraryItem {
  id: string;
  kind: 'background';
  name: string;
  sourceType: 'upload' | 'url';
  url: string;
  createdAt: string;
}
```

Future structures already planned:
- `Character`
- `CharacterAttribute`
- `Resource`
- `Condition`
- `Effect`
- `RuntimeState`
- `RuntimeSaveSlot`

---

## Store Architecture

### `workspaceStore.ts`

Responsibilities:
- project list
- active project
- create project
- open project
- close project
- rename project
- update active project
- persistence

Known actions:
- `createProject()`
- `openProject(projectId)`
- `closeProject()`
- `renameProject(projectId, newName)`
- `updateActiveProject(updater)`

Persistence:
- workspace metadata saved to `narrium_workspace`
- full project saved to `narrium_project_{id}`

### `useCanvasStore.ts`

Responsibilities:
- React Flow nodes and edges
- selected scene
- selected choice
- active view
- scene mutations
- dialogue mutations
- choice mutations
- background mutations
- asset library mutations
- sync from project

Known actions include:
- `syncFromProject()`
- `addScene(name)`
- `deleteScene(id)`
- `selectScene(id | null)`
- `selectChoice(sceneId, choiceId)`
- `clearSelectedChoice()`
- `openEditor(id)`
- `updateSceneName(sceneId, name)`
- `updateSceneBackground(sceneId, background)`
- `addDialoguePage(sceneId)`
- `updateDialoguePage(sceneId, pageId, text)`
- `deleteDialoguePage(sceneId, pageId)`
- `addChoice(sceneId)`
- `updateChoiceText(sceneId, choiceId, text)`
- `updateChoiceTarget(sceneId, choiceId, targetSceneId | null)`
- `deleteChoice(sceneId, choiceId)`
- `addBackgroundAsset(input)`
- `deleteBackgroundAsset(assetId)`
- `updateBackgroundAssetName(assetId, name)`

---

## Canvas Interaction Rules

### Scene click

Clicking a SceneNode:
- selects scene
- opens Scene Editor

### Edge drag

Dragging from source scene to target scene:
- creates a new Choice in source scene
- sets `targetSceneId`
- choice text becomes `Go to {target scene name}` when possible

### Edge delete

Deleting an edge:
- clears corresponding `choice.targetSceneId`
- does not delete the Choice

### Edge click

Clicking an edge:
- parses edge id as `sceneId:choiceId`
- selects source scene
- selects the corresponding Choice
- opens Scene Editor
- highlights and scrolls the Choice into view

### Choice Target dropdown

Changing target in Choice dropdown:
- updates `choice.targetSceneId`
- React Flow edge updates automatically after `syncFromProject()`

---

## Background System Rules

### Supported modes

```text
none
url
upload
asset
scene_reference
```

### URL

Stores external URL in:

```typescript
scene.background.url
```

### Upload

Stores base64 Data URL in:

```typescript
scene.background.url
```

No compression/resizing yet.

### Asset

Stores reference only:

```typescript
scene.background.assetId
```

Asset data lives in:

```typescript
project.assetLibrary
```

### Scene Reference

Stores:

```typescript
scene.background.sourceSceneId
```

Thumbnail preview resolves only one level.

Do not implement recursive scene-reference resolution unless explicitly requested.

### Deleted asset behavior

When a background asset is deleted:
- remove it from `project.assetLibrary`
- reset any scene using that asset to background mode `none`

---

## Product Decisions

| Topic | Decision |
|---|---|
| Canvas library | React Flow |
| State | Zustand |
| Storage | localStorage for MVP |
| Multiple projects | Yes |
| Active project navigation | My Projects is the hub; project can be closed without deletion |
| Project rename | From My Projects screen |
| Canvas header | Shows active project name |
| Edge model | Edge is projection of Choice, not a domain object |
| New edge behavior | Always creates a new Choice |
| Edge click behavior | Opens corresponding Choice editor |
| Choice target editing | Dropdown in Choice editor |
| Background sources | none, URL, upload, asset, scene reference |
| Asset storage | Project-level Asset Library |
| Uploaded image storage | Data URL inside project JSON for MVP |
| Scene reference thumbnails | One level only |
| Conditions/effects | Declarative, future Story Logic epic |
| First scene | `Project.startSceneId`; set to first created scene |
| Free-tier limit | Counts scenes only, future |
| Exported player | Future standalone HTML with embedded project JSON |

---

## Known Issues / Technical Debt

| Issue | Severity | Notes |
|---|---|---|
| `startSceneId: ''` | Low | Empty string instead of `null`; acceptable for now |
| Large uploads can fill localStorage | Medium | Future compression/resizing or storage strategy needed |
| Background editor is large | Low/Medium | Consider extracting components or tabs later |
| Asset Library always visible inside Background section | Low | Acceptable for MVP |
| No project delete | Medium | Needed soon for workspace management |
| No JSON import/export yet | Medium | Planned in Save/Export epic |
| No validation panel | Medium | Planned after Story Logic |
| No undo/redo | Medium | Future Polish epic |
| Scene groups not implemented | Low/Medium | Can wait until larger graphs |
| AppShell sidebar placeholders are basic | Low | Polish later |

---

## Recommended Next Tasks

### Immediate next task

Start **EPIC 5 — Characters & Resources**.

Recommended first implementation task:

```text
E5-01 — Characters tab/screen foundation
```

Goal:
- Add a place in the app shell / sidebar to switch between Canvas and Characters.
- Create basic Characters screen.
- Do not implement conditions/effects yet.

### After that

1. Character list.
2. Add/edit/delete character.
3. Character attributes.
4. Resources screen.
5. Resource list.
6. Add/edit/delete resource.

Only then start **EPIC 6 — Story Logic**.

---

## PM Workflow Instructions

1. Verify repo state first.
2. Work directly on `main`.
3. Do not use, create, or target `dev`.
4. For implementation tasks, provide a complete English prompt for Codex/Claude Code.
5. Keep prompts self-contained.
6. Ask the owner before making product assumptions.
7. Review implementation after each push.
8. Update docs after confirmed task batches.
9. Do not duplicate UI or data models unless explicitly justified.
10. Keep `Project` as the central source of truth.

---

## Prompt Style for Codex

Every Codex prompt should include:

```text
You are working on the Narrium repository.

Role: implementation agent.

Important workflow:
- Work directly on the `main` branch.
- Do not create or target a `dev` branch.
- Keep this task focused.
- Do not implement unrelated roadmap items.
```

Then include:
- Task name
- Goal
- Context
- Relevant files
- Requirements
- Out of scope
- Acceptance criteria
- Suggested commit message
