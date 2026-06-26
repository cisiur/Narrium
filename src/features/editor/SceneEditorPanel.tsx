import { useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { Choice, DialoguePage, Scene, SceneBackground } from '../../types';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
}

function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="border-t border-gray-800">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-300 hover:bg-gray-800"
      >
        <span>{title}</span>
        <span className="text-gray-500">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen ? <div className="space-y-3 px-4 pb-4">{children}</div> : null}
    </section>
  );
}

interface SceneNameEditorProps {
  scene: Scene;
}

function SceneNameEditor({ scene }: SceneNameEditorProps) {
  const updateSceneName = useCanvasStore((state) => state.updateSceneName);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(scene.name);

  useEffect(() => {
    setDraftName(scene.name);
    setIsEditing(false);
  }, [scene.id, scene.name]);

  const saveName = () => {
    const nextName = draftName.trim() || 'Untitled Scene';
    updateSceneName(scene.id, nextName);
    setDraftName(nextName);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        onBlur={saveName}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            saveName();
          }
        }}
        autoFocus
        className="min-w-0 flex-1 rounded bg-gray-800 px-2 py-1 text-lg font-semibold text-gray-100 outline-none ring-1 ring-blue-500"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left text-lg font-semibold text-gray-100 hover:bg-gray-800"
      title={scene.name}
    >
      {scene.name}
    </button>
  );
}

interface BackgroundEditorProps {
  scene: Scene;
  scenes: Scene[];
}

