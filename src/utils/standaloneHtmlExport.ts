import type { Project } from '../types';

function getStandaloneHtmlFilename(projectName: string) {
  const safeName = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return safeName ? `narrium-${safeName}.html` : 'narrium-story.html';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serializeProjectForScript(project: Project) {
  return JSON.stringify(project)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function createStandaloneHtml(project: Project) {
  const title = escapeHtml(project.name || 'Narrium Story');
  const description = escapeHtml(
    `Play ${project.name || 'a Narrium story'}, a standalone interactive story exported from Narrium.`
  );
  const embeddedProject = serializeProjectForScript(project);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${description}">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    :root {
      color-scheme: dark;
      --bg: #080b12;
      --ink: #fff7e8;
      --muted: rgba(255, 247, 232, 0.68);
      --soft: rgba(255, 247, 232, 0.1);
      --line: rgba(255, 247, 232, 0.2);
      --accent: #f59e0b;
      --accent-strong: #f97316;
      --blue: #60a5fa;
      --panel: rgba(8, 11, 18, 0.82);
    }
    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(circle at top left, #1f2937, var(--bg) 42rem);
      color: var(--ink);
      font-family:
        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
        sans-serif;
    }
    .stage {
      display: flex;
      min-height: 100vh;
      min-height: 100svh;
      flex-direction: column;
      background-position: center;
      background-size: cover;
    }
    .stage::before {
      content: "";
      position: fixed;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(8, 11, 18, 0.28), rgba(8, 11, 18, 0.7) 45%, rgba(8, 11, 18, 0.95)),
        radial-gradient(circle at 50% 100%, rgba(245, 158, 11, 0.18), transparent 34rem);
      pointer-events: none;
    }
    header, main {
      position: relative;
      z-index: 1;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: clamp(1rem, 3vw, 1.6rem);
    }
    .brand {
      min-width: 0;
    }
    .eyebrow {
      margin: 0 0 0.25rem;
      color: var(--muted);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      overflow-wrap: anywhere;
      font-size: clamp(1rem, 2.5vw, 1.45rem);
      font-weight: 800;
      line-height: 1.15;
    }
    button {
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 0.5rem;
      background: linear-gradient(180deg, var(--accent), var(--accent-strong));
      box-shadow: 0 0.8rem 1.8rem rgba(249, 115, 22, 0.22);
      color: #16100a;
      cursor: pointer;
      font: inherit;
      font-weight: 800;
      line-height: 1.2;
      padding: 0.78rem 1rem;
      transition:
        background 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease,
        transform 160ms ease;
    }
    button.secondary {
      background: rgba(255, 255, 255, 0.1);
      box-shadow: none;
      color: var(--ink);
    }
    button:disabled {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.055);
      box-shadow: none;
      color: rgba(255, 247, 232, 0.46);
      cursor: not-allowed;
      filter: none;
    }
    button:hover {
      transform: translateY(-1px);
    }
    button:disabled:hover {
      filter: none;
      transform: none;
    }
    button:focus-visible {
      outline: 3px solid rgba(96, 165, 250, 0.72);
      outline-offset: 3px;
    }
    main {
      display: flex;
      flex: 1;
      align-items: flex-end;
      justify-content: center;
      padding: clamp(1rem, 4vw, 2.5rem);
    }
    .panel {
      width: min(52rem, 100%);
      border: 1px solid var(--line);
      border-radius: 0.75rem;
      background: var(--panel);
      box-shadow: 0 1.5rem 5rem rgba(0, 0, 0, 0.46);
      padding: clamp(1rem, 3vw, 1.6rem);
      backdrop-filter: blur(18px);
    }
    .speaker {
      display: inline-flex;
      max-width: 100%;
      margin: 0 0 0.75rem;
      border: 1px solid rgba(96, 165, 250, 0.28);
      border-radius: 999px;
      background: rgba(96, 165, 250, 0.12);
      color: #bfdbfe;
      font-size: 0.75rem;
      font-weight: 800;
      line-height: 1.2;
      overflow-wrap: anywhere;
      padding: 0.32rem 0.65rem;
      text-transform: uppercase;
    }
    .text {
      margin: 0;
      color: rgba(255, 247, 232, 0.92);
      font-size: clamp(1rem, 2.3vw, 1.18rem);
      line-height: 1.75;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    .actions, .choices {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1.35rem;
    }
    .choices {
      flex-direction: column;
    }
    .choice {
      width: 100%;
      min-height: 3rem;
      text-align: left;
    }
    .choice:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      color: var(--ink);
    }
    .choice:not(:disabled):hover {
      border-color: rgba(245, 158, 11, 0.5);
      background: rgba(245, 158, 11, 0.16);
    }
    .hint {
      margin: -0.35rem 0 0;
      border-left: 3px solid rgba(245, 158, 11, 0.72);
      border-radius: 0.35rem;
      background: rgba(245, 158, 11, 0.09);
      color: rgba(255, 237, 213, 0.78);
      font-size: 0.86rem;
      line-height: 1.45;
      padding: 0.55rem 0.75rem;
    }
    .notice,
    .end {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 0.65rem;
      background: rgba(255, 255, 255, 0.08);
      padding: 1rem;
    }
    .notice {
      margin-top: 1.25rem;
    }
    .notice-title,
    .end-title {
      margin: 0;
      color: var(--ink);
      font-size: 1rem;
      font-weight: 800;
    }
    .notice-text,
    .end-text {
      margin: 0.45rem 0 0;
      color: var(--muted);
      font-size: 0.92rem;
      line-height: 1.5;
    }
    .end {
      margin: 1.25rem 0 0;
      border-color: rgba(245, 158, 11, 0.28);
      background:
        linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(96, 165, 250, 0.08)),
        rgba(255, 255, 255, 0.06);
    }
    .muted {
      color: var(--muted);
    }
    @media (max-width: 640px) {
      header {
        align-items: flex-start;
      }
      #restart {
        flex: 0 0 auto;
        padding-inline: 0.8rem;
      }
      main {
        align-items: stretch;
        padding-top: 0.5rem;
      }
      .panel {
        align-self: flex-end;
        border-radius: 0.65rem;
      }
      .actions {
        flex-direction: column;
      }
      .actions button,
      .choice {
        width: 100%;
      }
    }
    @media (max-width: 420px) {
      header {
        flex-direction: column;
      }
      #restart {
        width: 100%;
        text-align: left;
      }
    }
  </style>
