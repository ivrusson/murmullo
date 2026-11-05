import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { currentMonitor, getCurrentWindow } from '@tauri-apps/api/window';
import { useOverlayClickThrough } from '@/hooks/useOverlayClickThrough';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { hotkeyParts } from '@/lib/hotkey';
import type { OverlayWorkArea } from '@/lib/overlayPlacement';
import {
  mascotPointForAnchor,
  normalizeOverlayAnchor,
  type OverlayAnchor,
} from '@/lib/overlayAnchor';
import {
  mascotFromWindow,
  overlayWindowSize,
  stageSizeForMode,
  windowOriginForMascot,
  type HudPanelKind,
  type HudPoint,
  type HudSize,
} from '@/lib/overlayFrame';
import { insertionService, overlayService } from '@/services/tauri';
import { TranscriptionService } from '@/services/transcriptionService';
import type { AppConfig, OverlayLayout } from '@/types';
import type { MurmulloSceneMode } from '@/mascot/MurmulloView';
import {
  CancelledPanel,
  ErrorPanel,
  HudLayer,
  HudMascot,
  HudModal,
  HudPanel,
  HudQuickMenu,
  HudStage,
  HudToast,
  ListeningOrbitals,
  ProcessingToast,
  ReadyOrbitals,
  ResultPanel,
  type HudMode,
  type HudModalKind,
  type HudNoticeKind,
  type HudTranscription,
  type OrbitalActionId,
} from './FloatingBarStates';
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

/** Missing key means on: dictation pastes into the focused field unless the user opts out. */
function storedAutoInsert(): boolean | null {
  try {
    const value = window.localStorage.getItem(AUTO_INSERT_KEY);
    if (value === '0') return false;
    if (value === '1') return true;
    return null;
  } catch {
    return null;
  }
}

const RESULT_MODES: ReadonlySet<HudMode> = new Set([
  'done',
  'transcribed',
  'actions',
]);
const STICKY_IDLE_MODES: ReadonlySet<HudMode> = new Set([
  'transcribed',
  'actions',
  'done',
  'cancelled',
  'error',
]);
const HUD_LEAVE_MS = 200;
/**
 * Window shrinks wait for the leave transitions (orbitals, panel) to finish.
 * Must cover --hud-duration plus the orbital stagger.
 */
const HUD_SHRINK_DELAY_MS = 240;

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

function workAreaOf(geo: OverlayGeometry): OverlayWorkArea {
  return {
    x: geo.workX,
    y: geo.workY,
    width: geo.workWidth,
    height: geo.workHeight,
  };
}

