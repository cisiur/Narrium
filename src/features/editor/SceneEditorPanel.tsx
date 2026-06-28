import { useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { AssetLibraryItem, Choice, ConditionGroup, DialoguePage, Scene, SceneBackground } from '../../types';

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
  assets: AssetLibraryItem[];
}

function BackgroundEditor({ scene, scenes, assets }: BackgroundEditorProps) {
  const updateSceneBackground = useCanvasStore((state) => state.updateSceneBackground);
  const addBackgroundAsset = useCanvasStore((state) => state.addBackgroundAsset);
  const deleteBackgroundAsset = useCanvasStore((state) => state.deleteBackgroundAsset);
  const availableReferenceScenes = scenes.filter((candidate) => candidate.id !== scene.id);
  const referencedScene =
    availableReferenceScenes.find((candidate) => candidate.id === scene.background.sourceSceneId) ?? null;
  const backgroundAssets = assets.filter((asset) => asset.kind === 'background');
  const selectedAsset =
    backgroundAssets.find((asset) => asset.id === scene.background.assetId) ?? null;
  const [urlAssetName, setUrlAssetName] = useState('');
  const [urlAssetUrl, setUrlAssetUrl] = useState('');
  const [uploadAssetName, setUploadAssetName] = useState('');

  const updateBackground = (background: SceneBackground) => {
    updateSceneBackground(scene.id, background);
  };

  const selectMode = (mode: SceneBackground['mode']) => {
    if (mode === 'none') {
      updateBackground({
        mode: 'none',
        assetId: null,
        sourceSceneId: null,
        url: '',
      });
      return;
    }

    if (mode === 'asset') {
      const assetId =
        scene.background.mode === 'asset' &&
        scene.background.assetId &&
        backgroundAssets.some((asset) => asset.id === scene.background.assetId)
          ? scene.background.assetId
          : backgroundAssets[0]?.id ?? null;

      updateBackground({
        mode: 'asset',
        assetId,
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

  const useAsset = (assetId: string) => {
    updateBackground({
      mode: 'asset',
      assetId,
      sourceSceneId: null,
      url: '',
    });
  };

  const addUrlAsset = () => {
    addBackgroundAsset({
      name: urlAssetName || 'Untitled Background',
      sourceType: 'url',
      url: urlAssetUrl,
    });
    setUrlAssetName('');
    setUrlAssetUrl('');
  };

  const addUploadedAsset = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      addBackgroundAsset({
        name: uploadAssetName || file.name || 'Uploaded Background',
        sourceType: 'upload',
        url: reader.result,
      });
      setUploadAssetName('');
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
            { label: 'Asset Library', mode: 'asset' },
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

      <div className="rounded-md border border-gray-700 bg-gray-800/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Asset Library</p>

        <div className="mt-3 space-y-3">
          <div className="space-y-2 rounded-md border border-gray-700 bg-gray-900 p-3">
            <div className="text-xs font-semibold text-gray-300">Add asset by URL</div>
            <input
              type="text"
              value={urlAssetName}
              onChange={(event) => setUrlAssetName(event.target.value)}
              className="w-full rounded bg-gray-950 px-2 py-1.5 text-xs text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
              placeholder="Asset name"
            />
            <input
              type="text"
              value={urlAssetUrl}
              onChange={(event) => setUrlAssetUrl(event.target.value)}
              className="w-full rounded bg-gray-950 px-2 py-1.5 text-xs text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
              placeholder="Image URL"
            />
            <button
              type="button"
              onClick={addUrlAsset}
              className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
            >
              Add URL Asset
            </button>
          </div>

          <div className="space-y-2 rounded-md border border-gray-700 bg-gray-900 p-3">
            <div className="text-xs font-semibold text-gray-300">Add asset by upload</div>
            <input
              type="text"
              value={uploadAssetName}
              onChange={(event) => setUploadAssetName(event.target.value)}
              className="w-full rounded bg-gray-950 px-2 py-1.5 text-xs text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
              placeholder="Asset name"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                addUploadedAsset(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
              className="block w-full text-xs text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-gray-700 file:px-2 file:py-1 file:text-xs file:font-medium file:text-gray-100 hover:file:bg-gray-600"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold text-gray-300">Project background assets</div>
          {backgroundAssets.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-700 px-3 py-3 text-xs text-gray-500">
              No assets yet. Add a URL or uploaded image to use it as a scene background.
            </p>
          ) : (
            backgroundAssets.map((asset) => (
              <div
                key={asset.id}
                className="grid grid-cols-[3rem_1fr_auto] items-center gap-2 rounded-md border border-gray-700 bg-gray-900 p-2"
              >
                <img src={asset.url} alt="" className="h-10 w-12 rounded bg-gray-950 object-cover" />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-gray-100">{asset.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {asset.sourceType === 'url' ? 'URL' : 'Upload'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => useAsset(asset.id)}
                    className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-100 hover:bg-gray-600"
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBackgroundAsset(asset.id)}
                    className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-100"
                    aria-label={`Delete ${asset.name}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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

        {scene.background.mode === 'asset' ? (
          selectedAsset ? (
            <img
              src={selectedAsset.url}
              alt="Asset background preview"
              className="h-32 w-full object-cover"
            />
          ) : (
            <div className="flex h-28 items-center justify-center px-3 text-center text-sm text-gray-500">
              {scene.background.assetId ? 'Missing asset' : 'Choose an asset from the library'}
            </div>
          )
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
  scenes: Scene[];
  isSelected: boolean;
  targetSceneName: string;
}

function createConditionGroup(): ConditionGroup {
  return {
    id: crypto.randomUUID(),
    conditions: [],
  };
}

interface ConditionGroupsEditorProps {
  choice: Choice;
  scene: Scene;
}

function ConditionGroupsEditor({ choice, scene }: ConditionGroupsEditorProps) {
  const updateActiveProject = useWorkspaceStore((state) => state.updateActiveProject);
  const conditionGroups = choice.conditionGroups ?? [];

  const updateChoiceConditionGroups = (updater: (groups: ConditionGroup[]) => ConditionGroup[]) => {
    updateActiveProject((project) => ({
      ...project,
      scenes: project.scenes.map((projectScene) =>
        projectScene.id === scene.id
          ? {
              ...projectScene,
              choices: projectScene.choices.map((projectChoice) =>
                projectChoice.id === choice.id
                  ? {
                      ...projectChoice,
                      conditionGroups: updater(projectChoice.conditionGroups ?? []),
                    }
                  : projectChoice,
              ),
            }
          : projectScene,
      ),
    }));
  };

  const addConditionGroup = () => {
    updateChoiceConditionGroups((groups) => [...groups, createConditionGroup()]);
  };

  const deleteConditionGroup = (conditionGroupId: string) => {
    updateChoiceConditionGroups((groups) => groups.filter((group) => group.id !== conditionGroupId));
  };

  return (
    <section className="mt-4 border-t border-gray-700 pt-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Conditions</div>

      {conditionGroups.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-700 px-3 py-3 text-xs text-gray-500">
          No condition groups
        </p>
      ) : (
        <div className="space-y-2">
          {conditionGroups.map((group, index) => (
            <div key={group.id} className="rounded-md border border-gray-700 bg-gray-900 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-gray-200">Group {index + 1}</div>
                <button
                  type="button"
                  onClick={() => deleteConditionGroup(group.id)}
                  className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700"
                >
                  Delete Group
                </button>
              </div>
              {group.conditions.length === 0 ? (
                <p className="mt-3 text-xs text-gray-500">No conditions</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addConditionGroup}
        className="mt-3 rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
      >
        + Add OR Group
      </button>
    </section>
  );
}

function ChoiceItem({ choice, scene, scenes, isSelected, targetSceneName }: ChoiceItemProps) {
  const updateChoiceText = useCanvasStore((state) => state.updateChoiceText);
  const updateChoiceTarget = useCanvasStore((state) => state.updateChoiceTarget);
  const deleteChoice = useCanvasStore((state) => state.deleteChoice);
  const [isEditing, setIsEditing] = useState(false);
  const choiceRef = useRef<HTMLDivElement | null>(null);
  const targetScenes = scenes.filter((candidate) => candidate.id !== scene.id);

  useEffect(() => {
    if (!isSelected) {
      return;
    }

    choiceRef.current?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
  }, [isSelected]);

  return (
    <div
      ref={choiceRef}
      className={[
        'rounded-md border p-3 transition-colors',
        isSelected ? 'border-blue-500 bg-gray-700/80' : 'border-gray-700 bg-gray-800/70',
      ].join(' ')}
    >
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
      <label className="mt-3 block text-xs font-semibold text-gray-300">
        Target Scene
        <select
          value={choice.targetSceneId ?? ''}
          onChange={(event) => updateChoiceTarget(scene.id, choice.id, event.target.value || null)}
          className="mt-1 w-full rounded bg-gray-950 px-2 py-2 text-sm font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
        >
          <option value="">None</option>
          {targetScenes.map((targetScene) => (
            <option key={targetScene.id} value={targetScene.id}>
              {targetScene.name}
            </option>
          ))}
        </select>
      </label>
      <ConditionGroupsEditor choice={choice} scene={scene} />
    </div>
  );
}

export function SceneEditorPanel() {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const selectedSceneId = useCanvasStore((state) => state.selectedSceneId);
  const selectedChoiceId = useCanvasStore((state) => state.selectedChoiceId);
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
              <BackgroundEditor
                scene={scene}
                scenes={activeProject?.scenes ?? []}
                assets={activeProject?.assetLibrary ?? []}
              />
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
                      scenes={activeProject?.scenes ?? []}
                      isSelected={selectedChoiceId === choice.id}
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
