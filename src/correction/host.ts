import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { builtinModelIsCached, preloadBrowserModel } from './browserModel';
import { correctTranscript } from './engine';
import { loadCorrectionRules } from './promptStore';
import {
  BROWSER_MODEL_LABEL,
  BUILTIN_PROVIDER_ID,
  type CorrectionStatus,
} from './types';

interface BrowserCorrectionRequest {
  id: string;
  text: string;
  language?: string | null;
}

const HOST_FLAG = '__murmulloBrowserCorrectionHost';

export function installBrowserCorrectionHost(): void {
  const scope = globalThis as typeof globalThis & {
    [HOST_FLAG]?: boolean;
  };
  if (scope[HOST_FLAG]) return;
  scope[HOST_FLAG] = true;
  void startHost();
}

async function startHost(): Promise<void> {
  const controllers = new Set<AbortController>();
  await invoke('register_browser_corrector').catch(() => undefined);

  await listen('browser-correction-cancel', () => {
    for (const controller of controllers) controller.abort();
    controllers.clear();
  });

  await listen('builtin-model-download', () => {
    void preloadBrowserModel(progress => {
      reportStatus(statusFromPreload(progress));
    }).catch(() => {
      reportStatus({
        state: 'error',
        progress: null,
        provider: BUILTIN_PROVIDER_ID,
        model: BROWSER_MODEL_LABEL,
        backend: null,
      });
    });
  });

  if (await builtinModelIsCached()) {
    reportStatus({
      state: 'ready',
      progress: null,
      provider: BUILTIN_PROVIDER_ID,
      model: BROWSER_MODEL_LABEL,
      backend: null,
    });
  }

  await listen<BrowserCorrectionRequest>(
    'browser-correction-request',
    event => {
      const controller = new AbortController();
      controllers.add(controller);
      void runRequest(event.payload, controller.signal).finally(() => {
        controllers.delete(controller);
      });
    }
  );
}

async function runRequest(
  request: BrowserCorrectionRequest,
  signal: AbortSignal
): Promise<void> {
  try {
    const result = await correctTranscript({
      text: request.text,
      language: request.language,
      rules: await loadCorrectionRules(),
      signal,
      onStatus: reportStatus,
    });
    await invoke('submit_browser_correction', {
      id: request.id,
      text: result.text,
      usedModel: result.usedModel,
    });
  } catch {
    await invoke('submit_browser_correction', {
      id: request.id,
      text: null,
      usedModel: false,
    }).catch(() => undefined);
  }
}

function reportStatus(status: CorrectionStatus): void {
  void invoke('report_correction_status', { status }).catch(() => undefined);
}

function statusFromPreload(
  progress: import('./browserModel').BrowserProgress
): CorrectionStatus {
  const base = {
    provider: BUILTIN_PROVIDER_ID,
    model: BROWSER_MODEL_LABEL,
    backend: null,
  };
  if (progress.kind === 'downloading') {
    return { ...base, state: 'downloading', progress: progress.progress };
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
