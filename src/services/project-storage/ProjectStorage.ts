import type { Project, WorkspaceState } from '../../types';

export interface ProjectStorage {
  loadWorkspace(): WorkspaceState;
  saveWorkspace(workspace: WorkspaceState): void;
  loadProject(projectId: string | null): Project | null;
  saveProject(project: Project): void;
  deleteProject(projectId: string): void;
}
