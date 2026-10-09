import { BROWSER_MODEL_ID, type InferenceBackend } from './types';

export type BrowserProgress =
  | { kind: 'checking' }
  | { kind: 'downloading'; progress: number }
  | { kind: 'loading' }
  | { kind: 'ready'; backend: InferenceBackend };

type ChatGenerator = (
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  options: { max_new_tokens: number; do_sample: boolean }
) => Promise<Array<{ generated_text: string | Array<{ content?: string }> }>>;

let loading: Promise<{
  generator: ChatGenerator;
  backend: InferenceBackend;
}> | null = null;

export async function detectInferenceBackend(): Promise<
  InferenceBackend | 'none'
> {
  const gpu = (
    navigator as Navigator & {
      gpu?: { requestAdapter: () => Promise<unknown> };
    }
  ).gpu;
  if (gpu) {
    try {
      const adapter = await gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch {
      // WebGPU advertised but not usable in this webview.
    }
  }
  if (typeof WebAssembly === 'undefined') return 'none';
  return 'wasm';
}

export async function preloadBrowserModel(
  onProgress: (progress: BrowserProgress) => void
): Promise<void> {
  await getGenerator(onProgress);
}

export async function builtinModelIsCached(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open('transformers-cache');
    const keys = await cache.keys();
    return keys.some(key => key.url.includes('Qwen2.5-0.5B-Instruct'));
  } catch {
    return false;
  }
}

export async function generateCorrection(
  systemPrompt: string,
  text: string,
  onProgress: (progress: BrowserProgress) => void,
  signal?: AbortSignal
): Promise<{ text: string; backend: InferenceBackend }> {
  throwIfAborted(signal);
  onProgress({ kind: 'checking' });
  const loaded = await getGenerator(onProgress, signal);
  throwIfAborted(signal);
  onProgress({ kind: 'ready', backend: loaded.backend });
  const output = await loaded.generator(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    {
      max_new_tokens: tokenBudget(text),
      do_sample: false,
    }
  );
  throwIfAborted(signal);
  return { text: readGenerated(output), backend: loaded.backend };
}

async function getGenerator(
  onProgress: (progress: BrowserProgress) => void,
  signal?: AbortSignal
): Promise<{ generator: ChatGenerator; backend: InferenceBackend }> {
  if (!loading) {
    loading = loadGenerator(onProgress, signal).catch(error => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

async function loadGenerator(
  onProgress: (progress: BrowserProgress) => void,
  signal?: AbortSignal
): Promise<{ generator: ChatGenerator; backend: InferenceBackend }> {
  const preferred = await detectInferenceBackend();
  throwIfAborted(signal);
  if (preferred === 'none') {
    throw new Error('no inference backend');
  }
  try {
    return await loadOn(preferred, onProgress, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (preferred === 'webgpu') {
      return loadOn('wasm', onProgress, signal);
    }
    throw error;
  }
}

async function loadOn(
  backend: InferenceBackend,
  onProgress: (progress: BrowserProgress) => void,
  signal?: AbortSignal
): Promise<{ generator: ChatGenerator; backend: InferenceBackend }> {
  throwIfAborted(signal);
  onProgress({ kind: 'loading' });
  const transformers = await import('@huggingface/transformers');
  const { pipeline, env } = transformers;
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  const wasm = env.backends.onnx.wasm as
    { numThreads?: number; proxy?: boolean } | undefined;
  if (wasm) {
    wasm.numThreads = 1;
    wasm.proxy = false;
  }
  let lastPercent = -1;
  const generator = (await pipeline('text-generation', BROWSER_MODEL_ID, {
    dtype: 'q4f16',
    device: backend,
    progress_callback: info => {
      if (info.status === 'progress_total') {
        const progress = Math.max(0, Math.min(100, Math.round(info.progress)));
        if (progress !== lastPercent) {
          lastPercent = progress;
          onProgress({ kind: 'downloading', progress });
        }
        return;
      }
      if (info.status === 'initiate' || info.status === 'download') {
        onProgress({ kind: 'loading' });
      }
    },
  })) as ChatGenerator;
  onProgress({ kind: 'ready', backend });
  return { generator, backend };
}

function readGenerated(
  output: Array<{ generated_text: string | Array<{ content?: string }> }>
): string {
  const generated = output[0]?.generated_text;
  if (typeof generated === 'string') return generated;
  if (Array.isArray(generated)) {
    const last = generated[generated.length - 1];
    return typeof last?.content === 'string' ? last.content : '';
  }
  return '';
}

function tokenBudget(text: string): number {
  return Math.min(192, Math.max(24, Math.ceil(text.length / 3)));
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Correction cancelled', 'AbortError');
  }
}
