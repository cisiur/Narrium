import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { SceneCanvas } from '../features/canvas/SceneCanvas';
import { CharactersScreen } from '../features/characters/CharactersScreen';
import { SceneEditorPanel } from '../features/editor/SceneEditorPanel';
import { StoryPlayer } from '../features/player/StoryPlayer';
import { ResourcesScreen } from '../features/resources/ResourcesScreen';
import { VariablesScreen } from '../features/variables/VariablesScreen';
import { MyProjectsScreen } from '../features/workspace/MyProjectsScreen';
import { useCanvasStore } from '../store/useCanvasStore';
import { useProjectViewStore } from '../store/useProjectViewStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { Project } from '../types';
import { exportProjectAsJson } from '../utils/projectExport';
import { exportProjectAsStandaloneHtml } from '../utils/standaloneHtmlExport';

function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || Boolean(target.closest('input, textarea, select'));
}

export function getAssignableSceneGroupOptions(project: Project, selectedSceneIds: string[]) {
  const selectedSceneIdSet = new Set(selectedSceneIds);
  const selectedScenes = project.scenes.filter((scene) => selectedSceneIdSet.has(scene.id));

  return project.groups
    .filter((group) => selectedScenes.some((scene) => scene.groupId !== group.id))
    .map((group) => ({ id: group.id, name: group.name }));
}

