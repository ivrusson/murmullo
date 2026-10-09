import { invoke } from '@tauri-apps/api/core';
import type { CorrectionRuleOverrides } from './prompts';

export interface CorrectionPromptState {
  es: string | null;
  en: string | null;
  provider: string | null;
  provider_default: string;
}

export async function loadCorrectionPrompts(): Promise<CorrectionPromptState | null> {
  return invoke<CorrectionPromptState>('get_correction_prompts').catch(
    () => null
  );
}

export async function loadCorrectionRules(): Promise<CorrectionRuleOverrides> {
  const stored = await loadCorrectionPrompts();
  return { es: stored?.es, en: stored?.en };
}

export async function saveCorrectionPrompt(
  slot: 'es' | 'en' | 'provider',
  text: string | null
): Promise<CorrectionPromptState | null> {
  return invoke<CorrectionPromptState>('set_correction_prompt', {
    slot,
    text,
  }).catch(() => null);
}
