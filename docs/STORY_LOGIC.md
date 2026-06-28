# Story Logic — Narrium

> **Version:** v1 draft  
> **Status:** Product / architecture specification before EPIC 6 implementation  
> **Scope:** Conditions, condition groups, effects, and runtime logic behavior for Narrium choices.

---

## 1. Purpose

Story Logic defines how Narrium stories can react to player state without scripting.

Authors should be able to make choices available or unavailable based on declarative conditions, and change story state through declarative effects.

The goal is to support meaningful branching narratives while keeping the editor no-code and understandable for non-technical authors.

---

## 2. Design Principles

- Story Logic must remain declarative.
- No scripting language in MVP.
- `Project` remains the single source of truth.
- Logic should reference existing project data:
  - `Project.resources`
  - `Project.characters`
  - `Character.attributes`
- Runtime state is derived from project defaults when preview/player starts.
- Choices remain visible even when unavailable.
- Unavailable choices are disabled and can show a hint.
- The MVP logic model should be powerful enough for common visual novel / RPG scenarios but simple enough to explain in UI.

---

## 3. Core Concepts

### 3.1 Resources

Resources are global numeric variables shared by the whole story.

Examples:

```text
gold
health
energy
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
  defaultValue: number;
}
```

Runtime resource values are seeded from `Resource.defaultValue`.

---

### 3.2 Characters

Characters are story entities that can be used as dialogue speakers and later as logic targets.

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

---

### 3.3 Character Attributes

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

---

## 4. Choice Logic

Story Logic is attached to `Choice`.

A choice can have:

- condition groups
- effects

Conditions decide whether the choice is available.

Effects are applied after the player selects the choice.

---

## 5. Conditions

A condition compares a runtime value against a number.

### 5.1 Condition Types

MVP supports two condition types:

```typescript
type ConditionType = 'resource' | 'character_attr';
```

#### Resource condition

Example:

```text
gold >= 10
```

Meaning:

The choice is available only if the current runtime value of `gold` is at least `10`.

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
| `>` | greater than |
| `<` | less than |
| `!=` | not equal |

---

### 5.3 Condition Shape

```typescript
interface Condition {
  id: string;
  type: 'resource' | 'character_attr';
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
| `type` | whether the condition targets a resource or character attribute |
| `targetId` | `Resource.id` or `Character.id` depending on type |
| `attribute` | required for `character_attr`; stores `CharacterAttribute.key` |
| `operator` | comparison operator |
| `value` | numeric comparison value |
| `hintText` | optional author-facing/player-facing unavailable-choice hint |

---

## 6. Condition Groups

The user explicitly wants `OR` support.

To keep the MVP simple and understandable, Narrium should use:

```text
OR between groups
AND within a group
```

This means:

```text
Choice is available if at least one condition group passes.
A condition group passes if all conditions inside it pass.
```

### 6.1 Example

```text
Group 1:
gold >= 10
reputation >= 2

OR

