# Changelog — Narrium

This changelog records milestone-level project changes. It is intentionally concise and complements git history.

---

## Unreleased / Next

### Planned

- EPIC 7 — Story Player
  - `E7-01`: initialize `RuntimeState` from `Project`
  - player shell / preview mode
  - background, dialogue, speaker, text and choices rendering
  - choice navigation
  - effects application
  - condition evaluation
  - unavailable-choice hints
  - end state and restart preview

---

## v0.6.1 — Post-Audit Stabilization Sprint

Status: **completed**

Source audit:
- `docs/AUDIT_EPIC_6_TO_7.md`

Purpose:
- Remove targeted blockers and high-priority data consistency risks before starting EPIC 7 — Story Player.

Completed:

### Scene deletion integrity

Commit:
- `472e268` — `fix: preserve valid start scene after scene deletion`

Changes:
- Deleting a scene preserves existing behavior of clearing incoming `choice.targetSceneId` references.
- If the deleted scene was `Project.startSceneId`, the project now selects the first remaining scene as start scene.
- If no scenes remain, `Project.startSceneId` becomes `''`.
- Deleting a scene resets dangling `scene_reference` backgrounds that pointed to the deleted scene.
- `normalizeProject()` enforces the valid `startSceneId` invariant.

### Full project shape normalization

Changes:
- `normalizeProject()` now normalizes the current Project shape more completely.
- Project-level collections are defaulted when missing:
  - `scenes`
  - `characters`
  - `resources`
  - `groups`
  - `assetLibrary`
- Project settings are normalized.
- Scenes are normalized to include:
  - `background`
  - `position`
  - `dialoguePages`
  - `choices`
  - `groupId`
- Dialogue pages are normalized to include:
  - `speakerId`
- Choices are normalized to include:
  - `conditionGroups`
  - `effects`
- Legacy `conditions` migration remains supported.
- Existing data is preserved wherever possible.

Note:
- The exact commit hash for this batch was not available during this documentation update. Check git history for the commit that changed `src/store/projectMigrations.ts`.

### Character Attribute rename safety

Commit:
- `b9ed4db` — `fix: preserve character attribute references on rename`

Changes:
- Character Attribute key renames now cascade matching Story Logic references.
- Matching `character_attr` conditions are updated from old key to new key.
- Matching `character_attr` effects are updated from old key to new key.
- Updates are limited to the renamed character.
- Resource references, dialogue speaker references, runtime logic and delete behavior were not changed.

### Empty condition group authoring UX

Commit:
- `53e21d5` — `ux: improve empty condition group authoring`

Changes:
- `+ Add OR Group` now creates a group with one default condition.
- Empty groups still remain valid according to runtime semantics.
- Empty groups now display an inline warning:
  - `This group has no conditions and will always pass.`
- Runtime behavior and Story Logic semantics were not changed.

Result:
- EPIC 7 blockers from the audit are resolved.
- Project data consistency is safer.
- Story Logic authoring is safer.
- Story Player implementation can start.

---

## v0.6.0 — EPIC 6 Story Logic + UX Polish

Status: **completed**

Completed:

### Story Logic — Conditions

- `ConditionGroup` model added.
- Canonical `Choice.conditionGroups` implemented.
- Legacy `Choice.conditions` migration supported.
- Condition groups implement:
  - OR between groups
  - AND inside one group
- Resource conditions implemented.
- Character Attribute conditions implemented.
- Numeric operators implemented:
  - `>=`
  - `<=`
  - `==`
  - `>`
  - `<`
  - `!=`
- Missing-reference warnings implemented.
- Condition editor components live in `src/features/story-logic/`.

### Story Logic — Effects

- `Choice.effects` implemented.
- Resource effects implemented.
- Character Attribute effects implemented.
- Effect operations implemented:
  - `+=`
  - `-=`
  - `=`
- User-facing operation labels simplified to:
  - `+`
  - `-`
  - `=`
- Missing-reference warnings implemented.

### Story Logic — Runtime Helpers

Implemented in `src/features/story-logic/runtimeLogic.ts`:

- `compareNumbers()`
- `evaluateCondition()`
- `isChoiceAvailable()`
- `resolveUnavailableChoiceHint()`
- `applyNumericOperation()`
- `applyEffects()`

Runtime behavior:
- no condition groups means choice is available
- OR between groups
- AND inside group
- empty group passes
- missing condition references fail
- missing effect references are skipped
- effects apply in array order
- runtime helpers are pure

### Reference usage warnings

Implemented in `src/features/story-logic/referenceUsage.ts`:

- Resource usage warnings before delete.
- Character usage warnings before delete.
- Character Attribute usage warnings before delete.
- Checks both condition groups and effects.
- Deletion is not blocked; user confirmation controls final action.

### Post-EPIC 6 UX Polish

Completed:
- Scene Editor sections start collapsed.
- Project Settings sidebar added.
- `RightSidebar` extracted.
- Project delete flow added.
- Project thumbnail upload/preview/remove/display added.
- Obsolete Inspector placeholder removed.
- Dialogue speaker selector added.
- Dialogue page reorder buttons added.
- Effect operation labels simplified.

---

## Earlier MVP Foundation

Completed before v0.6.0:

### Workspace / Projects

- Local multi-project workspace.
- My Projects screen.
- Project cards.
- Create/open/rename/delete project.
- Project thumbnails.
- Active project name in canvas header.
- localStorage persistence:
  - `narrium_workspace`
  - `narrium_project_{id}`

### Canvas Graph Editor

- React Flow canvas.
- Scene nodes.
- Scene positions persisted.
- Edge creation.
- Edge deletion.
- Edge click opens the corresponding Choice.
- Choice target is the source of truth for graph edges.

### Scene Editor

- Scene name editing.
- Background section.
- Dialogue pages.
- Choices.
- Choice target dropdown.
- Condition and effects editors embedded under choices.

### Background System

- Background modes:
  - `none`
  - `url`
  - `upload`
  - `asset`
  - `scene_reference`
- Asset library for reusable backgrounds.
- SceneNode background thumbnails.

### Characters & Resources

- Characters screen.
- Character attributes.
- Resources screen.
- Duplicate key handling.
- Numeric defaults.
- Delete warnings for Story Logic references.
