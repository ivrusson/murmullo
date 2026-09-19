import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { FeedbackLaunchButtons } from '@/components/FeedbackDialog';
import * as stylex from '@stylexjs/stylex';
import { color, font, motion, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { navItems } from '@/lib/nav';
import { MurmulloView } from '@/mascot/MurmulloView';
import { useDictationScene } from '@/hooks/useDictationScene';
import { startPendingContextSync } from '@/lib/pendingDictationContext';
import { useT } from '@/i18n';

const MOBILE = '@media (max-width: 720px)';
const NARROW = '@media (max-width: 960px)';

const styles = stylex.create({
  aside: {
    height: {
      default: '100%',
      [MOBILE]: 'auto',
    },
    width: {
      default: 240,
      [NARROW]: 200,
      [MOBILE]: '100%',
    },
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--brand-sidebar-veil)',
    paddingLeft: {
      default: 20,
      [MOBILE]: 12,
    },
    paddingRight: {
      default: 16,
      [MOBILE]: 12,
    },
    paddingBottom: {
      default: 20,
      [MOBILE]: 8,
    },
    position: 'relative',
    overflow: 'visible',
  },
  chrome: {
    height: {
      default: 44,
      [MOBILE]: 0,
    },
    flexShrink: 0,
    display: {
      default: 'block',
      [MOBILE]: 'none',
    },
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    paddingInline: 4,
    paddingTop: 8,
    paddingBottom: 20,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: color.ink,
  },
  name: {
    fontFamily: font.display,
    fontSize: 22,
    fontWeight: 500,
    letterSpacing: '-0.03em',
    lineHeight: '26px',
    margin: 0,
    color: color.ink,
  },
  tag: {
    margin: 0,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: '16px',
  },
  nav: {
    display: 'flex',
    flexDirection: {
      default: 'column',
      [MOBILE]: 'row',
    },
    gap: 4,
    overflowX: {
      default: 'visible',
      [MOBILE]: 'auto',
    },
    paddingBottom: {
      default: 0,
      [MOBILE]: space.sm,
    },
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    height: {
      default: 40,
      [MOBILE]: 36,
    },
    paddingInline: 12,
    borderRadius: radius.pill,
    color: {
      default: color.muted,
      ':hover': color.ink,
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': color.raised,
    },
    textDecoration: 'none',
    fontFamily: font.sans,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: '20px',
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
    whiteSpace: {
      default: 'nowrap',
      [MOBILE]: 'nowrap',
    },
  },
  iconSlot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    flexShrink: 0,
  },
  active: {
    color: {
      default: color.ink,
      ':hover': color.ink,
    },
    backgroundColor: {
      default: color.navActive,
      ':hover': color.navActive,
    },
    fontWeight: 500,
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.75)',
  },
  spacer: {
    flex: '1',
    minHeight: 24,
    display: {
      default: 'block',
      [MOBILE]: 'none',
    },
  },
  companion: {
    display: {
      default: 'flex',
      [MOBILE]: 'none',
    },
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    paddingInline: 8,
    paddingTop: 8,
    paddingBottom: 20,
  },
  mascotHost: {
    width: 88,
    height: 88,
    flexShrink: 0,
    position: 'relative',
  },
  quote: {
    margin: 0,
    maxWidth: 160,
    color: color.muted,
    fontFamily: font.hand,
    fontSize: 16,
    fontWeight: 400,
    lineHeight: '20px',
    transform: 'rotate(-2deg)',
    transformOrigin: 'center center',
  },
  feedback: {
    display: 'flex',
    flexDirection: 'row',
    paddingTop: 4,
  },
  mobileFeedback: {
    display: {
      default: 'none',
      [MOBILE]: 'flex',
    },
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
});

export function Sidebar() {
  const mascotHost = sx(styles.mascotHost);
  const { mode, level } = useDictationScene();
  const t = useT();

  useEffect(() => startPendingContextSync(), []);

  return (
    <aside {...sx(styles.aside)}>
      <div data-tauri-drag-region="" {...sx(styles.chrome)} />
      <div {...sx(styles.brand)}>
        <div {...sx(styles.brandRow)}>
          <p {...sx(styles.name)}>Murmullo</p>
        </div>
        <p {...sx(styles.tag)}>{t('nav.tagline')}</p>
      </div>
      <nav {...sx(styles.nav)} aria-label={t('nav.sections')}>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              preload="intent"
              activeOptions={{ exact: item.to === '/' }}
              {...sx(styles.item)}
              activeProps={{
                ...sx(styles.item, styles.active),
                'aria-current': 'page',
              }}
            >
              <span {...sx(styles.iconSlot)}>
                <Icon size={18} strokeWidth={1.7} aria-hidden />
              </span>
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
      <div {...sx(styles.mobileFeedback)}>
        <FeedbackLaunchButtons compact />
      </div>
      <div {...sx(styles.spacer)} />
      <div {...sx(styles.companion)}>
        <div
          id="sidebar-mascot"
          className={['murmullo-mascot-host', mascotHost.className]
            .filter(Boolean)
            .join(' ')}
          style={mascotHost.style}
        >
          <MurmulloView
            kind="2d"
            size={88}
            interactive={false}
            sceneMode={mode}
            level={level}
          />
        </div>
        <p {...sx(styles.quote)}>{t('nav.quote')}</p>
        <div {...sx(styles.feedback)}>
          <FeedbackLaunchButtons compact />
        </div>
      </div>
    </aside>
  );
}
