# Full Code Review - July 2026

## 1. Review Metadata

- Repository: `https://github.com/cisiur/Narrium`
- Branch: `main`
- Reviewed HEAD: `9a17c6c6756a68dfd86e17f8d645d2bf55511e12`
- Review date: 2026-07-20
- Reviewed scope: all files under `src/`, all files under `src-tauri/src/`, Tauri config and capabilities, TypeScript/Vite/Vitest configuration, `package.json`, Rust manifest/configuration, automated tests, export/storage/migration/asset/runtime/validation/platform service boundaries, and the required architecture/data/review documents.

Validation commands and outcomes:

- `npm.cmd test`: Passed. 42 test files, 457 tests.
- `npm.cmd run build`: Passed. Vite emitted a chunk-size warning for `assets/index-B8i3pFpA.js` at 505.72 kB before gzip.
- `npm.cmd run desktop:build`: First sandboxed run compiled the release app but failed when running WiX `light.exe` from AppData. After confirming no running `narrium.exe` process was locking the release binary, the escalated rerun passed and produced MSI and NSIS bundles.
- `cargo test` from `src-tauri`: Passed. 81 tests.
- `npm.cmd run lint`: Not run because `package.json` has no `lint` script.
- `cargo fmt --check` from `src-tauri`: Passed.
- `cargo clippy --all-targets --all-features` from `src-tauri`: Completed with one warning, `clippy::needless_borrows_for_generic_args` at `src-tauri/src/lib.rs:421`.

## 2. Executive Summary

Narrium is in solid early-desktop shape. The central `.narrium` workflow is coherent, Rust owns most filesystem validation, local background assets are project-relative, file-backed desktop projects avoid full `Project` mirroring into localStorage, and the tests cover many of the important storage, asset, export, runtime, and migration rules.

Architecture score: 7/10.

Desktop readiness score: 7/10.

Data-integrity assessment: good for normal Save/Save As/Open workflows, with one high-risk unsaved-change bypass and some partial-success cleanup gaps.

Security assessment: generally good for project/local-background operations, but one desktop JSON export command is wider than the otherwise session-trusted file command design.

Performance assessment: acceptable for current project sizes, but drag-position persistence and full-snapshot history create a concrete scaling problem for larger canvases.

Test-quality assessment: broad unit coverage with strong Rust filesystem tests; weakest area is standalone runtime parity because current tests mainly assert template strings instead of executing exported runtime behavior.

Total findings by severity:

- P0 Critical: 0
- P1 High: 1
- P2 Medium: 5
- P3 Low: 1

## 3. Severity Definitions

- **P0 Critical** - active severe data loss, arbitrary filesystem compromise, unrecoverable corruption, or release-stopping defect with a direct reproduction path.
- **P1 High** - realistic data-loss, security, major correctness, or production-blocking risk.
- **P2 Medium** - meaningful correctness, maintainability, performance, test, or UX risk that should be scheduled.
- **P3 Low** - bounded technical debt, small resilience issue, or low-impact improvement.

## 4. Findings Summary Table

| ID | Title | Priority | Category | Affected area | Estimated size | Blocks future work |
|---|---|---:|---|---|---|---|
| FCR-001 | In-app My Projects navigation can discard dirty file-backed work without prompting | P1 | Data integrity / UX | App shell, workspace store | S | Yes |
| FCR-002 | Project import accepts malformed nested Story Logic that later crashes runtime/export code | P2 | Correctness / data integrity | Import, migration, runtime, validation, export | M | Yes |
| FCR-003 | Desktop JSON export command can write arbitrary `.json` paths supplied by the renderer | P2 | Security | Tauri command surface, JSON export | S | No |
| FCR-004 | Save As can leave copied or materialized assets behind when the final project write fails | P2 | Data integrity / asset lifecycle | Save As, local asset relocation, embedded migration | M | No |
| FCR-005 | Canvas drag events persist full project updates and undo snapshots for every position event | P2 | Performance / UX | React Flow canvas, workspace store, history | M | No |
| FCR-006 | Standalone player runtime parity is protected mostly by string-template tests | P2 | Test quality / runtime correctness | Standalone HTML export, Preview runtime | M | Yes |
| FCR-007 | Clippy reports a needless borrow in the Rust JSON export writer | P3 | Maintenance | Rust command implementation | XS | No |

