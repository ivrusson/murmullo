import {
  useEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from 'react';
import {
  Check,
  Copy,
  Keyboard,
  Mic,
  MoreHorizontal,
  Play,
  Search,
  Settings,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { MurmulloView, type MurmulloSceneMode } from '@/mascot/MurmulloView';
import type { OverlayStyle } from '@/lib/overlayStyle';
import { WaveformVisualization } from './WaveformVisualization';
import { t, translateBackendMessage } from '@/i18n';

export type HudMode =
  | 'rest'
  | 'ready'
  | 'listening'
  | 'processing'
  | 'done'
  | 'transcribed'
  | 'actions'
  | 'compact'
  | 'cancelled'
  | 'error'
  | 'menu'
  | 'history'
  | 'controls';

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

/** Render size of the 2D scene. CSS scales this down in pill/island modes. */
export const HUD_MASCOT_RENDER_SIZE = 140;
export const HUD_MASCOT_PILL_SIZE = 48;

export type MascotPlacement = 'rest' | 'inset' | 'perch';

type MascotProps = {
  placement: MascotPlacement;
  sceneMode: MurmulloSceneMode;
  level?: number;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
};

export function HudMascot({
  placement,
  sceneMode,
  level,
  onPointerDown,
  onContextMenu,
}: MascotProps) {
  const className =
    placement === 'rest'
      ? 'hud-mascot-rest'
      : placement === 'perch'
        ? 'hud-mascot-perch'
        : 'hud-mascot';
  return (
    <div
      className={className}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
    >
      <div className="hud-mascot-scene">
        <MurmulloView
          kind="2d"
          size={HUD_MASCOT_RENDER_SIZE}
          frame={placement === 'rest' ? 'haze' : 'body'}
          sceneMode={sceneMode}
          level={level}
          interactive={false}
        />
      </div>
    </div>
  );
}

export function HudStage({
  style,
  mode,
  width,
  mascot,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  children,
}: {
  style: OverlayStyle;
  mode: HudMode;
  width: number;
  mascot: ReactNode;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onPointerEnter?: PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: PointerEventHandler<HTMLDivElement>;
  children: ReactNode;
}) {
  const rest = mode === 'rest';

  if (style === 'card') {
    return (
      <div
        className={`hud-stage is-card${rest ? ' is-rest' : ''}`}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {mascot}
        <div
          className="hud-card"
          data-mode={mode}
          style={{ width }}
          onPointerDown={onPointerDown}
        >
          <div key={mode} className="hud-card-body">
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (style === 'island') {
    return (
      <div
        className={`hud-stage is-island${rest ? ' is-rest' : ''}`}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <div
          className="hud-pill"
          data-mode={mode}
          style={{ width }}
          onPointerDown={onPointerDown}
        >
          {mascot}
          {rest ? null : (
            <div key={mode} className="hud-body">
              {children}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`hud-stage is-pill${rest ? ' is-rest' : ''}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {mascot}
      <div
        className="hud-pill"
        data-mode={mode}
        style={{ width: rest ? 0 : width }}
        onPointerDown={onPointerDown}
      >
        {rest ? null : (
          <div key={mode} className="hud-body">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function ReadyContent({
  onStart,
  hotkeyParts,
}: {
  onStart: () => void;
  hotkeyParts: string[];
}) {
  const parts = hotkeyParts.length > 0 ? hotkeyParts : ['Cmd', 'Opt', 'T'];
  return (
    <>
      <button type="button" className="hud-copy" data-no-drag onClick={onStart}>
        <span className="hud-mic" aria-hidden>
          <Mic size={14} strokeWidth={2.2} />
        </span>
        <span className="hud-label">{t('hud.pressToTalk')}</span>
      </button>
      <span className="hud-keys" aria-label={parts.join(' + ')}>
        {parts.map(part => (
          <kbd key={part} className="hud-key">
            {part}
          </kbd>
        ))}
      </span>
    </>
  );
}

export function ListeningContent({
  audioLevel,
  onStop,
  onCancel,
  variant = 'pill',
}: {
  audioLevel: number;
  onStop: () => void;
  onCancel: () => void;
  variant?: 'pill' | 'island';
}) {
  return (
    <>
      <span className="hud-blush live" aria-hidden />
      <WaveformVisualization audioLevel={audioLevel} bars={16} barWidth={2.5} />
      {variant === 'pill' ? (
        <button
          type="button"
          className="hud-cancel"
          data-no-drag
          aria-label={t('hud.cancel')}
          onClick={onCancel}
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      ) : null}
      <button
        type="button"
        className={variant === 'island' ? 'hud-stop' : 'hud-confirm'}
        data-no-drag
        aria-label={t('hud.stop')}
        onClick={onStop}
      >
        {variant === 'island' ? (
          <Square size={10} fill="currentColor" strokeWidth={0} />
        ) : (
          <Check size={15} strokeWidth={2.6} />
        )}
      </button>
    </>
  );
}

export function ProcessingContent({ message }: { message?: string }) {
  return (
    <span className="hud-copy">
      <span className="hud-label muted">
        {translateBackendMessage(message || 'status.processing')}
      </span>
    </span>
  );
}

export function DoneContent() {
  return (
    <span className="hud-copy">
      <span className="hud-label">{t('hud.done')}</span>
    </span>
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

export function TranscribedContent({
  text,
  onInsert,
  onOpenActions,
  onClose,
  showTimeout,
}: {
  text: string;
  onInsert: () => void;
  onOpenActions: () => void;
  onClose: () => void;
  showTimeout?: boolean;
}) {
  return (
    <>
      <span className="hud-text" title={text}>
        {text}
      </span>
      <button
        type="button"
        className="hud-insert"
        data-no-drag
        aria-label={t('hud.insert')}
        onClick={onInsert}
      >
        <Play size={14} fill="currentColor" />
      </button>
      <button
        type="button"
        className="hud-icon-btn"
        data-no-drag
        aria-label={t('hud.moreActions')}
        onClick={onOpenActions}
      >
        <MoreHorizontal size={16} />
      </button>
      <button
        type="button"
        className="hud-cancel"
        data-no-drag
        aria-label={t('hud.close')}
        onClick={onClose}
      >
        <X size={14} strokeWidth={2.4} />
      </button>
      <ResultTimeout visible={showTimeout} />
    </>
  );
}

export function ActionsContent({
  text,
  menuOpen,
  onCopy,
  onImprove,
  onToggleMenu,
  onClose,
  showTimeout,
}: {
  text: string;
  menuOpen: boolean;
  onCopy: () => void;
  onImprove: () => void;
  onToggleMenu: () => void;
  onClose: () => void;
  showTimeout?: boolean;
}) {
  return (
    <>
      <span className="hud-text" title={text}>
        {text}
      </span>
      <button type="button" className="hud-btn" data-no-drag onClick={onCopy}>
        <Copy size={13} strokeWidth={2.2} />
        {t('hud.copy')}
      </button>
      <button
        type="button"
        className="hud-btn hud-btn-ghost"
        data-no-drag
        onClick={onImprove}
      >
        <Sparkles size={13} strokeWidth={2.2} />
        {t('hud.improve')}
      </button>
      <button
        type="button"
        className="hud-icon-btn"
        data-no-drag
        aria-label={t('hud.quickMenu')}
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
      >
        <MoreHorizontal size={16} />
      </button>
      <button
        type="button"
        className="hud-cancel"
        data-no-drag
        aria-label={t('hud.close')}
        onClick={onClose}
      >
        <X size={14} strokeWidth={2.4} />
      </button>
      <ResultTimeout visible={showTimeout} />
    </>
  );
}

export function CompactContent({
  onStop,
}: {
  audioLevel?: number;
  onStop: () => void;
  onCancel?: () => void;
}) {
  return (
    <>
      <span className="hud-mic" aria-hidden>
        <Mic size={14} strokeWidth={2.2} />
      </span>
      <span className="hud-label">{t('hud.dictating')}</span>
      <button
        type="button"
        className="hud-stop"
        data-no-drag
        aria-label={t('hud.stop')}
        onClick={onStop}
      >
        <Square size={10} fill="currentColor" strokeWidth={0} />
      </button>
    </>
  );
}

function CardFrame({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="hud-card-frame">
      <div className="hud-card-heading">
        <div className="hud-card-heading-row">
          <h2>{title}</h2>
          {onClose ? (
            <button
              type="button"
              className="hud-card-close"
              data-no-drag
              aria-label={t('hud.close')}
              onClick={onClose}
            >
              <X size={14} strokeWidth={2.4} />
            </button>
          ) : null}
        </div>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function CardChips({
  items,
}: {
  items: Array<{ label: string; onClick: () => void }>;
}) {
  return (
    <div className="hud-card-chips">
      {items.map(item => (
        <button
          key={item.label}
          type="button"
          className="hud-card-chip"
          data-no-drag
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function CardReadyContent({
  onStart,
  hotkeyParts,
  onNotes,
  onEmail,
  onIdea,
  onMore,
  onSettings,
}: {
  onStart: () => void;
  hotkeyParts: string[];
  onNotes: () => void;
  onEmail: () => void;
  onIdea: () => void;
  onMore: () => void;
  onSettings: () => void;
}) {
  const parts = hotkeyParts.length > 0 ? hotkeyParts : ['Cmd', 'Space'];
  return (
    <CardFrame title={t('common.brand')} subtitle={t('nav.tagline')}>
      <button
        type="button"
        className="hud-card-cta"
        data-no-drag
        onClick={onStart}
      >
        <span className="hud-mic" aria-hidden>
          <Mic size={14} strokeWidth={2.2} />
        </span>
        <span className="hud-label">
          {t('hud.pressParts', { parts: parts.join(' ') })}
        </span>
      </button>
      <div className="hud-card-idle-row">
        <CardChips
          items={[
            { label: t('hud.chipNote'), onClick: onNotes },
            { label: t('hud.chipEmail'), onClick: onEmail },
            { label: t('hud.chipIdea'), onClick: onIdea },
            { label: t('hud.chipMore'), onClick: onMore },
          ]}
        />
        <button
          type="button"
          className="hud-card-gear"
          data-no-drag
          aria-label={t('hud.controls')}
          onClick={onSettings}
        >
          <Settings size={14} strokeWidth={2.2} />
        </button>
      </div>
    </CardFrame>
  );
}

export function CardListeningContent({
  audioLevel,
  onStop,
  onCancel,
}: {
  audioLevel: number;
  onStop: () => void;
  onCancel: () => void;
}) {
  return (
    <CardFrame title={t('hud.listening')} subtitle={t('hud.voiceForms')}>
      <div className="hud-card-wave">
        <WaveformVisualization audioLevel={audioLevel} bars={22} barWidth={3} />
      </div>
      <button
        type="button"
        className="hud-card-stop"
        data-no-drag
        aria-label={t('hud.stop')}
        onClick={onStop}
      >
        <Square size={12} fill="currentColor" strokeWidth={0} />
      </button>
      <button
        type="button"
        className="hud-card-hint"
        data-no-drag
        onClick={onCancel}
      >
        {t('hud.pressEsc')}
      </button>
    </CardFrame>
  );
}

function processSteps(): string[] {
  return [
    t('hud.transcribing'),
    t('hud.improving'),
    t('hud.detecting'),
    t('hud.almost'),
  ];
}

export function CardProcessingContent({ message }: { message?: string }) {
  const [step, setStep] = useState(0);
  const steps = processSteps();
  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep(current => Math.min(current + 1, steps.length - 1));
    }, 700);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <CardFrame
      title={t('hud.processing')}
      subtitle={
        translateBackendMessage(message || 'status.processing') ||
        t('hud.organizing')
      }
    >
      <span className="hud-card-orb" aria-hidden />
      <ul className="hud-card-checklist">
        {steps.map((label, index) => (
          <li key={index} className={index <= step ? 'is-done' : undefined}>
            <span aria-hidden>{index <= step ? '✓' : '○'}</span>
            {label}
          </li>
        ))}
      </ul>
    </CardFrame>
  );
}

export function CardDoneContent() {
  return <CardFrame title={t('hud.done')} subtitle={t('hud.aMoment')} />;
}

export function CardTranscribedContent({
  text,
  onInsert,
  onCopy,
  onImprove,
  onSummarize,
  onTranslate,
  onOpenActions,
  onClose,
  showTimeout,
}: {
  text: string;
  onInsert: () => void;
  onCopy: () => void;
  onImprove: () => void;
  onSummarize: () => void;
  onTranslate: () => void;
  onOpenActions: () => void;
  onClose: () => void;
  showTimeout?: boolean;
}) {
  return (
    <CardFrame
      title={t('hud.done')}
      subtitle={t('hud.whatNext')}
      onClose={onClose}
    >
      <p className="hud-card-quote" title={text}>
        {text}
      </p>
      <div className="hud-card-row">
        <button
          type="button"
          className="hud-insert hud-insert-label"
          data-no-drag
          onClick={onInsert}
        >
          {t('hud.insert')}
        </button>
        <button type="button" className="hud-btn" data-no-drag onClick={onCopy}>
          <Copy size={13} strokeWidth={2.2} />
          {t('hud.copy')}
        </button>
      </div>
      <CardChips
        items={[
          { label: t('hud.improve'), onClick: onImprove },
          { label: t('hud.summarize'), onClick: onSummarize },
          { label: t('hud.translate'), onClick: onTranslate },
          { label: t('hud.chipMore'), onClick: onOpenActions },
        ]}
      />
      <ResultTimeout visible={showTimeout} />
    </CardFrame>
  );
}

export function CardActionsContent({
  text,
  onInsert,
  onCopy,
  onImprove,
  onClose,
  showTimeout,
}: {
  text: string;
  onInsert: () => void;
  onCopy: () => void;
  onImprove: () => void;
  onClose: () => void;
  showTimeout?: boolean;
}) {
  return (
    <CardFrame
      title={t('hud.actions')}
      subtitle={t('hud.adjustBefore')}
      onClose={onClose}
    >
      <p className="hud-card-quote" title={text}>
        {text}
      </p>
      <div className="hud-card-row">
        <button
          type="button"
          className="hud-insert hud-insert-label"
          data-no-drag
          onClick={onInsert}
        >
          {t('hud.insert')}
        </button>
        <button type="button" className="hud-btn" data-no-drag onClick={onCopy}>
          <Copy size={13} strokeWidth={2.2} />
          {t('hud.copy')}
        </button>
        <button
          type="button"
          className="hud-btn hud-btn-ghost"
          data-no-drag
          onClick={onImprove}
        >
          <Sparkles size={13} strokeWidth={2.2} />
          {t('hud.improve')}
        </button>
      </div>
      <ResultTimeout visible={showTimeout} />
    </CardFrame>
  );
}

export function CardMenuContent({
  hotkeyParts,
  onDictate,
  onNotes,
  onEmail,
  onIdea,
  onList,
  onTranslate,
  onMore,
  onClose,
}: {
  hotkeyParts: string[];
  onDictate: () => void;
  onNotes: () => void;
  onEmail: () => void;
  onIdea: () => void;
  onList: () => void;
  onTranslate: () => void;
  onMore: () => void;
  onClose: () => void;
}) {
  const shortcut = hotkeyParts.length > 0 ? hotkeyParts.join('') : '⌘Space';
  return (
    <CardFrame title={t('hud.actions')} onClose={onClose}>
      <div className="hud-card-menu" role="menu">
        <button type="button" role="menuitem" data-no-drag onClick={onDictate}>
          <span>{t('hud.dictate')}</span>
          <kbd>{shortcut}</kbd>
        </button>
        <button type="button" role="menuitem" data-no-drag onClick={onNotes}>
          {t('hud.takeNote')}
        </button>
        <button type="button" role="menuitem" data-no-drag onClick={onEmail}>
          {t('hud.writeEmail')}
        </button>
        <button type="button" role="menuitem" data-no-drag onClick={onIdea}>
          {t('hud.developIdea')}
        </button>
        <button type="button" role="menuitem" data-no-drag onClick={onList}>
          {t('hud.makeList')}
        </button>
        <button
          type="button"
          role="menuitem"
          data-no-drag
          onClick={onTranslate}
        >
          {t('hud.translate')}
        </button>
        <button type="button" role="menuitem" data-no-drag onClick={onMore}>
          {t('hud.moreActionsEllipsis')}
        </button>
      </div>
    </CardFrame>
  );
}

export function CardHistoryContent({
  items,
  query,
  onQueryChange,
  onOpenAll,
  onSelect,
  onClose,
  formatTime,
}: {
  items: HudHistoryItem[];
  query: string;
  onQueryChange: (value: string) => void;
  onOpenAll: () => void;
  onSelect: (item: HudHistoryItem) => void;
  onClose: () => void;
  formatTime: (createdAt: string) => string;
}) {
  const filtered = items.filter(item =>
    item.text.toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <CardFrame title={t('hud.recent')} onClose={onClose}>
      <label className="hud-card-search">
        <Search size={14} strokeWidth={2.2} />
        <input
          data-no-drag
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          placeholder={t('hud.search')}
        />
      </label>
      <ul className="hud-card-history">
        {filtered.length === 0 ? (
          <li className="is-empty">{t('hud.noMurmullos')}</li>
        ) : (
          filtered.slice(0, 3).map(item => (
            <li key={item.id}>
              <button type="button" data-no-drag onClick={() => onSelect(item)}>
                <span>{item.text}</span>
                <small>{formatTime(item.created_at)}</small>
              </button>
            </li>
          ))
        )}
      </ul>
      <button
        type="button"
        className="hud-card-more"
        data-no-drag
        onClick={onOpenAll}
      >
        {t('hud.seeAll')}
      </button>
    </CardFrame>
  );
}

export function CardControlsContent({
  modelLabel,
  languageLabel,
  autoInsert,
  onToggleAutoInsert,
  onShortcuts,
  onSettings,
  onClose,
}: {
  modelLabel: string;
  languageLabel: string;
  autoInsert: boolean;
  onToggleAutoInsert: (next: boolean) => void;
  onShortcuts: () => void;
  onSettings: () => void;
  onClose: () => void;
}) {
  return (
    <CardFrame title={t('hud.controls')} onClose={onClose}>
      <div className="hud-card-controls">
        <div className="hud-card-control">
          <span>{t('hud.model')}</span>
          <strong>{modelLabel}</strong>
        </div>
        <div className="hud-card-control">
          <span>{t('hud.language')}</span>
          <strong>{languageLabel}</strong>
        </div>
        <label className="hud-card-control">
          <span>{t('hud.autoInsert')}</span>
          <input
            type="checkbox"
            data-no-drag
            checked={autoInsert}
            onChange={event => onToggleAutoInsert(event.target.checked)}
          />
        </label>
        <button
          type="button"
          className="hud-card-control is-button"
          data-no-drag
          onClick={onShortcuts}
        >
          <span>
            <Keyboard size={14} strokeWidth={2.2} />
            {t('hud.shortcuts')}
          </span>
          <strong>⌘K</strong>
        </button>
        <button
          type="button"
          className="hud-card-control is-button"
          data-no-drag
          onClick={onSettings}
        >
          {t('common.settings')}
        </button>
      </div>
    </CardFrame>
  );
}

export function CardCancelledContent({
  onUndo,
  reducedMotion,
}: {
  onUndo: () => void;
  reducedMotion: boolean;
}) {
  return (
    <CardFrame title={t('hud.cancelledTitle')} subtitle={t('hud.notSaved')}>
      <button type="button" className="hud-btn" data-no-drag onClick={onUndo}>
        {t('hud.undo')}
      </button>
      {reducedMotion ? null : (
        <span className="hud-timeout" aria-hidden>
          <span className="hud-timeout-bar" />
        </span>
      )}
    </CardFrame>
  );
}

export function CardErrorContent({
  message,
  onClose,
  onOpenApp,
}: {
  message: string;
  onClose: () => void;
  onOpenApp?: () => void;
}) {
  return (
    <CardFrame title={t('common.genericError')} subtitle={message}>
      <div className="hud-card-row">
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
          className="hud-cancel"
          data-no-drag
          aria-label={t('hud.close')}
          onClick={onClose}
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      </div>
    </CardFrame>
  );
}

export function ErrorContent({
  message,
  onClose,
  onOpenApp,
}: {
  message: string;
  onClose: () => void;
  onOpenApp?: () => void;
}) {
  return (
    <>
      <span className="hud-copy">
        <span className="hud-label">{message}</span>
      </span>
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
        className="hud-cancel"
        data-no-drag
        aria-label={t('hud.close')}
        onClick={onClose}
      >
        <X size={14} strokeWidth={2.4} />
      </button>
    </>
  );
}

export function CancelledContent({
  onUndo,
  reducedMotion,
}: {
  onUndo: () => void;
  reducedMotion: boolean;
}) {
  return (
    <>
      <span className="hud-label">{t('hud.cancelled')}</span>
      <button type="button" className="hud-btn" data-no-drag onClick={onUndo}>
        {t('hud.undo')}
      </button>
      {reducedMotion ? null : (
        <span className="hud-timeout" aria-hidden>
          <span className="hud-timeout-bar" />
        </span>
      )}
    </>
  );
}

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
    const timer = window.setTimeout(() => setPresent(false), 200);
    return () => window.clearTimeout(timer);
  }, [open, reducedMotion]);

  if (!present) return null;
  return (
    <div
      className={`hud-layer ${className}${open ? ' is-open' : ' is-leaving'}`}
      data-no-drag
    >
      {open ? children : cached.current}
    </div>
  );
}

export function HudToast({
  message,
  kind = 'insert',
}: {
  message: string;
  kind?: HudNoticeKind;
}) {
  return (
    <div className={`hud-toast${kind === 'error' ? ' is-error' : ''}`}>
      {message}
    </div>
  );
}

export function HudQuickMenu({
  compact,
  showCompactToggle = true,
  onOpenApp,
  onLastMurmur,
  onSettings,
  onToggleCompact,
  onExit,
}: {
  compact: boolean;
  showCompactToggle?: boolean;
  onOpenApp: () => void;
  onLastMurmur: () => void;
  onSettings: () => void;
  onToggleCompact: () => void;
  onExit: () => void;
}) {
  return (
    <div className="hud-menu" role="menu">
      <button type="button" role="menuitem" onClick={onOpenApp}>
        {t('hud.openApp')}
      </button>
      <button type="button" role="menuitem" onClick={onLastMurmur}>
        {t('hud.lastMurmullo')}
      </button>
      <button type="button" role="menuitem" onClick={onSettings}>
        {t('common.settings')}
      </button>
      {showCompactToggle ? (
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={compact}
          onClick={onToggleCompact}
        >
          {compact ? t('hud.fullBar') : t('hud.compactMode')}
        </button>
      ) : null}
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
