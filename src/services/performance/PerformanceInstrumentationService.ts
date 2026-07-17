import type { Project } from '../../types';

export interface MonotonicClock {
  now(): number;
}

export interface OperationMetrics {
  operation: string;
  durationMs: number;
}

export interface ProjectPerformanceMetrics {
  serializedJsonSize: number;
  sceneCount: number;
  characterCount: number;
  resourceCount: number;
  variableCount: number;
  groupCount: number;
  assetCount: number;
  embeddedAssetCount: number;
  totalEmbeddedBytes: number;
}

export interface HistoryMetrics {
  projectId: string | null;
  undoSnapshotCount: number;
  redoSnapshotCount: number;
  snapshotCount: number;
  serializedSnapshotSize: number;
  totalHistorySize: number;
}

export interface ProjectSaveMetrics {
  operation: 'save' | 'save-as';
  projectId: string;
  projectFilePath: string;
  projectMetrics: ProjectPerformanceMetrics;
  serializationDurationMs: number;
  writeDurationMs: number;
  embeddedMaterializationDurationMs: number;
  localAssetCopyDurationMs: number;
  totalDurationMs: number;
}

export interface BackgroundImportMetrics {
  storageType: 'embedded' | 'local';
  importDurationMs: number;
  fileSize: number;
}

export interface ThumbnailGenerationMetrics {
  thumbnailGenerationDurationMs: number;
  inputBytes: number;
  outputBytes: number;
}

export interface CleanupMetrics {
  projectId: string;
  projectFilePath: string;
  scanDurationMs: number;
  deletionDurationMs: number;
  scannedFileCount: number;
  deletedFileCount: number;
}

export interface DuplicateMetrics {
  projectId: string;
  projectFilePath: string;
  fingerprintDurationMs: number;
  scannedFileCount: number;
  duplicateGroupCount: number;
}

export interface PerformanceSnapshot {
  projectMetrics: ProjectPerformanceMetrics[];
  historyMetrics: HistoryMetrics[];
  operations: OperationMetrics[];
  saves: ProjectSaveMetrics[];
  backgroundImports: BackgroundImportMetrics[];
  thumbnails: ThumbnailGenerationMetrics[];
  cleanups: CleanupMetrics[];
  duplicates: DuplicateMetrics[];
}

const textEncoder = new TextEncoder();

export const defaultMonotonicClock: MonotonicClock = {
  now() {
    return globalThis.performance?.now() ?? Date.now();
  },
};

export class OperationTimer {
  private readonly startedAt: number;

  constructor(
    private readonly clock: MonotonicClock,
    private readonly operation: string,
  ) {
    this.startedAt = clock.now();
  }

  elapsedMs(): number {
    return Math.max(0, this.clock.now() - this.startedAt);
  }

  stop(): OperationMetrics {
    return {
      operation: this.operation,
      durationMs: this.elapsedMs(),
    };
  }
}

export class PerformanceInstrumentationService {
  private readonly projectMetrics: ProjectPerformanceMetrics[] = [];
  private readonly historyMetrics: HistoryMetrics[] = [];
  private readonly operations: OperationMetrics[] = [];
  private readonly saves: ProjectSaveMetrics[] = [];
  private readonly backgroundImports: BackgroundImportMetrics[] = [];
  private readonly thumbnails: ThumbnailGenerationMetrics[] = [];
  private readonly cleanups: CleanupMetrics[] = [];
  private readonly duplicates: DuplicateMetrics[] = [];

  constructor(private readonly clock: MonotonicClock = defaultMonotonicClock) {}

  createTimer(operation: string): OperationTimer {
    return new OperationTimer(this.clock, operation);
  }

  measure<T>(operation: string, work: () => T): { value: T; metrics: OperationMetrics } {
    const timer = this.createTimer(operation);
    const value = work();
    const metrics = timer.stop();
    this.recordOperation(metrics);

    return { value, metrics };
  }

  async measureAsync<T>(operation: string, work: () => Promise<T>): Promise<{ value: T; metrics: OperationMetrics }> {
    const timer = this.createTimer(operation);
    const value = await work();
    const metrics = timer.stop();
    this.recordOperation(metrics);

    return { value, metrics };
  }

