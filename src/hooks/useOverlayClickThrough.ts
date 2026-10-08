import { useEffect, useRef } from 'react';
import { cursorPosition, getCurrentWindow } from '@tauri-apps/api/window';

const HIT_SELECTOR =
  '[data-hud-hit], .hud-pill, .hud-card, .hud-mascot, .hud-mascot-rest, .hud-mascot-perch, .hud-toast, .hud-menu, .hud-modal';

const POLL_MS = 32;

function isOverHudHit(clientX: number, clientY: number): boolean {
  if (
    clientX < 0 ||
    clientY < 0 ||
    clientX > window.innerWidth ||
    clientY > window.innerHeight
  ) {
    return false;
  }
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return false;
  return Boolean(el.closest(HIT_SELECTOR));
}

/**
 * Pass clicks through transparent overlay padding to the desktop.
 * CSS pointer-events alone cannot do this — the native window still owns the full rect.
 */
export function useOverlayClickThrough(options: {
  enabled: boolean;
  isDragging?: () => boolean;
  onHitChange?: (over: boolean) => void;
}): void {
  const isDraggingRef = useRef(options.isDragging);
  const onHitChangeRef = useRef(options.onHitChange);
  isDraggingRef.current = options.isDragging;
  onHitChangeRef.current = options.onHitChange;

  useEffect(() => {
    if (!options.enabled) return;

    const win = getCurrentWindow();
    let ignored: boolean | null = null;
    let overHit = false;
    let pollTimer: number | undefined;
    let disposed = false;

    const setIgnored = async (next: boolean) => {
      if (disposed || next === ignored) return;
      ignored = next;
      try {
        await win.setIgnoreCursorEvents(next);
      } catch (error) {
        console.error('[murmullo:overlay] setIgnoreCursorEvents failed', error);
      }
    };

    const applyHit = async (hit: boolean) => {
      if (disposed) return;
      if (isDraggingRef.current?.()) {
        await setIgnored(false);
        return;
      }
      if (hit !== overHit) {
        overHit = hit;
        onHitChangeRef.current?.(hit);
      }
      await setIgnored(!hit);
      if (!hit) startPoll();
      else stopPoll();
    };

    const syncFromClientPoint = (clientX: number, clientY: number) => {
      void applyHit(isOverHudHit(clientX, clientY));
    };

    const syncFromCursor = async () => {
      if (disposed) return;
      if (isDraggingRef.current?.()) {
        await setIgnored(false);
        return;
      }
      try {
        const [cursor, outer, scale] = await Promise.all([
          cursorPosition(),
          win.outerPosition(),
          win.scaleFactor(),
        ]);
        if (disposed) return;
        const factor = scale > 0 ? scale : 1;
        const clientX = (cursor.x - outer.x) / factor;
        const clientY = (cursor.y - outer.y) / factor;
        await applyHit(isOverHudHit(clientX, clientY));
      } catch {
        // window may be tearing down
      }
    };

    const startPoll = () => {
      if (pollTimer != null || disposed) return;
      pollTimer = window.setInterval(() => {
        void syncFromCursor();
      }, POLL_MS);
    };

    const stopPoll = () => {
      if (pollTimer == null) return;
      window.clearInterval(pollTimer);
      pollTimer = undefined;
    };

    const onMouseMove = (event: MouseEvent) => {
      syncFromClientPoint(event.clientX, event.clientY);
    };

    const onPointerUp = () => {
      void syncFromCursor();
    };

    // Start passthrough until the cursor is over real chrome.
    void setIgnored(true).then(() => {
      if (!disposed) startPoll();
    });

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    return () => {
      disposed = true;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('pointerup', onPointerUp);
      stopPoll();
      void win.setIgnoreCursorEvents(false).catch(() => undefined);
    };
  }, [options.enabled]);
}