function BackgroundEditor({ scene, scenes }: BackgroundEditorProps) {
  const updateSceneBackground = useCanvasStore((state) => state.updateSceneBackground);
  const availableReferenceScenes = scenes.filter((candidate) => candidate.id !== scene.id);
  const referencedScene =
    availableReferenceScenes.find((candidate) => candidate.id === scene.background.sourceSceneId) ?? null;

  const updateBackground = (background: SceneBackground) => {
    updateSceneBackground(scene.id, background);
  };

  const selectMode = (mode: SceneBackground['mode']) => {
    if (mode === 'asset') {
      return;
    }

    if (mode === 'none') {
      updateBackground({
        mode: 'none',
        assetId: null,
        sourceSceneId: null,
        url: '',
      });
      return;
    }

    if (mode === 'url') {
      updateBackground({
        mode: 'url',
        assetId: null,
        sourceSceneId: null,
        url: scene.background.mode === 'url' ? scene.background.url : '',
      });
      return;
    }

    if (mode === 'upload') {
      updateBackground({
        mode: 'upload',
        assetId: null,
        sourceSceneId: null,
        url: scene.background.mode === 'upload' ? scene.background.url : '',
      });
      return;
    }

    const sourceSceneId =
      scene.background.mode === 'scene_reference' && scene.background.sourceSceneId
        ? scene.background.sourceSceneId
        : availableReferenceScenes[0]?.id ?? null;

    updateBackground({
      mode: 'scene_reference',
      assetId: null,
      sourceSceneId,
      url: '',
    });
  };

  const updateUrl = (url: string) => {
    updateBackground({
      mode: 'url',
      assetId: null,
      sourceSceneId: null,
      url,
    });
  };

  const updateSceneReference = (sourceSceneId: string) => {
    updateBackground({
      mode: 'scene_reference',
      assetId: null,
      sourceSceneId: sourceSceneId || null,
      url: '',
    });
  };

  const handleUpload = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      updateBackground({
        mode: 'upload',
        assetId: null,
        sourceSceneId: null,
        url: reader.result,
      });
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-semibold text-gray-300">Background Source</div>
        <div className="space-y-2">
          {[
            { label: 'None', mode: 'none' },
            { label: 'URL', mode: 'url' },
            { label: 'Upload', mode: 'upload' },
            { label: 'Scene Reference', mode: 'scene_reference' },
          ].map((option) => (
            <label key={option.mode} className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="radio"
                name={`background-source-${scene.id}`}
                checked={scene.background.mode === option.mode}
                onChange={() => selectMode(option.mode as SceneBackground['mode'])}
                className="h-3.5 w-3.5 accent-blue-500"
              />
              {option.label}
            </label>
          ))}

          <label className="flex items-start gap-2 text-sm text-gray-500">
            <input
              type="radio"
              name={`background-source-${scene.id}`}
              checked={scene.background.mode === 'asset'}
              disabled
              className="mt-0.5 h-3.5 w-3.5"
            />
            <span>
              Asset Library
              <span className="block text-xs text-gray-600">Available in E2-06</span>
            </span>
          </label>
        </div>
      </div>

      {scene.background.mode === 'url' ? (
        <label className="block text-xs font-semibold text-gray-300">
          External Image URL
          <input
            type="text"
            value={scene.background.url}
            onChange={(event) => updateUrl(event.target.value)}
            className="mt-2 w-full rounded bg-gray-950 px-2 py-2 text-sm font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
            placeholder="https://example.com/background.jpg"
          />
        </label>
      ) : null}

      {scene.background.mode === 'upload' ? (
        <label className="block text-xs font-semibold text-gray-300">
          Upload Image
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleUpload(event.target.files?.[0])}
            className="mt-2 block w-full text-xs text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-gray-700 file:px-2 file:py-1 file:text-xs file:font-medium file:text-gray-100 hover:file:bg-gray-600"
          />
        </label>
      ) : null}

      {scene.background.mode === 'scene_reference' ? (
        <label className="block text-xs font-semibold text-gray-300">
          Source Scene
          <select
            value={scene.background.sourceSceneId ?? ''}
            onChange={(event) => updateSceneReference(event.target.value)}
            disabled={availableReferenceScenes.length === 0}
            className="mt-2 w-full rounded bg-gray-950 px-2 py-2 text-sm font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {availableReferenceScenes.length === 0 ? (
              <option value="">No other scenes available</option>
            ) : (
              availableReferenceScenes.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))
            )}
          </select>
        </label>
      ) : null}

      <div className="overflow-hidden rounded-md border border-gray-700 bg-gray-950">
        {scene.background.mode === 'none' ? (
          <div className="flex h-28 items-center justify-center px-3 text-center text-sm text-gray-500">
            No background selected
          </div>
        ) : null}

        {scene.background.mode === 'url' ? (
          scene.background.url ? (
            <img
              src={scene.background.url}
              alt="Background preview"
              className="h-32 w-full object-cover"
            />
          ) : (
            <div className="flex h-28 items-center justify-center px-3 text-center text-sm text-gray-500">
              Enter an external image URL
            </div>
          )
        ) : null}

        {scene.background.mode === 'upload' ? (
          scene.background.url ? (
            <img
              src={scene.background.url}
              alt="Uploaded background preview"
              className="h-32 w-full object-cover"
            />
          ) : (
            <div className="flex h-28 items-center justify-center px-3 text-center text-sm text-gray-500">
              Choose an image file
            </div>
          )
        ) : null}

        {scene.background.mode === 'scene_reference' ? (
          <div className="flex h-28 items-center justify-center px-3 text-center text-sm text-gray-400">
            {referencedScene ? `Uses background from: ${referencedScene.name}` : 'Choose a scene reference'}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface DialoguePageItemProps {
  page: DialoguePage;
  scene: Scene;
  isOnlyPage: boolean;
}

function DialoguePageItem({ page, scene, isOnlyPage }: DialoguePageItemProps) {
  const updateDialoguePage = useCanvasStore((state) => state.updateDialoguePage);
  const deleteDialoguePage = useCanvasStore((state) => state.deleteDialoguePage);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="rounded-md border border-gray-700 bg-gray-800/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="text-xs font-semibold text-gray-200">{page.speakerId ?? 'Narrator'}</div>
          {!isEditing ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">
              {page.text || 'Empty dialogue page'}
            </p>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => deleteDialoguePage(scene.id, page.id)}
          disabled={isOnlyPage}
          className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Delete dialogue page"
        >
          ×
        </button>
      </div>
      {isEditing ? (
        <textarea
          value={page.text}
          onChange={(event) => updateDialoguePage(scene.id, page.id, event.target.value)}
          onBlur={() => setIsEditing(false)}
          autoFocus
          rows={4}
          className="mt-3 w-full resize-none rounded bg-gray-950 px-2 py-2 text-sm text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
          placeholder="Dialogue text"
        />
      ) : null}
    </div>
  );
}

interface ChoiceItemProps {
  choice: Choice;
  scene: Scene;
  targetSceneName: string;
}

function ChoiceItem({ choice, scene, targetSceneName }: ChoiceItemProps) {
  const updateChoiceText = useCanvasStore((state) => state.updateChoiceText);
  const deleteChoice = useCanvasStore((state) => state.deleteChoice);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="rounded-md border border-gray-700 bg-gray-800/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="min-w-0 flex-1 text-left"
        >
          {!isEditing ? (
            <div className="text-sm font-medium text-gray-100">{choice.text || 'Untitled choice'}</div>
          ) : null}
          <div className="mt-1 text-xs text-gray-400">{targetSceneName}</div>
        </button>
        <button
          type="button"
          onClick={() => deleteChoice(scene.id, choice.id)}
          className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-100"
          aria-label="Delete choice"
        >
          ×
        </button>
      </div>
      {isEditing ? (
        <input
          value={choice.text}
          onChange={(event) => updateChoiceText(scene.id, choice.id, event.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              setIsEditing(false);
            }
          }}
          autoFocus
          className="mt-3 w-full rounded bg-gray-950 px-2 py-2 text-sm text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
          placeholder="Choice text"
        />
      ) : null}
    </div>
  );
}

