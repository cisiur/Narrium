import { AppShell } from '../components/AppShell';
import { SceneCanvas } from '../features/canvas/SceneCanvas';
import { SceneEditorPanel } from '../features/editor/SceneEditorPanel';
import { MyProjectsScreen } from '../features/workspace/MyProjectsScreen';
import { useCanvasStore } from '../store/useCanvasStore';
import { useWorkspaceStore } from '../store/workspaceStore';

export function App() {
  const activeProject = useWorkspaceStore((state) => state.activeProject);
  const addScene = useCanvasStore((state) => state.addScene);

  if (activeProject) {
    return (
      <AppShell
        isProjectOpen
        onAddScene={() => addScene('New Scene')}
        rightPanel={<SceneEditorPanel />}
      >
        <SceneCanvas />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <MyProjectsScreen />
    </AppShell>
  );
}