export function App() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const activeProjectFolderPath = useWorkspaceStore((state) => state.activeProjectFolderPath);
  const activeProjectDirty = useWorkspaceStore((state) => state.activeProjectDirty);
  const closeProject = useWorkspaceStore((state) => state.closeProject);
  const canUseProjectFolders = useWorkspaceStore((state) => state.canUseProjectFolders);
  const saveActiveProjectToFolder = useWorkspaceStore((state) => state.saveActiveProjectToFolder);
  const saveActiveProjectAsFolder = useWorkspaceStore((state) => state.saveActiveProjectAsFolder);
  const initializeDesktopLifecycle = useWorkspaceStore((state) => state.initializeDesktopLifecycle);
  const addScene = useCanvasStore((state) => state.addScene);
  const groupSelectedScenes = useCanvasStore((state) => state.groupSelectedScenes);
  const assignSelectedScenesToGroup = useCanvasStore((state) => state.assignSelectedScenesToGroup);
  const ungroupSelectedScenes = useCanvasStore((state) => state.ungroupSelectedScenes);
  const ungroupSelectedGroup = useCanvasStore((state) => state.ungroupSelectedGroup);
  const selectedSceneIds = useCanvasStore((state) => state.selectedSceneIds);
  const selectedGroupId = useCanvasStore((state) => state.selectedGroupId);
  const activeProjectView = useProjectViewStore((state) => state.activeProjectView);
  const setActiveProjectView = useProjectViewStore((state) => state.setActiveProjectView);

  useEffect(() => {
    void initializeDesktopLifecycle();
  }, [initializeDesktopLifecycle]);

  useEffect(() => {
    if (activeProject) {
      setActiveProjectView('canvas');
    }

    setIsPreviewMode(false);
  }, [activeProject?.id, setActiveProjectView]);

  useEffect(() => {
    if (!activeProject || isPreviewMode) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEditingTarget(event.target)) {
        return;
      }

      const workspaceStore = useWorkspaceStore.getState();
      const canvasStore = useCanvasStore.getState();
      const isRedoShortcut =
        event.ctrlKey &&
        !event.altKey &&
        (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'));
      const isUndoShortcut =
        event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'z';

      if (isRedoShortcut) {
        if (workspaceStore.redoActiveProject()) {
          event.preventDefault();
          canvasStore.syncFromProject();
        }
        return;
      }

      if (isUndoShortcut) {
        if (workspaceStore.undoActiveProject()) {
          event.preventDefault();
          canvasStore.syncFromProject();
        }
        return;
      }

      if (activeProjectView !== 'canvas') {
        return;
      }

      if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'c') {
        if (canvasStore.selectedChoiceId && canvasStore.selectedSceneId) {
          event.preventDefault();
          canvasStore.copySelectedChoice();
        }
        return;
      }

      if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'v') {
        if (canvasStore.selectedSceneId) {
          event.preventDefault();
          canvasStore.pasteChoice(canvasStore.selectedSceneId);
        }
        return;
      }

      if (event.key === 'Escape') {
        if (canvasStore.selectedChoiceId) {
          event.preventDefault();
          canvasStore.clearSelectedChoice();
          return;
        }

        if (canvasStore.selectedSceneId || canvasStore.selectedSceneIds.length > 0 || canvasStore.selectedGroupId) {
          event.preventDefault();
          canvasStore.selectScene(null);
        }
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (canvasStore.selectedChoiceId && canvasStore.selectedSceneId) {
          event.preventDefault();
          canvasStore.deleteChoice(canvasStore.selectedSceneId, canvasStore.selectedChoiceId);
          return;
        }

        if (canvasStore.selectedSceneId) {
          event.preventDefault();
          canvasStore.deleteScene(canvasStore.selectedSceneId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProject, activeProjectView, isPreviewMode]);

  if (activeProject) {
    if (isPreviewMode) {
      return <StoryPlayer project={activeProject} onExitPreview={() => setIsPreviewMode(false)} />;
    }

    const isCanvasView = activeProjectView === 'canvas';
    const selectedSceneIdSet = new Set(selectedSceneIds);
    const selectedScenes = activeProject.scenes.filter((scene) => selectedSceneIdSet.has(scene.id));
    const assignableSceneGroups = getAssignableSceneGroupOptions(activeProject, selectedSceneIds);
    const hasGroupedSelectedScenes = selectedScenes.some((scene) => scene.groupId !== null);
    const projectScreen = isCanvasView ? (
      <SceneCanvas />
    ) : activeProjectView === 'characters' ? (
      <CharactersScreen />
    ) : activeProjectView === 'resources' ? (
      <ResourcesScreen />
    ) : (
      <VariablesScreen />
    );

    return (
      <AppShell
        isProjectOpen
        projectName={activeProject.name}
        projectFolderPath={activeProjectFolderPath}
        projectDirty={activeProjectDirty}
        activeProjectView={activeProjectView}
        onAddScene={isCanvasView ? () => addScene('New Scene') : undefined}
        onGroupSelectedScenes={
          isCanvasView && selectedSceneIds.length >= 2 ? groupSelectedScenes : undefined
        }
        sceneGroupOptions={assignableSceneGroups}
        onAddSelectedScenesToGroup={
          isCanvasView && selectedSceneIds.length >= 1 && assignableSceneGroups.length > 0
            ? assignSelectedScenesToGroup
            : undefined
        }
        onUngroupSelectedScenes={
          isCanvasView && hasGroupedSelectedScenes ? ungroupSelectedScenes : undefined
        }
        onUngroupSelectedGroup={isCanvasView && selectedGroupId ? ungroupSelectedGroup : undefined}
        onBackToProjects={closeProject}
        onSaveProject={canUseProjectFolders ? () => void saveActiveProjectToFolder() : undefined}
        canSaveProject={Boolean(activeProjectFolderPath)}
        onSaveProjectAs={canUseProjectFolders ? () => void saveActiveProjectAsFolder() : undefined}
        onExportHtml={() => exportProjectAsStandaloneHtml(activeProject)}
        onExportProject={() => exportProjectAsJson(activeProject)}
        onEnterPreview={() => setIsPreviewMode(true)}
        onProjectViewChange={setActiveProjectView}
        rightPanel={isCanvasView ? <SceneEditorPanel /> : null}
      >
        {projectScreen}
      </AppShell>
    );
  }

  return (
    <AppShell>
      <MyProjectsScreen />
    </AppShell>
  );
}
