import type { Project, RuntimeState } from '../../types';
import { formatResourceIconLabel } from '../resources/resourcePresentation';

interface ResourceHudProps {
  project: Project;
  runtimeState: RuntimeState;
}

export function ResourceHud({ project, runtimeState }: ResourceHudProps) {
  const visibleResources = project.resources.filter((resource) => resource.visible);

  if (visibleResources.length === 0) {
    return null;
  }

  return (
    <aside
      className="absolute left-4 top-4 z-10 min-w-40 rounded-md border border-white/10 bg-gray-950/85 p-3 text-sm text-gray-100 shadow-xl"
      aria-label="Resources"
    >
      <ul className="space-y-2">
        {visibleResources.map((resource) => (
          <li key={resource.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2">
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-center text-[10px] font-bold uppercase text-gray-300">
              {formatResourceIconLabel(resource.icon)}
            </span>
            <span className="min-w-0 truncate text-gray-200">
              {resource.displayName.trim() || resource.key}
            </span>
            <span className="font-semibold tabular-nums text-white">
              {runtimeState.variables.resources[resource.key] ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
