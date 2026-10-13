export type UpdatePhase =
  | 'checking'
  | 'fetching'
  | 'downloading'
  | 'applying'
  | 'installing'
  | 'restarting'
  | 'done'
  | 'error';

/** Mirror of `UpdateStatus` in src-tauri/src/updater.rs. */
export interface UpdateStatus {
  phase: UpdatePhase;
  percent: number | null;
  target: string;
  detail: string;
  pid: number;
  updated_at: number;
  alive: boolean;
}

/** Mirror of `UpdateInfo` in src-tauri/src/updater.rs. */
export interface UpdateInfo {
  supported: boolean;
  reason: string | null;
  current: string;
  latest: string | null;
  update_available: boolean;
  has_local_changes: boolean;
  notes: string | null;
}

export const UPDATE_STEPS = [
  'release',
  'dependencies',
  'apply',
  'install',
  'restart',
] as const;

export type UpdateStep = (typeof UPDATE_STEPS)[number];
export type StepState = 'done' | 'active' | 'pending';

const STEP_OF_PHASE: Record<UpdatePhase, number> = {
  checking: -1,
  fetching: 0,
  downloading: 1,
  applying: 2,
  installing: 3,
  restarting: 4,
  done: UPDATE_STEPS.length,
  error: -1,
};

export function stepStates(phase: UpdatePhase): StepState[] {
  const active = STEP_OF_PHASE[phase];
  return UPDATE_STEPS.map((_, index) =>
    index < active ? 'done' : index === active ? 'active' : 'pending'
  );
}

export type UpdateView =
  | { kind: 'idle' }
  | { kind: 'running'; status: UpdateStatus }
  | { kind: 'finished'; version: string }
  | { kind: 'failed'; status: UpdateStatus; interrupted: boolean };

const strip = (version: string) => version.replace(/^v/, '');

/**
 * What the UI should show for the progress file. `current` is the version of the
 * running app: after a relaunch it equals the target, which is how a finished
 * update is told apart from one that is still working.
 */
export function deriveView(
  status: UpdateStatus | null,
  current: string
): UpdateView {
  if (!status || status.phase === 'done') return { kind: 'idle' };
  if (status.phase === 'error') {
    return { kind: 'failed', status, interrupted: false };
  }
  if (status.phase === 'restarting' && strip(status.target) === current) {
    return { kind: 'finished', version: strip(status.target) };
  }
  if (!status.alive) return { kind: 'failed', status, interrupted: true };
  return { kind: 'running', status };
}

/** Overall percent for the bar; null while the script has not reported one. */
export function overallPercent(status: UpdateStatus): number | null {
  if (status.percent === null || Number.isNaN(status.percent)) return null;
  return Math.max(0, Math.min(100, Math.round(status.percent)));
}
