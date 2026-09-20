import { AudioEnvelope } from './audio';
import { DEFAULT_PARAMS, mergeParams } from './presets';
import type {
  MurmulloParams,
  MurmulloParamsPatch,
  MurmulloPose,
  MurmulloState,
} from './types';

/** Target look for each state; the engine eases between them. */
interface StateTarget {
  eyeOpen: number;
  eyeSmile: number;
  eyeDroop: number;
  eyeSize: number;
  eyeSpacing: number;
  glow: number;
  opacity: number;
  ghost: number;
  hueShift: number;
  flowAmp: number;
  flowSpeed: number;
  scale: number;
  tilt: number;
  offsetX: number;
  offsetY: number;
  arcs: number;
  sparkle: number;
  rays: number;
  trail: number;
  /** How much audio is allowed to drive this state. */
  reactivity: number;
  /** How much the eyes wander in this state. */
  gaze: number;
  /** Where the eyes rest when not wandering. */
  restLookX: number;
  restLookY: number;
}

const BASE: StateTarget = {
  eyeOpen: 1,
  eyeSmile: 0,
  eyeDroop: 0,
  eyeSize: 1,
  eyeSpacing: 1,
  glow: 0.35,
  opacity: 1,
  ghost: 0,
  hueShift: 0,
  flowAmp: 0.6,
  flowSpeed: 0.55,
  scale: 1,
  tilt: 0,
  offsetX: 0,
  offsetY: 0,
  arcs: 0,
  sparkle: 0,
  rays: 0,
  trail: 0,
  reactivity: 0.25,
  gaze: 1,
  restLookX: 0,
  restLookY: 0,
};

export const STATE_TARGETS: Record<MurmulloState, StateTarget> = {
  idle: { ...BASE },
  listening: {
    ...BASE,
    eyeOpen: 1.08,
    glow: 0.8,
    flowAmp: 0.85,
    flowSpeed: 1.05,
    arcs: 1,
    tilt: -0.07,
    reactivity: 1,
    gaze: 0.25,
    restLookX: 0.15,
    restLookY: 0.1,
  },
  speaking: {
    ...BASE,
    eyeOpen: 0.92,
    glow: 0.7,
    flowAmp: 1.25,
    flowSpeed: 1.6,
    tilt: 0.28,
    scale: 1.04,
    reactivity: 1.5,
    gaze: 0,
    restLookX: 0.35,
    restLookY: -0.1,
  },
  processing: {
    ...BASE,
    eyeOpen: 0,
    eyeSmile: 1,
    glow: 0.6,
    flowAmp: 0.75,
    flowSpeed: 1.5,
    sparkle: 1,
    reactivity: 0,
    gaze: 0,
  },
  done: {
    ...BASE,
    eyeOpen: 0,
    eyeSmile: 0.8,
    glow: 0.95,
    flowAmp: 0.5,
    flowSpeed: 0.7,
    rays: 1,
    scale: 1.03,
    reactivity: 0,
    gaze: 0,
  },
  vanishing: {
    ...BASE,
    eyeOpen: 0.7,
    eyeSize: 0.9,
    glow: 0.3,
    opacity: 0.28,
    ghost: 0.7,
    hueShift: 1,
    flowAmp: 0.5,
    flowSpeed: 0.7,
    offsetX: 0.35,
    offsetY: 0.05,
    trail: 1,
    reactivity: 0,
    gaze: 0,
    restLookX: 0.6,
    restLookY: 0.3,
  },
  background: {
    ...BASE,
    eyeOpen: 0.95,
    eyeSize: 0.85,
    glow: 0.15,
    opacity: 0.6,
    ghost: 1,
    hueShift: 0.6,
    flowAmp: 0.35,
    flowSpeed: 0.35,
    scale: 0.72,
    reactivity: 0.1,
    gaze: 0.5,
  },
  error: {
    ...BASE,
    eyeOpen: 0.55,
    eyeDroop: 1,
    glow: 0.45,
    hueShift: -1,
    flowAmp: 0.35,
    flowSpeed: 0.3,
    tilt: 0.06,
    offsetY: -0.03,
    reactivity: 0,
    gaze: 0,
    restLookX: -0.2,
    restLookY: -0.3,
  },
};

const TAU = Math.PI * 2;
const BLINK_DURATION = 0.16;
const HOP_DURATION = 0.5;

function ease(
  current: number,
  target: number,
  dt: number,
  tau: number
): number {
  return (
    current + (target - current) * (1 - Math.exp(-dt / Math.max(1e-3, tau)))
  );
}

