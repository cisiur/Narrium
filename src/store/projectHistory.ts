import type { Project } from '../types';
import {
  getPerformanceInstrumentationService,
  serializedJsonStringByteSize,
} from '../services/performance';

export const PROJECT_HISTORY_LIMIT = 50;

export type ProjectSnapshotSizeCalculator = (serializedProject: string) => number;

export interface ProjectHistoryState {
  projectId: string | null;
  undoStack: Project[];
  redoStack: Project[];
  undoStackSizes?: number[];
  redoStackSizes?: number[];
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
    undoStackSizes: [],
    redoStackSizes: [],
  };
}

export function cloneProject(project: Project): Project {
  return JSON.parse(JSON.stringify(project)) as Project;
}

export function pushProjectSnapshot(
  history: ProjectHistoryState,
  project: Project,
  calculateSnapshotSize: ProjectSnapshotSizeCalculator = serializedJsonStringByteSize,
): ProjectHistoryState {
  const snapshot = createSizedProjectSnapshot(project, calculateSnapshotSize);
  const undoStack = history.projectId === project.id ? [...history.undoStack, snapshot.project] : [snapshot.project];
  const undoStackSizes = history.projectId === project.id
    ? [...getStackSizes(history.undoStack, history.undoStackSizes), snapshot.size]
    : [snapshot.size];

  const nextHistory = {
    projectId: project.id,
    undoStack: undoStack.slice(-PROJECT_HISTORY_LIMIT),
    undoStackSizes: undoStackSizes.slice(-PROJECT_HISTORY_LIMIT),
    redoStack: [],
    redoStackSizes: [],
  };

  getPerformanceInstrumentationService().calculateHistoryMetrics(nextHistory);

  return nextHistory;
}

export function undoProjectHistory(
  history: ProjectHistoryState,
  currentProject: Project | null,
  calculateSnapshotSize: ProjectSnapshotSizeCalculator = serializedJsonStringByteSize,
): ProjectHistoryResult {
  if (!currentProject || history.projectId !== currentProject.id || history.undoStack.length === 0) {
    return {
      history,
      project: null,
    };
  }

  const nextUndoStack = history.undoStack.slice(0, -1);
  const undoStackSizes = getStackSizes(history.undoStack, history.undoStackSizes);
  const nextUndoStackSizes = undoStackSizes.slice(0, -1);
  const previousProject = history.undoStack[history.undoStack.length - 1];
  const currentSnapshot = createSizedProjectSnapshot(currentProject, calculateSnapshotSize);

  const nextHistory = {
    projectId: currentProject.id,
    undoStack: nextUndoStack,
    undoStackSizes: nextUndoStackSizes,
    redoStack: [currentSnapshot.project, ...history.redoStack].slice(0, PROJECT_HISTORY_LIMIT),
    redoStackSizes: [
      currentSnapshot.size,
      ...getStackSizes(history.redoStack, history.redoStackSizes),
    ].slice(0, PROJECT_HISTORY_LIMIT),
  };

  getPerformanceInstrumentationService().calculateHistoryMetrics(nextHistory);

  return {
    history: nextHistory,
    project: cloneProject(previousProject),
  };
}

export function redoProjectHistory(
  history: ProjectHistoryState,
  currentProject: Project | null,
  calculateSnapshotSize: ProjectSnapshotSizeCalculator = serializedJsonStringByteSize,
): ProjectHistoryResult {
  if (!currentProject || history.projectId !== currentProject.id || history.redoStack.length === 0) {
    return {
      history,
      project: null,
    };
  }

  const nextProject = history.redoStack[0];
  const redoStackSizes = getStackSizes(history.redoStack, history.redoStackSizes);
  const nextRedoStack = history.redoStack.slice(1);
  const nextRedoStackSizes = redoStackSizes.slice(1);
  const currentSnapshot = createSizedProjectSnapshot(currentProject, calculateSnapshotSize);

  const nextHistory = {
    projectId: currentProject.id,
    undoStack: [...history.undoStack, currentSnapshot.project].slice(-PROJECT_HISTORY_LIMIT),
    undoStackSizes: [
      ...getStackSizes(history.undoStack, history.undoStackSizes),
      currentSnapshot.size,
    ].slice(-PROJECT_HISTORY_LIMIT),
    redoStack: nextRedoStack,
    redoStackSizes: nextRedoStackSizes,
  };

  getPerformanceInstrumentationService().calculateHistoryMetrics(nextHistory);

  return {
    history: nextHistory,
    project: cloneProject(nextProject),
  };
}

function createSizedProjectSnapshot(
  project: Project,
  calculateSnapshotSize: ProjectSnapshotSizeCalculator,
): { project: Project; size: number } {
  const serializedProject = JSON.stringify(project);

  return {
    project: JSON.parse(serializedProject) as Project,
    size: calculateSnapshotSize(serializedProject),
  };
}

function getStackSizes(projects: Project[], sizes: number[] | undefined): number[] {
  if (sizes && sizes.length === projects.length) {
    return sizes;
  }

  return projects.map((project) => serializedJsonStringByteSize(JSON.stringify(project)));
}
