import { describe, expect, it } from 'vitest';
import type { Project } from '../../types';
import {
  OperationTimer,
  PERFORMANCE_METRIC_RETENTION_LIMIT,
  PerformanceInstrumentationService,
  calculateHistoryMetrics,
  calculateProjectPerformanceMetrics,
  embeddedAssetByteSize,
  serializedJsonByteSize,
  type MonotonicClock,
} from './PerformanceInstrumentationService';

class ManualClock implements MonotonicClock {
  private current = 0;

  now(): number {
    return this.current;
  }

  advance(ms: number): void {
    this.current += ms;
  }
}

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Measured Project',
    thumbnail: null,
    startSceneId: 'scene-1',
    scenes: [
      {
        id: 'scene-1',
        name: 'Scene 1',
        background: { mode: 'none', assetId: null, sourceSceneId: null, url: '' },
        position: { x: 0, y: 0 },
        dialoguePages: [],
        choices: [],
        groupId: null,
      },
    ],
    characters: [{ id: 'character-1', name: 'Mira', attributes: [] }],
    resources: [{ id: 'resource-1', key: 'gold', displayName: 'Gold', icon: 'circle', visible: true, defaultValue: 0 }],
    variables: [{ id: 'variable-1', key: 'visited', defaultValue: 0 }],
    groups: [
      {
        id: 'group-1',
        name: 'Group',
        color: '#94a3b8',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        collapsed: false,
      },
    ],
    assetLibrary: [
      {
        id: 'asset-1',
        kind: 'background',
        name: 'Embedded',
        storageType: 'embedded',
        source: 'data:image/png;base64,cG5n',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'asset-2',
        kind: 'background',
        name: 'Remote',
        storageType: 'remote',
        source: 'https://example.com/background.png',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    settings: { allowSessionSaveLoad: true },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('PerformanceInstrumentationService', () => {
  it('calculates project metrics without mutating the project', () => {
    const project = createProject();
    const before = JSON.stringify(project);

    const metrics = calculateProjectPerformanceMetrics(project);

    expect(metrics).toMatchObject({
      sceneCount: 1,
      characterCount: 1,
      resourceCount: 1,
      variableCount: 1,
      groupCount: 1,
      assetCount: 2,
      embeddedAssetCount: 1,
      totalEmbeddedBytes: 3,
    });
    expect(metrics.serializedJsonSize).toBe(serializedJsonByteSize(project));
    expect(JSON.stringify(project)).toBe(before);
  });

  it('calculates embedded bytes from Base64 assets', () => {
    expect(embeddedAssetByteSize('data:image/png;base64,cG5n')).toBe(3);
    expect(embeddedAssetByteSize('data:image/png;base64,YQ==')).toBe(1);
  });

  it('calculates JSON size deterministically', () => {
    const value = { name: 'A', nested: [1, 2, 3] };

    expect(serializedJsonByteSize(value)).toBe(serializedJsonByteSize(value));
  });

  it('calculates snapshot metrics', () => {
    const first = createProject({ name: 'First' });
    const second = createProject({ name: 'Second' });

    const metrics = calculateHistoryMetrics({
      projectId: first.id,
      undoStack: [first],
      redoStack: [second],
    });

    expect(metrics.snapshotCount).toBe(2);
    expect(metrics.undoSnapshotCount).toBe(1);
    expect(metrics.redoSnapshotCount).toBe(1);
    expect(metrics.serializedSnapshotSize).toBe(serializedJsonByteSize(first));
    expect(metrics.totalHistorySize).toBe(serializedJsonByteSize(first) + serializedJsonByteSize(second));
  });

  it('calculates history metrics from retained snapshot sizes', () => {
    const metrics = calculateHistoryMetrics({
      projectId: 'project-1',
      undoStack: [createProject({ name: 'First' }), createProject({ name: 'Second' })],
      redoStack: [createProject({ name: 'Third' })],
      undoStackSizes: [10, 20],
      redoStackSizes: [30],
    });

    expect(metrics).toEqual({
      projectId: 'project-1',
      undoSnapshotCount: 2,
      redoSnapshotCount: 1,
      snapshotCount: 3,
      serializedSnapshotSize: 20,
      totalHistorySize: 60,
    });
  });


  it('measures operations with an injected monotonic clock', () => {
    const clock = new ManualClock();
    const timer = new OperationTimer(clock, 'test-operation');

    clock.advance(12.5);

    expect(timer.stop()).toEqual({
      operation: 'test-operation',
      durationMs: 12.5,
    });
  });

  it('stores structured snapshots in memory only', () => {
    const clock = new ManualClock();
    const service = new PerformanceInstrumentationService(clock);

    service.measure('sync-work', () => {
      clock.advance(4);
      return 'done';
    });
    service.calculateProjectMetrics(createProject());

    const snapshot = service.getSnapshot();

    expect(snapshot.operations).toEqual([{ operation: 'sync-work', durationMs: 4 }]);
    expect(snapshot.projectMetrics).toHaveLength(1);
    service.clear();
    expect(service.getSnapshot().operations).toEqual([]);
  });

  it('bounds every metric category and keeps the newest entries in order', () => {
    const service = new PerformanceInstrumentationService(new ManualClock());
    const olderProjectMetric = calculateProjectPerformanceMetrics(createProject({ name: 'older' }));
    const newerProjectMetric = calculateProjectPerformanceMetrics(createProject({ name: 'newer' }));
    const retainedOperation = { operation: 'operation-new', durationMs: 1 };

    for (let index = 0; index < PERFORMANCE_METRIC_RETENTION_LIMIT + 1; index += 1) {
      service.recordOperation({ operation: `operation-${index}`, durationMs: index });
      service.recordSave({
        operation: 'save',
        projectId: `project-${index}`,
        projectFilePath: `C:/Stories/${index}.narrium`,
        projectMetrics: index === 0 ? olderProjectMetric : newerProjectMetric,
        serializationDurationMs: index,
        writeDurationMs: index,
        embeddedMaterializationDurationMs: 0,
        localAssetCopyDurationMs: 0,
        totalDurationMs: index,
      });
      service.recordBackgroundImport({ storageType: 'embedded', importDurationMs: index, fileSize: index });
      service.recordThumbnailGeneration({
        thumbnailGenerationDurationMs: index,
        inputBytes: index,
        outputBytes: index,
      });
      service.recordCleanup({
        projectId: `project-${index}`,
        projectFilePath: `C:/Stories/${index}.narrium`,
        scanDurationMs: index,
        deletionDurationMs: 0,
        scannedFileCount: index,
        deletedFileCount: 0,
      });
      service.recordDuplicate({
        projectId: `project-${index}`,
        projectFilePath: `C:/Stories/${index}.narrium`,
        fingerprintDurationMs: index,
        scannedFileCount: index,
        duplicateGroupCount: index,
      });
      service.calculateProjectMetrics(createProject({ name: `Project ${index}` }));
      service.calculateHistoryMetrics({
        projectId: `project-${index}`,
        undoStack: [createProject({ name: `Undo ${index}` })],
        redoStack: [],
        undoStackSizes: [index],
        redoStackSizes: [],
      });
    }

    service.recordOperation(retainedOperation);

    const snapshot = service.getSnapshot();

    expect(snapshot.operations).toHaveLength(PERFORMANCE_METRIC_RETENTION_LIMIT);
    expect(snapshot.saves).toHaveLength(PERFORMANCE_METRIC_RETENTION_LIMIT);
    expect(snapshot.backgroundImports).toHaveLength(PERFORMANCE_METRIC_RETENTION_LIMIT);
    expect(snapshot.thumbnails).toHaveLength(PERFORMANCE_METRIC_RETENTION_LIMIT);
    expect(snapshot.cleanups).toHaveLength(PERFORMANCE_METRIC_RETENTION_LIMIT);
    expect(snapshot.duplicates).toHaveLength(PERFORMANCE_METRIC_RETENTION_LIMIT);
    expect(snapshot.projectMetrics).toHaveLength(PERFORMANCE_METRIC_RETENTION_LIMIT);
    expect(snapshot.historyMetrics).toHaveLength(PERFORMANCE_METRIC_RETENTION_LIMIT);
    expect(snapshot.operations[0].operation).toBe('operation-2');
    expect(snapshot.operations[snapshot.operations.length - 1]).toBe(retainedOperation);
  });

  it('returns independent snapshot arrays and clear empties every retained category', () => {
    const service = new PerformanceInstrumentationService(new ManualClock());
    const operation = { operation: 'operation', durationMs: 1 };
    const save = {
      operation: 'save' as const,
      projectId: 'project-1',
      projectFilePath: 'C:/Stories/Story.narrium',
      projectMetrics: calculateProjectPerformanceMetrics(createProject()),
      serializationDurationMs: 1,
      writeDurationMs: 1,
      embeddedMaterializationDurationMs: 0,
      localAssetCopyDurationMs: 0,
      totalDurationMs: 2,
    };

    service.recordOperation(operation);
    service.recordSave(save);
    service.recordBackgroundImport({ storageType: 'local', importDurationMs: 1, fileSize: 2 });
    service.recordThumbnailGeneration({ thumbnailGenerationDurationMs: 1, inputBytes: 2, outputBytes: 3 });
    service.recordCleanup({
      projectId: 'project-1',
      projectFilePath: 'C:/Stories/Story.narrium',
      scanDurationMs: 1,
      deletionDurationMs: 0,
      scannedFileCount: 1,
      deletedFileCount: 0,
    });
    service.recordDuplicate({
      projectId: 'project-1',
      projectFilePath: 'C:/Stories/Story.narrium',
      fingerprintDurationMs: 1,
      scannedFileCount: 1,
      duplicateGroupCount: 0,
    });
    service.calculateProjectMetrics(createProject());
    service.calculateHistoryMetrics({
      projectId: 'project-1',
      undoStack: [createProject()],
      redoStack: [],
      undoStackSizes: [10],
      redoStackSizes: [],
    });

    const snapshot = service.getSnapshot();

    snapshot.operations.length = 0;
    expect(service.getSnapshot().operations).toEqual([operation]);
    expect(service.getSnapshot().saves[0]).toBe(save);
    service.clear();
    expect(Object.values(service.getSnapshot()).every((items) => items.length === 0)).toBe(true);
  });
});