## 5. Detailed Findings

### FCR-001

ID: FCR-001  
Title: In-app My Projects navigation can discard dirty file-backed work without prompting  
Priority: P1 High  
Category: Data integrity / UX  
Files and symbols: `src/app/App.tsx` `App`, `src/components/AppShell.tsx` `onBackToProjects`, `src/store/workspaceStore.ts` `closeProject`, `ensureCanLeaveActiveProject`  
Status: Confirmed defect  
Confidence: High  
Estimated implementation size: S  
Blocks future work: Yes  
Depends on: None

#### Evidence

`App` reads `closeProject` directly from the workspace store and passes it to the shell as `onBackToProjects` (`src/app/App.tsx:47`, `src/app/App.tsx:260`). `AppShell` wires that callback directly to the in-editor `My Projects` button (`src/components/AppShell.tsx:104`). The store's `closeProject` implementation clears `activeProject`, `activeProjectFilePath`, history, and sets `activeProjectDirty: false` without calling `ensureCanLeaveActiveProject` (`src/store/workspaceStore.ts:370`-`385`). The dirty guard exists and is used for Create, Open Project File, Recent Project, and native close (`src/store/workspaceStore.ts:200`, `247`, `293`, `364`, `498`, `716`-`744`), but this in-app path bypasses it.

#### Failure or risk scenario

An author opens a file-backed `.narrium` project, edits a scene, background, variable, or choice, and sees the dirty `*`. They click `My Projects` in the app header rather than using native window close or opening another project. The app immediately drops the in-memory file-backed project and marks dirty state false. Because file-backed edits are intentionally not mirrored into `BrowserProjectStorage`, those edits are not recoverable unless the author had saved them separately.

#### Impact

This is a realistic data-loss path in normal desktop navigation. It contradicts the otherwise strong dirty-state protection design and is more severe than a cosmetic UX inconsistency because the discarded state is the only copy of unsaved file-backed edits.

#### Recommended Resolution

Add an async guarded close/back action, for example `closeProjectWithUnsavedCheck`, that calls `ensureCanLeaveActiveProject()` before `closeProject()`. Wire the header `My Projects` button to that guarded action. Keep `closeProject` available only as an internal primitive for already-approved transitions.

#### Acceptance Criteria For A Future Fix

- Clicking `My Projects` while clean returns to the project list immediately.
- Clicking `My Projects` while dirty shows the same Save / Don't Save / Cancel decision used by native close and guarded Open/Create.
- Cancel keeps the project open and dirty.
- Save failure keeps the project open and dirty and surfaces the error.
- File-backed dirty projects are not written to localStorage during this flow.

#### Suggested Tests

- App or store integration test proving `onBackToProjects` invokes the unsaved-change guard for dirty file-backed projects.
- Regression test for Cancel preserving `activeProject`, `activeProjectFilePath`, and `activeProjectDirty`.
- Regression test for Save success closing the project only after `saveActiveProjectToFile()` returns true.

### FCR-002

ID: FCR-002  
Title: Project import accepts malformed nested Story Logic that later crashes runtime/export code  
Priority: P2 Medium  
Category: Correctness / data integrity  
Files and symbols: `src/domain/project/projectImport.ts` `parseProjectImport`, `resemblesChoice`; `src/domain/project/projectMigrations.ts` `normalizeChoice`; `src/domain/runtime/runtimeLogic.ts` `isChoiceAvailable`, `resolveUnavailableChoiceHint`; `src/features/validation/projectValidation.ts` validation loops; `src/services/export/playableFolderExportPlanner.ts` `createPlayableFolderExportPlan`; `src/services/export/standaloneHtmlExport.ts` inline runtime helpers  
Status: Confirmed defect  
Confidence: High  
Estimated implementation size: M  
Blocks future work: Yes  
Depends on: None

#### Evidence

