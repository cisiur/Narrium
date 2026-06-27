import { useEffect } from 'react';
import { AppShell } from '../components/AppShell';
import { SceneCanvas } from '../features/canvas/SceneCanvas';
import { CharactersScreen } from '../features/characters/CharactersScreen';
import { SceneEditorPanel } from '../features/editor/SceneEditorPanel';
import { MyProjectsScreen } from '../features/workspace/MyProjectsScreen';
import { useCanvasStore } from '../store/useCanvasStore';
import { useProjectViewStore } from '../store/useProjectViewStore';
import { useWorkspaceStore } from '../store/workspaceStore';

export function App() {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const closeProject = useWorkspaceStore((state) => state.closeProject);
  const addScene = useCanvasStore((state) => state.addScene);
  const activeProjectView = useProjectViewStore((state) => state.activeProjectView);
  const setActiveProjectView = useProjectViewStore((state) => state.setActiveProjectView);

  useEffect(() => {
    if (activeProject) {
      setActiveProjectView('canvas');
    }
  }, [activeProject?.id, setActiveProjectView]);

  if (activeProject) {
    const isCanvasView = activeProjectView === 'canvas';

    return (
      <AppShell
        isProjectOpen
        projectName={activeProject.name}
        activeProjectView={activeProjectView}
        onAddScene={isCanvasView ? () => addScene('New Scene') : undefined}
        onBackToProjects={closeProject}
        onProjectViewChange={setActiveProjectView}
        rightPanel={isCanvasView ? <SceneEditorPanel /> : null}
      >
        {isCanvasView ? <SceneCanvas /> : <CharactersScreen />}
      </AppShell>
    );
  }

  return (
    <AppShell>
      <MyProjectsScreen />
    </AppShell>
  );
}