function sceneModeForHud(mode: HudMode): MurmulloSceneMode {
  if (mode === 'error') return 'error';
  switch (mode) {
    case 'listening':
      return 'recording';
    case 'processing':
      return 'processing';
    case 'done':
    case 'transcribed':
    case 'actions':
      return 'complete';
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

function isEditableOverlayTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'textarea, input:not([type="button"]):not([type="submit"]):not([type="reset"]), [contenteditable="true"]'
      )
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

function sizeFits(outer: HudSize | null, inner: HudSize): boolean {
  if (!outer) return false;
  return outer.width + 0.5 >= inner.width && outer.height + 0.5 >= inner.height;
}

/**
 * Move/resize the native window so it stays symmetric around the mascot.
 * Returns the geometry the window now has.
 */
async function applyOverlayFrame(
  target: HudSize,
  mascotRef: { current: HudPoint | null }
): Promise<OverlayGeometry> {
  const geo = await readOverlayGeometry();
  if (!mascotRef.current) {
    const derived = mascotFromWindow(
      { x: geo.x, y: geo.y },
      { width: geo.width, height: geo.height }
    );
    mascotRef.current = { x: Math.round(derived.x), y: Math.round(derived.y) };
  }
  const origin = windowOriginForMascot(mascotRef.current, target);

  if (!isTauriRuntime()) {
    return geo;
  }

  const sameSize =
    Math.abs(geo.width - target.width) < 1 &&
    Math.abs(geo.height - target.height) < 1;
  const samePos =
    Math.abs(geo.x - origin.x) < 1 && Math.abs(geo.y - origin.y) < 1;
  if (!sameSize || !samePos) {
    await overlayService.resize(
      target.width,
      target.height,
      origin.x,
      origin.y
    );
  }
  return {
    ...geo,
    x: origin.x,
    y: origin.y,
    width: target.width,
    height: target.height,
  };
}

export const FloatingBar: React.FC = () => {
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();
  const [mode, setMode] = useState<HudMode>('rest');
  const [anchor, setAnchor] = useState<OverlayAnchor>('bottom');
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
  const [autoInsert, setAutoInsert] = useState(
    () => storedAutoInsert() ?? true
  );
  const [errorOpenApp, setErrorOpenApp] = useState(false);
  /** Window box the native window currently has (after our last apply). */
  const [appliedSize, setAppliedSize] = useState<HudSize | null>(null);
  const [work, setWork] = useState<OverlayWorkArea | null>(null);
  const [mascotPoint, setMascotPoint] = useState<HudPoint | null>(null);

  const modeRef = useRef(mode);
  const draggingRef = useRef(false);
  const expectingCancelRef = useRef(false);
  const localBusyRef = useRef(false);
  const menuOpenRef = useRef(menuOpen);
  const modalRef = useRef(modal);
  const hoverRef = useRef(false);
  const pointerDownRef = useRef(false);
  const leaveTimerRef = useRef(0);
  const shrinkTimerRef = useRef(0);
  const geometryRef = useRef<OverlayGeometry | null>(null);
  const mascotRef = useRef<HudPoint | null>(null);
  const applyingRef = useRef(false);
  const applyGenRef = useRef(0);
  const autoInsertRef = useRef(autoInsert);
  const lastPanelRef = useRef<HudPanelKind>('result');
  modeRef.current = mode;
  autoInsertRef.current = autoInsert;
  menuOpenRef.current = menuOpen;
  modalRef.current = modal;

  const panelKind: HudPanelKind | null =
    modal === 'edit'
      ? 'edit'
      : menuOpen
        ? 'menu'
        : mode === 'transcribed' || mode === 'actions'
          ? 'result'
          : mode === 'cancelled' || mode === 'error'
            ? 'notice'
            : null;
  if (panelKind) lastPanelRef.current = panelKind;
  const panelRef = useRef(panelKind);
  panelRef.current = panelKind;
  const hasNotice = notice !== null;
  const noticeRef = useRef(hasNotice);
  noticeRef.current = hasNotice;

  const publishGeometry = useCallback((geo: OverlayGeometry) => {
    geometryRef.current = geo;
    setWork(workAreaOf(geo));
    setAppliedSize({ width: geo.width, height: geo.height });
    if (mascotRef.current) setMascotPoint(mascotRef.current);
  }, []);

  /**
   * Bring the window to the box the current mode/panel needs.
   * Growth is immediate; shrinking waits for leave transitions so nothing is
   * clipped mid-animation.
   */
  const syncOverlayFrame = useCallback(async () => {
    const gen = ++applyGenRef.current;
    window.clearTimeout(shrinkTimerRef.current);
    const target = overlayWindowSize(
      modeRef.current,
      panelRef.current,
      noticeRef.current
    );
    const current = geometryRef.current;
    const grows =
      !current ||
      target.width > current.width + 0.5 ||
      target.height > current.height + 0.5;
    const shrinks =
      !grows &&
      current !== null &&
      (target.width < current.width - 0.5 ||
        target.height < current.height - 0.5);

    if (shrinks && !reducedMotion) {
      await new Promise<void>(resolve => {
        shrinkTimerRef.current = window.setTimeout(
          resolve,
          HUD_SHRINK_DELAY_MS
        );
      });
      if (gen !== applyGenRef.current) return;
    }

    applyingRef.current = true;
    try {
      const geo = await applyOverlayFrame(target, mascotRef);
      if (gen !== applyGenRef.current) return;
      publishGeometry(geo);
    } catch (error) {
      console.error('[murmullo:overlay] frame failed', error);
    } finally {
      if (gen === applyGenRef.current) applyingRef.current = false;
    }
  }, [publishGeometry, reducedMotion]);

  /** After a drag: the window is symmetric, so its center is the mascot. */
  const saveOverlayPosition = useCallback(async () => {
    try {
      const geo = await readOverlayGeometry();
      const derived = mascotFromWindow(
        { x: geo.x, y: geo.y },
        { width: geo.width, height: geo.height }
      );
      const next = { x: Math.round(derived.x), y: Math.round(derived.y) };
      const prev = mascotRef.current;
      geometryRef.current = geo;
      setWork(workAreaOf(geo));
      if (
        prev &&
        Math.abs(prev.x - next.x) < 1 &&
        Math.abs(prev.y - next.y) < 1
      ) {
        return;
      }
      mascotRef.current = next;
      setMascotPoint(next);
      if (!isTauriRuntime()) return;
      await overlayService.savePosition(next.x, next.y);
      setAnchor('custom');
    } catch (error) {
      console.error('[murmullo:overlay] save position failed', error);
    }
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
    closeOverlays();
  }, [closeOverlays]);

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
    if (modeRef.current === 'listening') {
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

  /**
   * Cardinal snap: pick the mascot point for that edge, move the window
   * around it (same math the window always uses), then persist edge + point.
   */
  const snapToAnchor = useCallback(
    (next: Exclude<OverlayAnchor, 'custom'>) => {
      setAnchor(next);
      setMenuOpen(false);
      void (async () => {
        try {
          const geo = geometryRef.current ?? (await readOverlayGeometry());
          const point = mascotPointForAnchor(next, workAreaOf(geo));
          mascotRef.current = {
            x: Math.round(point.x),
            y: Math.round(point.y),
          };
          setMascotPoint(mascotRef.current);
          await syncOverlayFrame();
          if (!isTauriRuntime()) return;
          const layout = await overlayService.setAnchor(
            next,
            mascotRef.current.x,
            mascotRef.current.y
          );
          setAnchor(normalizeOverlayAnchor(layout.anchor));
        } catch (error) {
          console.error('[murmullo:overlay] set anchor failed', error);
        }
      })();
    },
    [syncOverlayFrame]
  );

  const beginChromeDrag: MouseEventHandler<HTMLDivElement> = useCallback(
    event => {
      window.clearTimeout(leaveTimerRef.current);
      pointerDownRef.current = true;
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

  const handleOrbital = useCallback(
    (id: OrbitalActionId) => {
      switch (id) {
        case 'dictate':
          startRecording();
          break;
        case 'more':
          setMenuOpen(true);
          break;
        case 'stop':
          stopRecording();
          break;
        case 'cancel':
          cancelRecording();
          break;
      }
    },
    [cancelRecording, startRecording, stopRecording]
  );

  useOverlayClickThrough({
    enabled: isTauriRuntime(),
    isDragging: () => draggingRef.current || pointerDownRef.current,
    onHitChange: over => {
      if (over) enterReady();
      else leaveReady();
    },
  });

  const applyLayout = useCallback((layout: OverlayLayout) => {
    setAnchor(normalizeOverlayAnchor(layout.anchor));
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
    } else if (
      preview === 'ready' ||
      preview === 'listening' ||
      preview === 'processing' ||
      preview === 'error' ||
      preview === 'cancelled'
    ) {
      if (preview === 'error') setErrorMessage(previewText);
      setMode(preview);
    }
    if (params.get('menu') === '1') setMenuOpen(true);
  }, []);

  useEffect(() => {
    const clearChromeSelection = () => {
      if (pointerDownRef.current || draggingRef.current) return;
      const active = document.activeElement;
      if (isEditableOverlayTarget(active)) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const node = selection.anchorNode;
      const el = node instanceof Element ? node : (node?.parentElement ?? null);
      if (isEditableOverlayTarget(el)) return;
      selection.removeAllRanges();
    };
    document.addEventListener('selectionchange', clearChromeSelection);
    return () => {
      document.removeEventListener('selectionchange', clearChromeSelection);
    };
  }, []);

  useEffect(() => {
    void overlayService
      .getLayout()
      .then(applyLayout)
      .catch(() => undefined);

    void invoke<AppConfig>('get_config')
      .then(config => {
        // Keep hotkey available for accessibility labels even if idle UI hides it.
        void hotkeyParts(config.hotkeys.push_to_talk);
        const stored = storedAutoInsert();
        const fromConfig = config.ui?.auto_insert !== false;
        setAutoInsert(stored ?? fromConfig);
        if (stored !== null && stored !== fromConfig && isTauriRuntime()) {
          void insertionService.setAutoInsert(stored).catch(() => undefined);
        }
        if (config.ui?.overlay_anchor) {
          setAnchor(normalizeOverlayAnchor(config.ui.overlay_anchor));
        }
      })
      .catch(() => undefined);

    const unlistenRecording = listen('recording-state-changed', event => {
      const payload = event.payload as {
        state: BackendState;
        message?: string;
      };
      if (payload.state === 'recording') {
        expectingCancelRef.current = false;
        setMode('listening');
        setMenuOpen(false);
        setModal(null);
        setNotice(null);
        return;
      }
      if (payload.state === 'processing') {
        expectingCancelRef.current = false;
        const nextMessage = payload.message?.trim() || 'status.processing';
        const { code } = parseCodedError(nextMessage);
        setProcessingMessage(
          code.startsWith('status.') ? nextMessage : 'status.processing'
        );
        setMode('processing');
        setMenuOpen(false);
        return;
      }
      if (payload.state === 'done') {
        if (autoInsertRef.current) return;
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
      setMenuOpen(false);
      if (autoInsertRef.current && payload.text?.trim()) {
        expectingCancelRef.current = false;
        setMode('rest');
        setTranscription(null);
        setNotice({ kind: 'insert', message: translate('hud.done') });
        setModal(null);
        return;
      }
      setTranscription(payload);
      setMode('done');
      setNotice(null);
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

    return () => {
      unlistenRecording.then(fn => fn()).catch(() => undefined);
      unlistenTranscription.then(fn => fn()).catch(() => undefined);
      unlistenAudioLevel.then(fn => fn()).catch(() => undefined);
      unlistenError.then(fn => fn()).catch(() => undefined);
      unlistenLog.then(fn => fn()).catch(() => undefined);
      unlistenLayout.then(fn => fn()).catch(() => undefined);
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

  // Window follows mode/panel. Layout effect: schedule before paint so growth
  // is in flight by the time the new content is visible.
  useLayoutEffect(() => {
    void syncOverlayFrame();
  }, [mode, panelKind, hasNotice, syncOverlayFrame]);

  useEffect(() => {
    const endPointer = () => {
      pointerDownRef.current = false;
      if (!isEditableOverlayTarget(document.activeElement)) {
        window.getSelection()?.removeAllRanges();
      }
      if (draggingRef.current) {
        draggingRef.current = false;
        void saveOverlayPosition().then(() => syncOverlayFrame());
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
      window.clearTimeout(shrinkTimerRef.current);
    };
  }, [leaveReady, saveOverlayPosition, syncOverlayFrame]);

  useEffect(() => {
    const win = currentOverlayWindow();
    if (!win) return undefined;
    let unlisten: (() => void) | undefined;
    let timer: number | undefined;
    void win
      .onMoved(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (applyingRef.current || draggingRef.current) return;
          void saveOverlayPosition();
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
  }, [saveOverlayPosition]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        if (modal === 'edit') {
          event.preventDefault();
          void insertCurrent(draft);
          return;
        }
        if ((mode === 'transcribed' || mode === 'actions') && !menuOpen) {
          event.preventDefault();
          void insertCurrent(transcription?.text ?? '');
          return;
        }
      }
      if (event.key !== 'Escape') return;
      if (menuOpen || modal) {
        closeOverlays();
        return;
      }
      if (mode === 'cancelled' || mode === 'error' || RESULT_MODES.has(mode)) {
        returnToIdle();
        return;
      }
      if (mode === 'listening') {
        cancelRecording();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    cancelRecording,
    closeOverlays,
    draft,
    insertCurrent,
    menuOpen,
    modal,
    mode,
    returnToIdle,
    transcription,
  ]);

  const sceneMode = sceneModeForHud(mode);
  const covered = panelKind !== null;
  const mascot = (
    <HudMascot
      sceneMode={sceneMode}
      level={audioLevel}
      active={mode === 'ready' || mode === 'listening' || mode === 'processing'}
      onMouseDown={beginChromeDrag}
      onPointerEnter={enterReady}
      onPointerLeave={leaveReady}
      onContextMenu={openQuickMenu}
    />
  );

  let toast: ReactNode = null;
  if (!covered) {
    if (mode === 'processing') {
      toast = <ProcessingToast message={processingMessage} />;
    } else if (mode === 'done') {
      toast = <HudToast message={t('hud.done')} />;
    } else if (notice) {
      toast = <HudToast kind={notice.kind} message={notice.message} />;
    }
  }

  const renderPanel = (): ReactNode => {
    switch (panelKind) {
      case 'edit':
        return (
          <HudModal
            draft={draft}
            onDraftChange={setDraft}
            onClose={() => setModal(null)}
            onInsert={() => void insertCurrent(draft)}
          />
        );
      case 'menu':
        return (
          <HudQuickMenu
            anchor={anchor}
            onOpenApp={openMainWindow}
            onLastMurmur={() => void showLastMurmur()}
            onSettings={openMainWindow}
            onAnchor={snapToAnchor}
            onExit={exitOverlay}
            onClose={() => setMenuOpen(false)}
          />
        );
      case 'result':
        return (
          <ResultPanel
            text={transcription?.text ?? ''}
            onInsert={() => void insertCurrent(transcription?.text ?? '')}
            onCopy={copyAndDismiss}
            onEdit={() => {
              setDraft(transcription?.text ?? '');
              setModal('edit');
            }}
            onClose={returnToIdle}
            showTimeout={!reducedMotion}
          />
        );
      case 'notice':
        if (mode === 'cancelled') {
          return (
            <CancelledPanel
              reducedMotion={reducedMotion}
              onUndo={undoCancel}
              onClose={returnToIdle}
            />
          );
        }
        return (
          <ErrorPanel
            message={errorMessage || t('common.genericError')}
            onClose={returnToIdle}
            onOpenApp={errorOpenApp ? openMainWindow : undefined}
          />
        );
      default:
        return null;
    }
  };

  // The panel waits until the native window is large enough for it.
  const panelOpen =
    panelKind !== null &&
    (!isTauriRuntime() ||
      sizeFits(appliedSize, overlayWindowSize(mode, panelKind, hasNotice)));
  const stage = stageSizeForMode(mode, hasNotice);

  return (
    <div
      className={`floating-bar-container${reducedMotion ? ' hud-reduced' : ''}`}
    >
      <HudStage
        mode={mode}
        width={stage.width}
        height={stage.height}
        covered={covered}
        mascot={mascot}
        orbitals={
          <>
            <ReadyOrbitals
              visible={mode === 'ready' && !covered}
              onAction={handleOrbital}
            />
            <ListeningOrbitals
              visible={mode === 'listening' && !covered}
              onAction={handleOrbital}
            />
          </>
        }
        toast={
          <HudLayer
            open={toast !== null}
            reducedMotion={reducedMotion}
            className="hud-toast-layer"
          >
            {toast}
          </HudLayer>
        }
        onMouseDown={beginChromeDrag}
        onPointerEnter={enterReady}
        onPointerLeave={leaveReady}
      />
      <HudPanel
        open={panelOpen}
        kind={panelKind ?? lastPanelRef.current}
        mascot={mascotPoint}
        work={work}
        reducedMotion={reducedMotion}
      >
        {renderPanel()}
      </HudPanel>
    </div>
  );
};
