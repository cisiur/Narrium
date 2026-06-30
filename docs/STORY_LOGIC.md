# Story Logic — Narrium

> **Version:** v3 implemented specification after EPIC 8 runtime parity + action choices  
> **Status:** Implemented for MVP editor, Preview player, and standalone HTML player  
> **Scope:** Conditions, condition groups, effects, reference warnings, runtime logic behavior, and action-choice behavior for Narrium choices.

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
  - `Project.characters`
  - `Character.attributes`
- Runtime state is derived from project defaults when preview/player starts.
- Choices remain visible even when unavailable.
- Unavailable choices are disabled and can show a hint.
- Effects modify runtime state, not editor project data.
- Effects are independent from navigation.
- Targetless choices can be valid action choices.
- Broken references should be visible in the editor and safe in runtime.

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

Editor-facing references display `Resource.key`.

Conditions/effects store `Resource.id`.

Runtime state stores resource values by `Resource.key`.

---

### 3.2 Characters

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
| `>` | greater |
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
- missing character
- missing character attribute

Implemented runtime behavior:

```text
The condition fails.
```

Implemented editor behavior:

```text
Show inline warning for invalid logic references.
```

This avoids accidentally making broken choices available.

---

### 7.4 Runtime Value Lookup

Resource condition lookup:

```typescript
const resource = project.resources.find((resource) => resource.id === condition.targetId);
const runtimeValue = runtimeState.variables.resources[resource.key];
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
2. If `targetSceneId` is non-null, validate that it points to an existing scene.
3. Apply effects in array order.
4. If `targetSceneId` is a valid scene id:
   - navigate to `choice.targetSceneId`
   - reset `currentPageIndex` to `0`
5. If `targetSceneId` is `null`:
   - remain in the current scene
   - keep the current page
   - re-render with updated runtime variables

If `targetSceneId` is non-null but invalid:
- runtime returns the original state
- effects are not applied
- player UI should disable the choice

---

### 10.1 Resource Effect Runtime Behavior

For:

```typescript
effect.type === 'resource'
```

Runtime behavior:
- Find resource by `effect.targetId`.
- If resource is missing, skip effect.
- Use runtime key `resource.key`.
- Current missing runtime value is treated as `0`.
- Apply `+=`, `-=`, or `=`.
- Store updated value in returned `RuntimeState`.

---

### 10.2 Character Attribute Effect Runtime Behavior

For:

```typescript
effect.type === 'character_attr'
```

Runtime behavior:
- Find character by `effect.targetId`.
- If character is missing, skip effect.
- Require `effect.attribute`.
- Verify the character still has that attribute key.
- If attribute is missing, skip effect.
- Current missing runtime value is treated as `0`.
- Apply `+=`, `-=`, or `=`.
- Create nested runtime objects when needed.
- Store updated value in returned `RuntimeState`.

---

### 10.3 Purity

Runtime helpers must not mutate:

- `choice`
- `project`
- `runtimeState`

They return a new `RuntimeState` when changes are applied.

---

## 11. Action Choices

Action choices are choices that execute effects without changing scenes.

They use the existing `Choice` model:

```typescript
targetSceneId: null
effects: [...]
```

No new data model is required.

### 11.1 Example — Take Key

```text
Choice: Take Key
targetSceneId: null
effect: has_key = 1
```

Runtime behavior:
- conditions are checked
- effects are applied
- current scene remains unchanged
- current page remains unchanged
- choices are re-rendered using updated runtime variables

### 11.2 Example — Unlock Door

```text
Choice: Open Door
condition: has_key == 1
targetSceneId: hall_scene
```

Runtime behavior:
- unavailable until `has_key == 1`
- after the player clicks `Take Key`, the choice becomes available
- clicking `Open Door` navigates to the hall scene

### 11.3 Targetless choice with no effects

Runtime currently allows this if conditions pass.

Product note:
- this choice does nothing
- future validation should warn authors about targetless choices with no effects

---

## 12. Runtime State

Runtime state should be initialized from the `Project`.

Current model:

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

### 12.1 Resource Runtime Keys

Runtime resources are keyed by `Resource.key`.

Example:

```typescript
variables.resources.gold = 10;
```

### 12.2 Character Attribute Runtime Keys

Structure:

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

## 13. Editor UI Specification

### 13.1 Choice Editor Placement

Story Logic UI lives inside the existing Scene Editor choice section.

Each choice exposes:

- Target scene
- Conditions
- Effects

MVP order inside a Choice editor:

1. Choice text
2. Target scene
3. Conditions
4. Effects

Target scene can be `None`.
- `None` may represent an unfinished choice.
- `None` is also valid for targetless action choices when effects are present.
- Future validation should warn if a targetless choice has no effects.

---

### 13.2 Conditions Editor

Implemented features:
- Add OR group.
- Delete OR group.
- Add condition inside a group.
- Delete condition.
- Select condition type:
  - Resource
  - Character Attribute
- Select resource.
- Select character.
- Select character attribute.
- Select operator.
- Edit numeric value.
- Edit unavailable hint.
- Show inline warnings for missing references.

---

### 13.3 Effects Editor

Implemented features:
- Add effect.
- Delete effect.
- Select effect type:
  - Resource
  - Character Attribute
- Select resource.
- Select character.
- Select character attribute.
- Select operation.
- Edit numeric value.
- Show inline warnings for missing references.

Default new effect:

```typescript
{
  id: crypto.randomUUID(),
  type: "resource",
  targetId: "",
  operation: "+=",
  value: 0
}
```

---

### 13.4 Reference Warnings

Implemented helper:

```typescript
findStoryLogicUsages(project, target)
```

Implemented warning formatting:

```typescript
formatStoryLogicUsageWarning(referenceLabel, usages)
```

Warnings are shown before deleting:
- Resource
- Character
- Character Attribute

The warning scans:
- `choice.conditionGroups`
- `choice.effects`

Deletion is still allowed after confirmation.

References are not auto-fixed.

Existing inline missing-reference warnings remain responsible for showing broken logic after deletion.

---

## 14. Player Integration

Preview Player and standalone HTML player should follow the same runtime semantics.

Flow:

1. Initialize `RuntimeState` from Project defaults.
2. Set:
   - `currentSceneId = Project.startSceneId`
   - `currentPageIndex = 0`
3. Resolve current scene.
4. Show current dialogue page:
   - `scene.dialoguePages[currentPageIndex]`
5. Resolve speaker:
   - `speakerId === null` → Narrator
   - `speakerId === Character.id` → Character
   - missing speaker → Unknown Speaker
6. On Next:
   - if more pages exist, increment `currentPageIndex`
   - otherwise show choices
7. For each choice:
   - evaluate `isChoiceAvailable(choice, project, runtimeState)`
   - disable if unavailable
   - disable if `targetSceneId` is non-null and invalid
   - do not disable solely because `targetSceneId` is `null`
   - show hint from `resolveUnavailableChoiceHint(...)` if unavailable
8. On enabled choice selection:
   - call `advanceRuntimeForChoice(choice, project, runtimeState)`
   - store returned runtime state
   - re-render

---

## 15. Exported Standalone HTML Runtime

The standalone HTML export mirrors Preview runtime behavior in a self-contained file.

Implemented behavior:
- embeds the active full `Project`
- initializes local runtime state from Project defaults
- renders dialogue pages
- shows Next only when another dialogue page exists
- renders choices after the final dialogue page
- evaluates conditions
- disables unavailable choices
- shows hints
- applies effects
- supports targetless action choices
- supports valid target navigation
- disables invalid non-null targets
- supports restart
- supports end state
- supports URL/upload/asset/one-level scene-reference backgrounds
- does not persist runtime state yet

Known limitation:
- Runtime logic is duplicated inside the standalone inline script for now because the output is a single HTML file without a bundler.
- Keep semantics synchronized with `src/features/story-logic/runtimeLogic.ts`.

---

## 16. Implementation Files

Story Logic editor/runtime files:

```text
src/features/story-logic/
  ConditionGroupsEditor.tsx
  ConditionGroupCard.tsx
  ConditionRow.tsx
  EffectsEditor.tsx
  EffectCard.tsx
  referenceUsage.ts
  runtimeLogic.ts
  runtimeLogic.test.ts