</head>
<body>
  <div id="app" class="stage">
    <header>
      <div class="brand">
        <p class="eyebrow">Narrium Player</p>
        <h1></h1>
      </div>
      <button id="restart" type="button" class="secondary">Restart</button>
    </header>
    <main>
      <section class="panel" aria-live="polite">
        <p id="speaker" class="speaker"></p>
        <p id="text" class="text"></p>
        <div id="choices" class="choices"></div>
        <div id="actions" class="actions">
          <button id="next" type="button">Next</button>
        </div>
      </section>
    </main>
  </div>
  <script>
    const project = ${embeddedProject};
    const app = document.getElementById('app');
    const title = document.querySelector('h1');
    const speaker = document.getElementById('speaker');
    const text = document.getElementById('text');
    const choices = document.getElementById('choices');
    const actions = document.getElementById('actions');
    const nextButton = document.getElementById('next');
    const restartButton = document.getElementById('restart');
    let currentSceneId = project.startSceneId || (project.scenes[0] && project.scenes[0].id) || null;
    let currentPageIndex = 0;
    let runtimeState = createInitialRuntimeState(project);

    function createInitialRuntimeState(project) {
      const resources = Object.fromEntries(
        project.resources.map((resource) => [resource.key, resource.defaultValue])
      );
      const characterAttrs = Object.fromEntries(
        project.characters.map((character) => [
          character.id,
          Object.fromEntries(
            character.attributes.map((attribute) => [attribute.key, attribute.defaultValue])
          )
        ])
      );

      return {
        currentSceneId: project.startSceneId,
        currentPageIndex: 0,
        variables: {
          resources,
          characterAttrs
        }
      };
    }

    function findScene(sceneId) {
      return project.scenes.find((scene) => scene.id === sceneId) || null;
    }

    function findCharacter(characterId) {
      return project.characters.find((character) => character.id === characterId) || null;
    }

    function resolveSpeakerName(speakerId) {
      if (speakerId === null) {
        return 'Narrator';
      }

      return findCharacter(speakerId)?.name || 'Unknown Speaker';
    }

    function isFiniteNumber(value) {
      return typeof value === 'number' && Number.isFinite(value);
    }

    function compareNumbers(leftValue, operator, rightValue) {
      if (!isFiniteNumber(leftValue) || !isFiniteNumber(rightValue)) {
        return false;
      }

      switch (operator) {
        case '>=':
          return leftValue >= rightValue;
        case '<=':
          return leftValue <= rightValue;
        case '==':
          return leftValue === rightValue;
        case '>':
          return leftValue > rightValue;
        case '<':
          return leftValue < rightValue;
        case '!=':
          return leftValue !== rightValue;
        default:
          return false;
      }
    }

    function applyNumericOperation(currentValue, operation, effectValue) {
      switch (operation) {
        case '+=':
          return currentValue + effectValue;
        case '-=':
          return currentValue - effectValue;
        case '=':
          return effectValue;
        default:
          return null;
      }
    }

    function evaluateCondition(condition, project, runtimeState) {
      if (condition.type === 'resource') {
        const resource = project.resources.find((item) => item.id === condition.targetId);

        if (!resource) {
          return false;
        }

        const runtimeValue = runtimeState.variables.resources[resource.key];

        return compareNumbers(runtimeValue, condition.operator, condition.value);
      }

      if (condition.type === 'character_attr') {
        const character = project.characters.find((item) => item.id === condition.targetId);

        if (!character || !condition.attribute) {
          return false;
        }

        if (!character.attributes.some((attribute) => attribute.key === condition.attribute)) {
          return false;
        }

        const runtimeValue = runtimeState.variables.characterAttrs[character.id]?.[condition.attribute];

        return compareNumbers(runtimeValue, condition.operator, condition.value);
      }

      return false;
    }

    function isChoiceAvailable(choice, project, runtimeState) {
      const conditionGroups = choice.conditionGroups || [];

      if (conditionGroups.length === 0) {
        return true;
      }

      return conditionGroups.some((group) =>
        group.conditions.every((condition) => evaluateCondition(condition, project, runtimeState))
      );
    }

    function resolveUnavailableChoiceHint(choice, project, runtimeState) {
      if (isChoiceAvailable(choice, project, runtimeState)) {
        return null;
      }

      const conditionGroups = choice.conditionGroups || [];

      for (const group of conditionGroups) {
        for (const condition of group.conditions) {
          if (evaluateCondition(condition, project, runtimeState)) {
            continue;
          }

          const hintText = condition.hintText.trim();

          if (hintText !== '') {
            return hintText;
          }
        }
      }

      return null;
    }

    function applyEffects(choice, project, runtimeState) {
      const effects = choice.effects;

      if (!effects) {
        return runtimeState;
      }

      let nextResources = runtimeState.variables.resources;
      let nextCharacterAttrs = runtimeState.variables.characterAttrs;

      for (const effect of effects) {
        if (effect.type === 'resource') {
          const resource = project.resources.find((item) => item.id === effect.targetId);

          if (!resource) {
            continue;
          }

          const currentValue = nextResources[resource.key] ?? 0;
          const nextValue = applyNumericOperation(currentValue, effect.operation, effect.value);

          if (nextValue === null) {
            continue;
          }

          nextResources = {
            ...nextResources,
            [resource.key]: nextValue
          };
          continue;
        }

        if (effect.type === 'character_attr') {
          const character = project.characters.find((item) => item.id === effect.targetId);

          if (!character || !effect.attribute) {
            continue;
          }

          if (!character.attributes.some((attribute) => attribute.key === effect.attribute)) {
            continue;
          }

          const currentCharacterAttrs = nextCharacterAttrs[character.id] || {};
          const currentValue = currentCharacterAttrs[effect.attribute] ?? 0;
          const nextValue = applyNumericOperation(currentValue, effect.operation, effect.value);

          if (nextValue === null) {
            continue;
          }

          nextCharacterAttrs = {
            ...nextCharacterAttrs,
            [character.id]: {
              ...currentCharacterAttrs,
              [effect.attribute]: nextValue
            }
          };
        }
      }

      return {
        ...runtimeState,
        variables: {
          ...runtimeState.variables,
          resources: nextResources,
          characterAttrs: nextCharacterAttrs
        }
      };
    }

    function createChoiceViewModels(choices, project, runtimeState) {
      return choices.map((choice) => {
        const hasValidTarget = Boolean(
          choice.targetSceneId === null ||
            project.scenes.some((scene) => scene.id === choice.targetSceneId)
        );
        const isAvailable = isChoiceAvailable(choice, project, runtimeState);

        return {
          choice,
          isEnabled: isAvailable && hasValidTarget,
          unavailableHint: isAvailable
            ? null
            : resolveUnavailableChoiceHint(choice, project, runtimeState)
        };
      });
    }

    function advanceRuntimeForChoice(choice, project, runtimeState) {
      const targetSceneId = choice.targetSceneId;

      if (
        !isChoiceAvailable(choice, project, runtimeState) ||
        (targetSceneId !== null && !project.scenes.some((scene) => scene.id === targetSceneId))
      ) {
        return runtimeState;
      }

      const nextState = applyEffects(choice, project, runtimeState);

      if (targetSceneId === null) {
        return nextState;
      }

      return {
        ...nextState,
        currentSceneId: targetSceneId,
        currentPageIndex: 0
      };
    }

    function resolveDirectBackgroundUrl(scene) {
      if (!scene || !scene.background) {
        return null;
      }

      if (scene.background.mode === 'url' || scene.background.mode === 'upload') {
        return scene.background.url || null;
      }

      if (scene.background.mode === 'asset') {
        const asset = project.assetLibrary.find((item) => item.id === scene.background.assetId);
        return asset?.url || null;
      }

      return null;
    }

    function resolveBackgroundUrl(scene) {
      if (!scene) {
        return null;
      }

      const directUrl = resolveDirectBackgroundUrl(scene);

      if (directUrl) {
        return directUrl;
      }

      if (scene.background?.mode === 'scene_reference' && scene.background.sourceSceneId) {
        return resolveDirectBackgroundUrl(findScene(scene.background.sourceSceneId));
      }

      return null;
    }

    function setBackground(scene) {
      const backgroundUrl = resolveBackgroundUrl(scene);

      if (backgroundUrl) {
        app.style.backgroundImage = 'url("' + backgroundUrl.replace(/"/g, '%22') + '")';
      } else {
        app.style.backgroundImage = '';
      }
    }

    function clearChoices() {
      choices.replaceChildren();
    }

    function renderEndState(scene) {
      speaker.textContent = scene ? scene.name : 'Story';
      text.textContent = scene ? 'The story ends here.' : 'No starting scene is available.';
      clearChoices();
      renderNotice(
        scene ? 'End state' : 'Missing start scene',
        scene
          ? 'This scene has no further dialogue or choices.'
          : 'The exported project does not currently point to a playable opening scene.'
      );
      actions.hidden = true;
    }

    function renderChoices(choiceViewModels) {
      clearChoices();

      if (!choiceViewModels.length) {
        return;
      }

      choiceViewModels.forEach(({ choice, isEnabled, unavailableHint }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'choice secondary';
        button.disabled = !isEnabled;
        button.textContent = choice.text || 'Continue';
        button.addEventListener('click', () => {
          runtimeState = advanceRuntimeForChoice(choice, project, runtimeState);
          currentSceneId = runtimeState.currentSceneId;
          currentPageIndex = runtimeState.currentPageIndex;
          render();
        });
        choices.append(button);

        if (unavailableHint) {
          const hint = document.createElement('p');
          hint.className = 'hint';
          hint.textContent = unavailableHint;
          choices.append(hint);
        }
      });
    }

    function renderEndNotice() {
      clearChoices();
      const end = document.createElement('div');
      const endTitle = document.createElement('p');
      const endText = document.createElement('p');

      end.className = 'end';
      endTitle.className = 'end-title';
      endTitle.textContent = 'The End';
      endText.className = 'end-text';
      endText.textContent = 'This story has reached its final scene.';
      end.append(endTitle, endText);
      choices.append(end);
    }

    function renderNotice(titleText, bodyText) {
      clearChoices();
      const notice = document.createElement('div');
      const noticeTitle = document.createElement('p');
      const noticeText = document.createElement('p');

      notice.className = 'notice';
      noticeTitle.className = 'notice-title';
      noticeTitle.textContent = titleText;
      noticeText.className = 'notice-text';
      noticeText.textContent = bodyText;
      notice.append(noticeTitle, noticeText);
      choices.append(notice);
    }

    function render() {
      const scene = findScene(runtimeState.currentSceneId);
      title.textContent = project.name || 'Narrium Story';

      if (!scene) {
        setBackground(null);
        renderEndState(null);
        return;
      }

      setBackground(scene);
      const pages = scene.dialoguePages || [];
      const page = pages[runtimeState.currentPageIndex] || null;
      const hasNextPage = runtimeState.currentPageIndex < pages.length - 1;
      const visibleChoices = page && !hasNextPage ? scene.choices : [];
      const choiceViewModels = createChoiceViewModels(visibleChoices, project, runtimeState);
      const isEndOfStory = Boolean(page && !hasNextPage && visibleChoices.length === 0);

      if (page) {
        speaker.textContent = resolveSpeakerName(page.speakerId);
        text.textContent = page.text || '';
        if (isEndOfStory) {
          renderEndNotice();
        } else {
          renderChoices(choiceViewModels);
        }
        actions.hidden = !hasNextPage;
        nextButton.textContent = 'Next';
        return;
      }

      speaker.textContent = 'Dialogue page not found';
      text.textContent = 'No dialogue page exists at the current runtime page index.';
      renderNotice(
        'Missing dialogue page',
        'The current scene does not contain a dialogue page for this point in the story.'
      );
      actions.hidden = true;
    }

    nextButton.addEventListener('click', () => {
      const scene = findScene(runtimeState.currentSceneId);
      const pages = scene?.dialoguePages || [];

      if (runtimeState.currentPageIndex < pages.length - 1) {
        runtimeState = {
          ...runtimeState,
          currentPageIndex: runtimeState.currentPageIndex + 1
        };
        currentPageIndex = runtimeState.currentPageIndex;
        render();
      }
    });

    restartButton.addEventListener('click', () => {
      runtimeState = createInitialRuntimeState(project);
      currentSceneId = runtimeState.currentSceneId;
      currentPageIndex = runtimeState.currentPageIndex;
      render();
    });

    render();
  </script>
</body>
</html>
`;
}

export function exportProjectAsStandaloneHtml(project: Project) {
  const html = createStandaloneHtml(project);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getStandaloneHtmlFilename(project.name);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
