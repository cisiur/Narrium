import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { RecentProject } from '../../services/app-preferences';
import type { WorkspaceProjectMeta } from '../../types';
import { findAssociatedRecentProject, ProjectCard } from './MyProjectsScreen';

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
