import { listen } from '@tauri-apps/api/event';
import { TranscriptionService } from '@/services/transcriptionService';
import { t, type AppMessageKey } from '@/i18n';

const STORAGE_KEY = 'murmullo.pendingDictationContext';

export const CONTEXT_LABELS = [
  'Trabajo',
  'Comunicación',
  'Diseño',
  'Reuniones',
  'Personal',
] as const;

export type MurmulloContextLabel = (typeof CONTEXT_LABELS)[number];

export type DictationPromptId = 'notes' | 'email' | 'idea' | 'other';

export type DictationPrompt = {
  id: DictationPromptId;
  context: MurmulloContextLabel;
};

export const DICTATION_PROMPTS: readonly DictationPrompt[] = [
  { id: 'notes', context: 'Trabajo' },
  { id: 'email', context: 'Comunicación' },
  { id: 'idea', context: 'Diseño' },
  { id: 'other', context: 'Personal' },
];

export function contextDisplayLabel(context: MurmulloContextLabel): string {
  const keys: Record<MurmulloContextLabel, AppMessageKey> = {
    Trabajo: 'dashboard.context.work',
    Comunicación: 'dashboard.context.communication',
    Diseño: 'dashboard.context.design',
    Reuniones: 'dashboard.context.meetings',
    Personal: 'dashboard.context.personal',
  };
  return t(keys[context]);
}

export function promptDisplayLabel(id: DictationPromptId): string {
  const keys: Record<DictationPromptId, AppMessageKey> = {
    notes: 'dashboard.prompts.notes',
    email: 'dashboard.prompts.email',
    idea: 'dashboard.prompts.idea',
    other: 'dashboard.prompts.other',
  };
  return t(keys[id]);
}

const CONTEXT_SET = new Set<string>(CONTEXT_LABELS);

let memoryFallback: MurmulloContextLabel | null = null;
let syncStarted = false;
let subscriberCount = 0;
let stopListen: (() => void) | null = null;

function isContextLabel(value: string): value is MurmulloContextLabel {
  return CONTEXT_SET.has(value);
}

export function contextFromMetadata(
  metadata: Record<string, string> | undefined
): MurmulloContextLabel | null {
  const raw = metadata?.context?.trim();
  if (!raw) return null;
  return isContextLabel(raw) ? raw : null;
}

export function queuePendingDictationContext(
  context: MurmulloContextLabel
): void {
  memoryFallback = context;
  try {
    sessionStorage.setItem(STORAGE_KEY, context);
  } catch {
    // Private mode / overlay webview without storage — memory is enough.
  }
}

export function peekPendingDictationContext(): MurmulloContextLabel | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && isContextLabel(stored)) return stored;
  } catch {
    // fall through to memory
  }
  return memoryFallback;
}

export function takePendingDictationContext(): MurmulloContextLabel | null {
  const next = peekPendingDictationContext();
  memoryFallback = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return next;
}

export async function attachPendingContextIfAny(id: string): Promise<boolean> {
  const context = peekPendingDictationContext();
  if (!context || id.trim().length === 0) return false;
  try {
    const updated = await TranscriptionService.updateTranscription(
      id,
      undefined,
      {
        context,
      }
    );
    if (updated) {
      takePendingDictationContext();
      return true;
    }
  } catch (error) {
    console.warn('Could not attach dictation context', error);
  }
  return false;
}

/**
 * Attach prompt context to the next auto-saved transcription.
 * Safe to call from a always-mounted shell so it still works if Inicio unmounts.
 */
export function startPendingContextSync(): () => void {
  subscriberCount += 1;
  if (!syncStarted) {
    syncStarted = true;
    const pending = listen<{ id?: string }>('transcription-saved', event => {
      const id = event.payload.id;
      if (typeof id !== 'string' || id.length === 0) return;
      void attachPendingContextIfAny(id);
    });
    stopListen = () => {
      pending.then(fn => fn()).catch(() => undefined);
      syncStarted = false;
      stopListen = null;
    };
  }
  return () => {
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      stopListen?.();
    }
  };
}
