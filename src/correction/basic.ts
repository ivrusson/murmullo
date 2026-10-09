const TERMINAL = /[.!?…:;"')\]]$/u;

export function polishTranscript(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  let value = capitalizeSentenceStarts(compact);
  if (needsTerminalPunctuation(value)) {
    value = `${value}.`;
  }
  return value;
}

function capitalizeSentenceStarts(text: string): string {
  return text.replace(
    /(^|[.!?…]\s+|¿\s*|¡\s*)(\p{Ll})/gu,
    (_match, prefix: string, letter: string) =>
      prefix + letter.toLocaleUpperCase()
  );
}

function needsTerminalPunctuation(text: string): boolean {
  const words = text.split(' ').filter(Boolean);
  if (words.length < 4) return false;
  return !TERMINAL.test(text);
}
