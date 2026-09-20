export type OverlayStyle = 'pill' | 'island' | 'card';

export const OVERLAY_STYLE_STORAGE_KEY = 'murmullo-overlay-style';
export const OVERLAY_STYLE_CHANNEL = 'murmullo-overlay-style';

export const OVERLAY_STYLES: ReadonlyArray<OverlayStyle> = [
  'pill',
  'island',
  'card',
];

export function normalizeOverlayStyle(
  value: string | null | undefined
): OverlayStyle {
  if (value === 'pill' || value === 'island' || value === 'card') return value;
  return 'pill';
}

export function readStoredOverlayStyle(): OverlayStyle {
  if (typeof window === 'undefined') return 'pill';
  try {
    return normalizeOverlayStyle(
      window.localStorage.getItem(OVERLAY_STYLE_STORAGE_KEY)
    );
  } catch {
    return 'pill';
  }
}

export function storeOverlayStyle(style: OverlayStyle): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OVERLAY_STYLE_STORAGE_KEY, style);
  } catch {
    /* ignore quota / private mode */
  }
}

export function broadcastOverlayStyle(style: OverlayStyle): void {
  storeOverlayStyle(style);
  try {
    const channel = new BroadcastChannel(OVERLAY_STYLE_CHANNEL);
    channel.postMessage(style);
    channel.close();
  } catch {
    /* BroadcastChannel is unavailable in some webviews */
  }
}
