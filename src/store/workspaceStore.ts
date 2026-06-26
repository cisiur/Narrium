import { create } from 'zustand';
import type { WorkspaceProjectMeta, WorkspaceState } from '../types';

const WORKSPACE_STORAGE_KEY = 'narrium_workspace';

interface WorkspaceStore extends WorkspaceState {
  createProject: () => WorkspaceProjectMeta;
}

function createProjectMeta(): WorkspaceProjectMeta {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  return {
    id,
    name: 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    thumbnailDataUrl: null,
  };
}

function loadWorkspace(): WorkspaceState {
  if (typeof window === 'undefined') {
    return { projects: [], activeProjectId: null };
  }

  const rawWorkspace = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);

  if (!rawWorkspace) {
    return { projects: [], activeProjectId: null };
  }

  try {
    const parsedWorkspace = JSON.parse(rawWorkspace) as WorkspaceState;

    return {
      projects: Array.isArray(parsedWorkspace.projects) ? parsedWorkspace.projects : [],
      activeProjectId: parsedWorkspace.activeProjectId ?? null,
    };
  } catch {
    return { projects: [], activeProjectId: null };
  }
}

function saveWorkspace(workspace: WorkspaceState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  ...loadWorkspace(),
  createProject: () => {
    const project = createProjectMeta();

    set((state) => {
      const nextWorkspace = {
        projects: [...state.projects, project],
        activeProjectId: project.id,
      };

      saveWorkspace(nextWorkspace);

      return nextWorkspace;
    });

    return project;
  },
}));
