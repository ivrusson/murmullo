import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type PointerEventHandler,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { currentMonitor, getCurrentWindow } from '@tauri-apps/api/window';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { hotkeyParts } from '@/lib/hotkey';
import {
  clampToWorkArea,
  decideOverlayPlacement,
  type OverlayPlacement,
} from '@/lib/overlayPlacement';
import {
  OVERLAY_STYLE_CHANNEL,
  OVERLAY_STYLE_STORAGE_KEY,
  normalizeOverlayStyle,
  readStoredOverlayStyle,
  storeOverlayStyle,
  type OverlayStyle,
} from '@/lib/overlayStyle';
import { insertionService, overlayService } from '@/services/tauri';
import { TranscriptionService } from '@/services/transcriptionService';
import type { AppConfig, OverlayLayout } from '@/types';
import type { MurmulloSceneMode } from '@/mascot/MurmulloView';
import {
  ActionsContent,
  CancelledContent,
  CardActionsContent,
  CardCancelledContent,
  CardDoneContent,
  CardErrorContent,
  CardListeningContent,
  CardProcessingContent,
  CardControlsContent,
  CardHistoryContent,
  CardMenuContent,
  CardReadyContent,
  CardTranscribedContent,
  CompactContent,
  DoneContent,
  ErrorContent,
  HudLayer,
  HudMascot,
  HudModal,
  HudQuickMenu,
  HudStage,
  HudToast,
  HUD_MASCOT_RENDER_SIZE,
  ListeningContent,
  ProcessingContent,
  ReadyContent,
  TranscribedContent,
  type HudHistoryItem,
  type HudMode,
  type HudModalKind,
  type HudNoticeKind,
  type HudTranscription,
  type MascotPlacement,
} from './FloatingBarStates';
import {
  improvePrompt,
  rewriteWithConfiguredLlm,
  summarizePrompt,
  translatePrompt,
} from '@/lib/localLlm';
import {
  queuePendingDictationContext,
  type MurmulloContextLabel,
} from '@/lib/pendingDictationContext';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import {
  mapBackendError,
  parseCodedError,
  t as translate,
  useT,
  type AppMessageKey,
} from '@/i18n';

type BackendState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

const DONE_HOLD_MS = 900;
const RESULT_HOLD_MS = 8000;
const TOAST_HOLD_MS = 3500;
const CANCEL_HOLD_MS = 5000;
const AUTO_INSERT_KEY = 'murmullo.autoInsertOnComplete';
const RESULT_MODES: ReadonlySet<HudMode> = new Set([
  'done',
  'transcribed',
  'actions',
]);
const PANEL_MODES: ReadonlySet<HudMode> = new Set([
  'menu',
  'history',
  'controls',
]);
const STICKY_IDLE_MODES: ReadonlySet<HudMode> = new Set([
  'transcribed',
  'actions',
  'done',
  'cancelled',
  'error',
  'menu',
  'history',
  'controls',
]);
const HUD_LEAVE_MS = 200;
const HUD_TOAST_EXTRA = 40;
const HUD_MENU_EXTRA = 180;
const HUD_MODAL_EXTRA = 220;
const HUD_SHADOW_PAD_X = 56;
const HUD_SHADOW_PAD_Y = 72;

const HUD_MODE_SIZE: Record<HudMode, { width: number; height: number }> = {
  rest: { width: HUD_MASCOT_RENDER_SIZE, height: HUD_MASCOT_RENDER_SIZE },
  ready: { width: 300, height: 64 },
  listening: { width: 340, height: 64 },
  processing: { width: 240, height: 64 },
  done: { width: 168, height: 64 },
  transcribed: { width: 508, height: 64 },
  actions: { width: 508, height: 64 },
  compact: { width: 220, height: 52 },
  cancelled: { width: 300, height: 64 },
  error: { width: 360, height: 64 },
  menu: { width: 280, height: 64 },
  history: { width: 280, height: 64 },
  controls: { width: 280, height: 64 },
};

const ISLAND_MODE_SIZE: Record<HudMode, { width: number; height: number }> = {
  rest: { width: 56, height: 56 },
  ready: { width: 292, height: 56 },
  listening: { width: 252, height: 56 },
  processing: { width: 208, height: 56 },
  done: { width: 148, height: 56 },
  transcribed: { width: 420, height: 56 },
  actions: { width: 460, height: 56 },
  compact: { width: 220, height: 52 },
  cancelled: { width: 268, height: 56 },
  error: { width: 332, height: 56 },
  menu: { width: 280, height: 56 },
  history: { width: 280, height: 56 },
  controls: { width: 280, height: 56 },
};

const CARD_MODE_SIZE: Record<HudMode, { width: number; height: number }> = {
  rest: { width: 280, height: 236 },
  ready: { width: 280, height: 236 },
  listening: { width: 280, height: 248 },
  processing: { width: 280, height: 292 },
  done: { width: 280, height: 132 },
  transcribed: { width: 280, height: 332 },
  actions: { width: 280, height: 280 },
  compact: { width: 220, height: 52 },
  cancelled: { width: 280, height: 176 },
  error: { width: 280, height: 196 },
  menu: { width: 280, height: 336 },
  history: { width: 280, height: 280 },
  controls: { width: 280, height: 268 },
};

const CARD_PERCH = 72;

