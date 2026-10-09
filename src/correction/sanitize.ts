const LEADING_LABEL =
  /^(?:texto corregido|correcci[oó]n|corrected text|correction|here is the corrected text|aquí (?:está|tienes) el texto corregido)\s*:\s*/i;

export function sanitizeCorrection(
  original: string,
  raw: string
): string | null {
  let text = raw.replace(/\r/g, '').trim();
  text = text
    .replace(/^```[\w-]*\s*/u, '')
    .replace(/\s*```$/u, '')
    .trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith('«') && text.endsWith('»')) ||
    (text.startsWith('“') && text.endsWith('”'))
  ) {
    text = text.slice(1, -1).trim();
  }
  text = text.replace(LEADING_LABEL, '').trim();
  if (!text) return null;

  const originalLength = original.trim().length;
  if (text.length > originalLength * 2 + 80) return null;
  if (originalLength > 40 && text.length < originalLength * 0.45) return null;
  return text;
}
