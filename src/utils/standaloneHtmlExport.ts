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
  const embeddedProject = serializeProjectForScript(project);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #080b12;
      color: #f7f0df;
      font-family: Arial, sans-serif;
    }
    .stage {
      display: flex;
      min-height: 100vh;
      flex-direction: column;
      background-position: center;
      background-size: cover;
    }
    .stage::before {
      content: "";
      position: fixed;
      inset: 0;
      background: linear-gradient(180deg, rgba(8, 11, 18, 0.35), rgba(8, 11, 18, 0.9));
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
      padding: 1rem 1.25rem;
    }
    h1 {
      margin: 0;
      font-size: 1rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    button {
      border: 0;
      border-radius: 0.4rem;
      background: #2563eb;
      color: white;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      padding: 0.65rem 0.9rem;
    }
    button.secondary {
      background: rgba(255, 255, 255, 0.14);
    }
    button:hover {
      filter: brightness(1.1);
    }
    main {
      display: flex;
      flex: 1;
      align-items: flex-end;
      justify-content: center;
      padding: 1.25rem;
    }
    .panel {
      width: min(46rem, 100%);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 0.5rem;
      background: rgba(8, 11, 18, 0.86);
      box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.4);
      padding: 1.25rem;
    }
    .speaker {
      margin: 0 0 0.5rem;
      color: #93c5fd;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .text {
      margin: 0;
      font-size: 1.1rem;
      line-height: 1.7;
      white-space: pre-wrap;
    }
    .actions, .choices {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }
    .choices {
      flex-direction: column;
    }
    .choice {
      width: 100%;
      text-align: left;
    }
    .muted {
      color: rgba(247, 240, 223, 0.72);
    }
  </style>
</head>
<body>
  <div id="app" class="stage">
    <header>
      <h1></h1>
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
      actions.hidden = true;
    }

    function renderChoices(scene) {
      clearChoices();
      actions.hidden = true;

      if (!scene.choices.length) {
        renderEndState(scene);
        return;
      }

      scene.choices.forEach((choice) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'choice secondary';
        button.textContent = choice.text || 'Continue';
        button.addEventListener('click', () => {
          currentSceneId = choice.targetSceneId;
          currentPageIndex = 0;
          render();
        });
        choices.append(button);
      });
    }

    function render() {
      const scene = findScene(currentSceneId);
      title.textContent = project.name || 'Narrium Story';

      if (!scene) {
        setBackground(null);
        renderEndState(null);
        return;
      }

      setBackground(scene);
      const pages = scene.dialoguePages || [];
      const page = pages[currentPageIndex] || null;

      if (page) {
        speaker.textContent = resolveSpeakerName(page.speakerId);
        text.textContent = page.text || '';
        clearChoices();
        actions.hidden = false;
        nextButton.textContent = currentPageIndex < pages.length - 1 ? 'Next' : 'Show Choices';
        return;
      }

      speaker.textContent = scene.name;
      text.textContent = 'Choose what happens next.';
      renderChoices(scene);
    }

    nextButton.addEventListener('click', () => {
      const scene = findScene(currentSceneId);
      const pages = scene?.dialoguePages || [];

      if (currentPageIndex < pages.length - 1) {
        currentPageIndex += 1;
        render();
        return;
      }

      currentPageIndex = pages.length;
      render();
    });

    restartButton.addEventListener('click', () => {
      currentSceneId = project.startSceneId || (project.scenes[0] && project.scenes[0].id) || null;
      currentPageIndex = 0;
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
