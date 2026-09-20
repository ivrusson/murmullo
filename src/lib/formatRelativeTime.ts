import { t } from '@/i18n';

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatRelativeTime(
  timestamp: string,
  now = Date.now()
): string {
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return '';
  const diffMinutes = Math.max(0, Math.floor((now - then) / 60000));
  if (diffMinutes < 1) return t('time.now');
  if (diffMinutes < 60) return t('time.minutes', { count: diffMinutes });
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return t('time.hours', { count: hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return t('time.yesterday');
  return t('time.days', { count: days });
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function firstLineTitle(text: string, max = 72): string {
  const line = text.split(/\n/)[0]?.trim() ?? '';
  const sentence = line.split(/(?<=[.!?])\s/)[0]?.trim() || line;
  if (sentence.length <= max) return sentence || t('history.untitled');
  return `${sentence.slice(0, max - 1).trimEnd()}…`;
}

export function previewText(text: string, max = 120): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}
