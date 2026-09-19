import type { MurmulloAudioParams } from './types';

/**
 * Envelope follower + onset detector.
 *
 * Feed it any 0..1 loudness figure (Tauri's `audio-level-updated`, a WebAudio
 * RMS, or a synthetic signal) and it returns a smoothed `level` plus a short
 * `pulse` that fires on sudden jumps (syllables, claps). The mascot uses
 * `level` for continuous inflation/glow and `pulse` for squash & stretch.
 */
export class AudioEnvelope {
  level = 0;
  pulse = 0;
  private input = 0;
  private slow = 0;

  constructor(private params: MurmulloAudioParams) {}

  setParams(params: MurmulloAudioParams): void {
    this.params = params;
  }

  /** Push a raw loudness sample (any rate). Values are clamped to 0..1. */
  push(raw: number): void {
    const { gate, gain } = this.params;
    const gated = Math.max(0, raw - gate) / Math.max(1e-3, 1 - gate);
    // soft clip so loud input saturates gently
    const x = gated * gain;
    this.input = x / (1 + x);
  }

  /** Advance the envelope by `dt` seconds. */
  update(dt: number): void {
    const { attack, release, onset } = this.params;
    const target = this.input;
    const tau = target > this.level ? attack : release;
    const k = 1 - Math.exp(-dt / Math.max(1e-3, tau));
    this.level += (target - this.level) * k;

    // slow reference for onset detection
    const kSlow = 1 - Math.exp(-dt / 0.6);
    this.slow += (this.level - this.slow) * kSlow;
    const delta = this.level - this.slow;
    if (onset > 0 && delta > 0.12 / onset) {
      this.pulse = Math.max(this.pulse, Math.min(1, delta * 3 * onset));
    }
    this.pulse *= Math.exp(-dt / 0.14);
    if (this.pulse < 0.002) this.pulse = 0;
  }

  reset(): void {
    this.level = 0;
    this.pulse = 0;
    this.input = 0;
    this.slow = 0;
  }
}

export interface LevelSource {
  /** Returns the current loudness in 0..1. */
  read(): number;
  stop(): void;
}

/**
 * Browser microphone via WebAudio. Useful for the web demo / lab page; inside
 * Tauri the Rust side already streams `audio-level-updated`.
 */
export async function createMicLevelSource(
  options: { fftSize?: number } = {}
): Promise<LevelSource> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: false,
  });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = options.fftSize ?? 1024;
  analyser.smoothingTimeConstant = 0.2;
  source.connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);

  return {
    read() {
      analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i];
      const rms = Math.sqrt(sum / buffer.length);
      // speech RMS sits around 0.02..0.2; map to 0..1 with a log-ish curve
      return Math.min(1, Math.pow(rms * 4, 0.7));
    },
    stop() {
      stream.getTracks().forEach(track => track.stop());
      void ctx.close();
    },
  };
}

/** Synthetic "someone talking" signal for demos and tests. */
export function createSyntheticLevelSource(): LevelSource {
  const start = performance.now();
  return {
    read() {
      const t = (performance.now() - start) / 1000;
      const syllables = Math.max(
        0,
        Math.sin(t * 7.3) * 0.5 + Math.sin(t * 11.1) * 0.3
      );
      const phrase = 0.5 + 0.5 * Math.sin(t * 0.45);
      const pause = Math.sin(t * 0.9) > -0.6 ? 1 : 0;
      return Math.min(1, syllables * phrase * pause * 0.9);
    },
    stop() {
      /* nothing to release */
    },
  };
}
