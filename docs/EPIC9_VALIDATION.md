# EPIC 9 Validation & Production UX — Narrium

> Status: implemented on `main` after E9-15, E9-16, E9-17, E9-18, and E9-18B.

---

## Purpose

This document summarizes the EPIC 9 validation work completed after EPIC 8 Save, Load, and Export.

The goal of this batch was to improve production-readiness and authoring safety without changing Narrium runtime behavior, project data shape, JSON import/export, Preview playback, or standalone HTML export semantics.

---

## Completed tasks

| ID | Task | Status | Commit |
|---|---|---|---|
| E9-15 | Warn on targetless choices with no effects | ✅ Done | `56a8304` |
| E9-16 | Validation infrastructure | ✅ Done | `87d08ba` |
| E9-17 | Validation rules batch | ✅ Done | `a90c866` |
| E9-18 | Project Validation Panel MVP | ✅ Done | `c25e3ea` |
| E9-18B | Validation Panel Layout Polish | ✅ Done | `8098139` |

---

## E9-15 — Warn on targetless choices with no effects

Implemented an inline authoring warning in the Scene Editor for choices that have:

```text
choice.targetSceneId === null
AND choice.effects.length === 0
```

Warning message:

```text
This choice does nothing. Add a target scene or at least one effect.
```

Important behavior:

- Targetless choices with effects remain valid action choices.
- Choices with a target scene and no effects remain valid navigation choices.
- The warning is authoring-only.
- Runtime behavior was not changed.

---

## E9-16 — Validation infrastructure

Added shared validation infrastructure under:

```text
src/features/validation/projectValidation.ts
```

Introduced:

- `ValidationSeverity`
- `ValidationIssue`
- `VALIDATION_CODES`
- `validateProject(project): ValidationIssue[]`

The first rule moved the E9-15 warning logic into shared validation:

```text
targetless_choice_without_effects
```

The Scene Editor now uses `validateProject(project)` instead of duplicating the targetless-choice rule inline.

---

## E9-17 — Validation rules batch

Extended `validateProject(project)` with additional validation rules.

### Broken choice target

Code:

```text
broken_choice_target
```

Severity:

```text
error
```

Detected when:

```text
choice.targetSceneId !== null
AND no scene with that id exists
```

Message:

```text
Target scene no longer exists.
```

### Missing dialogue speaker

Code:

```text
missing_dialogue_speaker
```

Severity:

```text
warning
```

Detected when:

```text
dialoguePage.speakerId !== null
AND no character with that id exists
```

Message:

```text
Referenced speaker no longer exists.
```

### Broken scene background reference

Code:

```text
broken_scene_background_reference
```

Severity:

```text
warning
```

Detected when:

```text
scene.background.mode === "scene_reference"
AND sourceSceneId points to a missing scene
```

Message:

```text
Referenced scene background no longer exists.
```

### Broken asset background reference

Code:

```text
broken_asset_background_reference
```

Severity:

```text
warning
```

Detected when:

```text
scene.background.mode === "asset"
AND assetId points to a missing project asset
```

Message:

```text
Referenced background asset no longer exists.
```

---

## E9-18 — Project Validation Panel MVP

Added a Project Validation panel based on the shared `validateProject(project)` function.

The panel displays:

- total issue count,
- empty state when there are no issues,
- severity labels (`Error` / `Warning`),
- issue messages,
- scene names when available.

Issue ordering:

1. errors first,
2. warnings second,
3. original validation order preserved within each severity group.

Click behavior:

- If an issue has `sceneId`, clicking it opens the related scene in the editor.
- If an issue has both `sceneId` and `choiceId`, clicking it selects the related choice.

Navigation uses existing canvas/editor store APIs:

- `openEditor(sceneId)`
- `selectChoice(sceneId, choiceId)`

No validation logic is duplicated in the panel.

---

## E9-18B — Validation Panel Layout Polish

The right sidebar was intentionally changed into a production-oriented validation/editor sidebar:

- Project Validation remains visible at the top.
- Scene Editor appears below validation when a scene is selected.
- When no scene is selected, the sidebar shows:

```text
Select a scene to edit its content.
```

This makes project validation always accessible while keeping scene editing contextual.

---

## Runtime and export compatibility

This EPIC 9 validation batch intentionally did not change:

- Preview runtime behavior,
- standalone HTML export behavior,
- standalone HTML runtime behavior,
- JSON export/import,
- project data model,
- project migrations.

Validation is editor-facing and authoring-focused.

---

## Test coverage

Added focused Vitest coverage for:

- `validateProject(project)` empty and warning cases,
- valid navigation choices,
- valid action choices,
- targetless choices with no effects,
- multiple issues across multiple scenes,
- broken choice targets,
- missing dialogue speakers,
- broken scene background references,
- broken asset background references,
- Project Validation panel empty state,
- warning rendering,
- error rendering,
- issue ordering,
- validation issue navigation helpers.

Latest reported validation after E9-18B:

```text
npm.cmd test      → 30 tests passing
npm.cmd run build → passed
```

---

## Current validation architecture

```text
src/features/validation/
  projectValidation.ts
  projectValidation.test.ts
  ProjectValidationPanel.tsx
  ProjectValidationPanel.test.tsx
```

Primary API:

```typescript
validateProject(project): ValidationIssue[]
```

The validation layer is now the recommended single source of truth for future editor validation, export-readiness checks, and project QA tooling.

---

## Recommended next steps

Good follow-up candidates for EPIC 9:

1. `E9-01` — Keyboard shortcuts: Delete selected node/choice, Esc close/cancel.
2. `E9-08` — Empty/error states polish.
3. Extend validation with Story Logic reference rules for missing resource / character attribute condition and effect targets.
4. Add export preflight warning using `validateProject(project)`.

Documentation follow-up:

- Update `docs/ROADMAP.md` EPIC 9 status table.
- Update `docs/CHANGELOG.md` Unreleased section.
- Update `CONTEXT.md` resume summary.
