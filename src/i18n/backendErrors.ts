import { hasMessage, t } from './store';
import type { TranslateParams } from './t';

// Backend codes are dotted ids: snake_case (`audio.too_short`) or camelCase
// (`status.sendingStt`). Each segment starts with a lowercase letter.
const CODE_RE = /^[a-z][a-zA-Z0-9_]+(?:\.[a-z][a-zA-Z0-9_]+)+$/;

function extractRaw(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return String(error ?? '');
}

export function parseCodedError(raw: string): {
  code: string;
  params: TranslateParams;
} {
  const trimmed = raw.trim();
  const pipe = trimmed.indexOf('|');
  const code = pipe === -1 ? trimmed : trimmed.slice(0, pipe);
  const params: TranslateParams = {};
  if (pipe !== -1) {
    const payload = trimmed.slice(pipe + 1);
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(
          parsed as Record<string, unknown>
        )) {
          if (typeof value === 'string' || typeof value === 'number') {
            params[key] = value;
          }
        }
      }
    } catch {
      // ignore malformed payload
    }
  }
  return { code, params };
}

function looksTechnical(raw: string): boolean {
  return (
    /\bhttps?:\/\//i.test(raw) ||
    /^(https?:\/\/|\/|file:|[A-Za-z]:\\)/.test(raw) ||
    /\b(GET|POST|PUT|DELETE|PATCH)\s+\S+/i.test(raw) ||
    /\/v1\/|127\.0\.0\.1|localhost:\d+/i.test(raw) ||
    /^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(raw) ||
    raw.includes('::') ||
    /poisoned|mutex|anyhow|cpal|InvokeError|__TAURI/i.test(raw)
  );
}

type BackendMessageFallback =
  'errors.generic' | 'errors.dictation' | 'errors.status.processing';

export function translateBackendMessage(
  raw: unknown,
  fallbackKey: BackendMessageFallback = 'errors.generic'
): string {
  const text = extractRaw(raw).trim();
  if (!text) return t(fallbackKey);

  const { code, params } = parseCodedError(text);
  const errorKey = `errors.${code}`;
  if (CODE_RE.test(code)) {
    if (hasMessage(errorKey)) {
      return t(errorKey as Parameters<typeof t>[0], params);
    }
    // Unknown coded id — never show the raw key in UI.
    return t(fallbackKey);
  }
  // Never surface raw HTTP/debug lines in the HUD or status rows.
  if (looksTechnical(text) || text.length > 120) {
    return t(fallbackKey);
  }
  return text;
}

export function mapBackendError(error: unknown): string {
  const text = extractRaw(error).trim();
  if (!text) return t('errors.generic');
  const { code, params } = parseCodedError(text);
  const errorKey = `errors.${code}`;
  if (CODE_RE.test(code) && hasMessage(errorKey)) {
    return t(errorKey as Parameters<typeof t>[0], params);
  }
  if (looksTechnical(text) || text.length > 180) {
    return t('errors.generic');
  }
  if (CODE_RE.test(code) || /invoke|not allowed/i.test(text)) {
    return t('errors.generic');
  }
  return t('errors.generic');
}
