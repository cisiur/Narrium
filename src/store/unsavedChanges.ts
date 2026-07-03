import type { Project } from '../types';
import type { UnsavedChangesAction } from '../services/platform';

interface EnsureCanLeaveProjectInput {
  activeProject: Project | null;
  activeProjectDirty: boolean;
  confirmUnsavedChanges: (projectName: string) => Promise<UnsavedChangesAction>;
  saveActiveProject: () => Promise<boolean>;
  markProjectClean: () => void;
}

export async function ensureCanLeaveProject({
  activeProject,
  activeProjectDirty,
  confirmUnsavedChanges,
  saveActiveProject,
  markProjectClean,
}: EnsureCanLeaveProjectInput): Promise<boolean> {
  if (!activeProject || !activeProjectDirty) {
    return true;
  }

  const action = await confirmUnsavedChanges(activeProject.name);

  if (action === 'cancel') {
    return false;
  }

  if (action === 'discard') {
    markProjectClean();
    return true;
  }

  return saveActiveProject();
}
