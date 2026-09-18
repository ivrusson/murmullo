import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, motion, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { formatHotkey } from '@/lib/hotkey';
import { navItems } from '@/lib/nav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { StatusDot } from '@/components/ui-system/StatusDot';

const MOBILE = '@media (max-width: 860px)';

const styles = stylex.create({
  aside: {
    height: {
      default: '100%',
      [MOBILE]: 'auto',
    },
    width: {
      default: 248,
      [MOBILE]: '100%',
    },
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: color.surface,
    borderRightColor: color.line,
    borderRightStyle: 'solid',
    borderRightWidth: {
      default: 1,
      [MOBILE]: 0,
    },
    borderBottomColor: color.line,
    borderBottomStyle: 'solid',
    borderBottomWidth: {
      default: 0,
      [MOBILE]: 1,
    },
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingInline: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
  },
  name: {
    fontFamily: font.display,
    fontSize: '1.35rem',
    lineHeight: 1,
    margin: 0,
    color: color.ink,
  },
  tag: {
    margin: 0,
    marginTop: 4,
    color: color.muted,
    fontSize: '0.75rem',
  },
  hotkey: {
    marginInline: space.lg,
    marginBottom: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.raised,
    color: color.muted,
    fontFamily: font.mono,
    fontSize: '0.7rem',
  },
  nav: {
    display: 'flex',
    flexDirection: {
      default: 'column',
      [MOBILE]: 'row',
    },
    gap: 4,
    paddingInline: space.sm,
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
    gap: space.md,
    paddingBlock: '0.6rem',
    paddingInline: '0.85rem',
    borderRadius: radius.md,
    color: {
      default: color.muted,
      ':hover': color.ink,
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': color.raised,
    },
    textDecoration: 'none',
    fontSize: '0.9rem',
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
      default: 'normal',
      [MOBILE]: 'nowrap',
    },
  },
  active: {
    color: {
      default: color.copperInk,
      ':hover': color.copperInk,
    },
    backgroundColor: {
      default: color.copper,
      ':hover': color.copper,
    },
  },
  foot: {
    padding: space.lg,
    display: {
      default: 'flex',
      [MOBILE]: 'none',
    },
    flexDirection: 'column',
    gap: space.md,
  },
  mic: {
    color: color.muted,
    fontSize: '0.75rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

export function Sidebar() {
  const { selectedDevice, audioDevices, runtimeStatus, config } =
    useAppConfig();
  const deviceName =
    audioDevices.find(d => d.id === selectedDevice)?.name ?? 'Sin micrófono';
  const ready = Boolean(runtimeStatus?.dictation_ready);
  const ptt = formatHotkey(config?.hotkeys.push_to_talk);

  return (
    <aside {...sx(styles.aside)}>
      <div>
        <div {...sx(styles.brand)}>
          <img
            src="/murmullo-logo.svg"
            alt=""
            {...sx(styles.logo)}
          />
          <div>
            <p {...sx(styles.name)}>Murmullo</p>
            <p {...sx(styles.tag)}>Dictado local</p>
          </div>
        </div>
        <div {...sx(styles.hotkey)}>Atajo {ptt}</div>
        <nav {...sx(styles.nav)} aria-label="Secciones">
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
                <Icon size={16} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div {...sx(styles.foot)}>
        <ThemeToggle compact />
        <StatusDot
          ready={ready}
          label={ready ? 'Parakeet listo' : 'STT no listo'}
        />
        <div {...sx(styles.mic)}>{deviceName}</div>
      </div>
    </aside>
  );
}
