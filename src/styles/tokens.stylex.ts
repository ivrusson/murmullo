import * as stylex from '@stylexjs/stylex';

/**
 * Booth tokens. Values are CSS custom properties so light/dark can switch
 * on `html.dark` without a second StyleX theme runtime.
 */
export const color = stylex.defineVars({
  bg: 'var(--booth-bg)',
  ink: 'var(--booth-ink)',
  muted: 'var(--booth-muted)',
  copper: 'var(--booth-copper)',
  copperInk: 'var(--booth-copper-ink)',
  live: 'var(--booth-live)',
  liveInk: 'var(--booth-live-ink)',
  danger: 'var(--booth-danger)',
  dangerInk: 'var(--booth-danger-ink)',
  surface: 'var(--booth-surface)',
  raised: 'var(--booth-raised)',
  line: 'var(--booth-line)',
  focus: 'var(--booth-focus)',
  overlay: 'var(--booth-overlay)',
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
  mono: 'var(--font-mono)',
});

export const radius = stylex.defineVars({
  sm: '0.5rem',
  md: '0.85rem',
  lg: '1.15rem',
  pill: '999px',
});

export const motion = stylex.defineVars({
  fast: '140ms ease',
  normal: '240ms ease',
});
