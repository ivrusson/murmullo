export type OverlayWorkArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
