import { useState, type KeyboardEvent } from 'react';
import type { Character } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';

function createCharacter(): Character {
  return {
    id: crypto.randomUUID(),
    name: 'New Character',
    attributes: [],
  };
}

export function CharactersScreen() {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const updateActiveProject = useWorkspaceStore((state) => state.updateActiveProject);
  const characters = activeProject?.characters ?? [];
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

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
    updateActiveProject((project) => ({
      ...project,
      characters: project.characters.filter((character) => character.id !== characterId),
    }));

    if (editingCharacterId === characterId) {
      cancelRenaming();
    }
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
              <li key={character.id} className="flex items-center gap-3 px-4 py-3">
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
