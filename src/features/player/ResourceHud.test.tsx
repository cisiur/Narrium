import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Choice, Project } from '../../types';
import { advanceRuntimeForChoice, createInitialRuntimeState } from '../../domain/runtime';
import { ResourceHud } from './ResourceHud';

function createProject(): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    thumbnail: null,
    startSceneId: 'scene-start',
    scenes: [
      {
        id: 'scene-start',
        name: 'Start',
        background: {
          mode: 'none',
          assetId: null,
          sourceSceneId: null,
          url: '',
        },
        position: { x: 0, y: 0 },
        dialoguePages: [
          {
            id: 'page-1',
            speakerId: null,
            text: 'Hello',
          },
        ],
        choices: [],
        groupId: null,
      },
    ],
    characters: [],
    resources: [
      {
        id: 'resource-gold',
        key: 'gold',
        displayName: 'Gold',
        icon: 'coins',
        visible: true,
        defaultValue: 5,
      },
      {
        id: 'resource-mana',
        key: 'mana',
        displayName: 'Mana',
        icon: 'gem',
        visible: false,
        defaultValue: 2,
      },
    ],
    variables: [
      {
        id: 'variable-secret',
        key: 'secret',
        defaultValue: 9,
      },
    ],
    groups: [],
    assetLibrary: [],
    settings: {
      allowSessionSaveLoad: true,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('ResourceHud', () => {
  it('renders visible resources and hides variables', () => {
    const project = createProject();
    const markup = renderToStaticMarkup(
      <ResourceHud project={project} runtimeState={createInitialRuntimeState(project)} />,
    );

    expect(markup).toContain('Gold');
    expect(markup).toContain('coins');
    expect(markup).toContain('5');
    expect(markup).not.toContain('Mana');
    expect(markup).not.toContain('secret');
  });

  it('renders updated runtime values after resource effects are applied', () => {
    const project = createProject();
    const choice: Choice = {
      id: 'choice-gold',
      text: 'Gain gold',
      targetSceneId: null,
      conditionGroups: [],
      effects: [
        {
          id: 'effect-gold',
          type: 'resource',
          targetId: 'resource-gold',
          operation: '+=',
          value: 4,
        },
      ],
    };
    const runtimeState = advanceRuntimeForChoice(choice, project, createInitialRuntimeState(project));
    const markup = renderToStaticMarkup(<ResourceHud project={project} runtimeState={runtimeState} />);

    expect(markup).toContain('Gold');
    expect(markup).toContain('9');
  });

  it('renders nothing when no resources are visible', () => {
    const project = {
      ...createProject(),
      resources: createProject().resources.map((resource) => ({
        ...resource,
        visible: false,
      })),
    };
    const markup = renderToStaticMarkup(
      <ResourceHud project={project} runtimeState={createInitialRuntimeState(project)} />,
    );

    expect(markup).toBe('');
  });
});
