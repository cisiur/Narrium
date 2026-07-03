import type { Project, RuntimeState } from '../../types';

export function createInitialRuntimeState(project: Project): RuntimeState {
  const resources = Object.fromEntries(
    project.resources.map((resource) => [resource.key, resource.defaultValue]),
  );
  const variables = Object.fromEntries(
    project.variables.map((variable) => [variable.key, variable.defaultValue]),
  );

  const characterAttrs = Object.fromEntries(
    project.characters.map((character) => [
      character.id,
      Object.fromEntries(
        character.attributes.map((attribute) => [attribute.key, attribute.defaultValue]),
      ),
    ]),
  );

  return {
    currentSceneId: project.startSceneId,
    currentPageIndex: 0,
    variables: {
      resources,
      variables,
      characterAttrs,
    },
  };
}
