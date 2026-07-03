import type { Project, WorkspaceState } from '../../types';
import { normalizeProject } from '../../store/projectMigrations';
import type { ProjectStorage } from './ProjectStorage';

export const WORKSPACE_STORAGE_KEY = 'narrium_workspace';
export const PROJECT_STORAGE_PREFIX = 'narrium_project_';

const emptyWorkspace: WorkspaceState = {
  projects: [],
  activeProjectId: null,
};

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getProjectStorageKey(projectId: string) {
  return `${PROJECT_STORAGE_PREFIX}${projectId}`;
}

export class BrowserProjectStorage implements ProjectStorage {
  loadWorkspace(): WorkspaceState {
    if (!canUseLocalStorage()) {
      return emptyWorkspace;
    }

    const rawWorkspace = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);

    if (!rawWorkspace) {
      return emptyWorkspace;
    }

    try {
      const parsedWorkspace = JSON.parse(rawWorkspace) as WorkspaceState;

      return {
        projects: Array.isArray(parsedWorkspace.projects)
          ? parsedWorkspace.projects.map((project) => ({
              ...project,
              thumbnailDataUrl: project.thumbnailDataUrl ?? null,
            }))
          : [],
        activeProjectId: parsedWorkspace.activeProjectId ?? null,
      };
    } catch {
      return emptyWorkspace;
    }
  }

  saveWorkspace(workspace: WorkspaceState): void {
    if (!canUseLocalStorage()) {
      return;
    }

    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  }

  loadProject(projectId: string | null): Project | null {
    if (!canUseLocalStorage() || !projectId) {
      return null;
    }

    const rawProject = window.localStorage.getItem(getProjectStorageKey(projectId));

    if (!rawProject) {
      return null;
    }

    try {
      const parsedProject = JSON.parse(rawProject) as Project;
      const normalizedProject = normalizeProject(parsedProject);

      if (normalizedProject.changed) {
        this.saveProject(normalizedProject.project);
      }

      return normalizedProject.project;
    } catch {
      return null;
    }
  }

  saveProject(project: Project): void {
    if (!canUseLocalStorage()) {
      return;
    }

    window.localStorage.setItem(getProjectStorageKey(project.id), JSON.stringify(project));
  }

  deleteProject(projectId: string): void {
    if (!canUseLocalStorage()) {
      return;
    }

    window.localStorage.removeItem(getProjectStorageKey(projectId));
  }
}
