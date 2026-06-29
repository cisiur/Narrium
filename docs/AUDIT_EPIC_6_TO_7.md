# Audit — EPIC 6 to EPIC 7 Readiness

## Summary

Assessment: **Mostly ready, with targeted fixes needed before Story Player MVP.**

The current app is internally consistent in its main architecture: `Project` is the practical source of truth, React Flow state is a projection, Story Logic is declarative, and persistence is centralized through `workspaceStore`. The EPIC 6 Story Logic layer is a solid base for EPIC 7.

Main risks:
- Deleting the start scene can leave `Project.startSceneId` pointing at a missing scene.
- Legacy migration only covers thumbnail and legacy choice conditions, not all fields introduced across the completed epics.
- Character attribute key renames silently break Story Logic references because conditions/effects store attribute keys.
- Scene reference backgrounds and dialogue speaker references can become broken after deletes and need clear player semantics.
- Empty condition groups intentionally pass at runtime, but the editor makes it easy to create an always-available group accidentally.

Recommended next action: **fix the blocker and high-priority data consistency issues before starting Story Player implementation**, then proceed with EPIC 7 using the existing `Project` model and Story Logic helpers.

## Findings

### Blockers

#### Start scene can point to a deleted scene

- Severity: Blocker
- Files affected:
  - `src/store/useCanvasStore.ts`
  - `src/types/index.ts`
  - `docs/DATA_MODEL.md`
- Description:
  - `addScene()` sets `startSceneId` only when the project has no start scene.
  - `deleteScene()` removes the scene and clears incoming choice targets, but it does not update `Project.startSceneId` when the deleted scene is the start scene.
  - This can leave `Project.startSceneId` pointing at a scene that no longer exists.
- Why it matters:
  - EPIC 7 begins by initializing `RuntimeState.currentSceneId` from `Project.startSceneId`.
  - A missing start scene would make the player open into invalid runtime state or require defensive fallback logic immediately.
- Recommended fix:
  - When deleting a scene, if it is the current `startSceneId`, set `startSceneId` to the first remaining scene id or `''` if no scenes remain.
  - Add a project validation helper or migration invariant that checks `startSceneId` exists whenever scenes exist.
- Blocks EPIC 7: Yes.

### High Priority

#### Store migrations are too narrow for the current model

- Severity: High Priority
- Files affected:
  - `src/store/projectMigrations.ts`
  - `src/store/workspaceStore.ts`
  - `src/types/index.ts`
  - `docs/DATA_MODEL.md`
- Description:
  - `normalizeProject()` currently normalizes only `Project.thumbnail` and legacy `Choice.conditions` into `Choice.conditionGroups`.
  - It assumes fields such as `project.scenes`, `scene.choices`, `choice.effects`, `scene.dialoguePages`, `scene.background`, `characters`, `resources`, `groups`, `assetLibrary`, and `settings` already exist.
  - The editor often guards with `?? []`, but the migration does not persist a fully normalized shape.
- Why it matters:
  - EPIC 7 should not need to defend against every historical partial project shape.
  - LocalStorage projects created before later epics may load into the editor or player with missing arrays/objects.
  - Player initialization will depend on complete `resources`, `characters`, scene backgrounds, dialogue pages, choices, and effects.
- Recommended fix:
  - Expand migrations to normalize the full current `Project` shape.
  - Ensure each scene has a background, position, dialoguePages, choices, and groupId.
  - Ensure each choice has `conditionGroups: []` and `effects: []`.
  - Ensure each dialogue page has `speakerId: null`.
  - Ensure project-level arrays and settings exist.
- Blocks EPIC 7: Yes, if old local projects must remain supported during EPIC 7. Otherwise it should be fixed before releasing Story Player.

#### Character attribute renames silently break conditions and effects

- Severity: High Priority
- Files affected:
  - `src/features/characters/CharactersScreen.tsx`
  - `src/features/story-logic/referenceUsage.ts`
  - `src/features/story-logic/runtimeLogic.ts`
  - `docs/DATA_MODEL.md`
  - `docs/STORY_LOGIC.md`
- Description:
  - Character Attribute conditions/effects store `Character.id` plus `CharacterAttribute.key`.
  - Deleting an attribute warns via `findStoryLogicUsages()`.
  - Renaming an attribute does not warn, cascade-update references, or preserve aliases.
  - After rename, affected runtime conditions fail and affected effects are skipped because runtime checks for the old key.
