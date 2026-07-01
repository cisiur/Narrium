# EPIC 10 — Canvas Scene Groups

> Status: planned  
> Scope: editor-only canvas organization system  
> Runtime impact: none

---

## 1. Vision

Canvas Scene Groups let authors organize large visual novel projects by grouping related scenes into named visual containers such as chapters, routes, quest lines, locations, or story arcs.

A Scene Group is an **editor-only organization feature**. It changes how scenes are displayed on the canvas, but it must not change story logic, runtime behavior, preview behavior, or standalone HTML playback.

Groups help authors keep complex projects readable without changing how the story is executed.

Examples:

- group all scenes belonging to Chapter 1,
- group an optional side quest,
- group scenes inside one location,
- group an alternate route or ending branch,
- temporarily collapse a finished section to reduce canvas clutter.

---

## 2. Goals

- Allow authors to select multiple scenes and create a named group.
- Render expanded groups as visually distinct frames/containers around their scenes.
- Render collapsed groups as a single special canvas tile.
- Preserve all story logic exactly as-is.
- Keep external edges visible when groups are collapsed.
- Allow groups to be renamed, collapsed, expanded, and removed.
- Keep JSON project import/export compatible with groups.
- Keep undo/redo behavior consistent with other editor operations.
- Build the feature in small, reviewable tasks.

---

## 3. Non-goals

Do not implement these in the first Scene Groups epic unless explicitly scoped later:

- nested groups,
- runtime group behavior,
- Preview group behavior,
- standalone HTML group behavior,
- grouping Choices, Characters, Resources, Variables, or Assets,
- cross-project groups,
- group templates/prefabs,
- manual group resize,
- advanced color picker,
- auto-layout inside groups,
- automatic chapter numbering,
- export-time changes to story behavior.

---

## 4. Existing data model foundation

The current Project model already contains the basic group foundation:

```ts
interface Project {
  groups: SceneGroup[];
}

interface Scene {
  groupId: string | null;
}

interface SceneGroup {
  id: string;
  name: string;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  collapsed: boolean;
}
```

This epic should activate and complete this existing model rather than introduce an unrelated grouping system.

---

## 5. Core product rules

### 5.1 Groups are visual/editor-only

Grouping scenes must never modify:

- `Choice.targetSceneId`,
- choice text,
- condition groups,
- conditions,
- effects,
- scene dialogue pages,
- runtime state,
- story player behavior.

### 5.2 Scenes remain real scenes

Scenes inside a group are still normal `Scene` objects.

A group is not a runtime scene and is not playable.

### 5.3 Group collapse only affects canvas rendering

When a group is collapsed:

- member scenes are hidden on the canvas,
- one group node is shown instead,
- external edge visibility is preserved through visual edge projection,
- underlying story data is unchanged.

### 5.4 Ungrouping must be non-destructive

Ungrouping removes only the visual organization:

- delete the `SceneGroup`,
- set member `scene.groupId` values to `null`,
- keep all scenes,
- keep all choices,
- keep all Story Logic.

---

## 6. UX model

### 6.1 Creating a group

Author flow:

1. Select multiple scene nodes on the canvas.
2. Click **Group selected scenes**.
3. A new group is created.
4. Selected scenes receive the new `groupId`.
5. Group starts expanded.
6. Group receives a default name, e.g. `New Group`.
7. Group position and size are calculated from the selected scenes' bounding box.

Minimum selection requirement:

- at least 2 scenes.

### 6.2 Expanded group

An expanded group should appear as a visually distinct frame/container around member scenes.

Expanded group should show:

- group name,
- scene count,
- Collapse action,
- Ungroup action.

Nice-to-have but not required for first expanded rendering:

- subtle color tint,
- small header bar,
- border distinct from normal scene nodes.

### 6.3 Collapsed group

A collapsed group should render as one special canvas tile.

Collapsed group tile should show:

- group name,
- number of scenes inside,
- Expand action,
- Ungroup action.

When collapsed:

- member scene nodes are not rendered,
- internal edges are not rendered,
- external edges are still visible through projected endpoints.

### 6.4 Rename group

Authors must be able to rename a group.

Rename should only update `SceneGroup.name`.

### 6.5 Expand / collapse

Authors must be able to toggle `SceneGroup.collapsed`.

Expanded/collapsed state is saved in the Project.

### 6.6 Ungroup

Authors must be able to remove grouping.

Ungroup should:

- remove the group from `Project.groups`,
- set `groupId: null` on all member scenes,
- keep scene positions unchanged,
- keep choices and Story Logic unchanged.

---

## 7. Edge projection rules

Edge projection is the most important technical part of this epic.

