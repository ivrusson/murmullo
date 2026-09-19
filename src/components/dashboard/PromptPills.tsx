import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/components/ui-system/toast';
import * as stylex from '@stylexjs/stylex';
import { color, font, motion, radius } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import {
  DICTATION_PROMPTS,
  promptDisplayLabel,
  queuePendingDictationContext,
  type MurmulloContextLabel,
} from '@/lib/pendingDictationContext';
import { useT } from '@/i18n';

const styles = stylex.create({
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    width: {
      default: 268,
      '@media (max-width: 860px)': '100%',
    },
    gap: 8,
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    height: 34,
    paddingInline: 14,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.line,
    borderRadius: radius.pill,
    backgroundColor: {
      default: '#FFFFFF',
      ':hover': color.raised,
    },
    color: color.ink,
    cursor: 'pointer',
    fontFamily: font.sans,
    fontSize: 13,
    fontWeight: 500,
    lineHeight: '18px',
    gap: 8,
    transitionProperty: 'background-color, transform',
    transitionDuration: motion.fast,
    transform: {
      default: 'none',
      ':hover': 'scale(1.02)',
    },
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
});

function startPromptDictation(context: MurmulloContextLabel, failed: string) {
  queuePendingDictationContext(context);
  void invoke('overlay_start_dictation').catch(() => {
    toast.error(failed);
  });
}

export function PromptPills() {
  const t = useT();
  return (
    <div {...sx(styles.row)} role="group" aria-label={t('dashboard.startAria')}>
      {DICTATION_PROMPTS.map(prompt => (
        <button
          key={prompt.id}
          type="button"
          onClick={() =>
            startPromptDictation(prompt.context, t('nav.startFailed'))
          }
          {...sx(styles.pill)}
        >
          {promptDisplayLabel(prompt.id)}
        </button>
      ))}
    </div>
  );
}
