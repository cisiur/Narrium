# Story Logic — Narrium

> **Version:** v4 implemented specification after Variables integration  
> **Status:** Implemented for MVP editor, Preview player, and standalone HTML player  
> **Scope:** Conditions, condition groups, effects, reference warnings, runtime logic behavior, action-choice behavior, Resources, Variables, Character Attributes, and exported runtime parity.

---

## 1. Purpose

Story Logic defines how Narrium stories can react to player state without scripting.

Authors can make choices available or unavailable based on declarative conditions, and change story state through declarative effects.

The goal is to support meaningful branching narratives while keeping the editor no-code and understandable for non-technical authors.

---

## 2. Design Principles

- Story Logic must remain declarative.
- No scripting language in MVP.
- `Project` remains the single source of truth.
- Logic references existing project data:
  - `Project.resources`
  - `Project.variables`
  - `Project.characters`
  - `Character.attributes`
- Runtime state is derived from project defaults when preview/player starts.
- Choices remain visible even when unavailable.
- Unavailable choices are disabled and can show a hint.
- Effects modify runtime state, not editor project data.
- Effects are independent from navigation.
- Targetless choices can be valid action choices.
- Broken references should be visible in the editor and safe in runtime.
- Resources are intended to be player-facing state.
- Variables are intended to be hidden/internal story state.

---

## 3. Core Concepts

### 3.1 Resources

Resources are global numeric variables shared by the whole story and intended to be player-facing.

Examples:

```text
gold
health
energy
wood
food
reputation
```

Resources are defined in:

```typescript
Project.resources
```

Each resource has:

```typescript
interface Resource {
  id: string;
  key: string;
  displayName: string;
  icon: string;
  visible: boolean;
  defaultValue: number;
}
```

Runtime resource values are seeded from `Resource.defaultValue`.

Editor-facing references display `Resource.key`.

Conditions/effects store `Resource.id`.

Runtime state stores resource values by `Resource.key`.

Presentation metadata:
- `displayName` is shown to players in Resource HUDs.
- `icon` stores a built-in presentation icon key.
- `visible` controls whether the Resource HUD shows the resource.

Preview and standalone HTML both include a Resource HUD that displays visible resources only.

---

### 3.2 Variables

Variables are global numeric values shared by the whole story and intended to be hidden/internal.

Examples:

```text
visited_forest
knows_secret
guard_suspicion
quest_stage
has_seen_intro
```

Variables are defined in:

```typescript
Project.variables
```

Each variable has:

```typescript
interface Variable {
  id: string;
  key: string;
  defaultValue: number;
}
```

Runtime variable values are seeded from `Variable.defaultValue`.

Editor-facing references display `Variable.key`.

Conditions/effects store `Variable.id`.

Runtime state stores variable values by `Variable.key`.

Variables are not normally shown to the player.
Variables are hidden internal story-state values and are not displayed in the Resource HUD.

Boolean-like variables should use numeric values such as `0` / `1` in the MVP.

---

### 3.3 Characters

Characters are story entities used as dialogue speakers and logic targets.

Characters are defined in:

```typescript
Project.characters
```

Each character has:

```typescript
interface Character {
  id: string;
  name: string;
  attributes: CharacterAttribute[];
}
```

Characters can be selected as dialogue speakers through `DialoguePage.speakerId`.

---

### 3.4 Character Attributes

Character attributes are numeric values scoped to a character.

Examples:

```text
trust
fear
affection
loyalty
suspicion
```

Each attribute has:

```typescript
interface CharacterAttribute {
  key: string;
  defaultValue: number;
}
```

Runtime character attribute values are seeded from each character's attribute defaults.

Conditions/effects store:
- `targetId = Character.id`
- `attribute = CharacterAttribute.key`

Runtime state stores character attributes as:

```typescript
variables.characterAttrs[character.id][attribute.key]
```

---

## 4. Choice Logic

Story Logic is attached to `Choice`.

A choice can have:

