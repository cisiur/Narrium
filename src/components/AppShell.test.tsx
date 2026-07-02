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
});
