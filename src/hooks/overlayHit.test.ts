import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyCursorSample,
  clientPointFromPhysical,
  rectReceivesHit,
  shouldPassCursorThrough,
} from './overlayHit.ts';

test('physical cursor delta becomes a CSS point', () => {
  assert.deepEqual(clientPointFromPhysical(400, 300, 100, 80, 2), {
    x: 150,
    y: 110,
  });
});

test('a still cursor that lands on the same point is trusted', () => {
  assert.equal(classifyCursorSample(2, 3), 'match');
  assert.equal(classifyCursorSample(40, 0), 'inconclusive');
  assert.equal(classifyCursorSample(0, 120), 'mismatch');
});

test('click-through stays off while dragging, hovering, or uncalibrated', () => {
  assert.equal(
    shouldPassCursorThrough({
      overChrome: false,
      dragging: false,
      coordsTrusted: true,
    }),
    true
  );
  assert.equal(
    shouldPassCursorThrough({
      overChrome: true,
      dragging: false,
      coordsTrusted: true,
    }),
    false
  );
  assert.equal(
    shouldPassCursorThrough({
      overChrome: false,
      dragging: true,
      coordsTrusted: true,
    }),
    false
  );
  assert.equal(
    shouldPassCursorThrough({
      overChrome: false,
      dragging: false,
      coordsTrusted: false,
    }),
    false
  );
});

test('collapsed or non-interactive chrome does not count as a hit', () => {
  const box = {
    left: 10,
    top: 10,
    right: 80,
    bottom: 50,
    width: 70,
    height: 40,
    pointerEvents: 'auto',
    visibility: 'visible',
    opacity: '1',
  };
  assert.equal(rectReceivesHit(20, 20, box), true);
  assert.equal(rectReceivesHit(0, 0, box), false);
  assert.equal(
    rectReceivesHit(20, 20, { ...box, pointerEvents: 'none' }),
    false
  );
  assert.equal(rectReceivesHit(20, 20, { ...box, opacity: '0' }), false);
  assert.equal(rectReceivesHit(20, 20, { ...box, width: 0, height: 0 }), false);
});
