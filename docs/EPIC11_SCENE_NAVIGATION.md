# EPIC 11 — Scene Navigation Modes

> Status: planned  
> Scope: scene ending/navigation model for Choices and Auto Navigation  
> Runtime impact: Preview and standalone runtime must support the new navigation mode

---

## 1. Vision

Scene Navigation Modes let authors decide how a scene continues after its dialogue pages finish.

Today, every scene ends by showing player-facing Choices. This epic introduces a second mode: **Auto Navigation**.

With Auto Navigation, the player clicks **Next** after the last dialogue page, and Narrium automatically evaluates route rules from top to bottom. The first route whose conditions pass is executed. If none pass, a mandatory default route is executed.

This allows authors to build scenes that branch automatically based on Resources, Variables, or Character attributes without presenting visible choices to the player.

Examples:

- automatically route to a different scene if the player has enough gold,
- route to a special ending if a hidden variable is set,
- branch based on relationship/courage/suspicion values,
- keep a scene linear for the player while still using conditional logic under the hood.

---

## 2. Product concept

Each scene should have exactly one active navigation mode:

```ts
navigationMode: 'choices' | 'auto_navigation'
```

Modes:

| Mode | Player experience | Authoring model |
|---|---|---|
| `choices` | Player sees clickable choices after the last dialogue page | Existing `choices` behavior |
| `auto_navigation` | Player clicks Next after the last dialogue page; Narrium routes automatically | Ordered `autoRoutes` rules |

The modes are mutually exclusive at runtime and on the canvas.

When `navigationMode = 'choices'`:

- Choices work exactly as they do today.
- `autoRoutes` are ignored by runtime and canvas edge generation.

When `navigationMode = 'auto_navigation'`:

- Choices are ignored by runtime and canvas edge generation.
- Auto Routes are evaluated from top to bottom.
- The first route whose conditions pass is executed.
- If no conditional route passes, the required default route is executed.

Important product rule:

- Switching modes should not delete the inactive mode's data automatically.
- The inactive mode is preserved so authors do not lose work by toggling modes.

---

## 3. Naming

Recommended UI naming:

- Main editor section: **Navigation**
- Mode option 1: **Player Choices**
- Mode option 2: **Auto Navigation**

Avoid using only `Choices` as the section name once this epic is implemented, because the section will contain more than player-facing choices.

Suggested Scene Editor layout:

```text
Navigation
  Mode
    ○ Player Choices
    ○ Auto Navigation

  Player Choices
    Existing choices UI

  Auto Navigation
    Ordered routes UI
```

---

## 4. Data model proposal

Extend `Scene`:

```ts
interface Scene {
  id: string;
  name: string;
  background: SceneBackground;
  position: { x: number; y: number };
  dialoguePages: DialoguePage[];
  choices: Choice[];
  autoRoutes: AutoRoute[];
  navigationMode: 'choices' | 'auto_navigation';
  groupId: string | null;
}
```

Add `AutoRoute`:

```ts
interface AutoRoute {
  id: string;
  label: string;
  targetSceneId: string | null;
  conditionGroups: ConditionGroup[];
  effects: Effect[];
  isDefault: boolean;
}
```

### 4.1 Why AutoRoute resembles Choice

An Auto Route is essentially a Choice that is not shown as a clickable player option.

It still needs:

- stable id,
- label for editor/canvas readability,
- target scene,
- condition groups,
- effects,
- ordering.

The key difference is player visibility.

`Choice` is player-facing.  
`AutoRoute` is automatic and editor-facing.

---

## 5. Default Auto Route

Every scene should have exactly one default Auto Route when Auto Navigation is used.

Rules:

- default route is mandatory,
- default route is evaluated only after all non-default routes fail,
- default route should not require conditions,
- default route may have effects,
- default route may target a scene or have `targetSceneId = null`,
- if default route has no target, the scene may end the story after the final Next.

Recommended implementation detail:

- store default route in the same `autoRoutes` array with `isDefault: true`,
- keep default route visually pinned at the bottom of the Auto Navigation list,
- non-default routes are ordered above it and evaluated top-to-bottom.

Validation should eventually enforce:

- exactly one default route,
- default route exists,
- non-default route order is stable.

---

## 6. Runtime behavior

### 6.1 Choices mode

No behavior change.

After the final dialogue page:

- show available Choices,
- unavailable choices are disabled by existing condition logic,
- selecting a Choice applies effects and navigates according to existing runtime behavior.

### 6.2 Auto Navigation mode

After the final dialogue page:

- show a **Next** button,
- clicking **Next** evaluates Auto Routes,
- evaluate non-default routes from top to bottom,
- execute the first route whose condition groups pass,
- if no non-default route passes, execute the default route,
- apply route effects,
- navigate to route target if present,
- if no target is present, reach an end state.

Auto Navigation should reuse existing Story Logic condition/effect helpers where possible.

Do not create a second condition/effect engine.

