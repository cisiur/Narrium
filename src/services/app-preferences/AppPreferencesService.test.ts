import { describe, expect, it } from 'vitest';
import { normalizeRecentProjects, recordRecentProject, type AppPreferences, type RecentProject } from './AppPreferencesService';

function createRecentProject(index: number, overrides: Partial<RecentProject> = {}): RecentProject {
  return {
    name: `Project ${index}`,
    filePath: `C:/Stories/Project ${index}.narrium`,
    lastOpenedAt: `2026-01-${String(index).padStart(2, '0')}T00:00:00.000Z`,
    ...overrides,
  };
}

describe('app preferences recent projects', () => {
  it('orders recent projects by last opened time descending', () => {
    const recentProjects = normalizeRecentProjects([
      createRecentProject(1),
      createRecentProject(3),
      createRecentProject(2),
    ]);

    expect(recentProjects.map((project) => project.name)).toEqual(['Project 3', 'Project 2', 'Project 1']);
  });

  it('keeps only the 10 most recent projects', () => {
    const recentProjects = normalizeRecentProjects(
      Array.from({ length: 12 }, (_value, index) => createRecentProject(index + 1)),
    );

    expect(recentProjects).toHaveLength(10);
    expect(recentProjects[0].name).toBe('Project 12');
    expect(recentProjects[9].name).toBe('Project 3');
  });

  it('moves a reopened project to the top and updates last opened metadata', () => {
    const preferences: AppPreferences = {
      recentProjects: [createRecentProject(1), createRecentProject(2)],
      lastOpenedProjectFilePath: 'C:/Stories/Project 2.narrium',
    };

    const nextPreferences = recordRecentProject(
      preferences,
      {
        name: 'Project 1 Revised',
        filePath: 'C:/Stories/Project 1.narrium',
      },
      '2026-02-01T00:00:00.000Z',
    );

    expect(nextPreferences.recentProjects).toHaveLength(2);
    expect(nextPreferences.recentProjects[0]).toEqual({
      name: 'Project 1 Revised',
      filePath: 'C:/Stories/Project 1.narrium',
      lastOpenedAt: '2026-02-01T00:00:00.000Z',
    });
    expect(nextPreferences.lastOpenedProjectFilePath).toBe('C:/Stories/Project 1.narrium');
  });
});