export function SceneEditorPanel() {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const selectedSceneId = useCanvasStore((state) => state.selectedSceneId);
  const selectScene = useCanvasStore((state) => state.selectScene);
  const addDialoguePage = useCanvasStore((state) => state.addDialoguePage);
  const addChoice = useCanvasStore((state) => state.addChoice);
  const scene = activeProject?.scenes.find((item) => item.id === selectedSceneId) ?? null;
  const isOpen = Boolean(scene);

  return (
    <aside
      className={[
        'h-[calc(100vh-3.5rem)] w-[360px] border-l border-gray-800 bg-gray-900 text-gray-100 shadow-2xl transition-transform duration-200',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      {scene ? (
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
            <SceneNameEditor scene={scene} />
            <button
              type="button"
              onClick={() => selectScene(null)}
              className="rounded bg-gray-800 px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100"
              aria-label="Close scene editor"
            >
              ×
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <CollapsibleSection title="Background">
              <BackgroundEditor scene={scene} scenes={activeProject?.scenes ?? []} />
            </CollapsibleSection>

            <CollapsibleSection title="Dialogue Pages">
              <div className="space-y-2">
                {scene.dialoguePages.map((page) => (
                  <DialoguePageItem
                    key={page.id}
                    page={page}
                    scene={scene}
                    isOnlyPage={scene.dialoguePages.length === 1}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => addDialoguePage(scene.id)}
                className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
              >
                + Add Page
              </button>
            </CollapsibleSection>

            <CollapsibleSection title="Choices">
              <div className="space-y-2">
                {scene.choices.map((choice) => {
                  const targetScene = activeProject?.scenes.find(
                    (candidate) => candidate.id === choice.targetSceneId,
                  );

                  return (
                    <ChoiceItem
                      key={choice.id}
                      choice={choice}
                      scene={scene}
                      targetSceneName={targetScene ? `→ ${targetScene.name}` : '→ not connected'}
                    />
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => addChoice(scene.id)}
                className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
              >
                + Add Choice
              </button>
            </CollapsibleSection>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
