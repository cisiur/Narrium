# Context — Narrium

> This file is used to resume work on Narrium in a new AI session.  
> Paste this file at the beginning of a new conversation before asking for planning, review, or implementation prompts.

---

## What is this project

Narrium is a **no-code, browser-based visual novel editor**.

Authors build branching interactive stories by connecting scene tiles on a visual canvas — no programming required. Each scene can contain a background image, dialogue pages, and response choices. Each choice can carry declarative condition groups and, later, declarative effects.

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
- The assistant acts as PM.
- Codex implements.
- The project owner makes product decisions.
- The assistant should not generate implementation code directly unless explicitly asked.
- First provide plan and rationale.
- Codex prompts are created only after product-owner acceptance.
- Codex prompts must be in English and ready to paste.
- After each push, review the implementation against the accepted scope.
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

#### Project Navigation

- Project-level view state:
  - `canvas`
  - `characters`
  - `resources`
- Left project sidebar switches between Canvas, Characters, and Resources.
- Opening a project defaults to Canvas.
- Canvas keeps the right Scene Editor panel.
- Characters and Resources use full-width main screens without the Scene Editor panel.

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
  - condition editor embedded under each Choice

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

#### Characters

- Characters project view.
- Character list.
- Add character.
- Rename character inline.
- Delete character.
- Character attributes section per character.
- Add character attribute.
- Rename attribute key inline.
- Edit numeric attribute default value.
- Negative and decimal attribute values are supported.
- Invalid attribute values are stored as `0`.
- Delete character attribute.
- Duplicate attribute keys are resolved per character with suffixes such as `strength_2`, `strength_3`.
- Character mutations use `workspaceStore.updateActiveProject()`.

#### Resources

- Resources project view.
- Resource list.
- Add resource.
- Rename resource key inline.
- Edit numeric resource default value.
- Negative and decimal resource values are supported.
- Invalid resource values are stored as `0`.
- Delete resource.
- Duplicate resource keys are resolved project-wide with suffixes such as `gold_2`, `gold_3`.
- Resource mutations use `workspaceStore.updateActiveProject()`.

#### Story Logic — Conditions

- `ConditionGroup` data model added.
- `Choice.conditions` migrated to `Choice.conditionGroups`.
- Backward compatibility exists for old localStorage projects that still contain legacy `conditions`.
- Legacy non-empty `conditions` migrate into one default condition group.
- Legacy empty `conditions` migrate into `conditionGroups: []`.
- Condition groups represent:
  - OR between groups
  - AND inside each group
- Choice editor now includes a Conditions section.
- Add/delete OR condition groups.
- Add/delete condition rows inside groups.
- Resource conditions:
  - select project Resource
  - display `Resource.key`
  - store `Resource.id` in `condition.targetId`
  - edit operator, value, and hint text
  - visual warnings for missing/deleted resources
- Character Attribute conditions:
  - select Character
  - display `Character.name`
  - store `Character.id` in `condition.targetId`
  - select Character Attribute
  - display/store `CharacterAttribute.key` in `condition.attribute`
  - edit operator, value, and hint text
  - visual warnings for missing/deleted characters and attributes
- Condition value input supports integers, decimals, and negative numbers.
- Invalid numeric condition values are stored as `0`.
- Condition validation is visual only.
- Condition validation does not auto-fix stored data.
- No runtime condition evaluation yet.
- No effects editor yet.
- Condition editor has been refactored into `src/features/story-logic/`.

---

## Current Milestone

### EPIC 6 — Story Logic

Goal:
Allow authors to define declarative conditions and effects on choices.

Current state:
- The Conditions part of Story Logic is implemented for MVP editor use.
- Condition groups, resource conditions, character attribute conditions, and inline validation warnings are complete.
- Condition editor code has been extracted from `SceneEditorPanel.tsx` into dedicated story-logic components.
- Runtime evaluation is not implemented yet.
- Effects UI is not implemented yet.

Recommended next work:
1. Effect data model review and final acceptance.
2. Choice effect list UI foundation.
3. Add/edit/delete resource effects.
4. Add/edit/delete character attribute effects.
5. Effects validation for missing/deleted resources, characters, and attributes.
6. Runtime condition evaluation helper.
7. Runtime effect application helper.
8. Story Player / Preview integration.

