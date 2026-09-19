export type OverlayPlacement = 'above' | 'below';

export type OverlayWorkArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function decideOverlayPlacement(input: {
  hudY: number;
  hudHeight: number;
  extrasHeight: number;
  workTop: number;
  workHeight: number;
}): OverlayPlacement {
  if (input.extrasHeight <= 0 || input.workHeight <= 0) return 'below';

  const workBottom = input.workTop + input.workHeight;
  const hudBottom = input.hudY + input.hudHeight;
  const spaceBelow = workBottom - hudBottom;
  const spaceAbove = input.hudY - input.workTop;
  const hudCenter = input.hudY + input.hudHeight / 2;
  const workCenter = input.workTop + input.workHeight / 2;
  const inLowerHalf = hudCenter >= workCenter;
  const fitsBelow = spaceBelow >= input.extrasHeight;
  const fitsAbove = spaceAbove >= input.extrasHeight;

  if (inLowerHalf) {
    if (fitsAbove) return 'above';
    if (fitsBelow) return 'below';
  } else if (fitsBelow) {
    return 'below';
  } else if (fitsAbove) {
    return 'above';
  }

  return spaceAbove > spaceBelow ? 'above' : 'below';
}

export function clampToWorkArea(
  x: number,
  y: number,
  width: number,
  height: number,
  work: OverlayWorkArea
): { x: number; y: number } {
  const maxX = work.x + work.width - width;
  const maxY = work.y + work.height - height;
  return {
    x: clamp(x, work.x, Math.max(work.x, maxX)),
    y: clamp(y, work.y, Math.max(work.y, maxY)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
