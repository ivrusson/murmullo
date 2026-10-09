import { useEffect, useRef } from 'react';
import { cursorPosition, getCurrentWindow } from '@tauri-apps/api/window';
import {
  classifyCursorSample,
  clientPointFromPhysical,
  isOverHudChrome,
  shouldPassCursorThrough,
} from './overlayHit';

const POLL_MS = 32;
const STILL_MS = 90;
const MISMATCHES_BEFORE_GIVING_UP = 3;

/**
 * Pass clicks through transparent overlay padding to the desktop.
 * CSS pointer-events alone cannot do this — the native window still owns the full rect.
 *
 * The window stays interactive until a still cursor proves the native sample
 * matches the DOM point. A bad sample never enables click-through, so a
 * coordinate miss cannot freeze clicks and dragging.
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
    let disposed = false;
    let overHit = false;
    let stillTimer: number | undefined;
    let desiredIgnore: boolean | null = null;
    let appliedIgnore: boolean | null = null;
    let inflight = false;
    let coordsTrusted = false;
    let mismatches = 0;

    const pumpIgnore = () => {
      if (disposed || inflight || desiredIgnore === null) return;
      if (desiredIgnore === appliedIgnore) return;
      const next = desiredIgnore;
      inflight = true;
      void win
        .setIgnoreCursorEvents(next)
        .then(() => {
          if (!disposed && desiredIgnore === next) appliedIgnore = next;
        })
        .catch(error => {
          console.error(
            '[murmullo:overlay] setIgnoreCursorEvents failed',
            error
          );
          if (!disposed) {
            coordsTrusted = false;
            desiredIgnore = false;
            appliedIgnore = null;
          }
        })
        .finally(() => {
          inflight = false;
          if (!disposed) pumpIgnore();
        });
    };

    const requestIgnore = (ignore: boolean) => {
      desiredIgnore = ignore;
      pumpIgnore();
    };

    const publishHit = (hit: boolean) => {
      if (hit === overHit) return;
      overHit = hit;
      onHitChangeRef.current?.(hit);
    };

    const syncIgnore = (hit: boolean) => {
      const dragging = Boolean(isDraggingRef.current?.());
      requestIgnore(
        shouldPassCursorThrough({
          overChrome: hit,
          dragging,
          coordsTrusted,
        })
      );
    };

    const applyDomPoint = (clientX: number, clientY: number) => {
      if (disposed) return;
      if (isDraggingRef.current?.()) {
        requestIgnore(false);
        return;
      }
      const hit = isOverHudChrome(clientX, clientY);
      publishHit(hit);
      syncIgnore(hit);
    };

    const syncFromCursor = async () => {
      if (disposed || !coordsTrusted) return;
      if (isDraggingRef.current?.()) {
        requestIgnore(false);
        return;
      }
      try {
        const [cursor, outer] = await Promise.all([
          cursorPosition(),
          win.outerPosition(),
        ]);
        if (disposed || !coordsTrusted) return;
        const point = clientPointFromPhysical(
          cursor.x,
          cursor.y,
          outer.x,
          outer.y,
          window.devicePixelRatio || 1
        );
        const hit = isOverHudChrome(point.x, point.y);
        publishHit(hit);
        syncIgnore(hit);
      } catch {
        coordsTrusted = false;
        requestIgnore(false);
      }
    };

    const calibrate = async (domX: number, domY: number) => {
      if (
        disposed ||
        (!coordsTrusted && mismatches >= MISMATCHES_BEFORE_GIVING_UP)
      ) {
        return;
      }
      try {
        const [cursor, outer] = await Promise.all([
          cursorPosition(),
          win.outerPosition(),
        ]);
        if (disposed) return;
        const point = clientPointFromPhysical(
          cursor.x,
          cursor.y,
          outer.x,
          outer.y,
          window.devicePixelRatio || 1
        );
        const kind = classifyCursorSample(point.x - domX, point.y - domY);
        if (kind === 'inconclusive') return;
        if (kind === 'mismatch') {
          mismatches += 1;
          if (mismatches >= MISMATCHES_BEFORE_GIVING_UP) {
            coordsTrusted = false;
            requestIgnore(false);
          }
          return;
        }
        mismatches = 0;
        coordsTrusted = true;
        applyDomPoint(domX, domY);
      } catch {
        coordsTrusted = false;
        requestIgnore(false);
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      applyDomPoint(event.clientX, event.clientY);
      window.clearTimeout(stillTimer);
      const domX = event.clientX;
      const domY = event.clientY;
      stillTimer = window.setTimeout(() => {
        void calibrate(domX, domY);
      }, STILL_MS);
    };

    const onPointerUp = () => {
      void syncFromCursor();
    };

    // Interactive until a calibrated sample shows the cursor is on empty padding.
    requestIgnore(false);
    const pollTimer = window.setInterval(() => {
      void syncFromCursor();
    }, POLL_MS);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    return () => {
      disposed = true;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.clearTimeout(stillTimer);
      if (pollTimer != null) window.clearInterval(pollTimer);
      void win.setIgnoreCursorEvents(false).catch(() => undefined);
    };
  }, [options.enabled]);
}