- Why it matters:
  - Story Player will expose this as choices unexpectedly becoming unavailable or effects doing nothing.
  - The app currently makes attribute renaming feel safe, while the data model treats the key as an identifier.
- Recommended fix:
  - Before saving an attribute key rename, detect Story Logic usages of the old key.
  - Either cascade update those references to the new key, or warn that the rename will break existing logic.
  - Longer term: consider adding stable `CharacterAttribute.id` if attributes need safe renames.
- Blocks EPIC 7: Yes for reliable authored stories using character attributes.

#### Scene reference backgrounds can dangle after scene deletion

- Severity: High Priority
- Files affected:
  - `src/store/useCanvasStore.ts`
  - `src/features/editor/SceneEditorPanel.tsx`
  - `src/features/canvas/SceneNode.tsx`
  - `src/types/index.ts`
- Description:
  - `deleteScene()` clears choice targets that point to the deleted scene.
  - It does not clear `scene.background.sourceSceneId` for scenes using the deleted scene as a background reference.
  - The canvas/editor show fallback placeholders, but the data remains broken.
- Why it matters:
  - Story Player must render scene backgrounds. Dangling scene references force extra player fallback behavior and can surprise authors.
- Recommended fix:
  - On scene deletion, reset any `scene_reference` background pointing to the deleted scene to `mode: 'none'`.
  - Document player fallback for missing backgrounds as a defensive measure, not the primary consistency path.
- Blocks EPIC 7: Should be fixed before player background rendering.

#### Empty condition groups create an easy accidental always-available choice

- Severity: High Priority
- Files affected:
  - `src/features/story-logic/ConditionGroupsEditor.tsx`
  - `src/features/story-logic/ConditionGroupCard.tsx`
  - `src/features/story-logic/runtimeLogic.ts`
  - `docs/DATA_MODEL.md`
  - `docs/STORY_LOGIC.md`
- Description:
  - Runtime semantics are documented and implemented as: no groups means available, OR between groups, AND inside a group, and an empty group passes.
  - The editor creates an empty OR group when the author clicks `+ Add OR Group`.
  - Until a condition is added, that group makes the choice available even if other groups later contain failing conditions.
- Why it matters:
  - Runtime behavior is internally consistent, but the authoring UX can create accidental logic bypasses.
  - EPIC 7 will make this visible as choices appearing available despite intended restrictions.
- Recommended fix:
  - Keep runtime semantics as-is if desired, but change the editor to add the first condition with a new group or visually warn that an empty group always passes.
  - Consider whether empty groups should be disallowed at save/edit time.
- Blocks EPIC 7: Not strictly, but should be fixed before user-facing player testing.

### Medium Priority

#### Character deletion does not warn about dialogue speaker references

- Severity: Medium Priority
- Files affected:
  - `src/features/characters/CharactersScreen.tsx`
  - `src/features/editor/SceneEditorPanel.tsx`
  - `src/types/index.ts`
- Description:
  - Deleting a character warns only for Story Logic references.
  - Dialogue pages can still reference the deleted character through `DialoguePage.speakerId`.
  - The Scene Editor displays a missing-character warning, which is useful, but deletion does not warn that dialogue speaker attribution will be broken.
- Why it matters:
  - Story Player needs deterministic speaker display. Missing speakers can degrade the playthrough unless the player has a clear fallback.
- Recommended fix:
  - Extend reference usage warnings to include dialogue speaker usage, or add a separate speaker-reference warning on character deletion.
  - Define Story Player fallback: missing speaker should display as narrator, `Unknown Speaker`, or a visible missing-reference state.
- Blocks EPIC 7: No, if the player implements a clear fallback. Recommended before polished preview.

#### Workspace metadata can drift from normalized project data on load

- Severity: Medium Priority
- Files affected:
  - `src/store/workspaceStore.ts`
  - `src/store/projectMigrations.ts`
  - `docs/DATA_MODEL.md`
- Description:
  - `WorkspaceProjectMeta.thumbnailDataUrl` is normalized to `null` when absent.
  - Loading a full project can normalize and save the project, but `openProject()` does not refresh workspace metadata from the normalized project.
  - `updateActiveProject()` and thumbnail-specific updates do synchronize metadata, so the main mutation paths are safe.