  calculateProjectMetrics(project: Project): ProjectPerformanceMetrics {
    const metrics = calculateProjectPerformanceMetrics(project);
    this.projectMetrics.push(metrics);

    return metrics;
  }

  calculateHistoryMetrics(input: {
    projectId: string | null;
    undoStack: Project[];
    redoStack: Project[];
  }): HistoryMetrics {
    const metrics = calculateHistoryMetrics(input);
    this.historyMetrics.push(metrics);

    return metrics;
  }

  recordOperation(metrics: OperationMetrics): void {
    this.operations.push(metrics);
  }

  recordSave(metrics: ProjectSaveMetrics): void {
    this.saves.push(metrics);
  }

  recordBackgroundImport(metrics: BackgroundImportMetrics): void {
    this.backgroundImports.push(metrics);
  }

  recordThumbnailGeneration(metrics: ThumbnailGenerationMetrics): void {
    this.thumbnails.push(metrics);
  }

  recordCleanup(metrics: CleanupMetrics): void {
    this.cleanups.push(metrics);
  }

  recordDuplicate(metrics: DuplicateMetrics): void {
    this.duplicates.push(metrics);
  }

  getSnapshot(): PerformanceSnapshot {
    return {
      projectMetrics: [...this.projectMetrics],
      historyMetrics: [...this.historyMetrics],
      operations: [...this.operations],
      saves: [...this.saves],
      backgroundImports: [...this.backgroundImports],
      thumbnails: [...this.thumbnails],
      cleanups: [...this.cleanups],
      duplicates: [...this.duplicates],
    };
  }

  clear(): void {
    this.projectMetrics.length = 0;
    this.historyMetrics.length = 0;
    this.operations.length = 0;
    this.saves.length = 0;
    this.backgroundImports.length = 0;
    this.thumbnails.length = 0;
    this.cleanups.length = 0;
    this.duplicates.length = 0;
  }
}

export function calculateProjectPerformanceMetrics(project: Project): ProjectPerformanceMetrics {
  const embeddedAssets = project.assetLibrary.filter(
    (asset) => asset.kind === 'background' && asset.storageType === 'embedded',
  );

  return {
    serializedJsonSize: serializedJsonByteSize(project),
    sceneCount: project.scenes.length,
    characterCount: project.characters.length,
    resourceCount: project.resources.length,
    variableCount: project.variables.length,
    groupCount: project.groups.length,
    assetCount: project.assetLibrary.length,
    embeddedAssetCount: embeddedAssets.length,
    totalEmbeddedBytes: embeddedAssets.reduce((total, asset) => total + embeddedAssetByteSize(asset.source), 0),
  };
}

export function calculateHistoryMetrics(input: {
  projectId: string | null;
  undoStack: Project[];
  redoStack: Project[];
}): HistoryMetrics {
  const snapshots = [...input.undoStack, ...input.redoStack];
  const totalHistorySize = snapshots.reduce((total, project) => total + serializedJsonByteSize(project), 0);

  return {
    projectId: input.projectId,
    undoSnapshotCount: input.undoStack.length,
    redoSnapshotCount: input.redoStack.length,
    snapshotCount: snapshots.length,
    serializedSnapshotSize: input.undoStack.length > 0
      ? serializedJsonByteSize(input.undoStack[input.undoStack.length - 1])
      : 0,
    totalHistorySize,
  };
}

export function serializedJsonByteSize(value: unknown): number {
  return textEncoder.encode(JSON.stringify(value)).length;
}

export function embeddedAssetByteSize(source: string): number {
  const match = /^data:[^,]*;base64,(.*)$/i.exec(source.trim());

  if (!match) {
    return serializedJsonByteSize(source);
  }

  const base64 = match[1].replace(/\s/g, '');
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;

  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

const performanceInstrumentationService = new PerformanceInstrumentationService();

export function getPerformanceInstrumentationService(): PerformanceInstrumentationService {
  return performanceInstrumentationService;
}
