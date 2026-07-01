import { useState, type KeyboardEvent } from 'react';
import { useConfirmationDialog } from '../../components';
import type { Resource } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { findStoryLogicUsages, formatStoryLogicUsageWarning } from '../story-logic/referenceUsage';

const DEFAULT_RESOURCE_KEY = 'New Resource';

function createResource(key = DEFAULT_RESOURCE_KEY): Resource {
  return {
    id: crypto.randomUUID(),
    key,
    defaultValue: 0,
  };
}

function resolveResourceKey(resources: Resource[], nextKey: string, currentResourceId: string | null) {
  const baseKey = nextKey.trim() || 'resource';
  const usedKeys = new Set(
    resources
      .filter((resource) => resource.id !== currentResourceId)
      .map((resource) => resource.key),
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

export function ResourcesScreen() {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const updateActiveProject = useWorkspaceStore((state) => state.updateActiveProject);
  const { confirm, confirmationDialog } = useConfirmationDialog();
  const resources = activeProject?.resources ?? [];
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState('');
  const [editingResourceValue, setEditingResourceValue] = useState<{
    resourceId: string;
    value: string;
  } | null>(null);

  const addResource = () => {
    const resource = createResource(resolveResourceKey(resources, DEFAULT_RESOURCE_KEY, null));

    updateActiveProject((project) => ({
      ...project,
      resources: [...project.resources, resource],
    }));

    setEditingResourceId(resource.id);
    setDraftKey(resource.key);
  };

  const startRenaming = (resource: Resource) => {
    setEditingResourceId(resource.id);
    setDraftKey(resource.key);
  };

  const cancelRenaming = () => {
    setEditingResourceId(null);
    setDraftKey('');
  };

  const saveRename = (resourceId: string) => {
    updateActiveProject((project) => ({
      ...project,
      resources: project.resources.map((resource) =>
        resource.id === resourceId
          ? {
              ...resource,
              key: resolveResourceKey(project.resources, draftKey, resourceId),
            }
          : resource,
      ),
    }));
    cancelRenaming();
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>, resourceId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveRename(resourceId);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelRenaming();
    }
  };

  const startValueEdit = (resourceId: string, value: number) => {
    setEditingResourceValue({
      resourceId,
      value: String(value),
    });
  };

  const cancelValueEdit = () => {
    setEditingResourceValue(null);
  };

  const updateDefaultValue = (resourceId: string, value: string) => {
    const nextValue = Number(value);

    setEditingResourceValue({
      resourceId,
      value,
    });

    updateActiveProject((project) => ({
      ...project,
      resources: project.resources.map((resource) =>
        resource.id === resourceId
          ? {
              ...resource,
              defaultValue: Number.isFinite(nextValue) ? nextValue : 0,
            }
          : resource,
      ),
    }));
  };

  const deleteResource = async (resourceId: string) => {
    if (!activeProject) {
      return;
    }

    const usages = findStoryLogicUsages(activeProject, {
      kind: 'resource',
      id: resourceId,
    });

    if (usages.length > 0) {
      const shouldDelete = await confirm({
        title: 'Delete Resource',
        message: formatStoryLogicUsageWarning('Resource', usages),
        confirmLabel: 'Delete',
      });

      if (!shouldDelete) {
        return;
      }
    }

    updateActiveProject((project) => ({
      ...project,
      resources: project.resources.filter((resource) => resource.id !== resourceId),
    }));

    if (editingResourceId === resourceId) {
      cancelRenaming();
    }

    if (editingResourceValue?.resourceId === resourceId) {
      cancelValueEdit();
    }
  };

  return (
    <section className="min-h-[calc(100vh-3.5rem)] bg-gray-950 p-6 text-gray-100">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <h1 className="text-2xl font-semibold text-white">Resources</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Resources are global numeric variables shared by the entire project.
            </p>
          </div>
          <button
            type="button"
            onClick={addResource}
            className="shrink-0 rounded bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400"
          >
            Add Resource
          </button>
        </div>

        {resources.length === 0 ? (
          <div className="mt-8 rounded-md border border-dashed border-gray-700 bg-gray-900/70 p-6 text-sm text-gray-400">
            No resources yet.
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/70">
            {resources.map((resource) => (
              <li key={resource.id} className="grid grid-cols-[1fr_8rem_auto_auto] items-center gap-3 px-4 py-3">
                <div className="min-w-0">
                  {editingResourceId === resource.id ? (
                    <input
                      type="text"
                      value={draftKey}
                      onChange={(event) => setDraftKey(event.target.value)}
                      onBlur={() => saveRename(resource.id)}
                      onKeyDown={(event) => handleRenameKeyDown(event, resource.id)}
                      className="w-full rounded border border-blue-500 bg-gray-950 px-2 py-1 text-sm font-medium text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/40"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startRenaming(resource)}
                      className="max-w-full truncate text-left text-sm font-medium text-gray-100 hover:text-blue-300"
                    >
                      {resource.key || 'resource'}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={
                    editingResourceValue?.resourceId === resource.id
                      ? editingResourceValue.value
                      : resource.defaultValue
                  }
                  onFocus={() => startValueEdit(resource.id, resource.defaultValue)}
                  onBlur={cancelValueEdit}
                  onChange={(event) => updateDefaultValue(resource.id, event.target.value)}
                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  aria-label={`${resource.key} default value`}
                />
                <button
                  type="button"
                  onClick={() => startRenaming(resource)}
                  className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => void deleteResource(resource.id)}
                  className="rounded bg-red-950/70 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-900"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {confirmationDialog}
    </section>
  );
}