export interface MurmulloEngineOptions {
  params?: MurmulloParamsPatch;
  state?: MurmulloState;
  /** Injectable RNG for deterministic tests. */
  random?: () => number;
}

/**
 * Framework-agnostic animation brain. Call `setState`, `pushLevel` and
 * `update(dt)`; read `pose` afterwards.
 */
export class MurmulloEngine {
  params: MurmulloParams;
  state: MurmulloState;
  readonly pose: MurmulloPose;
  readonly envelope: AudioEnvelope;

  private readonly random: () => number;
  private cur: StateTarget;
  private time = 0;
  private nextBlink = 0;
  private blinkStart = -1;
  private nextGaze = 0;
  private gazeTargetX = 0;
  private gazeTargetY = 0;
  private lookX = 0;
  private lookY = 0;
  private hopStart = -1;
  private perkStart = -1;
  private driftX = 0;

  constructor(options: MurmulloEngineOptions = {}) {
    this.params = mergeParams(DEFAULT_PARAMS, options.params);
    this.state = options.state ?? 'idle';
    this.random = options.random ?? Math.random;
    this.cur = { ...STATE_TARGETS[this.state] };
    this.envelope = new AudioEnvelope(this.params.audio);
    this.pose = {
      time: 0,
      scaleX: 1,
      scaleY: 1,
      scale: 1,
      tilt: 0,
      offsetX: 0,
      offsetY: 0,
      flowAmp: 0.6,
      flowSpeed: 0.5,
      flowPhase: 0,
      level: 0,
      pulse: 0,
      glow: 0.35,
      opacity: 1,
      ghost: 0,
      hueShift: 0,
      eyeOpen: 1,
      eyeSmile: 0,
      eyeDroop: 0,
      eyeLookX: 0,
      eyeLookY: 0,
      eyeSpacing: 1,
      eyeSize: 1,
      arcs: 0,
      sparkle: 0,
      rays: 0,
      trail: 0,
    };
    this.scheduleBlink();
    this.scheduleGaze();
    this.update(0);
  }

  setParams(patch: MurmulloParamsPatch): void {
    this.params = mergeParams(this.params, patch);
    this.envelope.setParams(this.params.audio);
  }

  replaceParams(params: MurmulloParams): void {
    this.params = params;
    this.envelope.setParams(params.audio);
  }

  setState(next: MurmulloState): void {
    if (next === this.state) return;
    const prev = this.state;
    this.state = next;
    if (next === 'done') this.hopStart = this.time;
    if (next === 'listening' && prev !== 'speaking') this.perkStart = this.time;
    if (next === 'vanishing') this.driftX = 0;
    if (next !== 'listening' && next !== 'speaking') this.envelope.reset();
  }

  /** Raw loudness 0..1 from any source. */
  pushLevel(raw: number): void {
    this.envelope.push(raw);
  }