- Why it matters:
  - Old projects can show stale or missing thumbnail metadata in My Projects until a later mutation.
  - EPIC 7 itself is not blocked, but project list consistency matters as project artifacts grow.
- Recommended fix:
  - After `loadProject()` normalization, synchronize workspace metadata fields from the project, especially name, updatedAt, and thumbnail.
- Blocks EPIC 7: No.

#### Active workspace id can point to a missing project

- Severity: Medium Priority
- Files affected:
  - `src/store/workspaceStore.ts`
- Description:
  - Initial state uses `activeProjectId` from workspace storage and `activeProject: loadProject(activeProjectId)`.
  - If the stored project payload is missing or corrupt, `activeProject` becomes `null` while `activeProjectId` remains non-null in store/workspace.
- Why it matters:
  - The UI falls back to My Projects, but persistence state remains internally stale.
  - Future player routes or preview mode may care about active project identity more directly.
- Recommended fix:
  - If the active project cannot be loaded, clear `activeProjectId` and persist that cleanup.
- Blocks EPIC 7: No.

#### No centralized project validation exists yet

- Severity: Medium Priority
- Files affected:
  - `src/store/projectMigrations.ts`
  - `src/store/workspaceStore.ts`
  - `src/features/story-logic/runtimeLogic.ts`
  - `src/features/editor/SceneEditorPanel.tsx`
- Description:
  - The app handles missing references locally in UI and runtime helpers, but there is no single validation pass for player readiness.
  - Checks such as valid start scene, broken choice targets, missing speakers, missing resources, missing attributes, and missing background references are scattered.
- Why it matters:
  - Story Player will benefit from a simple “project is playable / has warnings” layer.
  - Without it, player components may duplicate validation and fallback logic.
- Recommended fix:
  - Add a read-only validation helper before or during EPIC 7.
  - Use it to power preview warnings and future export blocking.
- Blocks EPIC 7: No for MVP, but strongly recommended early in EPIC 7.

#### Runtime helper coverage is not backed by visible tests

- Severity: Medium Priority
- Files affected:
  - `src/features/story-logic/runtimeLogic.ts`
  - `package.json`
- Description:
  - Runtime helpers are pure and implementation looks correct for the documented semantics.
  - The repository currently has no test script or visible unit tests for condition/effect behavior.
- Why it matters:
  - EPIC 7 will rely directly on these helpers for player behavior.
  - Small semantic regressions would be hard to catch with only `npm run build`.
- Recommended fix:
  - Add focused unit tests around `compareNumbers`, `isChoiceAvailable`, `resolveUnavailableChoiceHint`, and `applyEffects` when introducing Story Player runtime initialization.
- Blocks EPIC 7: No, but tests should be added with the first player runtime task.

### Low Priority / Polish

#### Resource key rename implications should be documented for save/runtime state

- Severity: Low Priority / Polish
- Files affected:
  - `src/features/resources/ResourcesScreen.tsx`
  - `src/features/story-logic/runtimeLogic.ts`
  - `docs/DATA_MODEL.md`
- Description:
  - Conditions/effects store `Resource.id`, so editor references survive resource key rename.
  - Runtime values are keyed by `Resource.key`, so future save slots or in-progress play sessions may not survive key renames cleanly.
- Why it matters:
  - Not a current editor bug, but important once EPIC 7 adds runtime state and save/load behavior.
- Recommended fix:
  - Document that resource keys are runtime variable keys.
  - Consider runtime save migration by resource id later, or make key renames warn once save slots exist.
- Blocks EPIC 7: No.

#### Project Settings sidebar is reusable enough, but not yet a general form shell

- Severity: Low Priority / Polish
- Files affected:
  - `src/components/RightSidebar.tsx`
  - `src/features/workspace/MyProjectsScreen.tsx`
- Description:
  - `RightSidebar` is appropriately small and reusable for Project Settings.
  - It is not over-engineered and should not be generalized further until another sidebar needs it.
- Why it matters:
  - Keeps the codebase easy to extend.
- Recommended fix:
  - No immediate fix. Reuse as-is.
- Blocks EPIC 7: No.

#### Some completed UI copy still reads like placeholder text