- condition groups
- effects
- optional navigation target

Conditions decide whether the choice is available.

Effects are applied after the player selects an available choice.

Navigation is optional.

Canonical shape:

```typescript
interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditionGroups: ConditionGroup[];
  effects: Effect[];
}
```

Legacy project data may contain:

```typescript
conditions: Condition[];
```

Migration compatibility:
- `ConditionGroup` is the canonical Choice model.
- Legacy `conditions` exists only for migration compatibility.
- Existing `conditions` are normalized into one default AND group.
- New code should use `conditionGroups`.

---

## 5. Conditions

A condition compares a runtime value against a number.

### 5.1 Condition Types

MVP supports three condition types:

```typescript
type ConditionType = 'resource' | 'variable' | 'character_attr';
```

#### Resource condition

Example:

```text
gold >= 10
```

Meaning:

The choice is available only if the current runtime value of `gold` is at least `10`.

#### Variable condition

Example:

```text
visited_forest == 1
```

Meaning:

The choice is available only if the hidden story variable `visited_forest` has value `1`.

Variable conditions store `targetId = Variable.id`.
At runtime, the matching `Variable.key` is used to read from `runtimeState.variables.variables`.

#### Character attribute condition

Example:

```text
Alice.trust >= 5
```

Meaning:

The choice is available only if Alice's current runtime value for `trust` is at least `5`.

---

### 5.2 Operators

MVP supports:

```typescript
'>=' | '<=' | '==' | '>' | '<' | '!='
```

Semantics:

| Operator | Meaning |
|---|---|
| `>=` | greater than or equal |
| `<=` | less than or equal |
| `==` | equal |
| `>` | greater |
| `<` | less |
| `!=` | not equal |

---

### 5.3 Condition Shape

```typescript
interface Condition {
  id: string;
  type: 'resource' | 'variable' | 'character_attr';
  targetId: string;
  attribute?: string;
  operator: '>=' | '<=' | '==' | '>' | '<' | '!=';
  value: number;
  hintText: string;
}
```

Field behavior:

| Field | Meaning |
|---|---|
| `id` | stable condition id |
| `type` | whether the condition targets a resource, variable, or character attribute |
| `targetId` | `Resource.id`, `Variable.id`, or `Character.id` depending on type |
| `attribute` | required for `character_attr`; stores `CharacterAttribute.key` |
| `operator` | comparison operator |
| `value` | numeric comparison value |
| `hintText` | optional author-facing/player-facing unavailable-choice hint |

---

## 6. Condition Groups

Narrium uses:

```text
OR between groups
AND within a group
```

This means:

```text
Choice is available if at least one condition group passes.
A condition group passes if all conditions inside it pass.
```

Example:

```text
Group 1:
gold >= 10
reputation >= 2

OR

Group 2:
visited_forest == 1

OR

Group 3:
Alice.trust >= 5
```

This means the choice is available if:

```text
(gold >= 10 AND reputation >= 2)
OR
(visited_forest == 1)
OR
(Alice.trust >= 5)
```

### ConditionGroup Shape

```typescript
interface ConditionGroup {
  id: string;
  conditions: Condition[];
}
```

---

## 7. Condition Evaluation

Implemented helper:

```typescript
isChoiceAvailable(choice, project, runtimeState): boolean
```

Supporting helper:

```typescript
evaluateCondition(condition, project, runtimeState): boolean
```

### 7.1 Empty Condition Groups

Implemented MVP behavior:

- If a choice has no condition groups, it is available.
- If a choice has condition groups but a group has no conditions, that empty group passes.

Rationale:

An empty AND group is logically true, and this makes the editor forgiving during authoring.

---

### 7.2 Evaluation Algorithm

Runtime semantics:

```typescript
function isChoiceAvailable(choice, project, runtimeState): boolean {
  const conditionGroups = choice.conditionGroups ?? [];

  if (conditionGroups.length === 0) {
    return true;
  }

  return conditionGroups.some((group) =>
    group.conditions.every((condition) =>
      evaluateCondition(condition, project, runtimeState)
    )
  );
}
```

