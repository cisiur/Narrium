import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import { parseProjectImport } from './projectImport';

function createProject(overrides: Partial<Project> = {}): Project {
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
            text: 'Hello.',
          },
        ],
        choices: [
          {
            id: 'choice-1',
            text: 'Continue',
            targetSceneId: null,
            conditionGroups: [],
            effects: [],
          },
        ],
        groupId: null,
      },
    ],
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
    ...overrides,
  };
}

describe('parseProjectImport', () => {
  it('imports current project choices with condition groups and effects', () => {
    const project = createProject();

    expect(parseProjectImport(JSON.stringify(project))).toEqual(project);
  });

  it('accepts legacy choices with conditions and migrates them to condition groups', () => {
    const project = createProject({
      resources: [
        {
          id: 'resource-gold',
          key: 'gold',
          displayName: 'Gold',
          icon: 'coins',
          visible: true,
          defaultValue: 0,
        },
      ],
    });
    const legacyProject = {
      ...project,
      scenes: [
        {
          ...project.scenes[0],
          choices: [
            {
              id: 'choice-legacy',
              text: 'Buy passage',
              targetSceneId: null,
              conditions: [
                {
                  id: 'condition-gold',
                  type: 'resource',
                  targetId: 'resource-gold',
                  operator: '>=',
                  value: 10,
                  hintText: 'Need more gold.',
                },
              ],
            },
          ],
        },
      ],
    };

    const importedProject = parseProjectImport(JSON.stringify(legacyProject));
    const importedChoice = importedProject?.scenes[0].choices[0];

    expect(importedChoice?.effects).toEqual([]);
    expect(importedChoice?.conditionGroups).toHaveLength(1);
    expect(importedChoice?.conditionGroups[0].conditions).toEqual(
      legacyProject.scenes[0].choices[0].conditions,
    );
    expect('conditions' in (importedChoice ?? {})).toBe(false);
  });

  it('accepts missing effects and normalizes them to an empty array', () => {
    const project = createProject();
    const legacyProject = {
      ...project,
      scenes: [
        {
          ...project.scenes[0],
          choices: [
            {
              id: 'choice-no-effects',
              text: 'Continue',
              targetSceneId: null,
              conditionGroups: [],
            },
          ],
        },
      ],
    };

    const importedChoice = parseProjectImport(JSON.stringify(legacyProject))?.scenes[0].choices[0];

    expect(importedChoice?.conditionGroups).toEqual([]);
    expect(importedChoice?.effects).toEqual([]);
  });

  it('rejects clearly invalid choice data', () => {
    const invalidProject = {
      ...createProject(),
      scenes: [
        {
          ...createProject().scenes[0],
          choices: [
            {
              id: 'choice-invalid',
              conditionGroups: [],
              effects: [],
            },
          ],
        },
      ],
    };

    expect(parseProjectImport(JSON.stringify(invalidProject))).toBeNull();
  });
});
