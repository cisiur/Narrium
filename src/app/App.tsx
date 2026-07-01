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
import { exportProjectAsJson } from '../utils/projectExport';
import { exportProjectAsStandaloneHtml } from '../utils/standaloneHtmlExport';

function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || Boolean(target.closest('input, textarea, select'));
}

export function App() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const closeProject = useWorkspaceStore((state) => state.closeProject);
  const addScene = useCanvasStore((state) => state.addScene);
  const activeProjectView = useProjectViewStore((state) => state.activeProjectView);
  const setActiveProjectView = useProjectViewStore((state) => state.setActiveProjectView);

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

      if (event.key === 'Escape') {
        if (canvasStore.selectedChoiceId) {
          event.preventDefault();
          canvasStore.clearSelectedChoice();
          return;
        }

        if (canvasStore.selectedSceneId) {
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
        activeProjectView={activeProjectView}
        onAddScene={isCanvasView ? () => addScene('New Scene') : undefined}
        onBackToProjects={closeProject}
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
