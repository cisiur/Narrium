import type { Project } from '../types';
import { normalizeProject } from '../store/projectMigrations';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStringField(value: Record<string, unknown>, field: string) {
  return typeof value[field] === 'string';
}

function hasArrayField(value: Record<string, unknown>, field: string) {
  return Array.isArray(value[field]);
}

function resemblesScene(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  const dialoguePages = value.dialoguePages;
  const choices = value.choices;

  return (
    hasStringField(value, 'id') &&
    hasStringField(value, 'name') &&
    isRecord(value.background) &&
    Array.isArray(dialoguePages) &&
    Array.isArray(choices) &&
    dialoguePages.every(resemblesDialoguePage) &&
    choices.every(resemblesChoice)
  );
}

function resemblesDialoguePage(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return hasStringField(value, 'id') && hasStringField(value, 'text');
}

function resemblesChoice(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasStringField(value, 'id') &&
    hasStringField(value, 'text') &&
    hasArrayField(value, 'conditionGroups') &&
    hasArrayField(value, 'effects')
  );
}

function resemblesNarriumProject(value: unknown): value is Project {
  if (!isRecord(value)) {
    return false;
  }

  const scenes = value.scenes;

  return (
    hasStringField(value, 'id') &&
    hasStringField(value, 'name') &&
    hasStringField(value, 'startSceneId') &&
    Array.isArray(scenes) &&
    hasArrayField(value, 'characters') &&
    hasArrayField(value, 'resources') &&
    hasArrayField(value, 'groups') &&
    hasArrayField(value, 'assetLibrary') &&
    isRecord(value.settings) &&
    scenes.every(resemblesScene)
  );
}

export function parseProjectImport(source: string): Project | null {
  try {
    const parsed = JSON.parse(source) as unknown;

    if (!resemblesNarriumProject(parsed)) {
      return null;
    }

    return normalizeProject(parsed).project;
  } catch {
    return null;
  }
}