---

### 7.3 Missing References

If a condition references deleted or missing data:

- missing resource
- missing variable
- missing character
- missing character attribute

Implemented runtime behavior:

```text
The condition fails.
```

Implemented editor behavior:

```text
Show inline warning for invalid logic references.
Show Project Validation issues for broken Story Logic references.
```

This avoids accidentally making broken choices available.

---

### 7.4 Runtime Value Lookup

Resource condition lookup:

```typescript
const resource = project.resources.find((resource) => resource.id === condition.targetId);
const runtimeValue = runtimeState.variables.resources[resource.key];
```

Variable condition lookup:

```typescript
const variable = project.variables.find((variable) => variable.id === condition.targetId);
const runtimeValue = runtimeState.variables.variables[variable.key];
```

Character attribute condition lookup:

```typescript
const character = project.characters.find((character) => character.id === condition.targetId);
const runtimeValue = runtimeState.variables.characterAttrs[character.id][condition.attribute];
```

Missing/non-finite values fail condition evaluation.

---

## 8. Hints for Unavailable Choices

Implemented helper:

```typescript
resolveUnavailableChoiceHint(choice, project, runtimeState): string | null
```

Behavior:

- If `isChoiceAvailable(...)` is true, return `null`.
- Otherwise scan failing conditions in deterministic order:
  - group order
  - condition order inside group
- Return the first non-empty trimmed `condition.hintText`.
- If no failing condition has a hint, return `null`.

MVP recommendation:

Keep `hintText` on `Condition` for now.

Future option:
- Move hint text to `ConditionGroup` or `Choice` if authors need one message per unavailable choice.

---

## 9. Effects

Effects modify runtime state after a player selects an available choice.

Effects do not modify the editor `Project`.

Effects are applied to `RuntimeState`.

Effects are independent from navigation.

### 9.1 Effect Types

MVP supports:

```typescript
type EffectType = 'resource' | 'variable' | 'character_attr';
```

#### Resource effect

Example:

```text
gold -= 10
```

#### Variable effect

Example:

```text
visited_forest = 1
```

Variable effects store `targetId = Variable.id`.
At runtime, the matching `Variable.key` is used to write to `runtimeState.variables.variables`.

#### Character attribute effect

Example:

```text
Alice.trust += 1
```

---

### 9.2 Effect Operations

Stored model supports:

```typescript
'+=' | '-=' | '='
```

Semantics:

| Operation | Meaning |
|---|---|
| `+=` | add value |
| `-=` | subtract value |
| `=` | set absolute value |

Editor display labels:

| Stored value | UI label |
|---|---|
| `+=` | `+` |
| `-=` | `-` |
| `=` | `=` |

Important:
- UI labels are user-friendly only.
- Stored values remain `+=`, `-=`, `=`.
- Runtime helpers expect stored values.

---

### 9.3 Effect Shape

```typescript
interface Effect {
  id: string;
  type: 'resource' | 'variable' | 'character_attr';
  targetId: string;
  attribute?: string;
  operation: '+=' | '-=' | '=';
  value: number;
}
```

Field behavior:

| Field | Meaning |
|---|---|
| `id` | stable effect id |
| `type` | whether the effect targets a resource, variable, or character attribute |
| `targetId` | `Resource.id`, `Variable.id`, or `Character.id` depending on type |
| `attribute` | required for `character_attr`; stores `CharacterAttribute.key` |
| `operation` | mutation operation |
| `value` | numeric value used by the operation |

---

## 10. Effect Application and Choice Advancement

Implemented helper:

```typescript
applyEffects(choice, project, runtimeState): RuntimeState
```

Supporting helper:

```typescript
applyNumericOperation(currentValue, operation, effectValue): number | null
```

Implemented choice advancement helper:

```typescript
advanceRuntimeForChoice(choice, project, runtimeState): RuntimeState
```

