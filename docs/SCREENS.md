# Screens — Narrium

This document describes the main screens and major UI areas for Narrium MVP.

## 1. My Projects

The application starts on **My Projects**, a workspace screen inspired by Figma-style project selection.

### Purpose

- Show all locally stored projects
- Create a new project
- Open an existing project
- Rename or delete a project
- Show last updated date and thumbnail

### Main UI elements

- Top bar with app name and primary action: **New Project**
- Grid/list of project cards
- Empty state when no projects exist
- Project card actions: Open, Rename, Delete

### Project card contents

- Thumbnail image
- Project name
- Last updated timestamp
- Scene count (optional but recommended)

### Notes

- Thumbnail is auto-generated from the start scene background, but user can override it later.
- Only one project is active at a time.

---

## 2. Editor Shell

This is the main application layout after opening a project.

### Purpose

Provide a stable workspace for editing scenes, groups, dialogue, choices, characters, resources, and previewing the story.

### Layout

- Top toolbar
- Left sidebar or tab navigation
- Central canvas area
- Right sidebar scene editor panel

### Top toolbar

Recommended actions:

- Back to My Projects
- Project name
- Preview
- Save status indicator
- Export JSON
- Import JSON
- Export HTML
- Theme toggle

### Left navigation

Recommended sections:

- Canvas
- Characters
- Resources
- Assets
- Validation (optional in MVP shell if not fully implemented yet)

---

## 3. Canvas View

The canvas is the primary authoring surface.

### Purpose

Let the author visually create the branching structure of the story.

### Main interactions

- Add scene
- Move scene nodes
- Connect scenes
- Select scene
- Delete scene
- Pan and zoom
- Fit to screen
- Create scene groups

### Scene node content

Each scene node should show:

- Scene title
- Optional background thumbnail
- Dialogue page count
- Choice count
- Warning indicator for unconnected choices

### Group container

A scene group is a named visual area on canvas.

Each group should show:

- Group name
- Color accent
- Resizable bounding area
- Scenes visually placed inside it

### Notes

- Group collapse is not part of MVP behavior, but the model already supports it.
- Scene edges should reflect `Choice.targetSceneId` connections.

---

## 4. Scene Editor Panel

The right sidebar opens when a scene is selected.

### Purpose

Allow the author to fully configure one selected scene without leaving the canvas.

### Sections

#### 4.1 Scene meta

- Scene name input
- Start scene toggle or button
- Group assignment selector

#### 4.2 Background picker

Must support 4 modes:

- External URL
- Local upload
- Asset library selection
- Reference another scene's background

Recommended UI:

- Mode tabs or segmented control
- Preview area
- Clear background action

#### 4.3 Dialogue pages

- List of pages in order
- Add page
- Delete page
- Reorder page
- Speaker selector
- Dialogue text field

#### 4.4 Choices

- List of choices
- Add choice
- Delete choice
- Expand choice to edit logic

For each choice:

- Choice label text
- Target scene selector
- Conditions builder
- Effects builder
- Inline warning when no target is assigned

---

## 5. Characters Screen

### Purpose

Manage story characters and their numeric attributes used by conditions and effects.

### Main UI elements

- Character list
- Add character button
- Character editor form

### Character editor fields

- Character name
- Attributes list
- Add attribute
- Delete attribute

### Attribute fields

- Key/name, e.g. `reputation`
- Default numeric value

---

## 6. Resources Screen

### Purpose

Manage project-global numeric variables.

### Main UI elements

- Resource list
- Add resource button
- Edit resource form
- Delete resource action

### Resource fields

- Resource name
- Default numeric value

---

## 7. Assets Screen

### Purpose

Manage reusable project-level backgrounds.

### Main UI elements

- Asset library list/grid
- Add asset from URL
- Upload asset from file
- Rename asset
- Delete asset
- Preview asset

### Notes

- Only background assets are needed in MVP.
- Uploaded images are stored as base64 data URLs inside project JSON.

---

## 8. Preview Player

Preview opens from the editor toolbar.

### Purpose

Let the author test the story in-browser using the same core runtime model planned for export.

### Layout

- Background image area
- Dialogue box
- Speaker name area
- Choice buttons area
- Top or bottom utility controls

### Behavior

- Dialogue pages advance with Next until the final page
- Choices appear only after the final page
- Disabled choices remain visible and show hint text
- Selecting a choice applies effects and navigates to next scene
- Ending scenes show an End state

### Controls

- Restart
- Close preview
- Save / Load (if enabled)

---

## 9. Validation View

This can be a dedicated screen, modal, or sidebar tab.

### Purpose

Show project-wide issues before export.

### MVP issues to report

- Unconnected choices
- Missing target scenes
- Broken asset references
- Missing start scene
- Broken character/resource references in conditions or effects

### Recommended UX

- Click issue → focus related scene or entity
- Group issues by type
- Show issue count badge in navigation

---

## 10. Export Flows

### Export JSON

Purpose:

- Backup
- Portability
- Re-import later

### Import JSON

Behavior:

- Validate schema
- Create new project entry in workspace
- Assign a fresh local project id if needed

### Export HTML

Purpose:

- Produce standalone playable story

Expected output:

- Self-contained HTML file
- Embedded project JSON
- Embedded runtime JS/CSS
- Save/load via localStorage if enabled in settings

---

## 11. Empty states

Narrium should have clear empty states for:

- No projects yet
- No scenes in project
- No characters defined
- No resources defined
- No assets in library
- No issues in validation report

Each empty state should include:

- Short explanation
- Primary action button
- Optional 1-line hint on what to do next

---

## 12. MVP navigation flow

Recommended user journey:

1. Open My Projects
2. Create new project
3. Enter editor shell
4. Add scenes on canvas
5. Edit scene dialogue and choices
6. Define characters/resources if needed
7. Preview story
8. Fix validation issues
9. Export JSON or HTML
