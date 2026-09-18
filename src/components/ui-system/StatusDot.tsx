import * as stylex from '@stylexjs/stylex';
import { color, font, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  live: {
    backgroundColor: color.live,
    boxShadow:
      '0 0 0 4px color-mix(in srgb, var(--booth-live) 25%, transparent)',
  },
  wait: {
    backgroundColor: color.copper,
  },
  label: {
    fontFamily: font.sans,
    fontSize: '0.8rem',
    color: color.ink,
  },
});

export function StatusDot({
  ready,
  label,
}: {
  ready: boolean;
  label?: string;
}) {
  return (
    <span {...sx(styles.row)}>
      <span {...sx(styles.dot, ready ? styles.live : styles.wait)} />
      {label ? <span {...sx(styles.label)}>{label}</span> : null}
    </span>
  );
}