function contentSize(
  style: OverlayStyle,
  mode: HudMode
): { width: number; height: number } {
  if (style === 'island') return ISLAND_MODE_SIZE[mode];
  if (style === 'card') return CARD_MODE_SIZE[mode];
  return HUD_MODE_SIZE[mode];
}

function mascotPlacement(style: OverlayStyle, mode: HudMode): MascotPlacement {
  if (style === 'card') return 'perch';
  if (style === 'island') return 'inset';
  return mode === 'rest' ? 'rest' : 'inset';
}

type OverlayExtras = { toast: boolean; menu: boolean; modal: boolean };

type OverlayGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  workX: number;
  workY: number;
  workWidth: number;
  workHeight: number;
};

const CLOSED_EXTRAS: OverlayExtras = {
  toast: false,
  menu: false,
  modal: false,
};

function overlayWindowSize(
  style: OverlayStyle,
  mode: HudMode,
  extras: OverlayExtras
): { width: number; height: number } {
  const base = contentSize(style, mode);
  const width = Math.max(base.width, extras.modal ? 360 : 0) + HUD_SHADOW_PAD_X;
  let height = base.height + HUD_SHADOW_PAD_Y;
  if (style === 'pill') {
    height = Math.max(base.height, HUD_MASCOT_RENDER_SIZE) + HUD_SHADOW_PAD_Y;
  } else if (style === 'card') {
    height = base.height + CARD_PERCH + HUD_SHADOW_PAD_Y;
  }
  if (extras.toast) height += HUD_TOAST_EXTRA;
  if (extras.menu) height += HUD_MENU_EXTRA;
  if (extras.modal) height += HUD_MODAL_EXTRA;
  return { width, height };
}

function languageLabelFor(language?: string): string {
  const value = language?.trim().toLowerCase() ?? '';
  if (!value || value === 'auto') return translate('settings.sttLang.auto');
  if (value.startsWith('es')) return translate('settings.sttLang.es');
  if (value.startsWith('en')) return translate('settings.sttLang.en');
  if (value.startsWith('fr')) return translate('settings.sttLang.fr');
  if (value.startsWith('pt')) return translate('settings.sttLang.pt');
  if (value.startsWith('de')) return translate('settings.sttLang.de');
  if (value.startsWith('it')) return translate('settings.sttLang.it');
  return language?.trim() || translate('settings.sttLang.auto');
}

function friendlyModelLabel(model?: string): string {
  const value = model?.trim() ?? '';
  if (!value) return translate('settings.balanced');
  const last = value.split(/[\\/]/).pop() ?? value;
  return (
    last.replace(/\.(gguf|bin|onnx)$/i, '') || translate('settings.balanced')
  );
}

function sceneModeForHud(mode: HudMode): MurmulloSceneMode {
  if (mode === 'error') return 'error';
  switch (mode) {
    case 'listening':
    case 'compact':
      return 'recording';
    case 'processing':
      return 'processing';
    case 'done':
    case 'transcribed':
    case 'actions':
      return 'complete';
    case 'menu':
    case 'history':
    case 'controls':
      return 'idle';
    default:
      return 'idle';
  }
}

function currentOverlayWindow() {
  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
}

function isNoDragTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest('[data-no-drag], button, a, textarea, input, select, kbd')
    )
  );
}

function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const internals = (
    window as Window & {
      __TAURI_INTERNALS__?: { invoke?: unknown };
    }
  ).__TAURI_INTERNALS__;
  return typeof internals?.invoke === 'function';
}

function overlayExtrasHeight(
  style: OverlayStyle,
  mode: HudMode,
  extras: OverlayExtras
): number {
  const full = overlayWindowSize(style, mode, extras);
  const base = overlayWindowSize(style, mode, CLOSED_EXTRAS);
  return Math.max(0, full.height - base.height);
}

function readBrowserOverlayGeometry(): OverlayGeometry {
  const screen = window.screen as Screen & {
    availLeft?: number;
    availTop?: number;
  };
  return {
    x: window.screenX,
    y: window.screenY,
    width: window.outerWidth,
    height: window.outerHeight,
    workX: typeof screen.availLeft === 'number' ? screen.availLeft : 0,
    workY: typeof screen.availTop === 'number' ? screen.availTop : 0,
    workWidth: screen.availWidth,
    workHeight: screen.availHeight,
  };
}

async function readOverlayGeometry(): Promise<OverlayGeometry> {
  const win = currentOverlayWindow();
  if (win && isTauriRuntime()) {
    try {
      const [pos, size, scale, monitor] = await Promise.all([
        win.outerPosition(),
        win.outerSize(),
        win.scaleFactor(),
        currentMonitor().catch(() => null),
      ]);
      const factor = scale > 0 ? scale : 1;
      const work = monitor?.workArea;
      const workScale =
        monitor && monitor.scaleFactor > 0 ? monitor.scaleFactor : factor;
      return {
        x: pos.x / factor,
        y: pos.y / factor,
        width: size.width / factor,
        height: size.height / factor,
        workX: work ? work.position.x / workScale : 0,
        workY: work ? work.position.y / workScale : 0,
        workWidth: work ? work.size.width / workScale : size.width / factor,
        workHeight: work ? work.size.height / workScale : size.height / factor,
      };
    } catch (error) {
      console.error('[murmullo:overlay] geometry failed', error);
    }
  }
  return readBrowserOverlayGeometry();
}

