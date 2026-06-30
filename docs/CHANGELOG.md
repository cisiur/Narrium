# Changelog — Narrium

This changelog records milestone-level project changes. It is intentionally concise and complements git history.

---

## Unreleased / Next

### Planned

- EPIC 8 — Save, Load, Export
  - `E8-02`: export project as JSON
  - `E8-03`: import project from JSON
  - `E8-04`: export story as standalone HTML player
  - `E8-05`: exported player save/load slots

---

## v0.7.0 — Story Player MVP

Status: **completed**

Purpose:
- Add a playable in-browser Preview mode that executes the existing Project model.
- Reuse Story Logic runtime helpers from EPIC 6.
- Keep the Preview runtime local and non-persistent for now.

Completed:

### Runtime initialization

Commit:
- `9d3da3d` — `feat: initialize player runtime state from project`

Changes:
- Added `createInitialRuntimeState(project)`.
- Initializes:
  - `currentSceneId` from `Project.startSceneId`
  - `currentPageIndex` to `0`
  - runtime resources from `Resource.key` + `Resource.defaultValue`
  - runtime character attributes from `Character.id` + `CharacterAttribute.key` + `defaultValue`
- Helper is pure and does not mutate Project data.

### Preview shell

Commit:
- `bfc9642` — `feat: add story player preview shell`

Changes:
- Added initial `StoryPlayer`.
- Added Preview mode entry from the editor shell.
- Preview owns local runtime state.
- Preview can exit back to the editor.

### Current scene rendering

Commit:
- `61c1bef` — `feat: render current scene in story player`

Changes:
- Story Player resolves the current scene from runtime state.
- Renders:
  - current scene background
  - speaker name
  - dialogue text
- Supports basic background modes:
  - URL
  - upload
  - asset
  - one-level scene reference
- Missing scene/page states render placeholders.
- `speakerId: null` displays Narrator.
- Missing speakers display `Unknown Speaker`.

### Multi-page dialogue

Commit:
- `7a61d8b` — `feat: support multi-page dialogue in story player`

Changes:
- Added `Next` button.
- `Next` advances `currentPageIndex`.
- Page index is bounded.
- `Next` appears only when another dialogue page exists.

### Choice rendering

Commit:
- `26e2cd6` — `feat: render story choices`

Changes:
- Choices render after the final dialogue page.
- Initial implementation rendered choices as inert list items before navigation was added.

### Choice navigation

Commit:
- `58b0693` — `feat: support story choice navigation`

Changes:
- Choices became clickable buttons.
- Valid `targetSceneId` navigates to the target scene.
- Navigation resets `currentPageIndex` to `0`.
- Choices with no target or missing target scenes are disabled.

### Effects on choice selection

Commit:
- `7f9b679` — `feat: apply story choice effects`

Changes:
- Story Player now uses existing `applyEffects()` helper.
- Effects apply before scene navigation.
- Runtime state remains local to Preview.

### Conditions and unavailable hints

Commit:
- `5a504ca` — `feat: integrate story choice conditions`

Changes:
- Story Player now uses:
  - `isChoiceAvailable()`
  - `resolveUnavailableChoiceHint()`
- All choices remain visible.
- Unavailable choices are disabled.
- Unavailable choices show hint text when available.
- Enabled choice behavior remains unchanged.

### End-of-story state

Commit:
- `9a07171` — `feat: add story end state`

Changes:
- Scenes with no choices on the final dialogue page display a simple end panel.
- End panel includes `The End`, a short message, and `Exit Preview`.

### Preview restart

Commit:
- `18e08f4` — `feat: add preview restart`

Changes:
- Added `Restart` button to Preview header.
- Restart recreates runtime state through `createInitialRuntimeState(project)`.
- Restart returns to the project start scene and resets resources, character attributes, and page index.
- Existing Exit Preview behavior remains unchanged.

Result:
- EPIC 7 Story Player MVP is complete.
- Preview now supports a full playable loop:
  - scene rendering
  - multi-page dialogue
  - choices
  - scene navigation
  - effects
  - conditions
  - unavailable hints
  - end state
  - restart

---

## v0.7.1 — Player Stabilization

Status: **completed**

Purpose:
- Add focused test coverage for runtime/player foundations.
- Improve Story Player maintainability before EPIC 8.

Completed:

### Runtime and Story Logic tests

Commit:
- `4c9d9d7` — `test: add runtime and story logic tests`

Changes:
- Added Vitest.
- Added `npm.cmd test` script through `vitest run`.
- Added tests for `createInitialRuntimeState()`:
  - current scene initialization
  - page index initialization
  - resource defaults
  - character attribute defaults
  - no mutation of source Project
- Added tests for Story Logic runtime helpers:
  - `applyEffects()`
  - `isChoiceAvailable()`
  - `resolveUnavailableChoiceHint()`

Validation:
- `npm.cmd test`
- `npm.cmd run build`

### Story Player refactor

Commit:
- `4f9974e` — `refactor: split story player into reusable components`

Changes:
- Refactored Story Player into focused modules:
  - `StoryPlayer.tsx`
  - `StoryPlayerHeader.tsx`
  - `DialoguePanel.tsx`
  - `ChoiceList.tsx`
  - `playerHelpers.ts`
  - `runtimeState.ts`
- StoryPlayer now primarily owns local runtime state, coordinates flow, and composes child components.
- Extracted reusable helper logic:
  - background resolution
  - speaker resolution
  - choice view model / availability mapping
- Behavior and UI classes were preserved.

Validation:
- `npm.cmd test`
- `npm.cmd run build`

Result:
- Runtime foundation is now covered by focused automated tests.
- Story Player is easier to extend for future Save/Load and export work.

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