Important:
- Characters and Resources are implemented.
- Conditions use existing `Project.characters`, `Character.attributes`, and `Project.resources`.
- Do not introduce scripting. Story Logic remains declarative.
- Follow `docs/STORY_LOGIC.md`.
- Each proposed task should state which roadmap/spec section it implements.
- If a roadmap item is large, it may be split into smaller implementation tasks, but the functional order should remain aligned with `ROADMAP.md` and `STORY_LOGIC.md`.

---

## Core Architecture Principles

These rules are important. Future agents should preserve them.

### 1. Project is the single source of truth

All meaningful story data belongs to the `Project` object.

React state, React Flow nodes, and UI selections are derived from project state where possible.

### 2. React Flow is a projection

React Flow nodes and edges are generated from `Project.scenes`.

Do not store domain data in React Flow nodes/edges as the source of truth.

### 3. Choice is the source of truth for connections and choice logic

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

Choice logic is stored on `Choice`:

```typescript
Choice.conditionGroups
Choice.effects
```

### 4. Editors modify Project data

Editor panels and project data screens should call store actions that update the active Project.

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

### 7. Characters and Resources do not need their own domain stores

Character and Resource data belongs directly to `Project`.

Characters and Resources screens should mutate data through `workspaceStore.updateActiveProject()`.

UI-only state such as which row is being edited, which character is expanded, or which tab is active may live in local component state or small UI stores.

### 8. Story Logic remains declarative

Story Logic must not introduce scripting in MVP.

Conditions and effects should remain typed, explicit, and editor-friendly.

### 9. Keep implementation prompts scoped

Each Codex prompt should:
- work directly on `main`
- avoid unrelated refactors
- list relevant files
- include acceptance criteria
- say whether docs should or should not be updated
- state which `ROADMAP.md` and `STORY_LOGIC.md` section it implements

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

    story-logic/
      ConditionGroupsEditor.tsx
      ConditionGroupCard.tsx
      ConditionRow.tsx

    characters/
      CharactersScreen.tsx

    resources/
      ResourcesScreen.tsx

    player/
      empty / future E7

    assets/
      empty or future extraction area

  store/
    projectMigrations.ts
    workspaceStore.ts
    useCanvasStore.ts
    useProjectViewStore.ts

  types/
    index.ts

  styles/
    index.css

  main.tsx
```

Notes:
- The background asset management UI currently lives inside `SceneEditorPanel.tsx`.
- This is acceptable for MVP but may later be extracted into smaller components.
- The right sidebar is currently used for scene editing, choice editing, and embedded condition editing.
- Story Logic condition editing now lives under `src/features/story-logic/`.
- Characters and Resources are full-screen project views inside the project shell.

---

## Data Model — Canonical Summary

The authoritative TypeScript definitions live in:

```text
src/types/index.ts
```

Important structures:

```typescript
interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditionGroups: ConditionGroup[];
  effects: Effect[];
}

interface ConditionGroup {
  id: string;
  conditions: Condition[];
}

