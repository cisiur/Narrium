import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { SceneCanvas } from '../features/canvas/SceneCanvas';
import { CharactersScreen } from '../features/characters/CharactersScreen';
import { SceneEditorPanel } from '../features/editor/SceneEditorPanel';
import { StoryPlayer } from '../features/player/StoryPlayer';
import { ResourcesScreen } from '../features/resources/ResourcesScreen';
import { MyProjectsScreen } from '../features/workspace/MyProjectsScreen';
import { useCanvasStore } from '../store/useCanvasStore';
import { useProjectViewStore } from '../store/useProjectViewStore';
import { useWorkspaceStore } from '../store/workspaceStore';

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

  if (activeProject) {
    if (isPreviewMode) {
      return <StoryPlayer project={activeProject} onExitPreview={() => setIsPreviewMode(false)} />;
    }

    const isCanvasView = activeProjectView === 'canvas';
    const projectScreen = isCanvasView ? (
      <SceneCanvas />
    ) : activeProjectView === 'characters' ? (
      <CharactersScreen />
    ) : (
      <ResourcesScreen />
    );

    return (
      <AppShell
        isProjectOpen
        projectName={activeProject.name}
        activeProjectView={activeProjectView}
        onAddScene={isCanvasView ? () => addScene('New Scene') : undefined}
        onBackToProjects={closeProject}
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
