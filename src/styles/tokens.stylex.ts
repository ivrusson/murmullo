import * as stylex from '@stylexjs/stylex';

/**
 * Ceramic tokens (Paper + DESIGN.md). Values are CSS custom properties so
 * light/dark can switch on `html.dark` without a second StyleX theme runtime.
 *
 * `copper` / `copperInk` / `live` / `liveInk` stay as StyleX names so existing
 * components keep compiling; they now alias iris / sage in the ceramic palette.
 */
export const color = stylex.defineVars({
  bg: 'var(--color-bg)',
  canvas: 'var(--color-canvas)',
  ink: 'var(--color-ink)',
  muted: 'var(--color-muted)',
  copper: 'var(--color-copper)',
  copperInk: 'var(--color-copper-ink)',
  live: 'var(--color-live)',
  liveInk: 'var(--color-live-ink)',
  danger: 'var(--color-danger)',
  dangerInk: 'var(--color-danger-ink)',
  surface: 'var(--color-surface)',
  raised: 'var(--color-raised)',
  line: 'var(--color-line)',
  focus: 'var(--color-focus)',
  overlay: 'var(--color-overlay)',
  iris: 'var(--color-iris)',
  sky: 'var(--color-sky)',
  blush: 'var(--color-blush)',
  sage: 'var(--color-sage)',
  navActive: 'var(--color-nav-active)',
});

export const space = stylex.defineVars({
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1.25rem',
  xl: '2rem',
  '2xl': '3rem',
});

export const font = stylex.defineVars({
  display: 'var(--font-display)',
  sans: 'var(--font-family)',
  editorial: 'var(--font-editorial)',
  hand: 'var(--font-hand)',
  mono: 'var(--font-mono)',
});

export const radius = stylex.defineVars({
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '24px',
  pill: '9999px',
});

export const shadow = stylex.defineVars({
  card: 'var(--shadow-card)',
  hud: 'var(--shadow-hud)',
});

export const motion = stylex.defineVars({
  fast: '140ms ease',
  normal: '240ms ease',
});