`parseProjectImport` only checks that `conditionGroups`, legacy `conditions`, and `effects` are arrays when present (`src/domain/project/projectImport.ts:28`-`39`). It does not validate that each condition group has a `conditions` array, that conditions have `hintText`, `operator`, `type`, `targetId`, and numeric `value`, or that effects have valid operations and numeric values. `normalizeChoice` then preserves the nested objects with `conditionGroups` and `effects` mostly as-is (`src/domain/project/projectMigrations.ts:72`-`104`).

Downstream code assumes well-formed nested structures. Runtime calls `group.conditions.every(...)` and later `condition.hintText.trim()` (`src/domain/runtime/runtimeLogic.ts:110`-`132`). Validation iterates `(choice.conditionGroups ?? []).forEach((conditionGroup) => ...)` and then uses nested condition/effect fields (`src/features/validation/projectValidation.ts:290` and following). Playable export deep-clones `choice.conditionGroups.map((group) => group.conditions.map(...))` (`src/services/export/playableFolderExportPlanner.ts:66`-`71`). The standalone HTML template contains the same assumptions in its embedded runtime (`src/services/export/standaloneHtmlExport.ts:741`-`766`).

#### Failure Or Risk Scenario

A user imports or opens a JSON project where a choice contains `conditionGroups: [{ "id": "bad" }]`, or a condition missing `hintText`. The project passes the shallow resemblance check and becomes active. Opening validation/preview/export can then throw on `group.conditions.every`, `group.conditions.map`, or `condition.hintText.trim`, leaving the user with a project that loaded but breaks core workflows.

#### Impact

Malformed or partially corrupt project files can enter canonical application state and fail later in unrelated UI surfaces. This creates brittle migration behavior, confusing import success states, and crash paths in Preview, validation, standalone export, and playable folder export.

#### Recommended Resolution

Strengthen import normalization around nested Story Logic. Either reject malformed nested condition/effect objects during `parseProjectImport`, or normalize them into safe defaults with explicit validation issues. The important invariant is that a successfully imported `Project` must satisfy the runtime/export assumptions for `conditionGroups[].conditions[]` and `effects[]`.

#### Acceptance Criteria For A Future Fix

- `parseProjectImport` rejects or safely repairs malformed condition groups without producing runtime-crashing project state.
- Successfully imported projects always have `Choice.conditionGroups` arrays whose groups always have `conditions` arrays.
- Conditions always have safe `hintText`, recognized operators/types, and finite numeric values before runtime uses them.
- Effects always have recognized operations/types and finite numeric values before runtime uses them.
- Invalid imported Story Logic reports a user-visible import or validation error rather than crashing Preview/export.

#### Suggested Tests

- Import tests for missing `group.conditions`, non-array `group.conditions`, missing `hintText`, invalid operators, non-numeric condition values, invalid effect operations, and non-numeric effect values.
- Runtime tests proving malformed imported choices cannot throw.
- Export planner test proving malformed imported condition groups are rejected before `createPlayableFolderExportPlan` deep-clones them.

### FCR-003

ID: FCR-003  
Title: Desktop JSON export command can write arbitrary `.json` paths supplied by the renderer  
Priority: P2 Medium  
Category: Security  
Files and symbols: `src/services/json-export/DesktopJsonExportFileApi.ts` `selectJsonExportPath`, `writeJsonExportFile`; `src-tauri/src/lib.rs` `write_json_export_file`, `validate_json_export_file_path_for_write`; `src-tauri/capabilities/default.json` dialog permissions  
Status: Confirmed security boundary weakness  
Confidence: High  
Estimated implementation size: S  
Blocks future work: No  
Depends on: None

#### Evidence

The normal desktop UI asks Tauri's save dialog for a JSON export path (`src/services/json-export/DesktopJsonExportFileApi.ts:5`-`18`) and then invokes `write_json_export_file` (`src/services/json-export/DesktopJsonExportFileApi.ts:21`-`23`). The Rust command accepts `file_path` and `contents` directly from the renderer, checks only that the extension is `.json` and that the parent directory already exists, then writes the file (`src-tauri/src/lib.rs:413`-`429`, `464`-`479`). Unlike project-file writes, this path does not register a pending dialog-selected destination and does not require session trust. The capability grants dialog open/save permissions (`src-tauri/capabilities/default.json`) and the custom command is registered in the invoke handler (`src-tauri/src/lib.rs:23`-`39`).

