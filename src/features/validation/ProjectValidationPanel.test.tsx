import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Choice, Project, Scene } from '../../types';
import {
  ProjectValidationPanel,
  navigateToValidationIssue,
  orderValidationIssues,
} from './ProjectValidationPanel';
import { VALIDATION_CODES, type ValidationIssue } from './projectValidation';

function createProject(scenes: Scene[], overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    thumbnail: null,
    startSceneId: scenes[0]?.id ?? '',
    scenes,
    characters: [],
    resources: [],
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

function createScene(id: string, choices: Choice[] = []): Scene {
  return {
    id,
    name: id,
    background: {
      mode: 'none',
      assetId: null,
      sourceSceneId: null,
      url: '',
    },
    position: { x: 0, y: 0 },
    dialoguePages: [],
    choices,
    groupId: null,
  };
}

function createChoice(overrides: Partial<Choice> = {}): Choice {
  return {
    id: 'choice-1',
    text: 'Continue',
    targetSceneId: null,
    conditionGroups: [],
    effects: [],
    ...overrides,
  };
}

function renderPanel(project: Project) {
  return renderToStaticMarkup(
    <ProjectValidationPanel project={project} onIssueClick={() => undefined} />,
  );
}

describe('ProjectValidationPanel', () => {
  it('renders the empty validation state', () => {
    const project = createProject([createScene('scene-start')]);

    const markup = renderPanel(project);

    expect(markup).toContain('Project Validation');
    expect(markup).toContain('No validation issues found.');
    expect(markup).toContain('>0<');
  });

  it('renders warning issues with the scene name', () => {
    const project = createProject([
      createScene('scene-start', [createChoice({ id: 'choice-empty' })]),
    ]);

    const markup = renderPanel(project);

    expect(markup).toContain('Warning');
    expect(markup).toContain('scene-start');
    expect(markup).toContain('This choice does nothing. Add a target scene or at least one effect.');
  });

  it('renders error issues with the scene name', () => {
    const project = createProject([
      createScene('scene-start', [
        createChoice({ id: 'choice-broken', targetSceneId: 'missing-scene' }),
      ]),
    ]);

    const markup = renderPanel(project);

    expect(markup).toContain('Error');
    expect(markup).toContain('scene-start');
    expect(markup).toContain('Target scene no longer exists.');
  });

  it('orders errors before warnings while preserving order inside each severity', () => {
    const warningA: ValidationIssue = {
      severity: 'warning',
      code: VALIDATION_CODES.targetlessChoiceWithoutEffects,
      message: 'warning a',
      sceneId: 'scene-a',
      choiceId: 'choice-a',
    };
    const errorA: ValidationIssue = {
      severity: 'error',
      code: VALIDATION_CODES.brokenChoiceTarget,
      message: 'error a',
      sceneId: 'scene-b',
      choiceId: 'choice-b',
    };
    const warningB: ValidationIssue = {
      severity: 'warning',
      code: VALIDATION_CODES.missingDialogueSpeaker,
      message: 'warning b',
      sceneId: 'scene-c',
      choiceId: null,
    };
    const errorB: ValidationIssue = {
      severity: 'error',
      code: VALIDATION_CODES.brokenChoiceTarget,
      message: 'error b',
      sceneId: 'scene-d',
      choiceId: 'choice-d',
    };

    expect(orderValidationIssues([warningA, errorA, warningB, errorB])).toEqual([
      errorA,
      errorB,
      warningA,
      warningB,
    ]);
  });
});

describe('navigateToValidationIssue', () => {
  it('opens a scene issue in the editor', () => {
    const openEditor = vi.fn();
    const selectChoice = vi.fn();

    navigateToValidationIssue(
      {
        severity: 'warning',
        code: VALIDATION_CODES.missingDialogueSpeaker,
        message: 'Referenced speaker no longer exists.',
        sceneId: 'scene-start',
        choiceId: null,
      },
      { openEditor, selectChoice },
    );

    expect(openEditor).toHaveBeenCalledWith('scene-start');
    expect(selectChoice).not.toHaveBeenCalled();
  });

  it('selects a choice issue in the editor', () => {
    const openEditor = vi.fn();
    const selectChoice = vi.fn();

    navigateToValidationIssue(
      {
        severity: 'error',
        code: VALIDATION_CODES.brokenChoiceTarget,
        message: 'Target scene no longer exists.',
        sceneId: 'scene-start',
        choiceId: 'choice-broken',
      },
      { openEditor, selectChoice },
    );

    expect(selectChoice).toHaveBeenCalledWith('scene-start', 'choice-broken');
    expect(openEditor).not.toHaveBeenCalled();
  });
});
