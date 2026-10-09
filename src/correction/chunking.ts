export interface ChunkingOptions {
  maxCharacters?: number;
  maxSegments?: number;
}

const DEFAULT_MAX_CHARACTERS = 2800;
const DEFAULT_MAX_SEGMENTS = 8;

export function chunkTranscript(
  text: string,
  options: ChunkingOptions = {}
): string[] {
  const maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CHARACTERS;
  const maxSegments = options.maxSegments ?? DEFAULT_MAX_SEGMENTS;
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  if (normalized.length <= maxCharacters) return [normalized];

  const sentences = splitSentences(normalized);
  const chunks: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    chunks.push(current.join(' '));
    current = [];
  };

  for (const sentence of sentences) {
    if (sentence.length > maxCharacters) {
      flush();
      chunks.push(...hardSplit(sentence, maxCharacters));
      continue;
    }
    const currentLength = current.join(' ').length;
    const nextLength =
      current.length === 0
        ? sentence.length
        : currentLength + 1 + sentence.length;
    if (
      current.length > 0 &&
      (current.length >= maxSegments || nextLength > maxCharacters)
    ) {
      flush();
    }
    current.push(sentence);
  }
  flush();
  return chunks;
}

function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?…])\s+/u);
  return parts.map(part => part.trim()).filter(Boolean);
}

function hardSplit(text: string, maxCharacters: number): string[] {
  const words = text.split(' ');
  const pieces: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (current.length + 1 + word.length > maxCharacters) {
      pieces.push(current);
      current = word;
      continue;
    }
    current = `${current} ${word}`;
  }
  if (current) pieces.push(current);
  return pieces;
}