#### Failure Or Risk Scenario

If renderer JavaScript is compromised or a future renderer bug allows arbitrary command invocation, an attacker can call `write_json_export_file` with any user-writable existing path ending in `.json`, such as another application's settings file, and arbitrary JSON contents derived or supplied by the renderer. Current validation prevents non-JSON extensions and missing parents, but it does not prove that the path was selected in the save dialog.

#### Impact

This is narrower than arbitrary filesystem compromise because writes are limited to `.json` files in existing writable directories, but it is inconsistent with the session-trust model used for `.narrium` project writes. It expands the renderer-to-filesystem boundary beyond explicit user-selected export destinations.

#### Recommended Resolution

Mirror the Save As trust pattern for JSON export: have Rust own the save dialog or register a pending JSON export destination when the dialog returns, then require that pending destination in `write_json_export_file`. Keep extension and existing-parent checks.

#### Acceptance Criteria For A Future Fix

- Direct `write_json_export_file` calls to unregistered paths fail even when the path ends in `.json`.
- Dialog-selected JSON export destinations are accepted once and then cleared or scoped appropriately.
- `.narrium` project-file trust remains separate from JSON export trust.
- Tests cover untrusted JSON write rejection, trusted JSON write success, wrong extension rejection, and missing parent rejection.

#### Suggested Tests

- Rust tests for untrusted `.json` write rejection and pending JSON export write success.
- TypeScript platform/API tests proving the selected path is the one passed to the trusted write flow.

### FCR-004

ID: FCR-004  
Title: Save As can leave copied or materialized assets behind when the final project write fails  
Priority: P2 Medium  
Category: Data integrity / asset lifecycle  
Files and symbols: `src/services/project-file/ProjectFileService.ts` `saveProjectAs`, `writeProjectWithEmbeddedBackgroundMigration`; `src-tauri/src/lib.rs` `copy_local_asset_for_project_save_as_impl`, `materialize_embedded_background_assets`; `docs/DESKTOP_ARCHITECTURE.md` migration limitation  
Status: Confirmed partial-success risk  
Confidence: High  
Estimated implementation size: M  
Blocks future work: No  
Depends on: None

#### Evidence

`saveProjectAs` copies local asset sources to the destination project directory before the `.narrium` file is serialized and written (`src/services/project-file/ProjectFileService.ts:145`-`167`). The Rust copy command creates destination asset directories and copies each file immediately (`src-tauri/src/lib.rs:1316`-`1363`). After that, `writeProjectWithEmbeddedBackgroundMigration` may materialize embedded backgrounds and then writes the final `.narrium` (`src/services/project-file/ProjectFileService.ts:186`-`227`). The architecture docs already acknowledge one related limitation: materialized files are not rolled back when materialization succeeds but `.narrium` writing fails afterward. The same partial-success shape also exists for Save As local asset copies.

#### Failure Or Risk Scenario

An author performs Save As to a new folder. Local background copies succeed, then embedded migration fails, serialization throws on malformed imported data, or the final `.narrium` write fails due to disk permissions, low disk space, or a lock. The app correctly keeps the old active project/path dirty, but the chosen destination can contain copied local background files or materialized files without a matching project file.

#### Impact

This does not lose story edits, but it creates orphaned filesystem state and confusing partial output. It weakens the desktop asset lifecycle guarantee that project folders should remain understandable and portable.

#### Recommended Resolution

Make Save As asset relocation and final `.narrium` write transactional at the destination level. Use a staging directory or manifest for destination copies/materialized files, write the `.narrium` into the same staged area, then finalize atomically where possible. On failure, clean staged files and report cleanup failures separately.

#### Acceptance Criteria For A Future Fix

- Failed Save As after local asset copying leaves no new destination asset files when cleanup succeeds.
- Failed Save As after embedded materialization leaves no new destination materialized background files when cleanup succeeds.
- If cleanup itself fails, the error clearly identifies leftover files.
- Successful Save As still promotes the destination path to trusted and updates active project state only after final write success.

#### Suggested Tests

