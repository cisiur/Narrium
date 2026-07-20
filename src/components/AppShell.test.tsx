import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders distinct Scene Group toolbar actions', () => {
    const html = renderToStaticMarkup(
      <AppShell
        isProjectOpen
        projectName="Test Project"
        onGroupSelectedScenes={() => undefined}
        onAddSelectedScenesToGroup={() => undefined}
        sceneGroupOptions={[{ id: 'group-1', name: 'Chapter 1' }]}
      >
        <div />
      </AppShell>,
    );

    expect(html).toContain('New group from selection');
    expect(html).toContain('Add selected to group...');
    expect(html).not.toContain('Group selected scenes');
  });

  it('renders the selected-scenes ungroup action separately from whole-group Ungroup', () => {
    const html = renderToStaticMarkup(
      <AppShell
        isProjectOpen
        projectName="Test Project"
        onUngroupSelectedScenes={() => undefined}
        onUngroupSelectedGroup={() => undefined}
      >
        <div />
      </AppShell>,
    );

    expect(html).toContain('Ungroup selected scenes');
    expect(html).toContain('Ungroup');
  });

  it('hides the add-to-group picker when no groups are assignable', () => {
    const html = renderToStaticMarkup(
      <AppShell
        isProjectOpen
        projectName="Test Project"
        onAddSelectedScenesToGroup={() => undefined}
        sceneGroupOptions={[]}
      >
        <div />
      </AppShell>,
    );

    expect(html).not.toContain('Add selected to group...');
  });

  it('renders playable folder export only when a handler is provided', () => {
    const desktopHtml = renderToStaticMarkup(
      <AppShell
        isProjectOpen
        projectName="File-backed"
        onExportPlayableFolder={() => undefined}
      >
        <div />
      </AppShell>,
    );
    const browserHtml = renderToStaticMarkup(
      <AppShell isProjectOpen projectName="Browser">
        <div />
      </AppShell>,
    );

    expect(desktopHtml).toContain('Export Playable Folder');
    expect(browserHtml).not.toContain('Export Playable Folder');
  });

  it('keeps standalone HTML export available separately', () => {
    const html = renderToStaticMarkup(
      <AppShell
        isProjectOpen
        projectName="File-backed"
        onExportHtml={() => undefined}
        onExportPlayableFolder={() => undefined}
      >
        <div />
      </AppShell>,
    );

    expect(html).toContain('Export HTML');
    expect(html).toContain('Export Playable Folder');
  });

  it('shows unsaved draft status and disables Save when no project file path is known', () => {
    const html = renderToStaticMarkup(
      <AppShell
        isProjectOpen
        projectName="Draft"
        projectFilePath={null}
        onSaveProject={() => undefined}
        canSaveProject={false}
      >
        <div />
      </AppShell>,
    );

    expect(html).toContain('Unsaved draft - use Save As to create a .narrium file');
    expect(html).toContain('Use Save As to create a .narrium project file first.');
    expect(html).toContain('disabled=""');
  });

  it('shows project file path and enables Save when a project file path is known', () => {
    const html = renderToStaticMarkup(
      <AppShell
        isProjectOpen
        projectName="File-backed"
        projectFilePath="C:/Stories/File-backed.narrium"
        onSaveProject={() => undefined}
        canSaveProject
      >
        <div />
      </AppShell>,
    );

    expect(html).toContain('C:/Stories/File-backed.narrium');
    expect(html).not.toContain('Unsaved draft');
    expect(html).not.toContain('disabled=""');
  });

  it('does not render the single-item Workspace sidebar on the My Projects screen', () => {
    const html = renderToStaticMarkup(
      <AppShell>
        <h1>My Projects</h1>
      </AppShell>,
    );

    expect(html).toContain('My Projects');
    expect(html).not.toContain('Workspace');
    expect(html).not.toContain('grid-cols-[14rem_minmax(0,1fr)]');
  });
});
