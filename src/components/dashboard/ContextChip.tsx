import type { HTMLAttributes } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, font, radius } from '@/styles/tokens.stylex';
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
    backgroundColor: color.toneAmberBg,
    color: color.toneAmberInk,
  },
  comunicacion: {
    backgroundColor: color.toneBlushBg,
    color: color.toneBlushInk,
  },
  diseno: {
    backgroundColor: color.toneIrisBg,
    color: color.toneIrisInk,
  },
  reuniones: {
    backgroundColor: color.toneBlushBg,
    color: color.toneBlushInk,
  },
  personal: {
    backgroundColor: color.toneSageBg,
    color: color.toneSageInk,
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
