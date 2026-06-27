import { useWorkspaceStore } from '../../store/workspaceStore';

export function CharactersScreen() {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const characters = activeProject?.characters ?? [];

  return (
    <section className="min-h-[calc(100vh-3.5rem)] bg-gray-950 p-6 text-gray-100">
      <div className="mx-auto max-w-3xl">
        <div className="border-b border-gray-800 pb-5">
          <h1 className="text-2xl font-semibold text-white">Characters</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Characters will later be used as dialogue speakers and as targets for story logic.
          </p>
        </div>

        {characters.length === 0 ? (
          <div className="mt-8 rounded-md border border-dashed border-gray-700 bg-gray-900/70 p-6 text-sm text-gray-400">
            No characters yet. Character creation will be added in a later step.
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/70">
            {characters.map((character) => (
              <li key={character.id} className="px-4 py-3 text-sm font-medium text-gray-100">
                {character.name || 'Unnamed Character'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
