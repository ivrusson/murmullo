import { HUD_MASCOT_DISPLAY, type HudPoint } from '@/lib/overlayFrame';
import type { OverlayWorkArea } from '@/lib/overlayPlacement';

export type OverlayAnchor = 'top' | 'bottom' | 'left' | 'right' | 'custom';

export const OVERLAY_ANCHORS: ReadonlyArray<Exclude<OverlayAnchor, 'custom'>> =
  ['top', 'bottom', 'left', 'right'];

/**
 * Gap between the mascot's visible edge and the work-area edge.
 * Mirrored in Rust (FLOATING_BAR_EDGE_MARGIN) for the first show.
 */
export const OVERLAY_EDGE_MARGIN = 16;

export function normalizeOverlayAnchor(
  value: string | null | undefined
): OverlayAnchor {
  if (
    value === 'top' ||
    value === 'bottom' ||
    value === 'left' ||
    value === 'right' ||
    value === 'custom'
  ) {
    return value;
  }
  return 'bottom';
}

/** Mascot center for a cardinal edge, centered along that edge. */
export function mascotPointForAnchor(
  anchor: Exclude<OverlayAnchor, 'custom'>,
  work: OverlayWorkArea,
  margin = OVERLAY_EDGE_MARGIN
): HudPoint {
  const half = HUD_MASCOT_DISPLAY / 2;
  const centerX = work.x + work.width / 2;
  const centerY = work.y + work.height / 2;
  switch (anchor) {
    case 'top':
      return { x: centerX, y: work.y + margin + half };
    case 'bottom':
      return { x: centerX, y: work.y + work.height - margin - half };
    case 'left':
      return { x: work.x + margin + half, y: centerY };
    case 'right':
      return { x: work.x + work.width - margin - half, y: centerY };
  }
}
