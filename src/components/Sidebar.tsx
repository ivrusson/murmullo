import React from 'react';
import { Mic, Settings, Database, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalSelectors } from './GlobalSelectors';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    {
      key: 'transcriptions',
      label: 'Transcriptions',
      icon: <Mic size={14} />,
    },
    {
      key: 'models',
      label: 'Models',
      icon: <Database size={14} />,
    },
    {
      key: 'permissions',
      label: 'Permissions',
      icon: <Shield size={14} />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <Settings size={14} />,
    },
  ];

  return (
    <div className="h-full flex flex-col py-3">
      {/* Logo */}
      <div className="px-4 pb-3 border-b border-border mb-3">
        <div className="text-lg font-semibold text-foreground flex items-center gap-2 tracking-tight">
          murmullo
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 font-light tracking-wide">
          Offline Voice Dictation
        </div>
      </div>

      {/* Global Selectors */}
      <div className="px-4 pb-3 border-b border-border mb-3">
        <GlobalSelectors />
      </div>

      {/* Menu Items */}
      <div className="flex flex-col">
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onTabChange(item.key)}
            className={cn(
              "w-full px-4 py-2 text-left flex items-center gap-2 text-sm font-normal tracking-wide transition-all duration-150 mx-1 rounded-md",
              activeTab === item.key
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground font-light"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 pt-3 mt-auto border-t border-border">
        <div className="text-xs text-muted-foreground font-light tracking-wide">
          Murmullo v1.0.0
        </div>
      </div>
    </div>
  );
};
