import { t } from '@/i18n';

const FALLBACK_NAME = 'Iván';

function titleCaseName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return FALLBACK_NAME;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function nameFromHomePath(home: string): string | null {
  const segment =
    home
      .replace(/[/\\]+$/, '')
      .split(/[/\\]/)
      .pop() ?? '';
  const first = segment.split(/[._\s-]/)[0] ?? '';
  if (first.length < 2 || first.length > 16) return null;
  if (!/^[a-záéíóúüñ]+$/i.test(first)) return null;
  return titleCaseName(first);
}

/**
 * Best-effort given name for the Inicio greeting.
 * Tries the OS home folder; falls back to «Iván».
 */
export async function getDisplayName(): Promise<string> {
  try {
    const { homeDir } = await import('@tauri-apps/api/path');
    const home = await homeDir();
    return nameFromHomePath(home) ?? FALLBACK_NAME;
  } catch {
    return FALLBACK_NAME;
  }
}

export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return t('dashboard.greeting.morning');
  if (hour >= 12 && hour < 20) return t('dashboard.greeting.afternoon');
  return t('dashboard.greeting.night');
}