Underlying `Choice.targetSceneId` must never be modified just to display group edges.

### Definitions

- **Visible scene node** — normal scene node rendered on canvas.
- **Collapsed group node** — visual node representing a collapsed group.
- **Hidden scene node** — scene inside a collapsed group; not rendered as an individual node.
- **Projected edge** — visual React Flow edge whose rendered source/target may point to a group node while underlying Choice data still points to real scene ids.

### 7.1 Expanded group behavior

When all involved groups are expanded, edges render exactly as they do today:

```text
Scene A -> Scene B
```

### 7.2 Collapsed group: inside -> inside

If both source and target scenes are inside the same collapsed group:

```text
Scene A inside Group X -> Scene B inside Group X
```

Render:

```text
(no visible edge)
```

Reason: the whole relationship is internal to the collapsed group.

### 7.3 Collapsed group: inside -> outside

If the source scene is inside a collapsed group and the target scene is outside:

```text
Scene A inside Group X -> Scene B outside
```

Render:

```text
Group X -> Scene B
```

Underlying data remains:

```text
Choice.targetSceneId = Scene B
```

### 7.4 Collapsed group: outside -> inside

If the source scene is outside and the target scene is inside a collapsed group:

```text
Scene A outside -> Scene B inside Group X
```

Render:

```text
Scene A -> Group X
```

Underlying data remains:

```text
Choice.targetSceneId = Scene B
```

### 7.5 Collapsed group: group -> different group

If the source scene is inside collapsed Group X and the target scene is inside collapsed Group Y:

```text
Scene A inside Group X -> Scene B inside Group Y
```

Render:

```text
Group X -> Group Y
```

### 7.6 Expanded -> collapsed

If source scene is visible and target scene is hidden by a collapsed group:

```text
Visible Scene A -> Scene B inside collapsed Group X
```

Render:

```text
Scene A -> Group X
```

### 7.7 Collapsed -> expanded

If source scene is hidden by a collapsed group and target scene is visible:

```text
Scene A inside collapsed Group X -> Visible Scene B
```

Render:

```text
Group X -> Scene B
```

### 7.8 Duplicate projected edges

If multiple internal scenes produce the same visible projected edge, MVP may render duplicate edges if that is simpler.

Preferred later improvement:

- merge duplicate projected edges visually,
- show count or combined labels.

Do not merge underlying Choices.

### 7.9 Edge labels

MVP can keep the original choice label on projected edges.

If several choices project to the same visible source/target pair, duplicate labels are acceptable for MVP.

---

## 8. Selection model

Current canvas selection is primarily single-scene-oriented.

Scene Groups require multi-selection.

Desired MVP selection behavior:

- single-click scene selects one scene and opens editor as today,
- multi-select can be done through React Flow selection mechanics,
- selected scene ids are tracked in canvas/editor state,
- **Group selected scenes** appears only when at least 2 scene nodes are selected,
- selecting a collapsed group node selects that group, not an internal scene.

Implementation should preserve existing single-scene editing behavior.

---

## 9. Canvas rendering model

### 9.1 Node types

Expected React Flow node types:

- `scene` — existing scene node,
- `sceneGroup` or `group` — collapsed group node,
- optional expanded group frame/background representation.

### 9.2 Expanded groups

Expanded group rendering can be implemented as either:

- special background/group node behind scenes,
- custom overlay layer,
- React Flow node with lower z-index and no direct runtime semantics.

Implementation choice should favor reliability and small increments.

### 9.3 Collapsed groups

Collapsed groups should use a dedicated node type.

The collapsed group node id should be stable and should not conflict with scene ids.

Suggested visual node id pattern:

```text
group:{groupId}
```

### 9.4 Scene visibility

When building canvas nodes:

- scene with `groupId` referencing a collapsed group should not produce a visible scene node,
- scene with no group or expanded group should produce a normal scene node,
- every collapsed group should produce one group node.

---

## 10. Persistence and import/export

Scene Groups are part of the Project JSON.

JSON export/import should preserve:

- `Project.groups`,
- `Scene.groupId`,
- group names,
- collapsed state,
- position and size.

Standalone HTML runtime should ignore groups.

Preview runtime should ignore groups.

---

## 11. Validation rules

Potential validation rules for later tasks:

- scene references missing group id,
- group contains no scenes,
- duplicate group ids,
- collapsed group with invalid position/size.

These are not required in the first implementation task unless explicitly scoped.

---

## 12. Undo / redo

The following operations should create undo snapshots:

- create group,
- rename group,
- collapse group,
- expand group,
- ungroup,
- assign scene to group,
- remove scene from group,
- move group if implemented later.

