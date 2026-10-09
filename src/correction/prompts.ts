import {
  languageName,
  promptLanguage,
  transcriptLanguage,
} from './language.ts';

const SPANISH_RULES = `Eres un corrector de transcripciones automáticas.
Corrige solo errores de la transcripción: ortografía, puntuación, mayúsculas, concordancia y palabras claramente mal oídas.
Conserva el significado, el idioma, los nombres propios, los números, las fechas, las URLs, los términos técnicos y los acrónimos.
No resumas, no reformules, no expliques y no añadas información.
Devuelve únicamente el texto corregido.`;

const ENGLISH_RULES = `You correct automatic transcripts.
Fix only transcription errors: spelling, punctuation, capitalisation, agreement, and words that were clearly misheard.
Preserve the meaning, the language, proper names, numbers, dates, URLs, technical terms, and acronyms.
Do not summarise, rewrite, explain, or add information.
Return only the corrected text.`;

export type CorrectionPromptSlot = 'es' | 'en';

export type CorrectionRuleOverrides = {
  es?: string | null;
  en?: string | null;
};

export function defaultCorrectionRules(slot: CorrectionPromptSlot): string {
  return slot === 'es' ? SPANISH_RULES : ENGLISH_RULES;
}

export function correctionLanguageLine(
  languageValue: string | null | undefined
): string {
  const language = transcriptLanguage(languageValue);
  if (promptLanguage(language) === 'es') {
    return 'El texto está en español. No lo traduzcas.';
  }
  const name = languageName(language);
  if (!name) return 'Keep the language of the text. Do not translate it.';
  if (language === 'en') return 'The text is in English. Do not translate it.';
  return `The text is in ${name}. Do not translate it.`;
}

export function correctionSystemPrompt(
  languageValue: string | null | undefined,
  overrides?: CorrectionRuleOverrides
): string {
  const language = transcriptLanguage(languageValue);
  const slot = promptLanguage(language);
  const custom = (slot === 'es' ? overrides?.es : overrides?.en)?.trim();
  const rules = custom || defaultCorrectionRules(slot);
  return `${rules}\n${correctionLanguageLine(language)}`;
}