Effects are applied when the player selects an available choice.

Current player order:

1. Validate selected choice is currently available.
2. If `targetSceneId` is non-null, validate that target scene exists.
3. Apply effects.
4. If target exists, navigate and reset page index.
5. If target is null, remain on current scene/page and re-render with updated runtime values.

---

### 10.1 Resource Effects

Resource effect lookup:

```typescript
const resource = project.resources.find((resource) => resource.id === effect.targetId);
```

Runtime mutation:

```typescript
variables.resources[resource.key]
```

Missing resource references are skipped.

---

### 10.2 Variable Effects

Variable effect lookup:

```typescript
const variable = project.variables.find((variable) => variable.id === effect.targetId);
```

Runtime mutation:

```typescript
variables.variables[variable.key]
```

Missing variable references are skipped.

Editor behavior:
- inline Story Logic warnings mark missing Variable references,
- Project Validation reports broken Variable condition/effect references,
- runtime behavior remains safe and unchanged.

---

### 10.3 Character Attribute Effects

Character attribute effect lookup:

```typescript
const character = project.characters.find((character) => character.id === effect.targetId);
const attribute = character.attributes.find((attribute) => attribute.key === effect.attribute);
```

Runtime mutation:

```typescript
variables.characterAttrs[character.id][effect.attribute]
```

Missing character or attribute references are skipped.

---

## 11. Runtime State

Runtime values are stored in:

```typescript
interface RuntimeState {
  currentSceneId: string;
  currentPageIndex: number;
  variables: {
    resources: Record<string, number>;
    variables: Record<string, number>;
    characterAttrs: Record<string, Record<string, number>>;
  };
}
```

Initialization from Project:

```typescript
variables.resources = Object.fromEntries(
  project.resources.map((resource) => [resource.key, resource.defaultValue])
);

variables.variables = Object.fromEntries(
  project.variables.map((variable) => [variable.key, variable.defaultValue])
);

variables.characterAttrs = Object.fromEntries(
  project.characters.map((character) => [
    character.id,
    Object.fromEntries(
      character.attributes.map((attribute) => [attribute.key, attribute.defaultValue])
    )
  ])
);
```

Notes:
- Runtime values are keyed by user-editable keys for resources and variables.
- Character attributes are keyed by character id and attribute key.
- Runtime state is local to Preview/exported player.
- Runtime state should never mutate editor Project data.

---

## 12. Action Choices

A targetless choice with effects is a valid **action choice**.

Example:

```text
Choice: Search the drawer
Target: None
Effects:
- variable.has_key = 1
```

Behavior:

- choice applies effects
- current scene remains the same
- current page remains the same
- player re-renders
- newly available choices can become enabled after variables/resources/attributes change

A targetless choice with no effects is probably authoring noise and receives a validation warning.

---

## 13. Preview and Standalone Runtime Parity

Preview and standalone HTML player are expected to support the same Story Logic behavior:

- resource conditions
- variable conditions
- character attribute conditions
- unavailable choice hints
- resource effects
- variable effects
- character attribute effects
- targetless action choices
- valid target navigation
- invalid non-null target disabled behavior
- restart
- end state
- variable runtime initialization from `Project.variables`
- variable runtime save/load in standalone HTML

Standalone HTML export contains an inline runtime implementation mirroring the shared Preview runtime helpers.

---

## 14. Save / Load

Standalone save/load persists runtime snapshots only.

Snapshots include:

```typescript
{
  currentSceneId,
  currentPageIndex,
  variables: {
    resources,
    variables,
    characterAttrs
  }
}
```

Saved snapshots do not store the embedded Project.

Save/load validation rejects invalid, corrupted, or unsafe values.

---

## 15. Current Limitations and Future Work

Known future extensions:

- Export preflight using `validateProject(project)`.
- Optional richer variable types in the future, such as booleans or strings, if product requirements justify it.
- Better author-facing hint strategy if condition-level hints become too granular.