The following should not create undo snapshots:

- selection-only changes,
- opening group UI controls,
- purely transient hover state.

---

## 13. Task roadmap

### SG-01 — Scene Groups architecture helpers

Goal:
Create tested pure helpers for group membership and canvas projection decisions before touching UI.

Scope:

- add helper module for Scene Group calculations,
- compute group membership,
- compute group bounding boxes,
- detect collapsed groups,
- decide whether a scene should render,
- project edge endpoints without mutating Choices,
- tests for edge projection rules.

Out of scope:

- React Flow UI,
- buttons,
- group creation UI,
- drag behavior.

Suggested commit:

```text
feat: add scene group canvas helpers
```

---

### SG-02 — Multi-select and create/ungroup MVP

Goal:
Allow selecting multiple scenes and creating/removing groups.

Scope:

- track selected scene ids,
- keep existing single-scene behavior intact,
- show **Group selected scenes** when at least 2 scenes are selected,
- create `SceneGroup`,
- assign `scene.groupId`,
- calculate initial group position and size,
- add Ungroup action,
- tests for store actions.

Out of scope:

- collapsed group node,
- edge projection UI,
- advanced group styling.

Suggested commit:

```text
feat: add scene group creation workflow
```

---

### SG-03 — Expanded group rendering and rename

Goal:
Render expanded groups as visible organization frames and support renaming.

Scope:

- render expanded group frame/container,
- display name and scene count,
- rename group,
- keep member scenes visible,
- preserve existing scene editing behavior,
- tests where practical.

Out of scope:

- collapsed rendering,
- edge projection for collapsed groups,
- moving/resizing groups.

Suggested commit:

```text
feat: render expanded scene groups
```

---

### SG-04 — Collapse/expand group node

Goal:
Support collapsing a group into one special node and expanding it back.

Scope:

- toggle `SceneGroup.collapsed`,
- hide member scene nodes when collapsed,
- render collapsed group node,
- show group name and scene count,
- expand from collapsed node,
- ungroup from collapsed node.

Out of scope:

- perfect edge projection,
- duplicate projected edge merging,
- moving collapsed group node if risky.

Suggested commit:

```text
feat: add collapsed scene group nodes
```

---

### SG-05 — Collapsed group edge projection

Goal:
Make edges remain understandable when groups are collapsed.

Scope:

- implement visual source/target projection for collapsed groups,
- hide fully internal collapsed-group edges,
- support inside -> outside,
- support outside -> inside,
- support collapsed group -> collapsed group,
- preserve underlying Choice data,
- tests for all edge projection rules.

Out of scope:

- merging duplicate projected edges,
- advanced labels,
- edge routing polish.

Suggested commit:

```text
feat: project edges for collapsed scene groups
```

---

### SG-06 — Group movement and layout polish

Goal:
Improve authoring ergonomics after the core group model works.

Scope:

- move collapsed group nodes and persist `SceneGroup.position`,
- optionally move expanded group with member scenes if safe,
- recalculate group frame size after member scenes move,
- improve group z-index/selection behavior,
- polish visual spacing.

Out of scope:

- auto-layout engine,
- nested groups.

Suggested commit:

```text
feat: polish scene group movement
```

---

### SG-07 — Validation, docs, and final polish

Goal:
Finalize Scene Groups as a documented subsystem.

Scope:

- add validation rules if needed,
- update `CONTEXT.md`, `DATA_MODEL.md`, `ROADMAP.md`, and `CHANGELOG.md`,
- add/extend tests for regressions,
- update this document with final implementation notes.

Suggested commit:

```text
docs: document scene groups implementation
```

---

## 14. Acceptance criteria for complete epic

The epic is complete when:

- authors can group 2+ scenes,
- groups are saved in Project JSON,
- expanded groups visually organize scenes,
- collapsed groups show as a single tile,
- external edges remain visible when groups are collapsed,
- internal collapsed edges are hidden,
- groups can be renamed,
- groups can be expanded/collapsed,
- groups can be ungrouped without data loss,
- Story Logic remains unchanged by grouping,
- runtime/Preview/standalone behavior is unchanged,
- undo/redo handles group operations,
- tests cover helper logic and core store behavior,
- documentation is updated.

---

## 15. Implementation cautions

- Do not mutate `Choice.targetSceneId` for visual edge projection.
- Do not treat groups as playable scenes.
- Do not allow collapsed group nodes to leak into runtime/export data as scenes.
- Be careful not to break existing edge-to-choice navigation.
- Keep changes incremental and reviewable.
- Prefer pure helper tests for complex projection behavior before wiring React Flow UI.
