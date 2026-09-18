import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTheme } from '@/contexts/ThemeProvider';
import { THEME_OPTIONS, type ThemePreference } from '@/lib/theme';

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useAppTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la interfaz"
      className={cn(
        'vf-inset flex p-1',
        compact ? 'rounded-full' : 'rounded-xl w-full max-w-md'
      )}
    >
      {THEME_OPTIONS.map(option => {
        const Icon = ICONS[option.value];
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => void setTheme(option.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 text-xs font-medium transition-colors',
              compact ? 'h-8 flex-1 rounded-full' : 'flex-1 py-2 rounded-lg',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={compact ? 14 : 15} />
            {!compact && option.label}
          </button>
        );
      })}
    </div>
  );
}
