import { polishTranscript } from './basic';
import { generateCorrection, type BrowserProgress } from './browserModel';
import { chunkTranscript } from './chunking';
import {
  correctionSystemPrompt,
  type CorrectionRuleOverrides,
} from './prompts';
import { sanitizeCorrection } from './sanitize';
import {
  BROWSER_MODEL_LABEL,
  type CorrectionOutcome,
  type CorrectionStatus,
  type InferenceBackend,
} from './types';

export async function correctTranscript(input: {
  text: string;
  language?: string | null;
  rules?: CorrectionRuleOverrides;
  signal?: AbortSignal;
  onStatus?: (status: CorrectionStatus) => void;
}): Promise<CorrectionOutcome> {
  const original = input.text.trim();
  const fallback = (): CorrectionOutcome => ({
    text: polishTranscript(original),
    usedModel: false,
    model: null,
    backend: null,
  });
  if (input.signal?.aborted) {
    throw new DOMException('Correction cancelled', 'AbortError');
  }
  if (!original) return fallback();

  const report = (status: CorrectionStatus) => {
    input.onStatus?.(status);
  };

  report({
    state: 'checking',
    progress: null,
    provider: 'browser',
    model: BROWSER_MODEL_LABEL,
    backend: null,
  });

  const systemPrompt = correctionSystemPrompt(input.language, input.rules);
  const chunks = chunkTranscript(original);
  const corrected: string[] = [];
  let backend: InferenceBackend | null = null;

  try {
    for (const chunk of chunks) {
      if (input.signal?.aborted) {
        throw new DOMException('Correction cancelled', 'AbortError');
      }
      const generated = await generateCorrection(
        systemPrompt,
        chunk,
        progress => report(statusFromProgress(progress, backend)),
        input.signal
      );
      backend = generated.backend;
      const clean = sanitizeCorrection(chunk, generated.text);
      corrected.push(clean ?? chunk);
      report({
        state: 'processing',
        progress: null,
        provider: 'browser',
        model: BROWSER_MODEL_LABEL,
        backend,
      });
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    report({
      state: 'error',
      progress: null,
      provider: 'browser',
      model: BROWSER_MODEL_LABEL,
      backend,
    });
    return fallback();
  }

  const text = corrected.join(' ').trim();
  const accepted = sanitizeCorrection(original, text);
  if (!accepted) {
    report({
      state: 'ready',
      progress: null,
      provider: 'browser',
      model: BROWSER_MODEL_LABEL,
      backend,
    });
    return fallback();
  }

  report({
    state: 'ready',
    progress: null,
    provider: 'browser',
    model: BROWSER_MODEL_LABEL,
    backend,
  });
  return {
    text: accepted,
    usedModel: true,
    model: BROWSER_MODEL_LABEL,
    backend,
  };
}

function statusFromProgress(
  progress: BrowserProgress,
  backend: InferenceBackend | null
): CorrectionStatus {
  const base = {
    provider: 'browser',
    model: BROWSER_MODEL_LABEL,
    backend,
  };
  if (progress.kind === 'downloading') {
    return {
      ...base,
      state: 'downloading',
      progress: progress.progress,
    };
  }
  if (progress.kind === 'ready') {
    return {
      ...base,
      state: 'ready',
      progress: null,
      backend: progress.backend,
    };
  }
  if (progress.kind === 'checking') {
    return { ...base, state: 'checking', progress: null };
  }
  return { ...base, state: 'loading', progress: null };
}
