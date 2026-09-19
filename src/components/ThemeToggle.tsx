import { Monitor, Moon, Sun } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { useAppTheme } from '@/contexts/ThemeProvider';
import { THEME_OPTIONS, type ThemePreference } from '@/lib/theme';
import { useT } from '@/i18n';
import type { AppMessageKey } from '@/i18n';
import { color, motion, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const THEME_COPY: Record<
  ThemePreference,
  { label: AppMessageKey; hint: AppMessageKey }
> = {
  light: { label: 'settings.themeLight', hint: 'settings.themeLightHint' },
  dark: { label: 'settings.themeDark', hint: 'settings.themeDarkHint' },
  system: { label: 'settings.themeSystem', hint: 'settings.themeSystemHint' },
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
    backgroundColor: color.ink,
    color: color.surface,
  },
});

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useAppTheme();
  const t = useT();

  return (
    <div
      role="radiogroup"
      aria-label={t('settings.themeAria')}
      {...sx(styles.group, compact ? false : styles.wide)}
    >
      {THEME_OPTIONS.map(value => {
        const Icon = ICONS[value];
        const active = theme === value;
        const copy = THEME_COPY[value];
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={t(copy.hint)}
            onClick={() => void setTheme(value)}
            {...sx(styles.btn, active ? styles.active : false)}
          >
            <Icon size={compact ? 14 : 15} />
            {compact ? null : t(copy.label)}
          </button>
        );
      })}
    </div>
  );
}