---

## 7. Condition semantics

Auto Routes should use the same condition model as Choices:

```ts
ConditionGroup[]
```

Expected semantics should match existing Choice conditions.

A non-default Auto Route is considered available when its condition groups pass.

Default route should not need conditions and should always be available as fallback.

---

## 8. Effects semantics

Auto Routes should use the same effects model as Choices:

```ts
Effect[]
```

When an Auto Route is selected automatically:

- apply its effects,
- then navigate to `targetSceneId`, if present,
- reset page index for the target scene as existing navigation does.

---

## 9. Canvas edge behavior

Canvas edges should reflect only the active navigation mode of each scene.

When scene uses `choices`:

- render edges from `scene.choices`, exactly as today.

When scene uses `auto_navigation`:

- render edges from `scene.autoRoutes`,
- do not render edges from inactive `scene.choices`.

Underlying data must stay unchanged.

### 9.1 Edge colors

Auto Navigation edges must be visually distinct from Player Choice edges.

Recommended style:

| Edge source | Suggested meaning | Suggested visual treatment |
|---|---|---|
| Player Choice edge | Player chooses this path manually | Existing edge color/style |
| Auto Navigation edge | System routes automatically after final Next | Different color from Choices, e.g. amber/gold or violet |
| Default Auto Route edge | Fallback path | Same Auto Navigation color with label prefix or subtle dashed style |

Implementation details can be decided during implementation, but requirements are:

- Auto Navigation edges must not look identical to Choice edges.
- The distinction should remain visible with Scene Groups collapsed.
- Projected Auto Navigation edges should preserve the Auto Navigation edge style.
- Edge labels should make default routes understandable.

Suggested labels:

```text
Auto: <route label>
Default: <route label>
```

If a route label is empty, fallback label examples:

```text
Auto Route
Default Route
```

### 9.2 Scene Groups compatibility

Scene Groups edge projection must continue to work.

When a group is collapsed:

- Choice edges still project as before,
- Auto Navigation edges should also project using the same projection mechanism,
- projected edge source/target may point to `group:{groupId}` visually,
- underlying `AutoRoute.targetSceneId` must remain the real target scene id.

Do not duplicate Scene Groups projection logic.

Reuse existing helper architecture where possible.

---

## 10. Scene Editor behavior

Rename the current Choices section to **Navigation**.

Inside Navigation, provide two mutually exclusive authoring modes:

1. **Player Choices**
2. **Auto Navigation**

### 10.1 Player Choices mode

Existing Choices behavior should remain unchanged:

- add Choice,
- edit Choice text,
- edit target scene,
- conditions,
- effects,
- copy/paste if currently supported,
- edge click opens/selects the corresponding Choice.

### 10.2 Auto Navigation mode

Auto Navigation UI should allow:

- viewing ordered Auto Routes,
- adding conditional routes,
- editing route label,
- editing target scene,
- editing conditions,
- editing effects,
- reordering non-default routes,
- removing non-default routes,
- editing the default route target/effects,
- preventing deletion of the default route.

Default route should be clearly marked.

Recommended display:

```text
Auto Navigation
  Route 1: Has gold >= 10 -> Rich path
  Route 2: variable ending_unlocked == 1 -> Secret ending
  Default Route -> Normal path
```

---

## 11. Edge click behavior

Canvas edge click should continue to open the Scene Editor and select the relevant navigation item.

Expected behavior:

- clicking a Choice edge selects the corresponding Choice,
- clicking an Auto Route edge selects the corresponding Auto Route,
- projected edges from collapsed Scene Groups should still resolve back to the source scene and the original navigation item.

This may require selected navigation state to distinguish between:

```ts
selectedChoiceId
selectedAutoRouteId
```

or a generic selected navigation item model.

Implementation should preserve existing Choice edge click behavior.

---

## 12. Import/export and migrations

Old projects need migration defaults:

```ts
navigationMode: 'choices'
autoRoutes: [default route]
```

The default route should be generated for every scene during normalization if missing.

JSON export/import must preserve:

- `navigationMode`,
- `autoRoutes`,
- route order,
- default route,
- route conditions,
- route effects.

Standalone HTML export must support Auto Navigation with runtime parity.

---

## 13. Validation rules

Validation should eventually cover:

- missing `navigationMode`,
- invalid `navigationMode`,
- missing `autoRoutes`,
- Auto Navigation mode without a default route,
- Auto Navigation mode with multiple default routes,
- broken Auto Route target scene references,
- broken Auto Route condition references,
- broken Auto Route effect references,
- default route missing when mode is Auto Navigation,
- unreachable/ambiguous cases only if practical later.

Validation should not require inactive mode data to be valid at first unless product decision changes.

Recommended MVP validation rule:

- validate active navigation mode strictly,
- preserve inactive mode data but do not block export because of inactive mode issues unless the issue can corrupt project data.

---

## 14. Runtime parity requirements