```

Player files:

```text
src/features/player/
  ChoiceList.tsx
  DialoguePanel.tsx
  playerHelpers.ts
  runtimeState.ts
  runtimeState.test.ts
  StoryPlayer.tsx
  StoryPlayerHeader.tsx
```

Export files:

```text
src/utils/
  projectExport.ts
  projectImport.ts
  standaloneHtmlExport.ts
```

Related files:

```text
src/features/editor/SceneEditorPanel.tsx
src/features/characters/CharactersScreen.tsx
src/features/resources/ResourcesScreen.tsx
src/store/projectMigrations.ts
src/store/useCanvasStore.ts
src/store/workspaceStore.ts
src/types/index.ts
```

---

## 17. Completion Summary

EPIC 6 is complete for MVP Story Logic.

EPIC 7 is complete for Preview Player.

EPIC 8 has extended Story Logic runtime behavior into project export/import and standalone HTML export.

Completed:
- Conditions data model and editor
- Condition groups with OR/AND semantics
- Legacy migration from `Choice.conditions`
- Resource conditions
- Character Attribute conditions
- Inline validation warnings
- Effects data model and editor
- Resource effects
- Character Attribute effects
- Effects validation warnings
- Runtime condition evaluation helper
- Unavailable hint helper
- Runtime effect application helper
- Shared choice advancement helper
- Action choices without navigation
- Reference usage warnings before deleting resources/characters/attributes
- Preview player runtime integration
- Standalone HTML player runtime parity

Not yet complete:
- Standalone HTML visual polish
- Exported player save/load slots
- Full project validation panel
- Story Player component-level tests
