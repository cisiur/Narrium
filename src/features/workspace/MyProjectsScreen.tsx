import { useWorkspaceStore } from '../../store/workspaceStore';

export function MyProjectsScreen() {
  const projects = useWorkspaceStore((state) => state.projects);
  const createProject = useWorkspaceStore((state) => state.createProject);
  const openProject = useWorkspaceStore((state) => state.openProject);

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink-950">My Projects</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
            Local project workspace for branching visual novels.
          </p>
        </div>
        <button
          type="button"
          data-testid="create-project-button"
          onClick={() => createProject()}
          className="rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
        >
          Create Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-md border border-dashed border-ink-950/20 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-ink-950">No projects yet</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-600">
            Create a local mock project to start shaping the Narrium workspace foundation.
          </p>
          <button
            type="button"
            data-testid="empty-create-project-button"
            onClick={() => createProject()}
            className="mt-6 rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <button
              type="button"
              key={project.id}
              data-testid="project-card"
              onClick={() => openProject(project.id)}
              className="rounded-md border border-ink-950/10 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent-500/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-500/40"
              aria-label={`Open ${project.name}`}
            >
              <div className="flex h-32 items-center justify-center rounded-md bg-parchment-100 text-sm font-medium text-ink-600">
                No thumbnail
              </div>
              <span className="mt-4 block text-lg font-semibold text-ink-950">{project.name}</span>
              <span className="mt-1 block text-xs text-ink-600">
                Updated {new Date(project.updatedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
