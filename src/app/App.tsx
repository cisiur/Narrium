import { AppShell } from '../components/AppShell';
import { MyProjectsScreen } from '../features/workspace/MyProjectsScreen';

export function App() {
  return (
    <AppShell>
      <MyProjectsScreen />
    </AppShell>
  );
}
