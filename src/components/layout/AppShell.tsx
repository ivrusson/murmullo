import {
  LayoutGrid,
  History,
  BookOpen,
  Cpu,
  Shield,
  Settings,
} from 'lucide-react';

export const navItems = [
  { key: 'dashboard', label: 'Escritorio & HUD', icon: LayoutGrid },
  {
    key: 'transcriptions',
    label: 'Historial de Transcripciones',
    icon: History,
  },
  { key: 'dictionary', label: 'Diccionario AI', icon: BookOpen },
  { key: 'runtimes', label: 'Runtimes', icon: Cpu },
  { key: 'permissions', label: 'Permisos', icon: Shield },
  { key: 'settings', label: 'Configuración de Sistema', icon: Settings },
] as const;

export function AppHeader({ activeTab }: { activeTab: string }) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-surface-2/80 backdrop-blur-xl shadow-header shrink-0">
      <div className="flex items-center gap-3">
        <span className="vf-chip bg-surface-2 text-amber shadow-chip-inset">
          <LayoutGrid size={14} />
          HUD ACTIVO
        </span>
        <span className="hidden md:inline-flex items-center gap-1.5 vf-chip text-muted-foreground">
          <Shield size={12} />
          Modo Seguro Local
        </span>
      </div>
      <nav className="hidden xl:flex items-center gap-6 text-xs text-muted-foreground">
        <span
          className={
            activeTab === 'dashboard' ? 'text-foreground font-semibold' : ''
          }
        >
          HUD
        </span>
        <span
          className={
            activeTab === 'transcriptions'
              ? 'text-foreground font-semibold'
              : ''
          }
        >
          Actividad
        </span>
        <span
          className={
            activeTab === 'dictionary' ? 'text-foreground font-semibold' : ''
          }
        >
          Vocabulario
        </span>
        <span
          className={
            activeTab === 'settings' ? 'text-foreground font-semibold' : ''
          }
        >
          Preferencias
        </span>
      </nav>
    </header>
  );
}