function placementForGeometry(
  style: OverlayStyle,
  mode: HudMode,
  extras: OverlayExtras,
  geometry: OverlayGeometry,
  shift: number
): OverlayPlacement {
  const extrasHeight = overlayExtrasHeight(style, mode, extras);
  if (extrasHeight <= 0) return 'below';
  const base = overlayWindowSize(style, mode, CLOSED_EXTRAS);
  const hudHeight = isTauriRuntime()
    ? base.height
    : Math.max(base.height, geometry.height);
  return decideOverlayPlacement({
    hudY: geometry.y + shift,
    hudHeight,
    extrasHeight,
    workTop: geometry.workY,
    workHeight: geometry.workHeight,
  });
}

function overlayError(error: unknown, fallbackKey: AppMessageKey): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  if (!raw || /invoke|__TAURI|not allowed/i.test(raw)) {
    return translate(fallbackKey);
  }
  return mapBackendError(error);
}

function isPermissionError(message: string): boolean {
  const { code } = parseCodedError(message);
  return (
    code === 'audio.mic_access' ||
    /permiso|permission|micr[oó]fono|microphone|accessib|monitoriz|input monitoring/i.test(
      message
    )
  );
}

function needsOpenApp(message: string): boolean {
  const { code } = parseCodedError(message);
  return (
    isPermissionError(message) ||
    code === 'overlay.unavailable' ||
    /escritorio|desktop/i.test(message)
  );
}

async function persistOverlayPosition(shift: number): Promise<void> {
  try {
    const win = currentOverlayWindow();
    if (!win) return;
    const physical = await win.outerPosition();
    const scale = await win.scaleFactor();
    const factor = scale > 0 ? scale : 1;
    const x = physical.x / factor;
    const y = physical.y / factor + shift;
    await overlayService.savePosition(x, y);
  } catch (error) {
    console.error('[murmullo:overlay] save position failed', error);
  }
}

async function applyOverlayFrame(
  style: OverlayStyle,
  mode: HudMode,
  extras: OverlayExtras,
  shiftRef: { current: number },
  geometryRef: { current: OverlayGeometry | null }
): Promise<OverlayPlacement> {
  const extrasHeight = overlayExtrasHeight(style, mode, extras);
  const fullSize = overlayWindowSize(style, mode, extras);
  const geo = await readOverlayGeometry();
  const anchorX = geo.x;
  const anchorY = geo.y + shiftRef.current;
  const placement = placementForGeometry(
    style,
    mode,
    extras,
    geo,
    shiftRef.current
  );

  if (!isTauriRuntime()) {
    shiftRef.current = 0;
    geometryRef.current = geo;
    return placement;
  }

  const unclampedY =
    placement === 'above' && extrasHeight > 0
      ? anchorY - extrasHeight
      : anchorY;
  const clamped = clampToWorkArea(
    anchorX,
    unclampedY,
    fullSize.width,
    fullSize.height,
    {
      x: geo.workX,
      y: geo.workY,
      width: geo.workWidth,
      height: geo.workHeight,
    }
  );
  const appliedShift =
    placement === 'above' && extrasHeight > 0 ? anchorY - clamped.y : 0;

  const sameSize =
    Math.abs(geo.width - fullSize.width) < 1 &&
    Math.abs(geo.height - fullSize.height) < 1;
  const samePos =
    Math.abs(geo.x - clamped.x) < 1 && Math.abs(geo.y - clamped.y) < 1;
  if (!sameSize || !samePos) {
    try {
      await overlayService.resize(
        fullSize.width,
        fullSize.height,
        clamped.x,
        clamped.y
      );
    } catch (error) {
      console.error('[murmullo:overlay] resize failed', error);
      return placement;
    }
  }

  shiftRef.current = appliedShift;
  geometryRef.current = {
    ...geo,
    x: clamped.x,
    y: clamped.y,
    width: fullSize.width,
    height: fullSize.height,
  };
  return placement;
}