- Severity: Low Priority / Polish
- Files affected:
  - `src/features/characters/CharactersScreen.tsx`
  - `src/features/workspace/MyProjectsScreen.tsx`
  - `src/components/AppShell.tsx`
- Description:
  - Empty-state copy says character creation will be added later, although it exists.
  - Workspace empty state references a “mock project”.
  - Non-project `Preview` button is visible but inert.
- Why it matters:
  - This does not affect architecture, but it can confuse users and future QA.
- Recommended fix:
  - Refresh stale copy and either wire or hide the inert Preview button when EPIC 7 starts.
- Blocks EPIC 7: No.

## Positive Notes

- `Project` is the clear domain source of truth.
- React Flow nodes and edges are projections built from `Project.scenes`.
- Choice edges use `choice.targetSceneId`, and edge deletion correctly clears that target.
- Edge-click choice selection is clean and maps from edge id to source scene and choice id.
- `workspaceStore.updateActiveProject()` centralizes persistence, timestamp updates, and workspace metadata updates for the main mutation path.
- Canvas graph mutations generally resync from project after updates.
- Dialogue page array order is consistently treated as runtime order.
- `DialoguePage.speakerId` semantics are clear: `null` means narrator, character id means character speaker.
- Story Logic data model is declarative and editor-friendly.
- Condition and effect editors store resource references by `Resource.id` and character attribute references by `Character.id` plus attribute key, matching docs.
- Missing/deleted resources, attributes, characters, and speakers are surfaced visually rather than silently hidden.
- Runtime helpers are pure: `applyEffects()` returns a new state and does not mutate the input `Project` or `RuntimeState`.
- Effects apply in array order and skip missing references, matching the documented MVP behavior.
- Delete warnings for Story Logic resources/characters/attributes cover both condition groups and effects.
- Thumbnail updates through Project Settings synchronize `Project.thumbnail` and `WorkspaceProjectMeta.thumbnailDataUrl` on the main update paths.
- Project deletion removes the full project payload and clears active project state when appropriate.

## EPIC 7 Readiness Checklist

- [x] Project type contains the fields needed for Story Player MVP.
- [x] Scene dialogue pages have deterministic order.
- [x] Choice target scene ids are represented in the domain model.
- [x] Conditions and effects are modeled on choices.
- [x] Runtime helper semantics exist for condition evaluation, hints, and effect application.
- [x] React Flow graph data is not treated as the domain source of truth.
- [x] Workspace persistence is centralized for normal project edits.
- [x] Project thumbnails are synchronized on normal thumbnail updates.
- [ ] `startSceneId` remains valid after scene deletion.
- [ ] Full migration coverage exists for all current Project fields.
- [ ] Character attribute rename behavior is safe for Story Logic references.
- [ ] Scene reference backgrounds are cleaned up or validated after scene deletion.
- [ ] Player fallback semantics are defined for missing speakers and missing backgrounds.
- [ ] Empty condition group authoring UX prevents accidental always-available choices.
- [ ] A project validation/readiness helper exists for Story Player preview warnings.
- [ ] Runtime helper tests exist.

## Recommended Fix Order

1. Fix `deleteScene()` so deleting the start scene assigns a valid replacement `startSceneId` or clears it when no scenes remain.
2. Expand `normalizeProject()` to normalize the full current Project/Scene/Choice/DialoguePage shape.
3. Fix character attribute rename behavior by warning or cascade-updating Story Logic references.
4. Clear `scene_reference` backgrounds that point to deleted scenes.
5. Add a read-only project validation helper for player readiness warnings.
6. Decide and document Story Player fallback behavior for missing speakers, missing backgrounds, missing target scenes, and empty projects.
7. Adjust condition group authoring UX so empty groups cannot accidentally bypass intended restrictions.
8. Add focused tests for runtime initialization, condition evaluation, hint resolution, and effect application.
9. Clean up stale UI copy and the inert workspace Preview button as part of EPIC 7 UI work.

## Final Recommendation

**Fix specific issues first.**

Do not start Story Player implementation until the start-scene deletion bug and migration coverage gap are addressed. After those are fixed, EPIC 7 can start safely on the existing architecture. The current model and stores are sound enough to support a Story Player MVP, provided the player consumes `Project` directly, reuses `runtimeLogic.ts`, and adds a small validation layer instead of creating a second runtime data model.
