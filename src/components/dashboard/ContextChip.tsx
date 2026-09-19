import type { HTMLAttributes } from 'react';
import * as stylex from '@stylexjs/stylex';
import { font, radius } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import type { MurmulloContextLabel } from '@/lib/pendingDictationContext';
import { contextDisplayLabel } from '@/lib/pendingDictationContext';

const styles = stylex.create({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    paddingBlock: 4,
    paddingInline: 10,
    borderRadius: radius.pill,
    fontFamily: font.sans,
    fontSize: 11,
    fontWeight: 600,
    lineHeight: '14px',
    letterSpacing: '0.02em',
    borderWidth: 0,
    flexShrink: 0,
  },
  trabajo: {
    backgroundColor: '#F4E9C8',
    color: '#8A6A1E',
  },
  comunicacion: {
    backgroundColor: '#FDF0F0',
    color: '#A44C47',
  },
  diseno: {
    backgroundColor: '#F4F0F9',
    color: '#6E5696',
  },
  reuniones: {
    backgroundColor: '#FDF0F0',
    color: '#A44C47',
  },
  personal: {
    backgroundColor: '#EDF4EE',
    color: '#47784E',
  },
});

const TONE: Record<MurmulloContextLabel, keyof typeof styles> = {
  Trabajo: 'trabajo',
  Comunicación: 'comunicacion',
  Diseño: 'diseno',
  Reuniones: 'reuniones',
  Personal: 'personal',
};

export function ContextChip({
  context,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { context: MurmulloContextLabel }) {
  const x = sx(styles.chip, styles[TONE[context]]);
  return (
    <span
      {...rest}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={x.style}
    >
      {contextDisplayLabel(context)}
    </span>
  );
}
