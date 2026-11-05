import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Copy,
  Mic,
  MoreHorizontal,
  Pencil,
  Square,
  X,
} from 'lucide-react';
import { MurmulloView, type MurmulloSceneMode } from '@/mascot/MurmulloView';
import type { OverlayAnchor } from '@/lib/overlayAnchor';
import {
  HUD_MASCOT_DISPLAY,
  panelShift,
  type HudPanelKind,
  type HudPoint,
} from '@/lib/overlayFrame';
import type { OverlayWorkArea } from '@/lib/overlayPlacement';
import { t, translateBackendMessage } from '@/i18n';

export type HudMode =
  | 'rest'
  | 'ready'
  | 'listening'
  | 'processing'
  | 'done'
  | 'transcribed'
  | 'actions'
  | 'cancelled'
  | 'error';

export type HudHistoryItem = {
  id: string;
  text: string;
  created_at: string;
};

export type HudModalKind = 'edit' | null;

export type HudNoticeKind = 'insert' | 'error';

export type HudTranscription = {
  text: string;
  duration_ms: number;
  model_used: string;
};

/** Render size of the 2D scene; CSS scales the resting mascot. */
export const HUD_MASCOT_RENDER_SIZE = 140;
/** Resting on-screen size; scene is rendered at 140 and scaled down. */
export const HUD_MASCOT_DISPLAY_SIZE = HUD_MASCOT_DISPLAY;

export type OrbitalActionId = 'dictate' | 'more' | 'stop' | 'cancel';

export type OrbitalAction = {
  id: OrbitalActionId;
  label: string;
  icon: ReactNode;
};

type MascotProps = {
  sceneMode: MurmulloSceneMode;
  level?: number;
  active?: boolean;
  onMouseDown?: MouseEventHandler<HTMLDivElement>;
  onPointerEnter?: PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: PointerEventHandler<HTMLDivElement>;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
  onClick?: MouseEventHandler<HTMLDivElement>;
};

