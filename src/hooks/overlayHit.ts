/** Chrome that should receive clicks and window drags. */
export const HUD_HIT_SELECTOR =
  '[data-hud-hit], .hud-pill, .hud-card, .hud-mascot, .hud-mascot-rest, .hud-mascot-perch, .hud-toast, .hud-menu, .hud-modal';

/** Samples closer than this are the same CSS point, allowing for rounding. */
export const CURSOR_SAMPLE_MATCH_PX = 24;

/**
 * A still cursor that disagrees by more than this is a bad coordinate
 * conversion, not a hand moving during the sample.
 */
export const CURSOR_SAMPLE_MISMATCH_PX = 80;

export type CursorSampleKind = 'match' | 'inconclusive' | 'mismatch';

export function clientPointFromPhysical(
  cursorX: number,
  cursorY: number,
  originX: number,
  originY: number,
  devicePixelRatio: number
): { x: number; y: number } {
  const factor = devicePixelRatio > 0 ? devicePixelRatio : 1;
  return {
    x: (cursorX - originX) / factor,
    y: (cursorY - originY) / factor,
  };
}

export function classifyCursorSample(
  deltaX: number,
  deltaY: number
): CursorSampleKind {
  const distance = Math.hypot(deltaX, deltaY);
  if (distance <= CURSOR_SAMPLE_MATCH_PX) return 'match';
  if (distance <= CURSOR_SAMPLE_MISMATCH_PX) return 'inconclusive';
  return 'mismatch';
}

/**
 * Pass clicks through only when the cursor is on empty padding and we trust
 * the native cursor sample. A bad sample must leave the window interactive.
 */
export function shouldPassCursorThrough(options: {
  overChrome: boolean;
  dragging: boolean;
  coordsTrusted: boolean;
}): boolean {
  if (!options.coordsTrusted || options.dragging || options.overChrome) {
    return false;
  }
  return true;
}

type HitBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  pointerEvents: string;
  visibility: string;
  opacity: string;
};

export function rectReceivesHit(x: number, y: number, rect: HitBox): boolean {
  if (rect.width < 1 || rect.height < 1) return false;
  if (rect.pointerEvents === 'none' || rect.visibility === 'hidden') {
    return false;
  }
  if (Number(rect.opacity) === 0) return false;
  return x >= rect.left && y >= rect.top && x <= rect.right && y <= rect.bottom;
}

function hitElements(): Element[] {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll(HUD_HIT_SELECTOR));
}

/**
 * True when the CSS point is over real HUD chrome.
 * `elementFromPoint` is empty while the native window ignores the cursor, so
 * the chrome boxes are checked as well.
 */
export function isOverHudChrome(clientX: number, clientY: number): boolean {
  if (typeof document === 'undefined') return false;
  if (
    clientX < 0 ||
    clientY < 0 ||
    clientX > window.innerWidth ||
    clientY > window.innerHeight
  ) {
    return false;
  }

  const stacked =
    typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(clientX, clientY)
      : [document.elementFromPoint(clientX, clientY)].filter(
          (el): el is Element => el instanceof Element
        );

  for (const el of stacked) {
    if (el.closest(HUD_HIT_SELECTOR)) return true;
  }

  for (const node of hitElements()) {
    const style = window.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    if (
      rectReceivesHit(clientX, clientY, {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        pointerEvents: style.pointerEvents,
        visibility: style.visibility,
        opacity: style.opacity,
      })
    ) {
      return true;
    }
  }

  return false;
}
