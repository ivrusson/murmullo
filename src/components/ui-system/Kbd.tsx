import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  key: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '1.5rem',
    paddingBlock: '0.15rem',
    paddingInline: '0.4rem',
    marginInline: 2,
    borderRadius: radius.sm,
    backgroundColor: color.raised,
    borderColor: color.line,
    borderStyle: 'solid',
    borderWidth: 1,
    fontFamily: font.mono,
    fontSize: '0.7rem',
    color: color.ink,
  },
  row: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
  },
});

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd {...sx(styles.key)}>{children}</kbd>;
}

export function HotkeyKeys({ parts }: { parts: string[] }) {
  return (
    <span {...sx(styles.row)}>
      {parts.map(part => (
        <Kbd key={part}>{part}</Kbd>
      ))}
    </span>
  );
}
