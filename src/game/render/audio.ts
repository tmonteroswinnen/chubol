/**
 * Sound effects synthesised with the Web Audio API.
 *
 * No audio files exist in the repository, and this session cannot produce them,
 * so the chain rattle, the wooden knock, the bounce and the footsteps are
 * generated at runtime. The game runs normally with sound muted or unavailable:
 * every call is wrapped, and nothing depends on audio to make progress.
 */

export class SoundBoard {
  private context: AudioContext | null = null;
  private mutedValue = false;

  get muted(): boolean {
    return this.mutedValue;
  }

  setMuted(muted: boolean): void {
    this.mutedValue = muted;
  }

  toggleMuted(): boolean {
    this.mutedValue = !this.mutedValue;
    return this.mutedValue;
  }

  /** Must be called from a user gesture; browsers refuse audio before one. */
  unlock(): void {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume();
    } catch {
      this.context = null;
    }
  }

  dispose(): void {
    try {
      void this.context?.close();
    } catch {
      /* closing a context that never opened is not an error worth surfacing */
    }
    this.context = null;
  }

  /** Short metallic rattle, played the moment the ball passes through the ring. */
  chain(): void {
    this.noise(0.28, 2600, 0.5, 'bandpass', 5);
    this.noise(0.18, 4200, 0.28, 'highpass', 1);
  }

  board(): void {
    this.tone(180, 0.09, 'triangle', 0.3);
    this.noise(0.06, 900, 0.18, 'lowpass', 1);
  }

  bounce(): void {
    this.tone(120, 0.08, 'sine', 0.22);
  }

  rim(): void {
    this.tone(880, 0.07, 'square', 0.1);
  }

  step(): void {
    this.noise(0.05, 700, 0.06, 'lowpass', 1);
  }

  score(points: number): void {
    const base = 520 + points * 34;
    this.tone(base, 0.09, 'square', 0.14);
    window.setTimeout(() => this.tone(base * 1.5, 0.11, 'square', 0.12), 80);
  }

  miss(): void {
    this.tone(196, 0.16, 'sawtooth', 0.09);
  }

  fanfare(): void {
    [523, 659, 784, 1047].forEach((frequency, index) => {
      window.setTimeout(() => this.tone(frequency, 0.18, 'square', 0.13), index * 110);
    });
  }

  private ready(): AudioContext | null {
    if (this.mutedValue) return null;
    if (this.context === null) return null;
    if (this.context.state !== 'running') return null;
    return this.context;
  }

  private tone(frequency: number, duration: number, type: OscillatorType, gainValue: number): void {
    const ctx = this.ready();
    if (ctx === null) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  private noise(duration: number, frequency: number, gainValue: number, filter: BiquadFilterType, q: number): void {
    const ctx = this.ready();
    if (ctx === null) return;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      const decay = 1 - i / frames;
      data[i] = (Math.random() * 2 - 1) * decay * decay;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.setValueAtTime(frequency, ctx.currentTime);
    biquad.Q.setValueAtTime(q, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    source.connect(biquad).connect(gain).connect(ctx.destination);
    source.start();
  }
}

export const soundBoard = new SoundBoard();
