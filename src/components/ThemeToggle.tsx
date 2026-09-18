import { Monitor, Moon, Sun } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { useAppTheme } from '@/contexts/ThemeProvider';
import { THEME_OPTIONS, type ThemePreference } from '@/lib/theme';
import { color, motion, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const styles = stylex.create({
  group: {
    display: 'flex',
    padding: 4,
    backgroundColor: color.raised,
    borderRadius: radius.pill,
  },
  wide: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.md,
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    flex: '1',
    height: 32,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: color.muted,
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 500,
    borderRadius: radius.pill,
    transitionProperty: 'background-color, color',
    transitionDuration: motion.fast,
    outlineColor: {
      default: 'transparent',
      ':focus-visible': color.focus,
    },
    outlineOffset: {
      default: 0,
      ':focus-visible': 2,
    },
    outlineStyle: {
      default: 'none',
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      default: 0,
      ':focus-visible': 2,
    },
  },
  active: {
    backgroundColor: color.copper,
    color: color.copperInk,
  },
});

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useAppTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la interfaz"
      {...sx(styles.group, compact ? false : styles.wide)}
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
            {...sx(styles.btn, active ? styles.active : false)}
          >
            <Icon size={compact ? 14 : 15} />
            {compact ? null : option.label}
          </button>
        );
      })}
    </div>
  );
}