interface Condition {
  id: string;
  type: 'resource' | 'character_attr';
  targetId: string;
  attribute?: string;
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
  key: string;
  defaultValue: number;
}
```

Runtime structures are still planned:
- `RuntimeState`
- `RuntimeSaveSlot`

Important model notes:
- `Resource.key` is the canonical editor-facing resource identifier.
- Resource conditions store `Resource.id` in `Condition.targetId`.
- Character attribute conditions store `Character.id` in `Condition.targetId`.
- Character attribute conditions store `CharacterAttribute.key` in `Condition.attribute`.
- `CharacterAttribute` currently has no `id`.
- If advanced migrations/reordering are introduced later, consider adding `CharacterAttribute.id`.

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
- project normalization on load

Known actions:
- `createProject()`
- `openProject(projectId)`
- `closeProject()`
- `renameProject(projectId, newName)`
- `updateActiveProject(updater)`

Persistence:
- workspace metadata saved to `narrium_workspace`
- full project saved to `narrium_project_{id}`

### `projectMigrations.ts`

Responsibilities:
- normalize loaded projects
- preserve compatibility with older localStorage project shapes

Current migration behavior:
- Legacy `Choice.conditions` is converted to `Choice.conditionGroups`.
- Non-empty legacy `conditions` become one `ConditionGroup`.
- Empty legacy `conditions` become `conditionGroups: []`.
- Normalized projects are saved back after load if changed.

### `useCanvasStore.ts`

Responsibilities:
- React Flow nodes and edges
- selected scene
- selected choice
- active canvas/editor view
- scene mutations
- dialogue mutations
- choice mutations
- background mutations
- asset library mutations
- sync from project

### `useProjectViewStore.ts`

Responsibilities:
- UI-only project view selection.

Known state:

```typescript
type ProjectView = 'canvas' | 'characters' | 'resources';
```

Important:
- This store must not contain domain data.

---

## Story Logic Editor Architecture

Story Logic condition editing is currently split into:

```text
src/features/story-logic/
  ConditionGroupsEditor.tsx
  ConditionGroupCard.tsx
  ConditionRow.tsx
```

Responsibilities:

### `ConditionGroupsEditor.tsx`

- reads active project resources and characters
- lists condition groups for a choice
- adds condition groups
- deletes condition groups
- creates default conditions
- updates nested conditions via callbacks
- mutates Project through `workspaceStore.updateActiveProject()`

### `ConditionGroupCard.tsx`

- renders one condition group
- displays group number
- renders `No conditions`
- adds a condition to the group
- deletes the group
- renders `ConditionRow` for each condition

### `ConditionRow.tsx`

- renders condition type selector
- renders resource target selector
- renders character selector
- renders character attribute selector
- renders operator selector
- renders numeric value input
- renders hint text input
- renders delete condition button
- renders visual validation warnings

Validation is visual-only and currently includes:
- `⚠ Select a resource`
- `⚠ Referenced resource no longer exists`
- `⚠ Select a character`
- `⚠ Referenced character no longer exists`
- `⚠ Select an attribute`
- `⚠ Referenced attribute no longer exists`

---

## Known Gaps / Next Work

### Near-term

- Effects model review/final acceptance.
- Effects editor foundation.
- Resource effects.
- Character attribute effects.
- Effects validation warnings.
- Runtime condition evaluation.
- Runtime effect application.
- Story Player / Preview.

### Existing backlog

- Delete project.
- Duplicate project.
- Project thumbnails.
- Dialogue page speaker selector.
- Unconnected choice warning.
- Scene groups.
- Asset filtering.
- Import/export JSON.
- Standalone HTML export.

---

## Suggested prompt for a new session

```text
Przejmij rolę Project Managera projektu Narrium.

Repo:
https://github.com/cisiur/Narrium

Workflow:
- Ty jesteś PM.
- Codex implementuje.
- Ja podejmuję decyzje produktowe.
- Nie generujesz kodu.
- Najpierw analizujesz repo i dokumentację.
- Prompty dla Codexa tworzysz dopiero po mojej akceptacji.
- Wszystkie prompty dla Codexa są po angielsku i gotowe do wklejenia.
- Po każdym pushu robisz review implementacji.
- Aktualizujemy dokumentację po większych batchach zmian.

Pracujemy wyłącznie na branchu main.

Przed rozpoczęciem:
1. Sprawdź aktualny branch.
2. Przeczytaj:
   - CONTEXT.md
   - docs/ROADMAP.md
   - docs/DATA_MODEL.md
   - docs/STORY_LOGIC.md
3. Zweryfikuj zgodność dokumentacji z kodem.
4. Potwierdź aktualny stan projektu.
5. Zaproponuj następny task zgodnie z ROADMAP i STORY_LOGIC.

Każdy proponowany task powinien wskazywać, z którego punktu ROADMAP.md i STORY_LOGIC.md wynika.
Nie wymyślaj nowych epików ani nie zmieniaj kolejności funkcjonalnej bez uzasadnienia.
Jeśli większy punkt z ROADMAP wymaga rozbicia, zaproponuj mniejsze taski implementacyjne zachowujące tę samą kolejność.
```
