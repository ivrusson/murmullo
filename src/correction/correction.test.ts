import assert from 'node:assert/strict';
import test from 'node:test';
import { polishTranscript } from './basic.ts';
import { chunkTranscript } from './chunking.ts';
import { transcriptLanguage } from './language.ts';
import { correctionSystemPrompt } from './prompts.ts';
import { sanitizeCorrection } from './sanitize.ts';

test('chunks stay within the character budget and keep sentence breaks', () => {
  const text = Array.from(
    { length: 12 },
    (_, index) => `Frase número ${index + 1} termina aquí.`
  ).join(' ');
  const chunks = chunkTranscript(text, {
    maxCharacters: 80,
    maxSegments: 2,
  });
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 80);
  }
  assert.equal(chunks.join(' '), text);
});

test('basic polish capitalises and closes a sentence', () => {
  assert.equal(
    polishTranscript('pues nada el proyecto va bien'),
    'Pues nada el proyecto va bien.'
  );
});

test('short fragments are left without a forced period', () => {
  assert.equal(polishTranscript('hola'), 'Hola');
});

test('transcript language follows the configured code', () => {
  assert.equal(transcriptLanguage('es-ES'), 'es');
  assert.equal(transcriptLanguage('EN'), 'en');
  assert.equal(transcriptLanguage('fr'), 'fr');
  assert.equal(transcriptLanguage(null), 'auto');
  assert.equal(transcriptLanguage('ja'), 'auto');
});

test('prompts keep the transcript language', () => {
  assert.match(correctionSystemPrompt('es'), /español/);
  assert.match(correctionSystemPrompt('en'), /English/);
  assert.match(correctionSystemPrompt('fr'), /French/);
  assert.match(correctionSystemPrompt('de'), /German/);
  assert.match(correctionSystemPrompt(null), /Do not translate/);
  assert.doesNotMatch(correctionSystemPrompt('en'), /español/);
});

test('custom correction rules replace the default and keep the language line', () => {
  const spanish = correctionSystemPrompt('es', {
    es: 'Corrige solo los nombres.',
  });
  assert.match(spanish, /Corrige solo los nombres/);
  assert.match(spanish, /No lo traduzcas/);
  assert.doesNotMatch(spanish, /ortografía/);
  const french = correctionSystemPrompt('fr', { en: 'Fix names only.' });
  assert.match(french, /Fix names only/);
  assert.match(french, /French/);
  assert.doesNotMatch(french, /spelling/);
});

test('rejects corrections that rewrite the transcript', () => {
  const original = 'el presupuesto es de mil quinientos euros mañana';
  assert.equal(
    sanitizeCorrection(original, `Texto corregido: ${original}.`),
    `${original}.`
  );
  assert.equal(
    sanitizeCorrection(
      original,
      `${'Inventa un contexto nuevo y cambia el sentido. '.repeat(8)}`
    ),
    null
  );
});