- Project-file service test where local asset copy succeeds and final write fails, asserting active state is unchanged and cleanup is requested.
- Rust integration-style tests for staged Save As asset relocation cleanup.
- Save As test where embedded materialization succeeds and final write fails, asserting no orphaned files remain after cleanup.

### FCR-005

ID: FCR-005  
Title: Canvas drag events persist full project updates and undo snapshots for every position event  
Priority: P2 Medium  
Category: Performance / UX  
Files and symbols: `src/store/useCanvasStore.ts` `onNodesChange`; `src/store/workspaceStore.ts` `updateActiveProject`; `src/store/projectHistory.ts` `pushProjectSnapshot`, `createSizedProjectSnapshot`; `src/services/project-storage/BrowserProjectStorage.ts` `saveProject`  
Status: Confirmed performance risk  
Confidence: High  
Estimated implementation size: M  
Blocks future work: No  
Depends on: None

#### Evidence

`onNodesChange` processes every React Flow `position` change and calls `useWorkspaceStore.getState().updateActiveProject` whenever any scene position changed (`src/store/useCanvasStore.ts:403`-`436`). `updateActiveProject` stamps `updatedAt`, saves browser/draft projects to `BrowserProjectStorage`, saves workspace metadata, pushes a full previous-project snapshot, and marks dirty (`src/store/workspaceStore.ts:592`-`627`). `pushProjectSnapshot` serializes the whole `Project`, parses it back into a cloned snapshot, stores it in history, and computes history metrics (`src/store/projectHistory.ts:38`-`59`, `136`-`145`).

#### Failure Or Risk Scenario

Dragging one scene can emit many position events. In a browser project or unsaved desktop draft with embedded backgrounds, every drag event can serialize the full project, write the full draft payload to localStorage, push another full-project undo snapshot, and recalculate history metrics. A single long drag can fill the 50-snapshot undo cap with intermediate positions and make undo less useful, while also causing jank on larger projects.

#### Impact

This is a measurable scaling and UX problem, not only theoretical debt. It affects a core editing gesture and amplifies the known full-snapshot undo tradeoff. File-backed desktop projects avoid full-project localStorage writes, but they still pay full snapshot serialization and history churn for each position event.

#### Recommended Resolution

Treat canvas dragging as a coalesced edit. Update transient React Flow node positions during drag, but commit one project/history update on drag stop or through a short debounce/throttle that creates one undo step per author-visible drag. Preserve group-bound recalculation on the committed position.

#### Acceptance Criteria For A Future Fix

- A continuous scene drag creates one undo snapshot for the final position.
- Browser/draft localStorage project writes are not performed for every intermediate position event.
- Group bounds still update correctly after dragging grouped scenes.
- Selection-only changes still do not create undo history.

#### Suggested Tests

- Canvas store test simulating multiple position changes for one drag and asserting one history snapshot.
- Regression test for grouped scene drag updating group bounds after the final committed position.
- Browser draft test asserting coalesced persistence behavior during drag.

### FCR-006

ID: FCR-006  
Title: Standalone player runtime parity is protected mostly by string-template tests  
Priority: P2 Medium  
Category: Test quality / runtime correctness  
Files and symbols: `src/services/export/standaloneHtmlExport.ts` inline runtime helpers; `src/domain/runtime/runtimeLogic.ts` shared Preview runtime; `src/services/export/standaloneHtmlExport.test.ts`; `src/services/export/PlayableFolderExportService.ts`  
Status: Confirmed test gap around high-risk duplicated logic  
Confidence: High  
Estimated implementation size: M  
Blocks future work: Yes  
Depends on: None

#### Evidence

Preview uses shared domain helpers from `src/domain/runtime/runtimeLogic.ts` (`src/features/player/StoryPlayer.tsx:3`, `34`-`35`). The standalone export embeds a separate JavaScript implementation of the same runtime concepts: condition evaluation, unavailable hints, effects, choice enablement, advancement, background resolution, and save/load (`src/services/export/standaloneHtmlExport.ts:464`-`1149`). Current standalone export tests mostly assert that generated HTML contains specific strings, such as variable initialization snippets, Resource HUD snippets, and a local-asset option flag (`src/services/export/standaloneHtmlExport.test.ts:40`-`92`). They do not execute the generated player and compare behavior against the Preview/domain runtime.

