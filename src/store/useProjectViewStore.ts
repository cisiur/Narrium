import { create } from 'zustand';

export type ProjectView = 'canvas' | 'characters' | 'resources';

interface ProjectViewStore {
  activeProjectView: ProjectView;
  setActiveProjectView: (view: ProjectView) => void;
}

export const useProjectViewStore = create<ProjectViewStore>((set) => ({
  activeProjectView: 'canvas',
  setActiveProjectView: (view) => set({ activeProjectView: view }),
}));