Preview and standalone HTML must behave the same.

For Auto Navigation:

- same route order,
- same condition evaluation,
- same default fallback,
- same effects application,
- same target navigation,
- same end-state behavior when route target is null.

No feature should be Preview-only.

---

## 15. Suggested task roadmap

### NAV-01 — Data model and migrations

Goal:
Introduce navigation mode and Auto Route data foundation safely.

Scope:

- add `navigationMode` to `Scene`,
- add `autoRoutes` to `Scene`,
- add `AutoRoute` type,
- add create/default helpers,
- normalize imported/old projects,
- ensure new scenes get `navigationMode: 'choices'` and a default Auto Route,
- keep runtime and UI behavior unchanged for Choices mode.

Out of scope:

- Auto Navigation UI,
- Preview runtime changes,
- canvas edge changes,
- standalone runtime changes.

Suggested commit:

```text
feat: add scene navigation data model
```

---

### NAV-02 — Scene Editor Navigation UI

Goal:
Rename Choices section to Navigation and add mode-specific authoring UI.

Scope:

- rename Scene Editor `Choices` section to `Navigation`,
- add mode selector: Player Choices / Auto Navigation,
- keep Player Choices UI behavior unchanged,
- add Auto Navigation route list UI,
- support default route editing,
- support conditional route add/edit/remove/reorder,
- reuse existing Condition/Effect UI where possible.

Out of scope:

- Preview runtime execution,
- standalone execution,
- canvas edge styling.

Suggested commit:

```text
feat: add scene navigation editor UI
```

---

### NAV-03 — Preview Auto Navigation runtime

Goal:
Make Preview execute Auto Navigation after the final dialogue page.

Scope:

- show Next after final dialogue page when `navigationMode = 'auto_navigation'`,
- evaluate Auto Routes top-to-bottom,
- execute default route fallback,
- apply route effects,
- navigate to route target or end story,
- keep Choices mode unchanged.

Out of scope:

- standalone runtime,
- canvas edge rendering,
- validation.

Suggested commit:

```text
feat: support auto navigation in preview
```

---

### NAV-04 — Canvas Navigation edges

Goal:
Make canvas edges reflect active navigation mode and visually distinguish Auto Navigation edges.

Scope:

- Choices mode renders existing Choice edges,
- Auto Navigation mode renders Auto Route edges,
- Auto Navigation edges use a distinct visual style/color from Choice edges,
- default Auto Route edges are readable,
- Scene Groups edge projection remains compatible,
- edge click opens the correct source scene and navigation item.

Out of scope:

- runtime behavior changes,
- standalone runtime,
- validation.

Suggested commit:

```text
feat: render auto navigation canvas edges
```

---

### NAV-05 — Standalone HTML Auto Navigation parity

Goal:
Bring standalone exported player to parity with Preview.

Scope:

- standalone HTML runtime executes Auto Navigation,
- same route evaluation order as Preview,
- same default fallback,
- same effects behavior,
- same end-state behavior.

Suggested commit:

```text
feat: support auto navigation in standalone export
```

---

### NAV-06 — Validation and docs

Goal:
Finalize Scene Navigation Modes as a documented and validated subsystem.

Scope:

- add validation for active Auto Navigation mode,
- detect missing/multiple default routes,
- detect broken Auto Route target references,
- detect broken Auto Route condition/effect references,
- update `CONTEXT.md`, `DATA_MODEL.md`, `STORY_LOGIC.md`, `ROADMAP.md`, and `CHANGELOG.md`,
- mark this epic completed after implementation.

Suggested commit:

```text
docs: document scene navigation modes
```

---

## 16. Acceptance criteria

This epic is complete when:

- Scene Editor has a **Navigation** section instead of a Choices-only section,
- authors can choose Player Choices or Auto Navigation per scene,
- Player Choices behavior remains unchanged,
- Auto Navigation supports ordered conditional routes,
- Auto Navigation has exactly one mandatory default route,
- route conditions/effects reuse existing Story Logic models,
- Preview executes Auto Navigation correctly,
- standalone HTML executes Auto Navigation correctly,
- canvas renders only active navigation edges for each scene,
- Auto Navigation edges are visually distinct from Choice edges,
- Scene Groups edge projection works for Auto Navigation edges,
- edge clicks select the correct Choice or Auto Route,
- old projects migrate safely,
- JSON import/export preserves navigation data,
- validation covers active Auto Navigation issues,
- documentation is updated.

---

## 17. Implementation cautions

- Do not delete inactive Choices or Auto Routes when switching modes.
- Do not duplicate the condition/effect engine.
- Do not mutate `Choice.targetSceneId` or `AutoRoute.targetSceneId` for canvas projection.
- Do not break existing Choice behavior.
- Keep Preview and standalone runtime parity.
- Keep Scene Groups edge projection compatible with both navigation modes.
- Prefer small, reviewable NAV tasks over one large implementation commit.
