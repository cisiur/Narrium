import { useState, type KeyboardEvent } from 'react';
import type { Character, CharacterAttribute } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { findStoryLogicUsages, formatStoryLogicUsageWarning } from '../story-logic/referenceUsage';

const DEFAULT_ATTRIBUTE_KEY = 'New Attribute';

function createCharacter(): Character {
  return {
    id: crypto.randomUUID(),
    name: 'New Character',
    attributes: [],
  };
}

function createAttribute(key = DEFAULT_ATTRIBUTE_KEY): CharacterAttribute {
  return {
    key,
    defaultValue: 0,
  };
}

function resolveAttributeKey(attributes: CharacterAttribute[], nextKey: string, currentIndex: number) {
  const baseKey = nextKey.trim() || 'attribute';
  const usedKeys = new Set(
    attributes
      .filter((_, index) => index !== currentIndex)
      .map((attribute) => attribute.key),
  );

  if (!usedKeys.has(baseKey)) {
    return baseKey;
  }

  let suffix = 2;
  let candidate = `${baseKey}_${suffix}`;

  while (usedKeys.has(candidate)) {
    suffix += 1;
    candidate = `${baseKey}_${suffix}`;
  }

  return candidate;
}

export function CharactersScreen() {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const updateActiveProject = useWorkspaceStore((state) => state.updateActiveProject);
  const characters = activeProject?.characters ?? [];
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [expandedCharacterIds, setExpandedCharacterIds] = useState<Set<string>>(new Set());
  const [editingAttribute, setEditingAttribute] = useState<{ characterId: string; index: number } | null>(null);
  const [draftAttributeKey, setDraftAttributeKey] = useState('');
  const [editingAttributeValue, setEditingAttributeValue] = useState<{
    characterId: string;
    index: number;
    value: string;
  } | null>(null);

  const addCharacter = () => {
    const character = createCharacter();

    updateActiveProject((project) => ({
      ...project,
      characters: [...project.characters, character],
    }));
    setEditingCharacterId(character.id);
    setDraftName(character.name);
  };

  const startRenaming = (character: Character) => {
    setEditingCharacterId(character.id);
    setDraftName(character.name);
  };

  const cancelRenaming = () => {
    setEditingCharacterId(null);
    setDraftName('');
  };

  const saveRename = (characterId: string) => {
    const name = draftName.trim() || 'Unnamed Character';

    updateActiveProject((project) => ({
      ...project,
      characters: project.characters.map((character) =>
        character.id === characterId ? { ...character, name } : character,
      ),
    }));
    cancelRenaming();
  };

  const deleteCharacter = (characterId: string) => {
    if (!activeProject) {
      return;
    }

    const usages = findStoryLogicUsages(activeProject, {
      kind: 'character',
      id: characterId,
    });

    if (
      usages.length > 0 &&
      !window.confirm(formatStoryLogicUsageWarning('Character', usages))
    ) {
      return;
    }

    updateActiveProject((project) => ({
      ...project,
      characters: project.characters.filter((character) => character.id !== characterId),
    }));

    if (editingCharacterId === characterId) {
      cancelRenaming();
    }

    if (editingAttribute?.characterId === characterId) {
      cancelAttributeRename();
    }

    if (editingAttributeValue?.characterId === characterId) {
      cancelAttributeValueEdit();
    }

    setExpandedCharacterIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(characterId);
      return nextIds;
    });
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>, characterId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveRename(characterId);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelRenaming();
    }
  };

  const toggleAttributes = (characterId: string) => {
    setExpandedCharacterIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(characterId)) {
        nextIds.delete(characterId);
      } else {
        nextIds.add(characterId);
      }

      return nextIds;
    });
  };

  const addAttribute = (characterId: string) => {
    let nextIndex = 0;
    let nextKey = DEFAULT_ATTRIBUTE_KEY;

    updateActiveProject((project) => ({
      ...project,
      characters: project.characters.map((character) => {
        if (character.id !== characterId) {
          return character;
        }

        nextIndex = character.attributes.length;
        nextKey = resolveAttributeKey(character.attributes, DEFAULT_ATTRIBUTE_KEY, -1);

        return {
          ...character,
          attributes: [...character.attributes, createAttribute(nextKey)],
        };
      }),
    }));

    setExpandedCharacterIds((currentIds) => new Set(currentIds).add(characterId));
    setEditingAttribute({ characterId, index: nextIndex });
    setDraftAttributeKey(nextKey);
  };

  const startAttributeRename = (characterId: string, index: number, key: string) => {
    setEditingAttribute({ characterId, index });
    setDraftAttributeKey(key);
  };

  const cancelAttributeRename = () => {
    setEditingAttribute(null);
    setDraftAttributeKey('');
  };

  const saveAttributeRename = (characterId: string, attributeIndex: number) => {
    updateActiveProject((project) => ({
      ...project,
      characters: project.characters.map((character) => {
        if (character.id !== characterId) {
          return character;
        }

        return {
          ...character,
          attributes: character.attributes.map((attribute, index) =>
            index === attributeIndex
              ? {
                  ...attribute,
                  key: resolveAttributeKey(character.attributes, draftAttributeKey, attributeIndex),
                }
              : attribute,
          ),
        };
      }),
    }));
    cancelAttributeRename();
  };

  const handleAttributeKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    characterId: string,
    attributeIndex: number,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveAttributeRename(characterId, attributeIndex);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelAttributeRename();
    }
  };

  const startAttributeValueEdit = (characterId: string, index: number, value: number) => {
    setEditingAttributeValue({
      characterId,
      index,
      value: String(value),
    });
  };

  const cancelAttributeValueEdit = () => {
    setEditingAttributeValue(null);
  };

  const updateAttributeDefaultValue = (characterId: string, attributeIndex: number, value: string) => {
    const nextValue = Number(value);

    setEditingAttributeValue({
      characterId,
      index: attributeIndex,
      value,
    });

    updateActiveProject((project) => ({
      ...project,
      characters: project.characters.map((character) =>
        character.id === characterId
          ? {
              ...character,
              attributes: character.attributes.map((attribute, index) =>
                index === attributeIndex
                  ? {
                      ...attribute,
                      defaultValue: Number.isFinite(nextValue) ? nextValue : 0,
                    }
                  : attribute,
              ),
            }
          : character,
      ),
    }));
  };

  const deleteAttribute = (characterId: string, attributeIndex: number) => {
    updateActiveProject((project) => ({
      ...project,
      characters: project.characters.map((character) =>
        character.id === characterId
          ? {
              ...character,
              attributes: character.attributes.filter((_, index) => index !== attributeIndex),
            }
          : character,
      ),
    }));

    if (editingAttribute?.characterId === characterId) {
      if (editingAttribute.index === attributeIndex) {
        cancelAttributeRename();
      } else if (editingAttribute.index > attributeIndex) {
        setEditingAttribute({
          characterId,
          index: editingAttribute.index - 1,
        });
      }
    }

    if (editingAttributeValue?.characterId === characterId) {
      if (editingAttributeValue.index === attributeIndex) {
        cancelAttributeValueEdit();
      } else if (editingAttributeValue.index > attributeIndex) {
        setEditingAttributeValue({
          ...editingAttributeValue,
          index: editingAttributeValue.index - 1,
        });
      }
    }
  };

  return (
    <section className="min-h-[calc(100vh-3.5rem)] bg-gray-950 p-6 text-gray-100">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <h1 className="text-2xl font-semibold text-white">Characters</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Characters will later be used as dialogue speakers and as targets for story logic.
            </p>
          </div>
          <button
            type="button"
            onClick={addCharacter}
            className="shrink-0 rounded bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400"
          >
            Add Character
          </button>
        </div>

        {characters.length === 0 ? (
          <div className="mt-8 rounded-md border border-dashed border-gray-700 bg-gray-900/70 p-6 text-sm text-gray-400">
            No characters yet. Character creation will be added in a later step.
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/70">
            {characters.map((character) => (
              <li key={character.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    {editingCharacterId === character.id ? (
                      <input
                        type="text"
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        onBlur={() => saveRename(character.id)}
                        onKeyDown={(event) => handleRenameKeyDown(event, character.id)}
                        className="w-full rounded border border-blue-500 bg-gray-950 px-2 py-1 text-sm font-medium text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/40"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startRenaming(character)}
                        className="max-w-full truncate text-left text-sm font-medium text-gray-100 hover:text-blue-300"
                      >
                        {character.name || 'Unnamed Character'}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => startRenaming(character)}
                    className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCharacter(character.id)}
                    className="rounded bg-red-950/70 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-900"
                  >
                    Delete
                  </button>
                </div>

                <div className="mt-3 border-t border-gray-800 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleAttributes(character.id)}
                      className="text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-200"
                      aria-expanded={expandedCharacterIds.has(character.id)}
                    >
                      {expandedCharacterIds.has(character.id) ? 'Hide Attributes' : 'Attributes'} (
                      {character.attributes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => addAttribute(character.id)}
                      className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
                    >
                      Add Attribute
                    </button>
                  </div>

                  {expandedCharacterIds.has(character.id) ? (
                    <div className="mt-3">
                      {character.attributes.length === 0 ? (
                        <div className="rounded border border-dashed border-gray-700 px-3 py-3 text-xs text-gray-500">
                          No attributes yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {character.attributes.map((attribute, attributeIndex) => (
                            <div key={`${character.id}:${attributeIndex}`} className="grid grid-cols-[1fr_7rem_auto] items-center gap-2">
                              {editingAttribute?.characterId === character.id &&
                              editingAttribute.index === attributeIndex ? (
                                <input
                                  type="text"
                                  value={draftAttributeKey}
                                  onChange={(event) => setDraftAttributeKey(event.target.value)}
                                  onBlur={() => saveAttributeRename(character.id, attributeIndex)}
                                  onKeyDown={(event) => handleAttributeKeyDown(event, character.id, attributeIndex)}
                                  className="min-w-0 rounded border border-blue-500 bg-gray-950 px-2 py-1 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/40"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startAttributeRename(character.id, attributeIndex, attribute.key)}
                                  className="min-w-0 truncate rounded bg-gray-950 px-2 py-1 text-left text-sm text-gray-100 hover:text-blue-300"
                                >
                                  {attribute.key || 'attribute'}
                                </button>
                              )}
                              <input
                                type="number"
                                value={
                                  editingAttributeValue?.characterId === character.id &&
                                  editingAttributeValue.index === attributeIndex
                                    ? editingAttributeValue.value
                                    : attribute.defaultValue
                                }
                                onFocus={() =>
                                  startAttributeValueEdit(character.id, attributeIndex, attribute.defaultValue)
                                }
                                onBlur={cancelAttributeValueEdit}
                                onChange={(event) =>
                                  updateAttributeDefaultValue(character.id, attributeIndex, event.target.value)
                                }
                                className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                                aria-label={`${attribute.key} default value`}
                              />
                              <button
                                type="button"
                                onClick={() => deleteAttribute(character.id, attributeIndex)}
                                className="rounded bg-red-950/70 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
