import assert from 'node:assert/strict';
import test from 'node:test';
import {
  binaryButton,
  deriveView,
  overallPercent,
  stepStates,
  type BinaryUpdateState,
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

const binary = (patch: Partial<BinaryUpdateState>): BinaryUpdateState => ({
  phase: 'idle',
  version: '0.11.0',
  downloaded: 0,
  total: null,
  error: null,
  busy: false,
  ...patch,
});

test('the binary update button stays hidden without an update', () => {
  assert.deepEqual(binaryButton(null), { kind: 'hidden' });
  assert.deepEqual(binaryButton(binary({})), { kind: 'hidden' });
  assert.deepEqual(binaryButton(binary({ phase: 'error' })), {
    kind: 'hidden',
  });
});

test('the binary update button shows progress once the size is known', () => {
  assert.deepEqual(
    binaryButton(binary({ phase: 'downloading', downloaded: 10 })),
    { kind: 'downloading', percent: null }
  );
  assert.deepEqual(
    binaryButton(binary({ phase: 'downloading', downloaded: 30, total: 120 })),
    { kind: 'downloading', percent: 25 }
  );
});

test('installing is blocked while dictating', () => {
  assert.deepEqual(binaryButton(binary({ phase: 'ready' })), {
    kind: 'ready',
    version: '0.11.0',
    blocked: false,
  });
  assert.deepEqual(binaryButton(binary({ phase: 'ready', busy: true })), {
    kind: 'ready',
    version: '0.11.0',
    blocked: true,
  });
});
