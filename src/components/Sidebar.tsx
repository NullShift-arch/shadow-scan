import { Activity, Apple, Shield, Settings } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

const NAV = [
  { id: 'network' as const,     label: 'Network',     icon: Activity },
  { id: 'apple-relay' as const, label: 'Apple Relay', icon: Apple },
  { id: 'audit' as const,       label: 'Audit',       icon: Shield },
  { id: 'settings' as const,    label: 'Settings',    icon: Settings },
];

export function Sidebar() {
  const { currentScreen, setScreen } = useUIStore();

  return (
    <nav className="w-56 border-r border-white/8 p-3 flex flex-col shrink-0">
      <div className="px-2 py-4 mb-4">
        <h1 className="text-tf-teal font-mono tracking-widest text-sm">SHADOW SCAN</h1>
        <p className="text-tf-text/40 text-xs mt-1">v0.0.1-alpha</p>
      </div>

      {NAV.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setScreen(id)}
          className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors mb-1
            ${
              currentScreen === id
                ? 'bg-tf-teal/10 text-tf-teal border border-tf-teal/30'
                : 'text-tf-text/60 hover:text-tf-text hover:bg-white/5 border border-transparent'
            }
          `}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </nav>
  );
}