export function HudMascot({
  sceneMode,
  level,
  active = false,
  onMouseDown,
  onPointerEnter,
  onPointerLeave,
  onContextMenu,
  onClick,
}: MascotProps) {
  return (
    <div
      className={`hud-mascot${active ? ' is-active' : ''}`}
      data-hud-hit=""
      onMouseDown={onMouseDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
      onClick={onClick}
    >
      <div className="hud-mascot-scene">
        <MurmulloView
          kind="2d"
          size={HUD_MASCOT_RENDER_SIZE}
          frame="haze"
          sceneMode={sceneMode}
          level={level}
          interactive={false}
        />
      </div>
    </div>
  );
}

export function HudOrbitalActions({
  visible,
  left,
  right,
  onAction,
}: {
  visible: boolean;
  left: OrbitalAction[];
  right: OrbitalAction[];
  onAction: (id: OrbitalActionId) => void;
}) {
  const renderSide = (items: OrbitalAction[], side: 'left' | 'right') => (
    <div className={`hud-orbitals-side is-${side}`}>
      {items.map((action, index) => (
        <button
          key={action.id}
          type="button"
          className={`hud-orbital is-${action.id}`}
          data-no-drag
          tabIndex={visible ? 0 : -1}
          style={{ '--hud-stagger': index } as CSSProperties}
          aria-label={action.label}
          title={action.label}
          onClick={() => onAction(action.id)}
        >
          {action.icon}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={`hud-orbitals${visible ? ' is-visible' : ''}`}
      data-hud-hit=""
      aria-hidden={!visible}
    >
      {renderSide(left, 'left')}
      {renderSide(right, 'right')}
    </div>
  );
}

/** Hover actions: one per side, so each slides straight out from behind the mascot. */
export function ReadyOrbitals({
  visible,
  onAction,
}: {
  visible: boolean;
  onAction: (id: OrbitalActionId) => void;
}) {
  return (
    <HudOrbitalActions
      visible={visible}
      onAction={onAction}
      left={[
        {
          id: 'dictate',
          label: t('hud.dictate'),
          icon: <Mic size={15} strokeWidth={2.2} />,
        },
      ]}
      right={[
        {
          id: 'more',
          label: t('hud.moreActions'),
          icon: <MoreHorizontal size={15} strokeWidth={2.2} />,
        },
      ]}
    />
  );
}

export function ListeningOrbitals({
  visible,
  onAction,
}: {
  visible: boolean;
  onAction: (id: OrbitalActionId) => void;
}) {
  return (
    <HudOrbitalActions
      visible={visible}
      onAction={onAction}
      left={[
        {
          id: 'cancel',
          label: t('hud.cancel'),
          icon: <X size={14} strokeWidth={2.4} />,
        },
      ]}
      right={[
        {
          id: 'stop',
          label: t('hud.stop'),
          icon: <Square size={10} fill="currentColor" strokeWidth={0} />,
        },
      ]}
    />
  );
}

/**
 * Stage: a box whose geometric center is the mascot center.
 * Orbitals and the status toast are absolutely positioned around it,
 * so nothing ever pushes the mascot.
 */
export function HudStage({
  mode,
  width,
  height,
  covered,
  mascot,
  orbitals,
  toast,
  onMouseDown,
  onPointerEnter,
  onPointerLeave,
}: {
  mode: HudMode;
  width: number;
  height: number;
  covered: boolean;
  mascot: ReactNode;
  orbitals?: ReactNode;
  toast?: ReactNode;
  onMouseDown?: MouseEventHandler<HTMLDivElement>;
  onPointerEnter?: PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: PointerEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className={`hud-stage is-${mode}${covered ? ' is-covered' : ''}`}
      data-mode={mode}
      data-hud-hit=""
      style={{ width, height }}
      onMouseDown={onMouseDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="hud-stage-toast">{toast}</div>
      <div className="hud-stage-core">
        {orbitals}
        {mascot}
      </div>
    </div>
  );
}

/** Keeps children mounted for the leave transition. */
export function HudLayer({
  open,
  reducedMotion,
  className,
  children,
}: {
  open: boolean;
  reducedMotion: boolean;
  className: string;
  children: ReactNode;
}) {
  const [present, setPresent] = useState(open);
  const cached = useRef(children);
  if (open && children) cached.current = children;

  useEffect(() => {
    if (open) {
      setPresent(true);
      return undefined;
    }
    if (reducedMotion) {
      setPresent(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setPresent(false), 220);
    return () => window.clearTimeout(timer);
  }, [open, reducedMotion]);

  if (!present) return null;
  return (
    <div
      className={`hud-layer ${className}${open ? ' is-open' : ' is-leaving'}`}
      data-no-drag
      data-hud-hit=""
    >
      {open ? children : cached.current}
    </div>
  );
}

export function HudToast({
  message,
  kind = 'insert',
  spinner = false,
}: {
  message: string;
  kind?: HudNoticeKind;
  spinner?: boolean;
}) {
  return (
    <div className={`hud-toast${kind === 'error' ? ' is-error' : ''}`}>
      {spinner ? (
        <span className="hud-spinner" aria-hidden />
      ) : (
        <Check size={13} strokeWidth={2.6} aria-hidden />
      )}
      <span>{message}</span>
    </div>
  );
}

export function ProcessingToast({ message }: { message?: string }) {
  return (
    <HudToast
      spinner
      message={translateBackendMessage(
        message || 'status.processing',
        'errors.status.processing'
      )}
    />
  );
}

/**
 * A panel centered on the mascot that covers the stage like a modal.
 * It measures itself and shifts inside the window so it never leaves the
 * work area; the mascot underneath never moves.
 */
export function HudPanel({
  open,
  kind,
  mascot,
  work,
  reducedMotion,
  children,
}: {
  open: boolean;
  kind: HudPanelKind | null;
  mascot: HudPoint | null;
  work: OverlayWorkArea | null;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const [present, setPresent] = useState(open);
  const [shift, setShift] = useState<HudPoint>({ x: 0, y: 0 });
  const cached = useRef(children);
  const boxRef = useRef<HTMLDivElement | null>(null);
  if (open && children) cached.current = children;

  useEffect(() => {
    if (open) {
      setPresent(true);
      return undefined;
    }
    if (reducedMotion) {
      setPresent(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setPresent(false), 220);
    return () => window.clearTimeout(timer);
  }, [open, reducedMotion]);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || !present) return undefined;
    const measure = () => {
      if (!mascot || !work) {
        setShift({ x: 0, y: 0 });
        return;
      }
      const rect = box.getBoundingClientRect();
      const next = panelShift(
        mascot,
        { width: rect.width, height: rect.height },
        work
      );
      setShift(current =>
        current.x === next.x && current.y === next.y ? current : next
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [present, mascot, work, kind]);

  if (!present) return null;
  return (
    <div
      ref={boxRef}
      className={`hud-panel is-${kind ?? 'none'}${open ? ' is-open' : ' is-leaving'}`}
      style={
        {
          '--hud-shift-x': `${shift.x}px`,
          '--hud-shift-y': `${shift.y}px`,
        } as CSSProperties
      }
      data-no-drag
      data-hud-hit=""
    >
      {open ? children : cached.current}
    </div>
  );
}

function ResultTimeout({ visible }: { visible?: boolean }) {
  if (!visible) return null;
  return (
    <span className="hud-timeout hud-timeout-result" aria-hidden>
      <span className="hud-timeout-bar" />
    </span>
  );
}

export function ResultPanel({
  text,
  onInsert,
  onCopy,
  onEdit,
  onClose,
  showTimeout,
}: {
  text: string;
  onInsert: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onClose: () => void;
  showTimeout?: boolean;
}) {
  return (
    <div className="hud-card is-result" role="dialog" aria-modal="true">
      <p className="hud-card-result" title={text}>
        {text}
      </p>
      <div className="hud-card-actions">
        <button
          type="button"
          className="hud-insert"
          data-no-drag
          onClick={onInsert}
        >
          {t('hud.insertEnter')}
        </button>
        <button
          type="button"
          className="hud-icon-btn"
          data-no-drag
          aria-label={t('hud.copy')}
          onClick={onCopy}
        >
          <Copy size={14} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className="hud-icon-btn"
          data-no-drag
          aria-label={t('hud.edit')}
          onClick={onEdit}
        >
          <Pencil size={14} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className="hud-icon-btn"
          data-no-drag
          aria-label={t('hud.close')}
          onClick={onClose}
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      </div>
      <ResultTimeout visible={showTimeout} />
    </div>
  );
}

export function CancelledPanel({
  onUndo,
  onClose,
  reducedMotion,
}: {
  onUndo: () => void;
  onClose: () => void;
  reducedMotion: boolean;
}) {
  return (
    <div className="hud-card is-notice" role="status">
      <p className="hud-card-text">{t('hud.cancelled')}</p>
      <div className="hud-card-actions">
        <button type="button" className="hud-btn" data-no-drag onClick={onUndo}>
          {t('hud.undo')}
        </button>
        <button
          type="button"
          className="hud-icon-btn"
          data-no-drag
          aria-label={t('hud.close')}
          onClick={onClose}
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      </div>
      {reducedMotion ? null : (
        <span className="hud-timeout" aria-hidden>
          <span className="hud-timeout-bar is-cancel" />
        </span>
      )}
    </div>
  );
}

export function ErrorPanel({
  message,
  onClose,
  onOpenApp,
}: {
  message: string;
  onClose: () => void;
  onOpenApp?: () => void;
}) {
  return (
    <div className="hud-card is-error" role="alertdialog" aria-modal="true">
      <p className="hud-card-text">{message}</p>
      <div className="hud-card-actions">
        {onOpenApp ? (
          <button
            type="button"
            className="hud-btn"
            data-no-drag
            onClick={onOpenApp}
          >
            {t('hud.open')}
          </button>
        ) : null}
        <button
          type="button"
          className="hud-icon-btn"
          data-no-drag
          aria-label={t('hud.close')}
          onClick={onClose}
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

const ANCHOR_ITEMS: Array<{
  id: Exclude<OverlayAnchor, 'custom'>;
  labelKey:
    'hud.anchorTop' | 'hud.anchorBottom' | 'hud.anchorLeft' | 'hud.anchorRight';
  icon: ReactNode;
}> = [
  { id: 'top', labelKey: 'hud.anchorTop', icon: <ArrowUp size={14} /> },
  { id: 'bottom', labelKey: 'hud.anchorBottom', icon: <ArrowDown size={14} /> },
  { id: 'left', labelKey: 'hud.anchorLeft', icon: <ArrowLeft size={14} /> },
  { id: 'right', labelKey: 'hud.anchorRight', icon: <ArrowRight size={14} /> },
];

export function HudQuickMenu({
  anchor,
  onOpenApp,
  onLastMurmur,
  onSettings,
  onAnchor,
  onExit,
  onClose,
}: {
  anchor: OverlayAnchor;
  onOpenApp: () => void;
  onLastMurmur: () => void;
  onSettings: () => void;
  onAnchor: (anchor: Exclude<OverlayAnchor, 'custom'>) => void;
  onExit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="hud-menu" role="menu">
      <div className="hud-menu-head">
        <span className="hud-menu-title">{t('hud.quickMenu')}</span>
        <button
          type="button"
          className="hud-icon-btn is-small"
          aria-label={t('hud.close')}
          onClick={onClose}
        >
          <X size={13} strokeWidth={2.4} />
        </button>
      </div>
      <button type="button" role="menuitem" onClick={onOpenApp}>
        {t('hud.openApp')}
      </button>
      <button type="button" role="menuitem" onClick={onLastMurmur}>
        {t('hud.lastMurmullo')}
      </button>
      <button type="button" role="menuitem" onClick={onSettings}>
        {t('common.settings')}
      </button>
      <div className="hud-menu-sep" />
      <div className="hud-menu-label">{t('hud.position')}</div>
      <div
        className="hud-menu-anchors"
        role="group"
        aria-label={t('hud.position')}
      >
        {ANCHOR_ITEMS.map(item => (
          <button
            key={item.id}
            type="button"
            role="menuitemradio"
            aria-checked={anchor === item.id}
            className={anchor === item.id ? 'is-active' : undefined}
            aria-label={t(item.labelKey)}
            title={t(item.labelKey)}
            onClick={() => onAnchor(item.id)}
          >
            {item.icon}
            <span>{t(item.labelKey)}</span>
          </button>
        ))}
      </div>
      <div className="hud-menu-sep" />
      <button type="button" className="danger" role="menuitem" onClick={onExit}>
        {t('hud.quit')}
      </button>
    </div>
  );
}

export function HudModal({
  draft,
  onDraftChange,
  onClose,
  onInsert,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onClose: () => void;
  onInsert: () => void;
}) {
  return (
    <div className="hud-modal" role="dialog" aria-modal="true">
      <h2>{t('hud.editBefore')}</h2>
      <textarea
        value={draft}
        onChange={event => onDraftChange(event.target.value)}
        placeholder={t('hud.textToInsert')}
      />
      <div className="hud-modal-actions">
        <button
          type="button"
          className="hud-btn hud-btn-ghost"
          onClick={onClose}
        >
          {t('hud.cancel')}
        </button>
        <button type="button" className="hud-insert" onClick={onInsert}>
          {t('hud.insert')}
        </button>
      </div>
    </div>
  );
}
