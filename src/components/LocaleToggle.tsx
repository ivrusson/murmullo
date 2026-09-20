import * as stylex from '@stylexjs/stylex';
import { useLocale, type Locale } from '@/i18n';
import { color, motion, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const OPTIONS: ReadonlyArray<{
  value: Locale;
  labelKey: 'settings.localeEs' | 'settings.localeEn';
}> = [
  { value: 'es', labelKey: 'settings.localeEs' },
  { value: 'en', labelKey: 'settings.localeEn' },
];

const styles = stylex.create({
  group: {
    display: 'flex',
    padding: 4,
    backgroundColor: color.raised,
    borderRadius: radius.pill,
    width: '100%',
    maxWidth: 420,
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '1',
    height: 32,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: color.muted,
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 500,
    borderRadius: radius.pill,
    paddingInline: space.sm,
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

export function LocaleToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="radiogroup"
      aria-label={t('settings.localeAria')}
      {...sx(styles.group)}
    >
      {OPTIONS.map(option => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => void setLocale(option.value)}
            {...sx(styles.btn, active ? styles.active : false)}
          >
            {t(option.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
