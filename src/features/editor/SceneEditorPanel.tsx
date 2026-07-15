import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfirmationDialog } from '../../components';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import {
  BackgroundAssetCleanupService,
  type BackgroundAssetCleanupDeletionResult,
  type BackgroundAssetCleanupReport,
} from '../../services/background-assets';
import { processBrowserBackgroundUpload } from '../../services/image-processing';
import { getPlatformService } from '../../services/platform';
import { ConditionGroupsEditor } from '../story-logic/ConditionGroupsEditor';
import { EffectsEditor } from '../story-logic/EffectsEditor';
import { VALIDATION_CODES, validateProject } from '../validation/projectValidation';
import { useAssetDisplaySource } from '../assets/assetDisplay';
import {
  ProjectValidationPanel,
  navigateToValidationIssue,
} from '../validation/ProjectValidationPanel';
import type {
  AssetLibraryItem,
  Character,
  Choice,
  DialoguePage,
  Scene,
  SceneBackground,
} from '../../types';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
}

function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

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

interface BackgroundAssetRowProps {
  asset: AssetLibraryItem;
  projectFilePath: string | null;
  onUse: (assetId: string) => void;
  onDelete: (assetId: string) => void;
}

function BackgroundAssetRow({ asset, projectFilePath, onUse, onDelete }: BackgroundAssetRowProps) {
  const assetSource = useAssetDisplaySource(asset, projectFilePath);
  const storageLabel =
    asset.storageType === 'local'
      ? 'Local file'
      : asset.storageType === 'remote'
        ? 'Remote URL'
        : 'Embedded';

  return (
    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-2 rounded-md border border-gray-700 bg-gray-900 p-2">
      {assetSource ? (
        <img src={assetSource} alt="" className="h-10 w-12 rounded bg-gray-950 object-cover" />
      ) : (
        <div className="flex h-10 w-12 items-center justify-center rounded bg-gray-950 text-[10px] text-gray-500">
          Missing
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-gray-100">{asset.name}</div>
        <div className="truncate text-[11px] text-gray-500">{storageLabel}</div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onUse(asset.id)}
          className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-100 hover:bg-gray-600"
        >
          Use
        </button>
        <button
          type="button"
          onClick={() => onDelete(asset.id)}
          className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-100"
          aria-label={`Delete ${asset.name}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function BackgroundAssetThumbnail({
  asset,
  projectFilePath,
}: {
  asset: AssetLibraryItem;
  projectFilePath: string | null;
}) {
  const assetSource = useAssetDisplaySource(asset, projectFilePath);

  return assetSource ? (
    <img src={assetSource} alt="" className="h-10 w-12 rounded bg-gray-950 object-cover" />
  ) : (
    <div className="flex h-10 w-12 items-center justify-center rounded bg-gray-950 text-[10px] text-gray-500">
      Missing
    </div>
  );
}

function sumFileSizes(files: Array<{ fileSize: number }>): number {
  return files.reduce((total, file) => total + (Number.isFinite(file.fileSize) ? file.fileSize : 0), 0);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function BackgroundEditor({ scene, scenes, assets }: BackgroundEditorProps) {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const activeProjectFilePath = useWorkspaceStore((state) => state.activeProjectFilePath);
  const updateSceneBackground = useCanvasStore((state) => state.updateSceneBackground);
  const addBackgroundAsset = useCanvasStore((state) => state.addBackgroundAsset);
  const deleteBackgroundAsset = useCanvasStore((state) => state.deleteBackgroundAsset);
  const { confirm, confirmationDialog } = useConfirmationDialog();
  const cleanupService = useMemo(
    () => new BackgroundAssetCleanupService(getPlatformService()),
    [],
  );
  const availableReferenceScenes = scenes.filter((candidate) => candidate.id !== scene.id);
  const referencedScene =
    availableReferenceScenes.find((candidate) => candidate.id === scene.background.sourceSceneId) ?? null;
  const backgroundAssets = assets.filter((asset) => asset.kind === 'background');
  const selectedAsset =
    backgroundAssets.find((asset) => asset.id === scene.background.assetId) ?? null;
  const [urlAssetName, setUrlAssetName] = useState('');
  const [urlAssetUrl, setUrlAssetUrl] = useState('');
  const [uploadAssetName, setUploadAssetName] = useState('');
  const [assetError, setAssetError] = useState<string | null>(null);
  const [cleanupReport, setCleanupReport] = useState<BackgroundAssetCleanupReport | null>(null);
  const [cleanupResult, setCleanupResult] = useState<BackgroundAssetCleanupDeletionResult | null>(null);
  const [isCleanupScanning, setIsCleanupScanning] = useState(false);
  const [isCleanupDeleting, setIsCleanupDeleting] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const browserUploadInputRef = useRef<HTMLInputElement | null>(null);
  const selectedAssetSource = useAssetDisplaySource(selectedAsset, activeProjectFilePath);
  const canCleanUpLocalBackgroundFiles = cleanupService.canCleanUpLocalBackgroundFiles(activeProjectFilePath);

  useEffect(() => {
    setCleanupReport(null);
    setCleanupResult(null);
    setCleanupError(null);
  }, [activeProject?.id, activeProjectFilePath]);

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

  const updateSceneReference = (sourceSceneId: string) => {
    updateBackground({
      mode: 'scene_reference',
      assetId: null,
      sourceSceneId: sourceSceneId || null,
      url: '',
    });
  };

  const importBrowserUpload = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      const upload = await processBrowserBackgroundUpload(file);

      const assetId = addBackgroundAsset({
        name: uploadAssetName || file.name || 'Uploaded Background',
        storageType: 'embedded',
        source: upload.dataUrl,
        metadata: {
          mimeType: upload.mimeType,
          fileSize: upload.fileSize,
        },
      });

      if (assetId) {
        useAsset(assetId);
        setUploadAssetName('');
        setAssetError(null);
      }
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : 'Could not import background image.');
    }
  };

  const importDesktopUpload = async () => {
    const platformService = getPlatformService();

    if (!activeProjectFilePath) {
      setAssetError('Save the project as a .narrium file before importing local assets.');
      return;
    }

    try {
      const importedFile = await platformService.importBackgroundAssetFile(activeProjectFilePath);

      if (!importedFile) {
        return;
      }

      const assetId = addBackgroundAsset({
        name: uploadAssetName || importedFile.name || 'Uploaded Background',
        storageType: 'local',
        source: importedFile.relativePath,
        metadata: {
          mimeType: importedFile.mimeType,
          fileSize: importedFile.fileSize,
        },
      });

      if (assetId) {
        useAsset(assetId);
        setUploadAssetName('');
        setAssetError(null);
      }
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : 'Could not import background image.');
    }
  };

  const importUpload = () => {
    if (getPlatformService().isDesktop()) {
      void importDesktopUpload();
      return;
    }

    browserUploadInputRef.current?.click();
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
    const source = urlAssetUrl.trim();

    if (!source) {
      return;
    }

    const assetId = addBackgroundAsset({
      name: urlAssetName || source,
      storageType: 'remote',
      source,
    });
    if (assetId) {
      useAsset(assetId);
    }
    setUrlAssetName('');
    setUrlAssetUrl('');
    setAssetError(null);
  };

  const scanUnusedLocalBackgroundFiles = async () => {
    if (!activeProject) {
      setCleanupReport(null);
      return;
    }

    setIsCleanupScanning(true);
    setCleanupError(null);
    setCleanupResult(null);

    try {
      setCleanupReport(await cleanupService.scanLocalBackgroundFiles(activeProject, activeProjectFilePath));
    } catch (error) {
      setCleanupReport(null);
      setCleanupError(error instanceof Error ? error.message : 'Could not scan local background files.');
    } finally {
      setIsCleanupScanning(false);
    }
  };

  const deleteUnusedLocalBackgroundFiles = async () => {
    if (!cleanupReport || cleanupReport.orphanedFiles.length === 0) {
      return;
    }

    if (cleanupReport.projectId !== activeProject?.id || cleanupReport.projectFilePath !== activeProjectFilePath) {
      setCleanupReport(null);
      setCleanupResult(null);
      setCleanupError('The active project changed after the scan. Run cleanup scan again before deleting files.');
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Unused Background Files?',
      message: `Delete ${cleanupReport.orphanedFiles.length} unused local background file(s)? This only removes physical files that are not referenced by the Asset Library.`,
      confirmLabel: 'Delete Files',
      cancelLabel: 'Cancel',
    });

    if (!confirmed) {
      return;
    }

    const latestStateBeforeDelete = useWorkspaceStore.getState();

    if (
      cleanupReport.projectId !== latestStateBeforeDelete.activeProject?.id ||
      cleanupReport.projectFilePath !== latestStateBeforeDelete.activeProjectFilePath
    ) {
      setCleanupReport(null);
      setCleanupResult(null);
      setCleanupError('The active project changed after the scan. Run cleanup scan again before deleting files.');
      return;
    }

    setIsCleanupDeleting(true);
    setCleanupError(null);

    try {
      const deletionResult = await cleanupService.deleteOrphanedLocalBackgroundFiles({
        projectFilePath: cleanupReport.projectFilePath,
        orphanCandidates: cleanupReport.orphanedFiles,
        getLatestProject: () => useWorkspaceStore.getState().activeProject,
      });
      const latestStateAfterDelete = useWorkspaceStore.getState();

      setCleanupResult(deletionResult);

      if (
        latestStateAfterDelete.activeProject &&
        latestStateAfterDelete.activeProject.id === cleanupReport.projectId &&
        latestStateAfterDelete.activeProjectFilePath === cleanupReport.projectFilePath
      ) {
        setCleanupReport(
          await cleanupService.scanLocalBackgroundFiles(
            latestStateAfterDelete.activeProject,
            cleanupReport.projectFilePath,
          ),
        );
      } else {
        setCleanupReport(null);
      }
    } catch (error) {
      setCleanupResult(null);
      setCleanupError(error instanceof Error ? error.message : 'Could not delete unused local background files.');
    } finally {
      setIsCleanupDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-semibold text-gray-300">Background Source</div>
        <div className="space-y-2">
          {[
            { label: 'None', mode: 'none' },
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
              ref={browserUploadInputRef}
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                void importBrowserUpload(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={importUpload}
              className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
            >
              Import Image
            </button>
          </div>
        </div>

        {assetError ? (
          <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {assetError}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-gray-300">Project background assets</div>
            {canCleanUpLocalBackgroundFiles ? (
              <button
                type="button"
                onClick={() => void scanUnusedLocalBackgroundFiles()}
                disabled={isCleanupScanning || isCleanupDeleting}
                className="rounded bg-gray-700 px-2 py-1 text-[11px] font-medium text-gray-100 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCleanupScanning ? 'Scanning...' : 'Clean Up Unused Files'}
              </button>
            ) : null}
          </div>
          {backgroundAssets.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-700 px-3 py-3 text-xs text-gray-500">
              Add a background asset by upload or URL.
            </p>
          ) : (
            backgroundAssets.map((asset) => (
              <div
                key={asset.id}
                className="grid grid-cols-[3rem_1fr_auto] items-center gap-2 rounded-md border border-gray-700 bg-gray-900 p-2"
              >
                <BackgroundAssetThumbnail asset={asset} projectFilePath={activeProjectFilePath} />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-gray-100">{asset.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {asset.storageType === 'local'
                      ? 'Local file'
                      : asset.storageType === 'remote'
                        ? 'Remote URL'
                        : 'Embedded'}
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

        {cleanupError ? (
          <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {cleanupError}
          </p>
        ) : null}

        {cleanupReport ? (
          <div className="mt-3 space-y-2 rounded-md border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300">
            <div className="font-semibold text-gray-100">
              {cleanupReport.orphanedFiles.length === 0
                ? 'No unused local background files found.'
                : `${cleanupReport.orphanedFiles.length} unused local background file(s), ${formatBytes(
                    sumFileSizes(cleanupReport.orphanedFiles),
                  )}`}
            </div>
            {cleanupReport.orphanedFiles.length > 0 ? (
              <>
                <ul className="max-h-28 space-y-1 overflow-auto text-gray-400">
                  {cleanupReport.orphanedFiles.map((file) => (
                    <li key={file.relativePath} className="truncate" title={file.relativePath}>
                      {file.relativePath} ({formatBytes(file.fileSize)})
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void deleteUnusedLocalBackgroundFiles()}
                  disabled={isCleanupDeleting}
                  className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCleanupDeleting ? 'Deleting...' : 'Delete Unused Files'}
                </button>
              </>
            ) : null}
            {cleanupReport.missingReferencedFiles.length > 0 ? (
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-amber-100">
                <div className="font-semibold">Missing referenced local file(s)</div>
                <ul className="mt-1 space-y-1">
                  {cleanupReport.missingReferencedFiles.map((file) => (
                    <li key={file.relativePath} className="truncate" title={file.relativePath}>
                      {file.relativePath}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {cleanupResult ? (
          <div className="mt-3 rounded-md border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300">
            <div className="font-semibold text-gray-100">
              {cleanupResult.failed.length > 0
                ? 'Cleanup completed with failures.'
                : 'Cleanup complete.'}
            </div>
            <div className="mt-1">
              Deleted {cleanupResult.deleted.length} file(s), reclaimed {formatBytes(cleanupResult.reclaimedBytes)}.
            </div>
            {cleanupResult.skipped.length > 0 ? (
              <div className="mt-2 text-gray-400">
                Skipped: {cleanupResult.skipped.map((file) => file.relativePath).join(', ')}
              </div>
            ) : null}
            {cleanupResult.failed.length > 0 ? (
              <div className="mt-2 text-red-200">
                Failed: {cleanupResult.failed.map((file) => `${file.relativePath}: ${file.error}`).join('; ')}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {confirmationDialog}

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
          selectedAsset && selectedAssetSource ? (
            <img
              src={selectedAssetSource}
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
  pageIndex: number;
  pageCount: number;
  isOnlyPage: boolean;
  characters: Character[];
}

function DialoguePageItem({
  page,
  scene,
  pageIndex,
  pageCount,
  isOnlyPage,
  characters,
}: DialoguePageItemProps) {
  const updateDialoguePage = useCanvasStore((state) => state.updateDialoguePage);
  const updateDialoguePageSpeaker = useCanvasStore((state) => state.updateDialoguePageSpeaker);
  const moveDialoguePageUp = useCanvasStore((state) => state.moveDialoguePageUp);
  const moveDialoguePageDown = useCanvasStore((state) => state.moveDialoguePageDown);
  const deleteDialoguePage = useCanvasStore((state) => state.deleteDialoguePage);
  const [isEditing, setIsEditing] = useState(false);
  const isFirstPage = pageIndex === 0;
  const isLastPage = pageIndex === pageCount - 1;
  const selectedCharacter =
    page.speakerId !== null
      ? characters.find((character) => character.id === page.speakerId) ?? null
      : null;
  const speakerLabel =
    page.speakerId === null ? 'Narrator' : selectedCharacter?.name ?? 'Missing Character';
  const hasMissingSpeaker = page.speakerId !== null && !selectedCharacter;

  return (
    <div className="rounded-md border border-gray-700 bg-gray-800/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="text-xs font-semibold text-gray-200">
            {hasMissingSpeaker ? '⚠ Missing Character' : speakerLabel}
          </div>
          {!isEditing ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">
              {page.text || 'Empty dialogue page'}
            </p>
          ) : null}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => moveDialoguePageUp(scene.id, page.id)}
            disabled={isFirstPage}
            className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Move dialogue page up"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => moveDialoguePageDown(scene.id, page.id)}
            disabled={isLastPage}
            className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Move dialogue page down"
            title="Move down"
          >
            ↓
          </button>
        </div>
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
      <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Speaker
        <select
          value={page.speakerId ?? ''}
          onChange={(event) =>
            updateDialoguePageSpeaker(scene.id, page.id, event.target.value || null)
          }
          className="mt-1 w-full rounded bg-gray-950 px-2 py-1.5 text-xs font-normal text-gray-100 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
        >
          <option value="">Narrator</option>
          {hasMissingSpeaker ? <option value={page.speakerId ?? ''}>⚠ Missing Character</option> : null}
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
        </select>
      </label>
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
  hasChoiceDoesNothingWarning: boolean;
  onCopyChoice: (sceneId: string, choiceId: string) => void;
}

function ChoiceItem({
  choice,
  scene,
  scenes,
  isSelected,
  targetSceneName,
  hasChoiceDoesNothingWarning,
  onCopyChoice,
}: ChoiceItemProps) {
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onCopyChoice(scene.id, choice.id)}
            className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-100"
          >
            Copy
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
      {hasChoiceDoesNothingWarning ? (
        <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
          ⚠ This choice does nothing. Add a target scene or at least one effect.
        </p>
      ) : null}
      <ConditionGroupsEditor choice={choice} scene={scene} />
      <EffectsEditor choice={choice} scene={scene} />
    </div>
  );
}

export function SceneEditorPanel() {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const selectedSceneId = useCanvasStore((state) => state.selectedSceneId);
  const selectedChoiceId = useCanvasStore((state) => state.selectedChoiceId);
  const selectScene = useCanvasStore((state) => state.selectScene);
  const selectChoice = useCanvasStore((state) => state.selectChoice);
  const openEditor = useCanvasStore((state) => state.openEditor);
  const addDialoguePage = useCanvasStore((state) => state.addDialoguePage);
  const addChoice = useCanvasStore((state) => state.addChoice);
  const copyChoice = useCanvasStore((state) => state.copyChoice);
  const pasteChoice = useCanvasStore((state) => state.pasteChoice);
  const copiedChoiceProjectId = useCanvasStore((state) => state.copiedChoiceProjectId);
  const scene = activeProject?.scenes.find((item) => item.id === selectedSceneId) ?? null;
  const canPasteChoice = Boolean(activeProject && copiedChoiceProjectId === activeProject.id);
  const validationIssues = useMemo(
    () => (activeProject ? validateProject(activeProject) : []),
    [activeProject],
  );

  return (
    <aside className="h-[calc(100vh-3.5rem)] w-[360px] border-l border-gray-800 bg-gray-900 text-gray-100 shadow-2xl">
      <div className="flex h-full flex-col">
        {activeProject ? (
          <ProjectValidationPanel
            project={activeProject}
            onIssueClick={(issue) =>
              navigateToValidationIssue(issue, {
                openEditor,
                selectChoice,
              })
            }
          />
        ) : null}

        <div className="min-h-0 flex-1">
          {scene ? (
            <div className="flex h-full min-h-0 flex-col">
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
                    {scene.dialoguePages.map((page, pageIndex) => (
                      <DialoguePageItem
                        key={page.id}
                        page={page}
                        scene={scene}
                        pageIndex={pageIndex}
                        pageCount={scene.dialoguePages.length}
                        isOnlyPage={scene.dialoguePages.length === 1}
                        characters={activeProject?.characters ?? []}
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
                      const hasChoiceDoesNothingWarning = validationIssues.some(
                        (issue) =>
                          issue.code === VALIDATION_CODES.targetlessChoiceWithoutEffects &&
                          issue.sceneId === scene.id &&
                          issue.choiceId === choice.id,
                      );

                      return (
                        <ChoiceItem
                          key={choice.id}
                          choice={choice}
                          scene={scene}
                          scenes={activeProject?.scenes ?? []}
                          isSelected={selectedChoiceId === choice.id}
                          targetSceneName={targetScene ? `→ ${targetScene.name}` : '→ not connected'}
                          hasChoiceDoesNothingWarning={hasChoiceDoesNothingWarning}
                          onCopyChoice={copyChoice}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addChoice(scene.id)}
                      className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600"
                    >
                      + Add Choice
                    </button>
                    <button
                      type="button"
                      onClick={() => pasteChoice(scene.id)}
                      disabled={!canPasteChoice}
                      className="rounded bg-gray-700 px-2 py-1 text-xs font-medium text-gray-100 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Paste Choice
                    </button>
                  </div>
                </CollapsibleSection>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-start px-4 py-4">
              <p className="rounded-md border border-dashed border-gray-700 px-3 py-3 text-xs text-gray-500">
                Select a scene to edit its content.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
