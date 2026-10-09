const KNOWN_LANGUAGES = ['es', 'en', 'fr', 'de', 'it', 'pt'] as const;

export type KnownTranscriptLanguage = (typeof KNOWN_LANGUAGES)[number] | 'auto';

const ENGLISH_NAMES: Record<
  Exclude<KnownTranscriptLanguage, 'auto'>,
  string
> = {
  es: 'Spanish',
  en: 'English',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
};

export function transcriptLanguage(
  value: string | null | undefined
): KnownTranscriptLanguage {
  if (!value) return 'auto';
  const base = value.trim().toLowerCase().split('-')[0];
  if (base === 'auto' || base === '') return 'auto';
  if ((KNOWN_LANGUAGES as readonly string[]).includes(base)) {
    return base as Exclude<KnownTranscriptLanguage, 'auto'>;
  }
  return 'auto';
}

export function promptLanguage(language: KnownTranscriptLanguage): 'es' | 'en' {
  return language === 'es' ? 'es' : 'en';
}

export function languageName(language: KnownTranscriptLanguage): string | null {
  if (language === 'auto') return null;
  return ENGLISH_NAMES[language];
}
