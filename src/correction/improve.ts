import { invoke } from '@tauri-apps/api/core';
import { improvePrompt, rewriteWithConfiguredLlm } from '@/lib/localLlm';
import { correctTranscript } from './engine';
import { loadCorrectionRules } from './promptStore';
import { usesBuiltinCorrector, type CorrectionStatus } from './types';
import type { AppConfig } from '@/types';

export async function improveDictation(text: string): Promise<string | null> {
  const value = text.trim();
  if (!value) return null;
  const config = await invoke<AppConfig>('get_config').catch(() => null);
  if (config && !config.runtime.llm_enabled) return null;
  const language = config?.runtime.default_language;

  if (!usesBuiltinCorrector(config?.runtime)) {
    return rewriteWithConfiguredLlm(improvePrompt(), value);
  }

  const result = await correctTranscript({
    text: value,
    language,
    rules: await loadCorrectionRules(),
    onStatus: reportStatus,
  });
  if (!result.text.trim()) return null;
  if (!result.usedModel && result.text.trim() === value) return null;
  return result.text;
}

function reportStatus(status: CorrectionStatus): void {
  void invoke('report_correction_status', { status }).catch(() => undefined);
}
