import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { RecentProject } from '../../services/app-preferences';
import { PerformanceInstrumentationService, type MonotonicClock } from '../../services/performance';
import type { WorkspaceProjectMeta } from '../../types';
import { findAssociatedRecentProject, ProjectCard, updateProjectThumbnailFromFile } from './MyProjectsScreen';

function createProject(overrides: Partial<WorkspaceProjectMeta> = {}): WorkspaceProjectMeta {
  return {
    id: 'project-1',
    name: 'Szepcik',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    thumbnailDataUrl: null,
    ...overrides,
  };
}

function createRecentProject(overrides: Partial<RecentProject> = {}): RecentProject {
  return {
    projectId: 'project-1',
    name: 'Szepcik',
    filePath: 'C:/Stories/Szepcik.narrium',
    lastOpenedAt: '2026-01-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('My Projects file-backed cards', () => {
  it('associates project cards with recent files by project id', () => {
    const project = createProject({ id: 'project-1', name: 'Same Name' });
    const recentProjects = [
      createRecentProject({
        projectId: 'project-2',
        name: 'Same Name',
        filePath: 'C:/Stories/Other.narrium',
      }),
      createRecentProject({
        projectId: 'project-1',
        name: 'Same Name',
        filePath: 'C:/Stories/Correct.narrium',
      }),
    ];

    expect(findAssociatedRecentProject(project, recentProjects)?.filePath).toBe('C:/Stories/Correct.narrium');
  });

  it('falls back to a unique project name match for older recent metadata', () => {
    const project = createProject({ id: 'project-1', name: 'Legacy' });
    const recentProjects = [
      createRecentProject({
        projectId: undefined,
        name: 'Legacy',
        filePath: 'C:/Stories/Legacy.narrium',
      }),
    ];

    expect(findAssociatedRecentProject(project, recentProjects)?.filePath).toBe('C:/Stories/Legacy.narrium');
  });

  it('does not associate ambiguous name-only recent projects', () => {
    const project = createProject({ id: 'project-1', name: 'Duplicate' });
    const recentProjects = [
      createRecentProject({
        projectId: undefined,
        name: 'Duplicate',
        filePath: 'C:/Stories/Duplicate A.narrium',
      }),
      createRecentProject({
        projectId: undefined,
        name: 'Duplicate',
        filePath: 'C:/Stories/Duplicate B.narrium',
      }),
    ];

    expect(findAssociatedRecentProject(project, recentProjects)).toBeNull();
  });

  it('renders file-backed card metadata', () => {
    const html = renderToStaticMarkup(
      <ProjectCard
        project={createProject()}
        associatedFilePath="C:/Stories/Szepcik.narrium"
        onOpen={() => undefined}
        onOpenSettings={() => undefined}
      />,
    );

    expect(html).toContain('.narrium file - C:/Stories/Szepcik.narrium');
    expect(html).not.toContain('Local draft');
  });

  it('renders local draft card metadata', () => {
    const html = renderToStaticMarkup(
      <ProjectCard
        project={createProject()}
        associatedFilePath={null}
        onOpen={() => undefined}
        onOpenSettings={() => undefined}
      />,
    );

    expect(html).toContain('Local draft');
    expect(html).not.toContain('.narrium file');
  });
});

describe('project thumbnail processing', () => {
  class ManualClock implements MonotonicClock {
    private current = 0;

    now(): number {
      return this.current;
    }

    advance(ms: number): void {
      this.current += ms;
    }
  }

  it('updates the selected project thumbnail after successful processing', async () => {
    const onUpdateThumbnail = vi.fn();
    const onError = vi.fn();
    const file = new File(['thumbnail'], 'thumbnail.png', { type: 'image/png' });
    const processor = vi.fn(() => Promise.resolve({ dataUrl: 'data:image/jpeg;base64,optimized', width: 640, height: 360 }));

    await expect(
      updateProjectThumbnailFromFile('project-1', file, onUpdateThumbnail, onError, processor),
    ).resolves.toBe(true);

    expect(processor).toHaveBeenCalledWith(file);
    expect(onUpdateThumbnail).toHaveBeenCalledWith('project-1', 'data:image/jpeg;base64,optimized');
    expect(onError).toHaveBeenCalledWith(null);
  });

  it('records thumbnail generation metrics internally', async () => {
    const clock = new ManualClock();
    const instrumentation = new PerformanceInstrumentationService(clock);
    const onUpdateThumbnail = vi.fn();
    const onError = vi.fn();
    const file = new File(['thumbnail'], 'thumbnail.png', { type: 'image/png' });
    const processor = vi.fn(() => {
      clock.advance(14);
      return Promise.resolve({ dataUrl: 'data:image/jpeg;base64,optimized', width: 640, height: 360 });
    });

    await updateProjectThumbnailFromFile(
      'project-1',
      file,
      onUpdateThumbnail,
      onError,
      processor,
      instrumentation,
    );

    expect(instrumentation.getSnapshot().thumbnails[0]).toMatchObject({
      thumbnailGenerationDurationMs: 14,
      inputBytes: file.size,
    });
    expect(instrumentation.getSnapshot().thumbnails[0].outputBytes).toBeGreaterThan(0);
  });

  it('keeps the previous thumbnail when processing fails', async () => {
    let thumbnail = 'data:image/jpeg;base64,previous';
    const onUpdateThumbnail = vi.fn((_projectId: string, nextThumbnail: string | null) => {
      thumbnail = nextThumbnail ?? '';
    });
    const onError = vi.fn();
    const file = new File(['thumbnail'], 'thumbnail.gif', { type: 'image/gif' });
    const processor = vi.fn(() => Promise.reject(new Error('Thumbnail must be a PNG, JPEG, or WEBP image.')));

    await expect(
      updateProjectThumbnailFromFile('project-1', file, onUpdateThumbnail, onError, processor),
    ).resolves.toBe(false);

    expect(onUpdateThumbnail).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('Thumbnail must be a PNG, JPEG, or WEBP image.');
    expect(thumbnail).toBe('data:image/jpeg;base64,previous');
  });
});
