import { useState, type KeyboardEvent } from 'react';
import type { Variable } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { DEFAULT_VARIABLE_KEY, createVariable, resolveVariableKey } from './variableHelpers';

export function VariablesScreen() {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const updateActiveProject = useWorkspaceStore((state) => state.updateActiveProject);
  const variables = activeProject?.variables ?? [];
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState('');
  const [editingVariableValue, setEditingVariableValue] = useState<{
    variableId: string;
    value: string;
  } | null>(null);

  const addVariable = () => {
    const variable = createVariable(resolveVariableKey(variables, DEFAULT_VARIABLE_KEY, null));

    updateActiveProject((project) => ({
      ...project,
      variables: [...project.variables, variable],
    }));

    setEditingVariableId(variable.id);
    setDraftKey(variable.key);
  };

  const startRenaming = (variable: Variable) => {
    setEditingVariableId(variable.id);
    setDraftKey(variable.key);
  };

  const cancelRenaming = () => {
    setEditingVariableId(null);
    setDraftKey('');
  };

  const saveRename = (variableId: string) => {
    updateActiveProject((project) => ({
      ...project,
      variables: project.variables.map((variable) =>
        variable.id === variableId
          ? {
              ...variable,
              key: resolveVariableKey(project.variables, draftKey, variableId),
            }
          : variable,
      ),
    }));
    cancelRenaming();
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>, variableId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveRename(variableId);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelRenaming();
    }
  };

  const startValueEdit = (variableId: string, value: number) => {
    setEditingVariableValue({
      variableId,
      value: String(value),
    });
  };

  const cancelValueEdit = () => {
    setEditingVariableValue(null);
  };

  const updateDefaultValue = (variableId: string, value: string) => {
    const nextValue = Number(value);

    setEditingVariableValue({
      variableId,
      value,
    });

    updateActiveProject((project) => ({
      ...project,
      variables: project.variables.map((variable) =>
        variable.id === variableId
          ? {
              ...variable,
              defaultValue: Number.isFinite(nextValue) ? nextValue : 0,
            }
          : variable,
      ),
    }));
  };

  const deleteVariable = (variableId: string) => {
    updateActiveProject((project) => ({
      ...project,
      variables: project.variables.filter((variable) => variable.id !== variableId),
    }));

    if (editingVariableId === variableId) {
      cancelRenaming();
    }

    if (editingVariableValue?.variableId === variableId) {
      cancelValueEdit();
    }
  };

  return (
    <section className="min-h-[calc(100vh-3.5rem)] bg-gray-950 p-6 text-gray-100">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <h1 className="text-2xl font-semibold text-white">Variables</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Variables are hidden numeric values used by story logic and internal progression. They are not normally shown to the player.
            </p>
          </div>
          <button
            type="button"
            onClick={addVariable}
            className="shrink-0 rounded bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400"
          >
            Add Variable
          </button>
        </div>

        {variables.length === 0 ? (
          <div className="mt-8 rounded-md border border-dashed border-gray-700 bg-gray-900/70 p-6 text-sm text-gray-400">
            No variables yet.
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/70">
            {variables.map((variable) => (
              <li key={variable.id} className="grid grid-cols-[1fr_8rem_auto_auto] items-center gap-3 px-4 py-3">
                <div className="min-w-0">
                  {editingVariableId === variable.id ? (
                    <input
                      type="text"
                      value={draftKey}
                      onChange={(event) => setDraftKey(event.target.value)}
                      onBlur={() => saveRename(variable.id)}
                      onKeyDown={(event) => handleRenameKeyDown(event, variable.id)}
                      className="w-full rounded border border-blue-500 bg-gray-950 px-2 py-1 text-sm font-medium text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/40"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startRenaming(variable)}
                      className="max-w-full truncate text-left text-sm font-medium text-gray-100 hover:text-blue-300"
                    >
                      {variable.key || 'variable'}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={
                    editingVariableValue?.variableId === variable.id
                      ? editingVariableValue.value
                      : variable.defaultValue
                  }
                  onFocus={() => startValueEdit(variable.id, variable.defaultValue)}
                  onBlur={cancelValueEdit}
                  onChange={(event) => updateDefaultValue(variable.id, event.target.value)}
                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  aria-label={`${variable.key} default value`}
                />
                <button
                  type="button"
                  onClick={() => startRenaming(variable)}
                  className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => deleteVariable(variable.id)}
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
