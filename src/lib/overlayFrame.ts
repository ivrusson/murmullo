import { clampToWorkArea, type OverlayWorkArea } from '@/lib/overlayPlacement';

/**
 * Overlay geometry model.
 *
 * One rule: the window is always symmetric around the mascot center, in every
 * mode. The DOM centers the mascot at 50%/50%, the native window origin is
 * `mascot - size / 2`, and a resize (applied atomically on macOS) never moves
 * the mascot on screen. Nothing is clamped to the work area at the window
 * level; the window may hang off-screen. Only panels shift inside the window
 * to stay visible (see panelShift).
 *
 * Keep HUD_SHADOW_PAD_* in sync with `.floating-bar-container` padding and
 * HUD_MASCOT_DISPLAY with `--hud-mascot` in floating-bar.css.
 */

/** On-screen mascot box; scene renders larger and scales down. */
export const HUD_MASCOT_DISPLAY = 96;
export const HUD_SHADOW_PAD_X = 40;
export const HUD_SHADOW_PAD_Y = 36;
/** Horizontal room beside the mascot for one orbital column per side. */
export const HUD_ORBIT_SIDE = 80;
/** Vertical headroom above/below the mascot for the status toast. */
export const HUD_STAGE_HEAD = 64;
/** Extra reach, per axis, so a clamped panel still fits inside the window. */
export const HUD_PANEL_REACH = 64;
/** Minimum gap between a panel and the work-area edge. */
export const HUD_PANEL_EDGE_GAP = 8;

export type HudPanelKind = 'menu' | 'result' | 'edit' | 'notice';

/** Nominal panel boxes: size the window before the panel is measured. */
export const HUD_PANEL_NOMINAL: Record<
  HudPanelKind,
  { width: number; height: number }
> = {
  menu: { width: 240, height: 360 },
  result: { width: 340, height: 220 },
  edit: { width: 340, height: 300 },
  notice: { width: 320, height: 140 },
};

export type HudSize = { width: number; height: number };
export type HudPoint = { x: number; y: number };

export function stageSizeForMode(mode: string, toast = false): HudSize {
  const mascot = HUD_MASCOT_DISPLAY;
  if (mode === 'rest' && toast) {
    // A notice can outlive the hover; keep its headroom so it is not clipped.
    return { width: mascot + 28, height: mascot + HUD_STAGE_HEAD * 2 };
  }
  if (mode === 'rest') {
    return { width: mascot + 28, height: mascot + 28 };
  }
  return {
    width: mascot + HUD_ORBIT_SIDE * 2,
    height: mascot + HUD_STAGE_HEAD * 2,
  };
}

/** Symmetric window box for a mode and optional panel. */
export function overlayWindowSize(
  mode: string,
  panel: HudPanelKind | null,
  toast = false
): HudSize {
  const stage = stageSizeForMode(mode, toast);
  let width = stage.width + HUD_SHADOW_PAD_X;
  let height = stage.height + HUD_SHADOW_PAD_Y;
  if (panel) {
    const nominal = HUD_PANEL_NOMINAL[panel];
    width = Math.max(width, 2 * (nominal.width + HUD_PANEL_REACH));
    height = Math.max(height, 2 * (nominal.height + HUD_PANEL_REACH));
  }
  return { width, height };
}

export function windowOriginForMascot(
  mascot: HudPoint,
  size: HudSize
): HudPoint {
  return {
    x: Math.round(mascot.x - size.width / 2),
    y: Math.round(mascot.y - size.height / 2),
  };
}

export function mascotFromWindow(origin: HudPoint, size: HudSize): HudPoint {
  return {
    x: origin.x + size.width / 2,
    y: origin.y + size.height / 2,
  };
}

/**
 * Offset to apply to a mascot-centered panel so it stays inside the work area.
 * Zero when the panel already fits around the mascot.
 */
export function panelShift(
  mascot: HudPoint,
  panel: HudSize,
  work: OverlayWorkArea,
  gap = HUD_PANEL_EDGE_GAP
): HudPoint {
  const desiredX = mascot.x - panel.width / 2;
  const desiredY = mascot.y - panel.height / 2;
  const inset: OverlayWorkArea = {
    x: work.x + gap,
    y: work.y + gap,
    width: Math.max(0, work.width - gap * 2),
    height: Math.max(0, work.height - gap * 2),
  };
  const clamped = clampToWorkArea(
    desiredX,
    desiredY,
    panel.width,
    panel.height,
    inset
  );
  return {
    x: Math.round(clamped.x - desiredX),
    y: Math.round(clamped.y - desiredY),
  };
}
