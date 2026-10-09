export type CorrectionMode = 'auto' | 'provider' | 'browser' | 'basic';

export type InferenceBackend = 'webgpu' | 'wasm';

export type CorrectionModelState =
  | 'unavailable'
  | 'checking'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'processing'
  | 'error';

export interface CorrectionStatus {
  state: CorrectionModelState;
  progress: number | null;
  provider: string | null;
  model: string | null;
  backend: InferenceBackend | null;
}

export interface CorrectionOutcome {
  text: string;
  usedModel: boolean;
  model: string | null;
  backend: InferenceBackend | null;
}

export const EMPTY_CORRECTION_STATUS: CorrectionStatus = {
  state: 'unavailable',
  progress: null,
  provider: null,
  model: null,
  backend: null,
};

export const BUILTIN_PROVIDER_ID = 'murmullo';
export const BROWSER_MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';
export const BROWSER_MODEL_LABEL = 'Qwen 2.5 0.5B';
export const BROWSER_MODEL_SIZE_MB = 480;

export function usesBuiltinCorrector(
  runtime:
    | {
        llm_provider?: string;
        correction_mode?: string;
      }
    | null
    | undefined
): boolean {
  if (!runtime) return false;
  return (
    runtime.llm_provider === BUILTIN_PROVIDER_ID ||
    runtime.correction_mode === 'browser'
  );
}

export function normalizeCorrectionMode(
  value: string | null | undefined
): CorrectionMode {
  if (
    value === 'auto' ||
    value === 'provider' ||
    value === 'browser' ||
    value === 'basic'
  ) {
    return value;
  }
  return 'auto';
}