#### Failure Or Risk Scenario

A future change updates `advanceRuntimeForChoice`, `applyEffects`, save/load snapshot shape, unavailable-choice hints, or local background resolution in domain/runtime code but misses the embedded standalone JavaScript copy. The string tests can still pass if the expected snippets remain present, while exported stories behave differently from Preview or playable folder exports.

#### Impact

Standalone HTML and playable folder exports are user-facing distribution paths. Runtime divergence can ship broken choices, incorrect conditions/effects, missing save data, or inconsistent endings even when Preview is correct. Because the folder export reuses `createStandaloneHtml`, this test gap affects both export modes.

#### Recommended Resolution

Add executable parity tests for generated standalone HTML. Use a lightweight DOM environment or browser automation to load the generated HTML, click through representative choices, and compare runtime outcomes with domain helper outcomes for resources, variables, character attributes, targetless choices, invalid targets, save/load, and background modes.

#### Acceptance Criteria For A Future Fix

- At least one test executes generated standalone runtime behavior instead of only checking template strings.
- Cross-runtime tests cover conditions, effects, targetless choices, invalid targets, Resource HUD values, variable save/load, and one-level scene background references.
- The same tests run with `resolveLocalAssetSources: false` and `true` where local background behavior differs intentionally.

#### Suggested Tests

- Generated HTML smoke test that starts a story, advances pages, selects a valid choice, and verifies scene/page/resource/variable state.
- Parity matrix comparing domain `advanceRuntimeForChoice` results against standalone click results for resource, variable, and character attribute effects.
- Save/load test executing the standalone snapshot validator with current runtime state shape.

### FCR-007

ID: FCR-007  
Title: Clippy reports a needless borrow in the Rust JSON export writer  
Priority: P3 Low  
Category: Maintenance  
Files and symbols: `src-tauri/src/lib.rs` `write_json_export_file`  
Status: Confirmed tooling warning  
Confidence: High  
Estimated implementation size: XS  
Blocks future work: No  
Depends on: None

#### Evidence

`cargo clippy --all-targets --all-features` completed successfully but reported `clippy::needless_borrows_for_generic_args` at `src-tauri/src/lib.rs:421`, where `std::fs::write(&export_file_path, contents)` borrows a value that already implements the required traits.

#### Failure Or Risk Scenario

There is no runtime failure. The warning means optional Rust lint validation is not warning-clean, so future clippy use in CI would either fail if warnings are denied or train contributors to ignore warnings.

#### Impact

Low maintenance impact only.

#### Recommended Resolution

Change `std::fs::write(&export_file_path, contents)` to `std::fs::write(export_file_path, contents)` when normal code changes are in scope.

#### Acceptance Criteria For A Future Fix

- `cargo clippy --all-targets --all-features` completes without warnings.

#### Suggested Tests

- No dedicated regression test needed; clippy is sufficient.

## 6. Observed Intentional Tradeoffs

- Browser/localStorage compatibility remains intentional for browser projects, local desktop drafts before Save As, browser app preferences, and exported standalone player save slots.
- Legacy single-file standalone HTML export intentionally does not package local desktop files. The separate desktop playable folder export is the portable local-background export path.
- Full-snapshot undo/redo is documented as an MVP choice with a 50-snapshot cap. FCR-005 is limited to uncoalesced drag-position churn, not the existence of snapshots by itself.
- Direct development on `main` is documented as the current project workflow.
- Local asset lifecycle support is currently background-only by design. Non-background asset storage, packaging, cleanup, and duplicate consolidation remain future work.
- Playable folder export intentionally rejects existing output folders instead of replacing or merging them.
- Legacy direct `SceneBackground.url` / `upload` / `url` support remains for compatibility pending future format-version planning.
- Some browser file APIs remain in UI/components for browser compatibility and transitional draft/import flows.

## 7. Documentation Inconsistencies

