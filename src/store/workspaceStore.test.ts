import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyProject, useWorkspaceStore } from './workspaceStore';

describe('createEmptyProject', () => {
  it('creates new projects with an empty variables array', () => {
    const project = createEmptyProject({
      id: 'project-1',
      name: 'Test Project',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      thumbnailDataUrl: null,
    });

    expect(project.variables).toEqual([]);
  });
});

describe('workspace dirty state', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      projects: [],
      activeProjectId: null,
      activeProject: null,
      activeProjectFolderPath: null,
      activeProjectFilePath: null,
      activeProjectDirty: false,
      projectFolderError: null,
    });
  });

  it('creates new projects as clean and marks them dirty after edits', () => {
    const projectMeta = useWorkspaceStore.getState().createProject();

    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);

    useWorkspaceStore.getState().updateActiveProject((project) => ({
      ...project,
      name: 'Edited Project',
    }));

    expect(useWorkspaceStore.getState().activeProject?.id).toBe(projectMeta.id);
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(true);
  });

  it('resets dirty state when creating another project', () => {
    useWorkspaceStore.getState().createProject();

    useWorkspaceStore.getState().updateActiveProject((project) => ({
      ...project,
      name: 'Dirty Project',
    }));
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(true);

    useWorkspaceStore.getState().createProject();
    expect(useWorkspaceStore.getState().activeProjectDirty).toBe(false);
  });

  it('does not try to import a desktop background without an active project folder', async () => {
    useWorkspaceStore.getState().createProject();
    useWorkspaceStore.setState({
      activeProjectFolderPath: null,
      projectFolderError: null,
    });

    await expect(useWorkspaceStore.getState().importBackgroundImageToProject()).resolves.toBeNull();
    expect(useWorkspaceStore.getState().projectFolderError).toBeNull();
  });
});
