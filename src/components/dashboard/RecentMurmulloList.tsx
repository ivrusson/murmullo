import * as stylex from '@stylexjs/stylex';
import { color, font, motion, radius, shadow } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { ContextChip } from '@/components/dashboard/ContextChip';
import {
  firstLineTitle,
  formatRelativeTime,
  previewText,
} from '@/lib/formatRelativeTime';
import { contextFromMetadata } from '@/lib/pendingDictationContext';
import type { TranscriptionRecord } from '@/types/transcription';

const styles = stylex.create({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  item: {
    display: 'grid',
    gridTemplateColumns: '32px minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: 12,
    width: '100%',
    minWidth: 0,
    height: 56,
    textAlign: 'left',
    cursor: 'pointer',
    paddingBlock: 0,
    paddingInline: 12,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: {
      default: 'transparent',
      ':hover': '#ffffff',
    },
    color: 'inherit',
    boxShadow: {
      default: 'none',
      ':hover': shadow.card,
    },
    transform: {
      default: 'none',
      ':hover': 'translateY(-1px)',
    },
    transitionProperty: 'background-color, box-shadow, transform',
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
  selected: {
    backgroundColor: '#ffffff',
    boxShadow: shadow.card,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    flexShrink: 0,
    backgroundColor: '#232128',
    boxShadow: '0 8px 18px -8px rgba(138, 127, 214, 0.45)',
    position: 'relative',
  },
  eye: {
    position: 'absolute',
    top: 11,
    width: 4,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: '#f7f4ef',
  },
  eyeLeft: { left: 8 },
  eyeRight: { right: 8 },
  body: {
    flex: '1',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  title: {
    margin: 0,
    minWidth: 0,
    fontFamily: font.sans,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '20px',
    color: color.ink,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  preview: {
    margin: 0,
    color: '#5A5551',
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: '16px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    display: 'flex',
    flexDirection: {
      default: 'row',
      '@media (max-width: 1100px)': 'column',
    },
    alignItems: {
      default: 'center',
      '@media (max-width: 1100px)': 'flex-end',
    },
    justifyContent: 'flex-end',
    gap: 8,
    minWidth: 0,
    flexShrink: 0,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: '16px',
    whiteSpace: 'nowrap',
  },
});

function MiniCompanion() {
  return (
    <span {...sx(styles.avatar)} aria-hidden>
      <span {...sx(styles.eye, styles.eyeLeft)} />
      <span {...sx(styles.eye, styles.eyeRight)} />
    </span>
  );
}

export function RecentMurmulloList({
  items,
  selectedId,
  onSelect,
}: {
  items: TranscriptionRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div {...sx(styles.list)}>
      {items.map(item => {
        const selected = item.id === selectedId;
        const context = contextFromMetadata(item.metadata);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-pressed={selected}
            {...sx(styles.item, selected ? styles.selected : false)}
          >
            <MiniCompanion />
            <span {...sx(styles.body)}>
              <span {...sx(styles.title)}>{firstLineTitle(item.text)}</span>
              <span {...sx(styles.preview)}>{previewText(item.text)}</span>
            </span>
            <span {...sx(styles.meta)}>
              {formatRelativeTime(item.created_at)}
              {context ? <ContextChip context={context} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
