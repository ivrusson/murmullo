import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveView,
  overallPercent,
  stepStates,
  type UpdateStatus,
} from './progress.ts';

const status = (patch: Partial<UpdateStatus>): UpdateStatus => ({
  phase: 'downloading',
  percent: 40,
  target: 'v0.9.0',
  detail: '',
  pid: 10,
  updated_at: 0,
  alive: true,
  ...patch,
});

test('steps before the active one are done, after it pending', () => {
  assert.deepEqual(stepStates('downloading'), [
    'done',
    'active',
    'pending',
    'pending',
    'pending',
  ]);
  assert.deepEqual(stepStates('restarting'), [
    'done',
    'done',
    'done',
    'done',
    'active',
  ]);
  assert.deepEqual(stepStates('checking'), Array(5).fill('pending'));
});

test('no status file means nothing to show', () => {
  assert.deepEqual(deriveView(null, '0.8.2'), { kind: 'idle' });
  assert.deepEqual(deriveView(status({ phase: 'done' }), '0.8.2'), {
    kind: 'idle',
  });
});

test('a live run is running', () => {
  assert.equal(deriveView(status({}), '0.8.2').kind, 'running');
});

test('a dead run that never finished is interrupted, not stuck', () => {
  const view = deriveView(status({ alive: false }), '0.8.2');
  assert.equal(view.kind, 'failed');
  assert.equal(view.kind === 'failed' && view.interrupted, true);
});

test('errors are failures even if the process is gone', () => {
  const view = deriveView(
    status({ phase: 'error', alive: false, detail: 'boom' }),
    '0.8.2'
  );
  assert.equal(view.kind === 'failed' && view.interrupted, false);
});

test('restarting on the target version means the update finished', () => {
  assert.deepEqual(
    deriveView(status({ phase: 'restarting', target: 'v0.9.0' }), '0.9.0'),
    { kind: 'finished', version: '0.9.0' }
  );
  assert.equal(
    deriveView(status({ phase: 'restarting', target: 'v0.9.0' }), '0.8.2').kind,
    'running'
  );
});

test('percent is clamped and null stays null', () => {
  assert.equal(overallPercent(status({ percent: 140 })), 100);
  assert.equal(overallPercent(status({ percent: -3 })), 0);
  assert.equal(overallPercent(status({ percent: null })), null);
});