Group 2:
Alice.trust >= 5
```

This means the choice is available if:

```text
(gold >= 10 AND reputation >= 2)
OR
(Alice.trust >= 5)
```

---

### 6.2 ConditionGroup Shape

```typescript
interface ConditionGroup {
  id: string;
  conditions: Condition[];
}
```

---

### 6.3 Choice Shape

Canonical current shape:

```typescript
interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditionGroups: ConditionGroup[];
  effects: Effect[];
}
```

Legacy project data may still contain:

```typescript
conditions: Condition[];
```

Migration compatibility:

- `ConditionGroup` is the canonical Choice model.
- Legacy `conditions` exists only for migration compatibility.
- Existing `conditions` are normalized into one default AND group.
- New code should use `conditionGroups`.

---

## 7. Condition Evaluation

### 7.1 Empty Condition Groups

Recommended MVP behavior:

- If a choice has no condition groups, it is available.
- If a choice has condition groups but a group has no conditions, that empty group should pass.

Rationale:

An empty AND group is logically true, and this makes the editor forgiving during authoring.

Potential UX warning:

- A validation pass may warn about empty condition groups later.
- It should not block editing.

---

### 7.2 Evaluation Algorithm

Pseudocode:

```typescript
function isChoiceAvailable(choice, runtimeState): boolean {
  if (choice.conditionGroups.length === 0) {
    return true;
  }

  return choice.conditionGroups.some((group) =>
    group.conditions.every((condition) =>
      evaluateCondition(condition, runtimeState)
    )
  );
}
```

---

### 7.3 Missing References

If a condition references deleted or missing data:

- missing resource
- missing character
- missing character attribute

Recommended MVP runtime behavior:

```text
The condition fails.
```

Recommended editor behavior:

```text
Show inline warning for invalid logic references.
```

This avoids accidentally making broken choices available.

---

## 8. Hints for Unavailable Choices

Each condition currently has `hintText`.

For MVP, the unavailable-choice hint behavior should be:

- If a disabled choice has one or more failing conditions with non-empty `hintText`, show the first relevant hint.
- If multiple groups fail, choose the first failing condition with a hint from the first evaluated group.
- If no hint exists, show a generic disabled state without explanatory text.

Alternative future improvement:

- Move `hintText` from `Condition` to `ConditionGroup` or `Choice`.
- This may be cleaner if authors want one message per unavailable choice instead of one message per condition.

MVP recommendation:

Keep `hintText` on `Condition` for now.

---

## 9. Effects

Effects modify runtime state after a player selects a choice.

Effects do not modify the editor `Project`.

Effects are applied to `RuntimeState`.

---

### 9.1 Effect Types

MVP supports:

```typescript
type EffectType = 'resource' | 'character_attr';
```

#### Resource effect

Example:

```text
gold -= 10
```

#### Character attribute effect

Example:

```text
Alice.trust += 1
```

---

### 9.2 Effect Operations

MVP supports:

```typescript
'+=' | '-=' | '='
```

Semantics:

| Operation | Meaning |
|---|---|
| `+=` | add value |
| `-=` | subtract value |
| `=` | set absolute value |

---

### 9.3 Effect Shape

```typescript
interface Effect {
  id: string;
  type: 'resource' | 'character_attr';
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
| `type` | whether the effect targets a resource or character attribute |
| `targetId` | `Resource.id` or `Character.id` depending on type |
| `attribute` | required for `character_attr`; stores `CharacterAttribute.key` |
| `operation` | mutation operation |
| `value` | numeric value used by the operation |

---

## 10. Effect Application

Effects are applied when the player selects an available choice.

Recommended order:

1. Validate selected choice is currently available.
2. Apply effects in array order.
3. Navigate to `choice.targetSceneId`.
4. Reset page index to `0`.

If `targetSceneId` is `null`, the player should remain in the current scene or treat it as an ending/invalid transition depending on future player UX.

MVP recommendation:

- Editor should warn about unconnected choices.
- Runtime should avoid crashing if `targetSceneId` is missing.

---

## 11. Runtime State

Runtime state should be initialized from the `Project`.

Current planned model:

```typescript
interface RuntimeState {
  currentSceneId: string;
  currentPageIndex: number;
  variables: {
    resources: Record<string, number>;
    characterAttrs: Record<string, Record<string, number>>;
  };
  saveSlots?: RuntimeSaveSlot[];
}
```

### 11.1 Resource Runtime Keys

Runtime resources should be keyed by `Resource.key`.

Example:

```typescript
variables.resources.gold = 10;
```

### 11.2 Character Attribute Runtime Keys

Recommended structure:

```typescript
variables.characterAttrs[character.id][attribute.key] = attribute.defaultValue;
```

Example:

```typescript
variables.characterAttrs["alice-id"].trust = 5;
```

Reason:

- Character `id` is stable.
- Attribute `key` is author-readable.
- Attribute model currently has no `id`.

Future note:

If attributes get ids later, runtime can migrate to:

```typescript
variables.characterAttrs[character.id][attribute.id]
```

but that is not recommended until needed.

---

## 12. Editor UI Specification

### 12.1 Choice Editor Placement

Story Logic UI should live inside the existing Scene Editor choice section.

Each choice should eventually expose:

- Conditions
- Effects

MVP order inside a choice card:

1. Choice text
2. Target scene
3. Conditions
4. Effects

---

### 12.2 Conditions UI

Recommended MVP UI:

```text
Conditions

Group 1
  [Resource] [gold] [>=] [10] [hintText]
  [Character Attribute] [Alice] [trust] [>=] [5] [hintText]
  + Add Condition

OR

Group 2
  ...
  + Add Condition

+ Add OR Group
```

Required actions:

- Add OR group.
- Delete OR group.
- Add condition to group.
- Edit condition type.
- Edit target resource / character.
- Edit attribute for character condition.
- Edit operator.
- Edit value.
- Edit hint text.
- Delete condition.

---

### 12.3 Effects UI

Recommended MVP UI:

```text
Effects

[Resource] [gold] [-=] [10]
[Character Attribute] [Alice] [trust] [+=] [1]

+ Add Effect
```

Required actions:

- Add effect.
- Edit effect type.
- Edit target resource / character.
- Edit attribute for character effect.
- Edit operation.
- Edit value.
- Delete effect.

---

## 13. Validation

Validation should eventually catch invalid references and incomplete logic.

### 13.1 Condition Validation

Potential warnings:

- Missing target resource.
- Missing target character.
- Missing character attribute.
- Empty condition group.
- Condition with missing value.
- Condition with duplicate or impossible logic.

MVP required soon:

- Inline warning for deleted resource/character/attribute references.
- Do not crash.
- Invalid conditions evaluate as false.

---

### 13.2 Effect Validation

Potential warnings:

- Missing target resource.
- Missing target character.
- Missing character attribute.
- Effect with missing value.

MVP required soon:

- Inline warning for deleted resource/character/attribute references.
- Invalid effects are skipped at runtime.

---

## 14. Migration Compatibility

Legacy `Choice` data may contain:

```typescript
interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditions: Condition[];
  effects: Effect[];
}
```

Canonical current `Choice` model:

```typescript
interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditionGroups: ConditionGroup[];
  effects: Effect[];
}
```

Current migration helper behavior:

```typescript
function normalizeChoice(choice: Choice | LegacyChoice): Choice {
  const hasLegacyConditions = 'conditions' in choice;
  const conditionGroups = choice.conditionGroups ?? [];

  if (!hasLegacyConditions) {
    return {
      ...choice,
      conditionGroups,
    };
  }

  const { conditions = [], ...choiceWithoutLegacyConditions } = choice;
  let nextConditionGroups = conditionGroups;

  if (nextConditionGroups.length === 0 && conditions.length > 0) {
    nextConditionGroups = [{ id: crypto.randomUUID(), conditions }];
  }

  return {
    ...choiceWithoutLegacyConditions,
    conditionGroups: nextConditionGroups,
  };
}
```

Important:

- `conditionGroups` is the canonical model for choices.
- Legacy `conditions` exists only for migration compatibility.
- Existing localStorage projects may still contain `conditions`, so project loading remains defensive.
- The migration is non-destructive to existing condition data: legacy conditions become one condition group.

---

## 15. Data Model for EPIC 6

Current TypeScript model:

```typescript
export interface Choice {
  id: string;
  text: string;
  targetSceneId: string | null;
  conditionGroups: ConditionGroup[];
  effects: Effect[];
}

export interface ConditionGroup {
  id: string;
  conditions: Condition[];
}
```

Keep existing `Condition` and `Effect` mostly unchanged:

```typescript
export interface Condition {
  id: string;
  type: 'resource' | 'character_attr';
  targetId: string;
  attribute?: string;
  operator: '>=' | '<=' | '==' | '>' | '<' | '!=';
  value: number;
  hintText: string;
}

export interface Effect {
  id: string;
  type: 'resource' | 'character_attr';
  targetId: string;
  attribute?: string;
  operation: '+=' | '-=' | '=';
  value: number;
}
```

---

## 16. Implementation Sequence Recommendation

Recommended EPIC 6 order:

1. **E6-01 — Data model update**
   - Add `ConditionGroup`.
   - Replace new-choice creation with `conditionGroups: []`.
   - Add compatibility helpers for old `conditions`.
   - Keep UI unchanged except type compatibility.

2. **E6-02 — Choice condition groups UI foundation**
   - Render condition groups in Choice editor.
   - Add/delete groups.
   - Add/delete empty conditions.
   - No full target selectors yet if too large.

3. **E6-03 — Resource conditions**
   - Add target resource selector.
   - Add operator/value/hint editing.

4. **E6-04 — Character attribute conditions**
   - Add character selector.
   - Add attribute selector.

5. **E6-05 — Effect model review/final acceptance**
   - Confirm effect model before UI.

6. **E6-06 — Choice effects UI foundation**

7. **E6-07 — Resource effects**

8. **E6-08 — Character attribute effects**

9. **E6-09 — Invalid reference warnings**

10. **E6-10 — Runtime evaluation helpers**
    - This may be part of Story Player if runtime is not implemented yet.

---

## 17. Out of Scope for MVP

Do not implement in MVP unless explicitly requested:

- Nested logic trees.
- Arbitrary parentheses.
- Scripting.
- String variables.
- Boolean variables.
- Inventory item stacks.
- Timers.
- Random checks.
- Probability.
- Complex formula expressions.
- Global functions.
- Author-defined custom operators.
- Drag-and-drop condition reordering.
- Cross-project reusable logic templates.

---

## 18. Product Decision Summary

Accepted for MVP:

- Conditions and effects are declarative.
- Conditions can target resources or character attributes.
- Effects can modify resources or character attributes.
- Operators: `>=`, `<=`, `==`, `>`, `<`, `!=`.
- Effect operations: `+=`, `-=`, `=`.
- OR support is implemented through condition groups.
- AND applies within a condition group.
- OR applies between condition groups.
- No nested condition logic.
- No scripting.
- Broken conditions fail.
- Broken effects are skipped.
- `Resource.key` is the logic-facing identifier.
- `CharacterAttribute.key` is the logic-facing attribute identifier.
