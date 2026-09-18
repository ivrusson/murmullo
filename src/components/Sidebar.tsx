import React from 'react';
import { Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { formatHotkey } from '@/lib/hotkey';
import { navItems } from './layout/AppShell';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { selectedDevice, audioDevices, runtimeStatus, config } =
    useAppConfig();
  const deviceName =
    audioDevices.find(d => d.id === selectedDevice)?.name ?? 'Sin micrófono';
  const ready = Boolean(runtimeStatus?.dictation_ready);
  const ptt = formatHotkey(config?.hotkeys.push_to_talk);

  return (
    <aside className="h-full w-72 flex-shrink-0 bg-surface-2 flex flex-col justify-between shadow-sidebar">
      <div className="flex flex-col">
        <div className="h-16 px-6 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
          </div>
          <div className="ml-auto px-2 py-1 rounded vf-inset">
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
              Opt+Space
            </span>
          </div>
        </div>

        <div className="px-6 py-3 flex items-center gap-3">
          <img
            src="/murmullo-logo.svg"
            alt="Murmullo"
            className="h-8 w-8 rounded-xl object-contain"
          />
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight leading-none">
              Murmullo
            </span>
            <span className="font-mono text-[10px] text-cyan tracking-widest uppercase mt-1">
              Dictado local
            </span>
          </div>
        </div>

        <div className="px-6 mt-1">
          <div className="p-3 rounded-xl vf-card flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Command size={16} className="text-cyan" />
              <span className="font-mono text-xs">Atajo Global</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-surface-2">
              {ptt}
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-3 mt-5">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={cn(
                  'w-full px-4 py-2.5 text-left flex items-center gap-3 text-sm rounded-xl transition-all duration-150',
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-nav-active'
                    : 'text-muted-foreground hover:bg-surface-4 hover:text-foreground'
                )}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 space-y-3">
        <ThemeToggle compact />
        <div className="p-3 rounded-xl vf-inset flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5">
              {ready && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75" />
              )}
              <span
                className={cn(
                  'relative inline-flex rounded-full h-2.5 w-2.5',
                  ready ? 'bg-cyan' : 'bg-amber'
                )}
              />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-[10px] text-foreground">
                {ready ? 'Micrófono listo' : 'STT no listo'}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground truncate">
                {deviceName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