- The docs accurately describe most implemented desktop security and asset behavior, including session trust, local background cleanup, duplicate diagnostics, embedded background migration, native preferences, and playable folder export.
- The documentation says app preferences and raw JSON export are outside the project-relative allowlist "where appropriate." FCR-003 identifies that raw JSON export is currently outside any equivalent dialog-selected write allowlist, which is a security design mismatch with the otherwise session-scoped file command model.
- The docs acknowledge materialized files are not rolled back if final `.narrium` writing fails. FCR-004 extends that documented limitation to Save As local asset relocation; the local-copy side effect is not called out as clearly.

## 8. Test Coverage Gaps

Prioritized gaps:

1. Dirty in-app close/back navigation coverage for the `My Projects` header button and `closeProject` usage.
2. Malformed nested Story Logic import coverage, especially corrupt condition groups, missing condition fields, invalid numeric fields, and invalid effect operations.
3. JSON export Rust trust/allowlist tests equivalent to project Save As trust tests.
4. Save As partial-failure tests covering local asset copy success followed by embedded migration or final write failure.
5. Canvas drag coalescing and undo-history tests for repeated position events.
6. Executable standalone/export runtime parity tests instead of only template string assertions.
7. Optional clippy warning-clean CI if Rust linting becomes required.

## 9. Recommended Remediation Order

Batch 1: Dirty navigation and import hardening

- Findings included: FCR-001, FCR-002
- Rationale: Highest user-visible data risk plus the main path where corrupt imported data can enter canonical state.
- Dependencies: None.
- Expected risk reduction: Prevents direct unsaved-edit loss and removes runtime/export crash paths from malformed imports.
- Estimated combined size: M

Batch 2: Desktop filesystem boundary tightening

- Findings included: FCR-003, FCR-004
- Rationale: Aligns the remaining JSON export write path and Save As asset side effects with the stricter desktop file model.
- Dependencies: None, though staged Save As design should avoid disrupting existing project-file trust.
- Expected risk reduction: Narrows compromised-renderer write impact and reduces orphaned destination files after failures.
- Estimated combined size: M

Batch 3: Runtime parity test foundation

- Findings included: FCR-006
- Rationale: Exported player correctness is a distribution-quality gate and currently has duplicated runtime logic.
- Dependencies: None, but easier after import hardening prevents malformed fixtures from crashing unrelated tests.
- Expected risk reduction: Prevents Preview/export divergence in future story-logic changes.
- Estimated combined size: M

Batch 4: Canvas performance and maintenance cleanup

- Findings included: FCR-005, FCR-007
- Rationale: Improves editor feel for larger canvases and makes optional Rust linting clean.
- Dependencies: None.
- Expected risk reduction: Reduces drag jank/history spam and removes one tooling warning.
- Estimated combined size: M

## 10. Recommended First Remediation Batch

Recommended first batch: FCR-001 and FCR-002.

This batch is small enough for one implementation/review cycle and addresses the highest-value correctness risks: unsaved file-backed work loss and imported corrupt Story Logic entering canonical state.

Proposed acceptance criteria:

- The app header `My Projects` button uses the same unsaved-change guard as Open/Create/native close.
- Dirty Cancel and failed Save keep the project open and dirty.
- Import/open rejects or safely normalizes malformed `conditionGroups`, `conditions`, and `effects`.
- Preview, Project Validation, standalone HTML export, and playable folder export cannot throw from missing `group.conditions` or `condition.hintText`.

Required validation commands for that batch:

- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run desktop:build`
- `cargo test` from `src-tauri`

Recommended optional checks:

- `cargo fmt --check` from `src-tauri`
- `cargo clippy --all-targets --all-features` from `src-tauri`

## 11. Deferred And Optional Improvements

- Split `PlatformService` only when a new file or asset feature needs clearer ownership. The current size is not itself a defect.
- Add developer-facing performance tooling for the existing instrumentation after FCR-005 or other measured hotspots are prioritized.
- Plan a format-versioned removal of legacy direct scene background fields after migration compatibility is considered complete.
- Add ZIP/package/executable distribution only after product scope is selected.
- Add duplicate consolidation only after a product design exists for safe asset reference rewriting.
- Replace blocking `window.alert` status reporting for export success/failure with richer in-app operation feedback when broader UX polish is in scope.