export const FloatingBar: React.FC = () => {
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();
  const [mode, setMode] = useState<HudMode>('rest');
  const [overlayStyle, setOverlayStyle] = useState<OverlayStyle>(
    readStoredOverlayStyle
  );
  const [compactPref, setCompactPref] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcription, setTranscription] = useState<HudTranscription | null>(
    null
  );
  const [notice, setNotice] = useState<{
    kind: HudNoticeKind;
    message: string;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<HudModalKind>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [draft, setDraft] = useState('');
  const [processingMessage, setProcessingMessage] =
    useState('status.processing');
  const [pttParts, setPttParts] = useState<string[]>(['Cmd', 'Opt', 'T']);
  const [placement, setPlacement] = useState<OverlayPlacement>('above');
  const [historyItems, setHistoryItems] = useState<HudHistoryItem[]>([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [autoInsert, setAutoInsert] = useState(() => {
    try {
      return window.localStorage.getItem(AUTO_INSERT_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [sttLanguage, setSttLanguage] = useState('');
  const [modelId, setModelId] = useState('');
  const [errorOpenApp, setErrorOpenApp] = useState(false);

  const modeRef = useRef(mode);
  const overlayStyleRef = useRef(overlayStyle);
  const compactPrefRef = useRef(compactPref);
  const draggingRef = useRef(false);
  const expectingCancelRef = useRef(false);
  const localBusyRef = useRef(false);
  const menuOpenRef = useRef(menuOpen);
  const modalRef = useRef(modal);
  const noticeRef = useRef(notice);
  const hoverRef = useRef(false);
  const pointerDownRef = useRef(false);
  const leaveTimerRef = useRef(0);
  const shiftRef = useRef(0);
  const geometryRef = useRef<OverlayGeometry | null>(null);
  const applyingRef = useRef(false);
  const applyGenRef = useRef(0);
  modeRef.current = mode;
  overlayStyleRef.current = overlayStyle;
  compactPrefRef.current = compactPref;
  menuOpenRef.current = menuOpen;
  modalRef.current = modal;
  noticeRef.current = notice;

  const extras: OverlayExtras = {
    toast: notice !== null,
    menu: menuOpen,
    modal: modal !== null,
  };

  const currentExtras = useCallback(
    (): OverlayExtras => ({
      toast: noticeRef.current !== null,
      menu: menuOpenRef.current,
      modal: modalRef.current !== null,
    }),
    []
  );

  const syncOverlayFrame = useCallback(async () => {
    const gen = ++applyGenRef.current;
    applyingRef.current = true;
    try {
      const next = await applyOverlayFrame(
        overlayStyleRef.current,
        modeRef.current,
        currentExtras(),
        shiftRef,
        geometryRef
      );
      if (gen !== applyGenRef.current) return;
      setPlacement(next);
    } finally {
      if (gen === applyGenRef.current) applyingRef.current = false;
    }
  }, [currentExtras]);

  const saveOverlayPosition = useCallback(() => {
    void persistOverlayPosition(shiftRef.current);
  }, []);

  const closeOverlays = useCallback(() => {
    setMenuOpen(false);
    setModal(null);
  }, []);

  const returnToIdle = useCallback(() => {
    window.clearTimeout(leaveTimerRef.current);
    expectingCancelRef.current = false;
    localBusyRef.current = false;
    setMode('rest');
    setTranscription(null);
    setNotice(null);
    setErrorMessage('');
    setDraft('');
    setHistoryQuery('');
    closeOverlays();
  }, [closeOverlays]);

  const persistAutoInsert = useCallback((next: boolean) => {
    setAutoInsert(next);
    try {
      window.localStorage.setItem(AUTO_INSERT_KEY, next ? '1' : '0');
    } catch {
      // overlay webview without storage
    }
  }, []);

  const showPlainError = useCallback((message: string, openApp = false) => {
    window.clearTimeout(leaveTimerRef.current);
    setErrorMessage(message);
    setErrorOpenApp(openApp);
    setNotice(null);
    setMenuOpen(false);
    setModal(null);
    setMode('error');
  }, []);

  const showError = useCallback(
    (error: unknown, fallbackKey: AppMessageKey = 'errors.generic') => {
      const raw =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : '';
      showPlainError(overlayError(error, fallbackKey), needsOpenApp(raw));
    },
    [showPlainError]
  );

  const startRecording = useCallback(() => {
    closeOverlays();
    expectingCancelRef.current = false;
    if (!isTauriRuntime()) {
      showPlainError(t('hud.desktopOnly'), true);
      return;
    }
    void invoke('overlay_start_dictation').catch(error => {
      console.error('[murmullo:overlay] start failed', error);
      showError(error, 'hud.startFailed');
    });
  }, [closeOverlays, showError, showPlainError, t]);

  const stopRecording = useCallback(() => {
    expectingCancelRef.current = false;
    void invoke('overlay_stop_dictation').catch(error => {
      console.error('[murmullo:overlay] stop failed', error);
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const current = modeRef.current;
    if (current === 'listening' || current === 'compact') {
      expectingCancelRef.current = true;
    }
    void invoke('overlay_cancel_dictation').catch(error => {
      expectingCancelRef.current = false;
      console.error('[murmullo:overlay] cancel failed', error);
    });
  }, []);

  const undoCancel = useCallback(() => {
    expectingCancelRef.current = false;
    startRecording();
  }, [startRecording]);

  const insertCurrent = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value) return;
      try {
        await insertionService.insertText(value);
        returnToIdle();
      } catch (error) {
        console.error('[murmullo:overlay] insert failed', error);
        showError(error, 'hud.insertFailed');
      }
    },
    [returnToIdle, showError]
  );

  const copyAndDismiss = useCallback(() => {
    const text = transcription?.text ?? '';
    if (text) void navigator.clipboard.writeText(text);
    returnToIdle();
  }, [returnToIdle, transcription]);

  const startWithContext = useCallback(
    (context: MurmulloContextLabel) => {
      queuePendingDictationContext(context);
      startRecording();
    },
    [startRecording]
  );

  const rewriteCurrent = useCallback(
    async (prompt: string, busyLabel: string) => {
      const text = transcription?.text?.trim() ?? '';
      if (!text) return;
      closeOverlays();
      localBusyRef.current = true;
      setProcessingMessage(busyLabel);
      setMode('processing');
      try {
        const next = await rewriteWithConfiguredLlm(prompt, text);
        if (next) {
          setTranscription(current =>
            current
              ? { ...current, text: next }
              : { text: next, duration_ms: 0, model_used: '' }
          );
        }
        setMode('transcribed');
        setNotice({
          kind: 'insert',
          message: next ? t('hud.textUpdated') : t('hud.rewriteFailed'),
        });
      } finally {
        localBusyRef.current = false;
      }
    },
    [closeOverlays, transcription, t]
  );

  const openHistory = useCallback(() => {
    closeOverlays();
    setHistoryQuery('');
    setMode('history');
    void TranscriptionService.listTranscriptions()
      .then(items => {
        setHistoryItems(
          items.slice(0, 8).map(item => ({
            id: item.id,
            text: item.text,
            created_at: item.created_at,
          }))
        );
      })
      .catch(error => {
        console.error('[murmullo:overlay] history failed', error);
        showError(error, 'hud.historyFailed');
      });
  }, [closeOverlays, showError]);

  const closePanel = useCallback(() => {
    if (transcription && PANEL_MODES.has(modeRef.current)) {
      setMode('transcribed');
      closeOverlays();
      return;
    }
    returnToIdle();
  }, [closeOverlays, returnToIdle, transcription]);

  const showLastMurmur = useCallback(async () => {
    try {
      const items = await TranscriptionService.listTranscriptions();
      const latest = items[0];
      if (!latest?.text) {
        showPlainError(t('hud.noSaved'));
        return;
      }
      setTranscription({
        text: latest.text,
        duration_ms: latest.duration_ms,
        model_used: latest.model_used,
      });
      setMode('transcribed');
      setNotice({ kind: 'insert', message: t('hud.readyToInsert') });
      setMenuOpen(false);
    } catch (error) {
      console.error('[murmullo:overlay] last murmur failed', error);
      showError(error, 'hud.lastFailed');
    }
  }, [showError, showPlainError, t]);

  const openMainWindow = useCallback(() => {
    setMenuOpen(false);
    setModal(null);
    void invoke('show_main_window').catch(error => {
      console.error('[murmullo:overlay] show main failed', error);
    });
  }, []);

  const exitOverlay = useCallback(() => {
    setMenuOpen(false);
    const win = currentOverlayWindow();
    if (!win) return;
    void win.hide().catch(error => {
      console.error('[murmullo:overlay] hide failed', error);
    });
  }, []);

  const toggleCompactPref = useCallback(() => {
    const next = !compactPrefRef.current;
    setCompactPref(next);
    void overlayService.setCompact(next).catch(error => {
      console.error('[murmullo:overlay] set compact failed', error);
    });
    if (
      modeRef.current === 'listening' &&
      next &&
      overlayStyleRef.current === 'pill'
    ) {
      setMode('compact');
    }
    if (modeRef.current === 'compact' && !next) setMode('listening');
    setMenuOpen(false);
  }, []);

  const beginChromeDrag: PointerEventHandler<HTMLDivElement> = useCallback(
    event => {
      pointerDownRef.current = true;
      window.clearTimeout(leaveTimerRef.current);
      if (event.button !== 0 || isNoDragTarget(event.target)) return;
      draggingRef.current = true;
      const win = currentOverlayWindow();
      if (!win) {
        draggingRef.current = false;
        return;
      }
      void win.startDragging().catch(error => {
        draggingRef.current = false;
        console.error('[murmullo:overlay] drag failed', error);
      });
    },
    []
  );

  const openQuickMenu: MouseEventHandler<HTMLDivElement> = useCallback(
    event => {
      event.preventDefault();
      setMenuOpen(open => !open);
    },
    []
  );

  const enterReady = useCallback(() => {
    hoverRef.current = true;
    window.clearTimeout(leaveTimerRef.current);
    if (overlayStyleRef.current === 'card') return;
    if (modeRef.current === 'rest') setMode('ready');
  }, []);

  const leaveReady = useCallback(() => {
    hoverRef.current = false;
    window.clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = window.setTimeout(() => {
      if (hoverRef.current || pointerDownRef.current) return;
      if (menuOpenRef.current || modalRef.current) return;
      if (modeRef.current === 'ready') setMode('rest');
    }, HUD_LEAVE_MS);
  }, []);

  const applyLayout = useCallback((layout: OverlayLayout) => {
    const nextStyle = normalizeOverlayStyle(layout.style);
    setCompactPref(layout.compact);
    setOverlayStyle(nextStyle);
    storeOverlayStyle(nextStyle);
    if (nextStyle !== 'pill' && modeRef.current === 'compact') {
      setMode('listening');
    }
    if (nextStyle === 'card' && modeRef.current === 'ready') {
      setMode('rest');
    }
  }, []);

  useEffect(() => {
    if (isTauriRuntime()) return;
    const params = new URLSearchParams(window.location.search);
    const preview = params.get('hud');
    const previewText = params.get('text') || 'Preview dictation text.';
    if (preview === 'transcribed' || preview === 'actions') {
      setTranscription({
        text: previewText,
        duration_ms: 0,
        model_used: 'preview',
      });
      setMode(preview);
    }
  }, []);

  useEffect(() => {
    void overlayService
      .getLayout()
      .then(applyLayout)
      .catch(() => {
        setOverlayStyle(readStoredOverlayStyle());
      });

    void invoke<AppConfig>('get_config')
      .then(config => {
        setPttParts(hotkeyParts(config.hotkeys.push_to_talk));
        setSttLanguage(config.runtime?.default_language ?? '');
        setModelId(
          config.ui?.selected_model || config.runtime?.llm_model || ''
        );
      })
      .catch(() => undefined);

    const unlistenRecording = listen('recording-state-changed', event => {
      const payload = event.payload as {
        state: BackendState;
        message?: string;
      };
      if (payload.state === 'recording') {
        expectingCancelRef.current = false;
        setMode(
          overlayStyleRef.current === 'pill' && compactPrefRef.current
            ? 'compact'
            : 'listening'
        );
        setMenuOpen(false);
        setModal(null);
        setNotice(null);
        return;
      }
      if (payload.state === 'processing') {
        expectingCancelRef.current = false;
        setProcessingMessage(payload.message || 'status.processing');
        setMode('processing');
        setMenuOpen(false);
        return;
      }
      if (payload.state === 'done') {
        setMode('done');
        return;
      }
      if (payload.state === 'error') {
        showError(payload.message || 'errors.generic');
        return;
      }
      if (payload.state === 'idle') {
        if (expectingCancelRef.current) {
          expectingCancelRef.current = false;
          setMode('cancelled');
          setNotice(null);
          setMenuOpen(false);
          return;
        }
        const current = modeRef.current;
        if (localBusyRef.current || STICKY_IDLE_MODES.has(current)) {
          return;
        }
        setMode('rest');
        setNotice(null);
      }
    });

    const unlistenTranscription = listen('transcription-completed', event => {
      const payload = event.payload as HudTranscription;
      setTranscription(payload);
      setMenuOpen(false);
      let shouldAutoInsert = false;
      try {
        shouldAutoInsert = window.localStorage.getItem(AUTO_INSERT_KEY) === '1';
      } catch {
        shouldAutoInsert = false;
      }
      if (shouldAutoInsert && payload.text?.trim()) {
        void insertionService
          .insertText(payload.text.trim())
          .then(() => {
            expectingCancelRef.current = false;
            setMode('rest');
            setTranscription(null);
            setNotice(null);
            setMenuOpen(false);
            setModal(null);
          })
          .catch(error => {
            console.error('[murmullo:overlay] auto-insert failed', error);
            setMode('done');
            setNotice({
              kind: 'insert',
              message: translate('hud.readyToInsert'),
            });
          });
        return;
      }
      setMode('done');
      setNotice({ kind: 'insert', message: translate('hud.readyToInsert') });
    });

    const unlistenAudioLevel = listen('audio-level-updated', event => {
      const payload = event.payload as { level: number };
      setAudioLevel(payload.level);
    });

    const unlistenError = listen('error-occurred', event => {
      const payload = event.payload as { message: string };
      showError(payload.message);
    });

    const unlistenLog = listen<{ stage?: string; message?: string }>(
      'pipeline-log',
      event => {
        const stage = event.payload.stage || 'log';
        const message = event.payload.message || '';
        console.log(`[murmullo:${stage}] ${message}`);
      }
    );

    const unlistenLayout = listen<OverlayLayout>(
      'overlay-layout-updated',
      event => {
        applyLayout(event.payload);
      }
    );

    const onStorage = (event: StorageEvent) => {
      if (event.key !== OVERLAY_STYLE_STORAGE_KEY || !event.newValue) return;
      applyLayout({
        x: null,
        y: null,
        compact: compactPrefRef.current,
        style: normalizeOverlayStyle(event.newValue),
      });
    };
    window.addEventListener('storage', onStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(OVERLAY_STYLE_CHANNEL);
      channel.onmessage = event => {
        applyLayout({
          x: null,
          y: null,
          compact: compactPrefRef.current,
          style: normalizeOverlayStyle(
            typeof event.data === 'string' ? event.data : undefined
          ),
        });
      };
    } catch {
      channel = null;
    }

    return () => {
      unlistenRecording.then(fn => fn()).catch(() => undefined);
      unlistenTranscription.then(fn => fn()).catch(() => undefined);
      unlistenAudioLevel.then(fn => fn()).catch(() => undefined);
      unlistenError.then(fn => fn()).catch(() => undefined);
      unlistenLog.then(fn => fn()).catch(() => undefined);
      unlistenLayout.then(fn => fn()).catch(() => undefined);
      window.removeEventListener('storage', onStorage);
      channel?.close();
    };
  }, [applyLayout, showError]);

  useEffect(() => {
    if (mode !== 'done' || !transcription) return undefined;
    const timer = window.setTimeout(() => setMode('transcribed'), DONE_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [mode, transcription]);

  useEffect(() => {
    if (mode !== 'transcribed' && mode !== 'actions') return undefined;
    if (menuOpen || modal) return undefined;
    const timer = window.setTimeout(returnToIdle, RESULT_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [menuOpen, modal, mode, returnToIdle]);

  useEffect(() => {
    if (mode !== 'cancelled') return undefined;
    const timer = window.setTimeout(() => returnToIdle(), CANCEL_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [mode, returnToIdle]);

  useEffect(() => {
    if (!notice || notice.kind !== 'insert') return undefined;
    const timer = window.setTimeout(() => setNotice(null), TOAST_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useLayoutEffect(() => {
    void syncOverlayFrame();
  }, [overlayStyle, mode, notice, menuOpen, modal, syncOverlayFrame]);

  useEffect(() => {
    const endPointer = () => {
      pointerDownRef.current = false;
      if (draggingRef.current) {
        draggingRef.current = false;
        saveOverlayPosition();
        void syncOverlayFrame();
      }
      if (
        !hoverRef.current &&
        modeRef.current === 'ready' &&
        !menuOpenRef.current &&
        !modalRef.current
      ) {
        leaveReady();
      }
    };
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);
    return () => {
      window.removeEventListener('pointerup', endPointer);
      window.removeEventListener('pointercancel', endPointer);
      window.clearTimeout(leaveTimerRef.current);
    };
  }, [leaveReady, saveOverlayPosition, syncOverlayFrame]);

  useEffect(() => {
    void readOverlayGeometry().then(geo => {
      geometryRef.current = geo;
    });
  }, []);

  useEffect(() => {
    const win = currentOverlayWindow();
    if (!win) return undefined;
    let unlisten: (() => void) | undefined;
    let timer: number | undefined;
    void win
      .onMoved(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (applyingRef.current) return;
          saveOverlayPosition();
          if (!draggingRef.current) {
            void syncOverlayFrame();
          }
        }, 140);
      })
      .then(fn => {
        unlisten = fn;
      })
      .catch(() => undefined);
    return () => {
      window.clearTimeout(timer);
      unlisten?.();
    };
  }, [saveOverlayPosition, syncOverlayFrame]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (menuOpen || modal) {
        closeOverlays();
        return;
      }
      if (PANEL_MODES.has(mode)) {
        closePanel();
        return;
      }
      if (mode === 'cancelled' || mode === 'error' || RESULT_MODES.has(mode)) {
        returnToIdle();
        return;
      }
      if (mode === 'listening' || mode === 'compact') {
        cancelRecording();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    cancelRecording,
    closeOverlays,
    closePanel,
    menuOpen,
    modal,
    mode,
    returnToIdle,
  ]);

  const sceneMode = sceneModeForHud(mode);
  const openResultActions = () => {
    if (overlayStyleRef.current === 'card') {
      setMode('menu');
      return;
    }
    setMode('actions');
  };
  const mascot = (
    <HudMascot
      placement={mascotPlacement(overlayStyle, mode)}
      sceneMode={sceneMode}
      level={audioLevel}
      onPointerDown={beginChromeDrag}
      onContextMenu={openQuickMenu}
    />
  );

  const renderBody = () => {
    const listeningVariant =
      overlayStyle === 'island' || mode === 'compact' ? 'island' : 'pill';

    if (overlayStyle === 'card') {
      switch (mode) {
        case 'rest':
        case 'ready':
          return (
            <CardReadyContent
              hotkeyParts={pttParts}
              onStart={startRecording}
              onNotes={() => startWithContext('Trabajo')}
              onEmail={() => startWithContext('Comunicación')}
              onIdea={() => startWithContext('Diseño')}
              onMore={() => setMode('menu')}
              onSettings={() => setMode('controls')}
            />
          );
        case 'listening':
        case 'compact':
          return (
            <CardListeningContent
              audioLevel={audioLevel}
              onStop={stopRecording}
              onCancel={cancelRecording}
            />
          );
        case 'processing':
          return <CardProcessingContent message={processingMessage} />;
        case 'done':
          return <CardDoneContent />;
        case 'transcribed':
          return (
            <CardTranscribedContent
              text={transcription?.text ?? ''}
              onInsert={() => void insertCurrent(transcription?.text ?? '')}
              onCopy={copyAndDismiss}
              onImprove={() =>
                void rewriteCurrent(improvePrompt(), t('hud.improvingShort'))
              }
              onSummarize={() =>
                void rewriteCurrent(
                  summarizePrompt(),
                  t('hud.summarizingShort')
                )
              }
              onTranslate={() =>
                void rewriteCurrent(
                  translatePrompt(),
                  t('hud.translatingShort')
                )
              }
              onOpenActions={() => setMode('menu')}
              onClose={returnToIdle}
              showTimeout={!reducedMotion && !menuOpen && !modal}
            />
          );
        case 'actions':
          return (
            <CardActionsContent
              text={transcription?.text ?? ''}
              onInsert={() => void insertCurrent(transcription?.text ?? '')}
              onCopy={copyAndDismiss}
              onImprove={() =>
                void rewriteCurrent(improvePrompt(), t('hud.improvingShort'))
              }
              onClose={returnToIdle}
              showTimeout={!reducedMotion && !menuOpen && !modal}
            />
          );
        case 'menu':
          return (
            <CardMenuContent
              hotkeyParts={pttParts}
              onDictate={startRecording}
              onNotes={() => startWithContext('Trabajo')}
              onEmail={() => startWithContext('Comunicación')}
              onIdea={() => startWithContext('Diseño')}
              onList={() => startWithContext('Personal')}
              onTranslate={() => startWithContext('Comunicación')}
              onMore={openHistory}
              onClose={closePanel}
            />
          );
        case 'history':
          return (
            <CardHistoryContent
              items={historyItems}
              query={historyQuery}
              onQueryChange={setHistoryQuery}
              onOpenAll={openMainWindow}
              onSelect={item => {
                setTranscription({
                  text: item.text,
                  duration_ms: 0,
                  model_used: '',
                });
                setMode('transcribed');
                setNotice({
                  kind: 'insert',
                  message: t('hud.readyToInsert'),
                });
              }}
              onClose={closePanel}
              formatTime={createdAt => formatRelativeTime(createdAt)}
            />
          );
        case 'controls':
          return (
            <CardControlsContent
              modelLabel={friendlyModelLabel(modelId)}
              languageLabel={languageLabelFor(sttLanguage)}
              autoInsert={autoInsert}
              onToggleAutoInsert={persistAutoInsert}
              onShortcuts={openMainWindow}
              onSettings={openMainWindow}
              onClose={closePanel}
            />
          );
        case 'cancelled':
          return (
            <CardCancelledContent
              reducedMotion={reducedMotion}
              onUndo={undoCancel}
            />
          );
        case 'error':
          return (
            <CardErrorContent
              message={errorMessage || t('common.genericError')}
              onClose={returnToIdle}
              onOpenApp={errorOpenApp ? openMainWindow : undefined}
            />
          );
        default:
          return null;
      }
    }

    switch (mode) {
      case 'ready':
        return <ReadyContent hotkeyParts={pttParts} onStart={startRecording} />;
      case 'listening':
        return (
          <ListeningContent
            variant={listeningVariant}
            audioLevel={audioLevel}
            onStop={stopRecording}
            onCancel={cancelRecording}
          />
        );
      case 'processing':
        return <ProcessingContent message={processingMessage} />;
      case 'done':
        return <DoneContent />;
      case 'transcribed':
        return (
          <TranscribedContent
            text={transcription?.text ?? ''}
            onInsert={() => void insertCurrent(transcription?.text ?? '')}
            onOpenActions={openResultActions}
            onClose={returnToIdle}
            showTimeout={!reducedMotion && !menuOpen && !modal}
          />
        );
      case 'actions':
        return (
          <ActionsContent
            text={transcription?.text ?? ''}
            menuOpen={menuOpen}
            onCopy={copyAndDismiss}
            onImprove={() =>
              void rewriteCurrent(improvePrompt(), t('hud.improvingShort'))
            }
            onToggleMenu={() => setMenuOpen(open => !open)}
            onClose={returnToIdle}
            showTimeout={!reducedMotion && !menuOpen && !modal}
          />
        );
      case 'menu':
      case 'history':
      case 'controls':
        return overlayStyle === 'island' ? (
          <ReadyContent hotkeyParts={pttParts} onStart={startRecording} />
        ) : null;
      case 'compact':
        return (
          <CompactContent
            audioLevel={audioLevel}
            onStop={stopRecording}
            onCancel={cancelRecording}
          />
        );
      case 'cancelled':
        return (
          <CancelledContent reducedMotion={reducedMotion} onUndo={undoCancel} />
        );
      case 'error':
        return (
          <ErrorContent
            message={errorMessage || t('common.genericError')}
            onClose={returnToIdle}
            onOpenApp={errorOpenApp ? openMainWindow : undefined}
          />
        );
      default:
        return null;
    }
  };

  const extrasHeight = overlayExtrasHeight(overlayStyle, mode, extras);
  const stackAbove =
    extrasHeight > 0 &&
    (geometryRef.current
      ? placementForGeometry(
          overlayStyle,
          mode,
          extras,
          geometryRef.current,
          shiftRef.current
        ) === 'above'
      : placement === 'above');
  const pinWindowBottom = stackAbove && isTauriRuntime();

  return (
    <div
      className={`floating-bar-container hud-style-${overlayStyle}${pinWindowBottom ? ' is-above' : ''}${reducedMotion ? ' hud-reduced' : ''}`}
    >
      <div
        className={`hud-column${stackAbove ? ' is-above' : ''}`}
        data-placement={stackAbove ? 'above' : 'below'}
      >
        <HudStage
          style={overlayStyle}
          mode={mode}
          width={contentSize(overlayStyle, mode).width}
          mascot={mascot}
          onPointerDown={beginChromeDrag}
          onPointerEnter={enterReady}
          onPointerLeave={leaveReady}
        >
          {renderBody()}
        </HudStage>
        <HudLayer
          open={
            overlayStyle !== 'card' &&
            notice !== null &&
            notice.kind === 'insert'
          }
          reducedMotion={reducedMotion}
          className=""
        >
          {notice?.kind === 'insert' ? (
            <HudToast kind={notice.kind} message={notice.message} />
          ) : null}
        </HudLayer>
        <HudLayer open={menuOpen} reducedMotion={reducedMotion} className="">
          <HudQuickMenu
            compact={compactPref}
            showCompactToggle={overlayStyle === 'pill'}
            onOpenApp={openMainWindow}
            onLastMurmur={() => void showLastMurmur()}
            onSettings={openMainWindow}
            onToggleCompact={toggleCompactPref}
            onExit={exitOverlay}
          />
        </HudLayer>
        <HudLayer
          open={modal === 'edit'}
          reducedMotion={reducedMotion}
          className=""
        >
          {modal === 'edit' ? (
            <HudModal
              draft={draft}
              onDraftChange={setDraft}
              onClose={() => setModal(null)}
              onInsert={() => void insertCurrent(draft)}
            />
          ) : null}
        </HudLayer>
      </div>
    </div>
  );
};
