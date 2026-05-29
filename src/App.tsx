import { useUIStore } from './store/uiStore';
import { Sidebar } from './components/Sidebar';
import { NetworkScreen } from './screens/NetworkScreen';
import { AppleRelayScreen } from './screens/AppleRelayScreen';
import { AuditScreen } from './screens/AuditScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export default function App() {
  const screen = useUIStore((s) => s.currentScreen);

  return (
    <div className="flex h-screen bg-tf-bg text-tf-text">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {screen === 'network'     && <NetworkScreen />}
        {screen === 'apple-relay' && <AppleRelayScreen />}
        {screen === 'audit'       && <AuditScreen />}
        {screen === 'settings'    && <SettingsScreen />}
      </main>
    </div>
  );
}
