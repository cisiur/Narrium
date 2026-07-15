import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Project, Scene } from '../../types';
import {
  BACKGROUND_CLEANUP_REFRESH_WARNING,
  BackgroundEditor,
  runBackgroundCleanupDeletionWorkflow,
  runBackgroundDuplicateScanWorkflow,
} from './SceneEditorPanel';

function createScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 'scene-1',
    name: 'Scene 1',
    background: {
      mode: 'none',
      assetId: null,
      sourceSceneId: null,
      url: '',
    },
    position: { x: 0, y: 0 },
    dialoguePages: [],
    choices: [],
    groupId: null,
    ...overrides,
  };
}

function createProject(): Project {
  return {
    id: 'project-1',
    name: 'Project',
    thumbnail: null,
    startSceneId: '',
    scenes: [],
    characters: [],
    resources: [],
    variables: [],
    groups: [],
    assetLibrary: [],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('BackgroundEditor', () => {
  it('hides direct URL and Upload background source options while keeping Asset Library actions', () => {
    const html = renderToStaticMarkup(
      <BackgroundEditor scene={createScene()} scenes={[createScene()]} assets={[]} />,
    );

    expect(html).toContain('None');
    expect(html).toContain('Scene Reference');
    expect(html).toContain('Asset Library');
    expect(html).not.toContain('External Image URL');
    expect(html).not.toContain('Upload Image');
    expect(html).toContain('Add asset by URL');
    expect(html).toContain('Add asset by upload');
    expect(html).toContain('Add a background asset by upload or URL.');
  });

  it('preserves successful cleanup results when refresh scan fails', async () => {
    const deletionResult = {
      requestedFiles: [
        {
          relativePath: 'assets/backgrounds/orphan.png',
          fileName: 'orphan.png',
          fileSize: 12,
        },
      ],
      revalidatedOrphanFiles: [
        {
          relativePath: 'assets/backgrounds/orphan.png',
          fileName: 'orphan.png',
          fileSize: 12,
        },
      ],
      skippedNewlyReferencedFiles: [],
      reclaimedBytes: 12,
      deleted: [{ relativePath: 'assets/backgrounds/orphan.png', fileSize: 12 }],
      skipped: [],
      failed: [],
    };
    const cleanupService = {
      deleteOrphanedLocalBackgroundFiles: () => Promise.resolve(deletionResult),
      scanLocalBackgroundFiles: () => Promise.reject(new Error('refresh failed')),
    };

    const result = await runBackgroundCleanupDeletionWorkflow({
      cleanupService,
      cleanupReport: {
        projectId: 'project-1',
        projectFilePath: 'C:/Stories/Story.narrium',
        referencedFiles: [],
        orphanedFiles: deletionResult.requestedFiles,
        missingReferencedFiles: [],
        protectedRelativePaths: [],
      },
      getLatestWorkspaceState: () => ({
        activeProject: createProject(),
        activeProjectFilePath: 'C:/Stories/Story.narrium',
      }),
    });

    expect(result.cleanupResult).toBe(deletionResult);
    expect(result.cleanupReport).toBeNull();
    expect(result.cleanupError).toBe(BACKGROUND_CLEANUP_REFRESH_WARNING);
  });

  it('invalidates duplicate reports when the active project id changes', async () => {
    const result = await runBackgroundDuplicateScanWorkflow({
      duplicateService: {
        scanDuplicateLocalBackgroundFiles: () =>
          Promise.resolve({
            projectId: 'project-1',
            projectFilePath: 'C:/Stories/Story.narrium',
            groups: [],
            totalPotentialReclaimableBytes: 0,
          }),
      },
      project: createProject(),
      projectFilePath: 'C:/Stories/Story.narrium',
      getLatestWorkspaceState: () => ({
        activeProject: { ...createProject(), id: 'project-2' },
        activeProjectFilePath: 'C:/Stories/Story.narrium',
      }),
    });

    expect(result.duplicateReport).toBeNull();
    expect(result.duplicateError).toBeNull();
  });

  it('invalidates duplicate reports when the active project file path changes', async () => {
    const result = await runBackgroundDuplicateScanWorkflow({
      duplicateService: {
        scanDuplicateLocalBackgroundFiles: () =>
          Promise.resolve({
            projectId: 'project-1',
            projectFilePath: 'C:/Stories/Story.narrium',
            groups: [],
            totalPotentialReclaimableBytes: 0,
          }),
      },
      project: createProject(),
      projectFilePath: 'C:/Stories/Story.narrium',
      getLatestWorkspaceState: () => ({
        activeProject: createProject(),
        activeProjectFilePath: 'C:/Stories/Other.narrium',
      }),
    });

    expect(result.duplicateReport).toBeNull();
    expect(result.duplicateError).toBeNull();
  });

  it('returns duplicate scan failures without changing cleanup state', async () => {
    const cleanupState = { report: 'kept', result: 'kept', error: null };
    const result = await runBackgroundDuplicateScanWorkflow({
      duplicateService: {
        scanDuplicateLocalBackgroundFiles: () => Promise.reject(new Error('fingerprint failed')),
      },
      project: createProject(),
      projectFilePath: 'C:/Stories/Story.narrium',
      getLatestWorkspaceState: () => ({
        activeProject: createProject(),
        activeProjectFilePath: 'C:/Stories/Story.narrium',
      }),
    });

    expect(result.duplicateReport).toBeNull();
    expect(result.duplicateError).toBe('fingerprint failed');
    expect(cleanupState).toEqual({ report: 'kept', result: 'kept', error: null });
  });
});
