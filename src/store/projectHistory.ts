import type { Project } from '../types';

export const PROJECT_HISTORY_LIMIT = 50;

export interface ProjectHistoryState {
  projectId: string | null;
  undoStack: Project[];
  redoStack: Project[];
}

export interface ProjectHistoryResult {
  history: ProjectHistoryState;
  project: Project | null;
}

export function createEmptyProjectHistory(projectId: string | null = null): ProjectHistoryState {
  return {
    projectId,
    undoStack: [],
    redoStack: [],
  };
}

export function cloneProject(project: Project): Project {
  return JSON.parse(JSON.stringify(project)) as Project;
}

export function pushProjectSnapshot(
  history: ProjectHistoryState,
  project: Project,
): ProjectHistoryState {
  const undoStack =
    history.projectId === project.id ? [...history.undoStack, cloneProject(project)] : [cloneProject(project)];

  return {
    projectId: project.id,
    undoStack: undoStack.slice(-PROJECT_HISTORY_LIMIT),
    redoStack: [],
  };
}

export function undoProjectHistory(
  history: ProjectHistoryState,
  currentProject: Project | null,
): ProjectHistoryResult {
  if (!currentProject || history.projectId !== currentProject.id || history.undoStack.length === 0) {
    return {
      history,
      project: null,
    };
  }

  const nextUndoStack = history.undoStack.slice(0, -1);
  const previousProject = history.undoStack[history.undoStack.length - 1];

  return {
    history: {
      projectId: currentProject.id,
      undoStack: nextUndoStack,
      redoStack: [cloneProject(currentProject), ...history.redoStack].slice(0, PROJECT_HISTORY_LIMIT),
    },
    project: cloneProject(previousProject),
  };
}

export function redoProjectHistory(
  history: ProjectHistoryState,
  currentProject: Project | null,
): ProjectHistoryResult {
  if (!currentProject || history.projectId !== currentProject.id || history.redoStack.length === 0) {
    return {
      history,
      project: null,
    };
  }

  const nextProject = history.redoStack[0];
  const nextRedoStack = history.redoStack.slice(1);

  return {
    history: {
      projectId: currentProject.id,
      undoStack: [...history.undoStack, cloneProject(currentProject)].slice(-PROJECT_HISTORY_LIMIT),
      redoStack: nextRedoStack,
    },
    project: cloneProject(nextProject),
  };
}
