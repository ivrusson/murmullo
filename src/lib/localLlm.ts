import { invoke } from '@tauri-apps/api/core';
import { t } from '@/i18n';

export async function rewriteWithConfiguredLlm(
  systemPrompt: string,
  userText: string
): Promise<string | null> {
  const text = userText.trim();
  if (!systemPrompt.trim() || text.length === 0) return null;
  try {
    const rewritten = await invoke<string | null>(
      'rewrite_with_configured_llm',
      {
        systemPrompt,
        userText: text,
      }
    );
    const content = rewritten?.trim() ?? '';
    return content.length > 0 ? content : null;
  } catch {
    return null;
  }
}

/** @deprecated Use rewriteWithConfiguredLlm */
export const rewriteWithLocalLlm = async (
  _llmUrl: string,
  _model: string,
  systemPrompt: string,
  userText: string
): Promise<string | null> => rewriteWithConfiguredLlm(systemPrompt, userText);

export function summarizePrompt(): string {
  return t('llm.summarize');
}

export function improvePrompt(): string {
  return t('llm.improve');
}

export function translatePrompt(): string {
  return t('llm.translate');
}

export const SUMMARIZE_PROMPT = summarizePrompt;
export const IMPROVE_PROMPT = improvePrompt;
export const TRANSLATE_PROMPT = translatePrompt;