  update(dt: number): MurmulloPose {
    const { motion } = this.params;
    const still = motion.reducedMotion;
    const clamped = Math.min(0.1, Math.max(0, dt));
    this.time += clamped;
    const t = this.time;
    const target = STATE_TARGETS[this.state];

    this.envelope.update(clamped);
    const react = target.reactivity * motion.reactivity;
    const level = this.envelope.level * react;
    const pulse = still ? 0 : this.envelope.pulse * react;

    // ease every scalar of the current look toward the state target
    const cur = this.cur;
    (Object.keys(cur) as Array<keyof StateTarget>).forEach(key => {
      const tau =
        key === 'eyeOpen' || key === 'eyeSmile' || key === 'eyeDroop'
          ? 0.14
          : key === 'opacity' || key === 'offsetX' || key === 'scale'
            ? 0.45
            : 0.28;
      cur[key] = ease(cur[key], target[key], clamped, tau);
    });

    // one-shots
    let hop = 0;
    if (this.hopStart >= 0) {
      const h = (t - this.hopStart) / HOP_DURATION;
      if (h >= 1) this.hopStart = -1;
      else hop = Math.sin(h * Math.PI) * 0.16 * (still ? 0 : 1);
    }
    let perk = 0;
    if (this.perkStart >= 0) {
      const p = (t - this.perkStart) / 0.4;
      if (p >= 1) this.perkStart = -1;
      else perk = Math.sin(p * Math.PI) * 0.08 * (still ? 0 : 1);
    }

    // breathing + audio inflation + squash & stretch
    const breath = still
      ? 0
      : Math.sin(t * TAU * motion.breathRate) * motion.breathAmp;
    const inflate = level * 0.16;
    const stretch = (pulse * 0.14 + perk + hop * 0.6) * motion.squash;
    const speakingWeight = this.state === 'speaking' ? 1 : 0;
    const wobble = still
      ? 0
      : Math.sin(t * 9.3) * level * 0.09 * speakingWeight;

    const pose = this.pose;
    pose.time = t;
    pose.scale = cur.scale;
    pose.scaleX =
      cur.scale * (1 + breath * 0.6 + inflate * 0.5 - stretch * 0.5);
    pose.scaleY = cur.scale * (1 + breath + inflate + stretch);
    pose.tilt = cur.tilt + (still ? 0 : Math.sin(t * 0.7) * 0.02) + wobble;

    if (this.state === 'vanishing') {
      this.driftX = Math.min(1, this.driftX + clamped * 0.6);
    } else {
      this.driftX = Math.max(0, this.driftX - clamped * 2);
    }
    pose.offsetX =
      cur.offsetX * this.driftX + (still ? 0 : Math.sin(t * 0.43) * 0.012);
    pose.offsetY =
      cur.offsetY +
      hop +
      (still ? 0 : Math.sin(t * 0.5) * 0.025) +
      pulse * 0.05 * speakingWeight;

    pose.flowAmp =
      motion.flowAmp * (cur.flowAmp + level * 0.9) * (still ? 0 : 1);
    pose.flowSpeed = motion.flowSpeed * (cur.flowSpeed + level * 1.2);
    pose.flowPhase += clamped * pose.flowSpeed * (still ? 0 : 1);

    pose.level = level;
    pose.pulse = pulse;
    pose.glow = Math.min(1.2, cur.glow + level * 0.55 + pulse * 0.25);
    pose.opacity = cur.opacity;
    pose.ghost = cur.ghost;
    pose.hueShift = cur.hueShift;

    // eyes
    this.updateEyes(clamped, target, still);
    const blink = this.blinkFactor(t);
    pose.eyeSmile = cur.eyeSmile;
    pose.eyeDroop = cur.eyeDroop;
    pose.eyeOpen =
      cur.eyeOpen * (1 - blink) * (1 - cur.eyeSmile) * (1 + level * 0.12) -
      pulse * 0.25 * speakingWeight;
    pose.eyeOpen = Math.max(0, pose.eyeOpen);
    pose.eyeLookX = this.lookX;
    pose.eyeLookY = this.lookY;
    pose.eyeSpacing = cur.eyeSpacing * (1 + inflate * 0.3);
    pose.eyeSize = cur.eyeSize * (1 + level * 0.22 * speakingWeight);

    pose.arcs = cur.arcs;
    pose.sparkle = cur.sparkle;
    pose.rays = cur.rays;
    pose.trail = cur.trail;
    return pose;
  }

  private updateEyes(dt: number, target: StateTarget, still: boolean): void {
    const wander = this.params.motion.gazeWander * target.gaze;
    if (!still && wander > 0 && this.time >= this.nextGaze) {
      this.gazeTargetX = (this.random() * 2 - 1) * 0.7 * wander;
      this.gazeTargetY = (this.random() * 1.1 - 0.5) * 0.6 * wander;
      this.scheduleGaze();
    }
    const tx = wander > 0 ? this.gazeTargetX : target.restLookX;
    const ty = wander > 0 ? this.gazeTargetY : target.restLookY;
    this.lookX = ease(this.lookX, tx, dt, 0.35);
    this.lookY = ease(this.lookY, ty, dt, 0.35);
  }

  private blinkFactor(t: number): number {
    if (this.params.motion.reducedMotion) return 0;
    if (this.blinkStart >= 0) {
      const b = (t - this.blinkStart) / BLINK_DURATION;
      if (b >= 1) {
        this.blinkStart = -1;
        this.scheduleBlink();
        return 0;
      }
      return Math.sin(b * Math.PI);
    }
    if (
      t >= this.nextBlink &&
      this.cur.eyeSmile < 0.5 &&
      this.cur.eyeOpen > 0.3
    ) {
      this.blinkStart = t;
    }
    return 0;
  }

  private scheduleBlink(): void {
    const rate = Math.max(1, this.params.motion.blinkRate);
    const mean = 60 / rate;
    this.nextBlink = this.time + mean * (0.55 + this.random() * 0.9);
  }

  private scheduleGaze(): void {
    this.nextGaze = this.time + 1.4 + this.random() * 2.6;
  }
}

/** Map the app's dictation pipeline mode onto a mascot state. */
export function sceneModeToState(
  mode: 'idle' | 'recording' | 'processing' | 'complete' | 'error'
): MurmulloState {
  switch (mode) {
    case 'recording':
      return 'listening';
    case 'processing':
      return 'processing';
    case 'complete':
      return 'done';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}
