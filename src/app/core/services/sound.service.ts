import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoundService {
  private ctx: AudioContext | null = null;

  notificationSoundEnabled = true;
  clickSoundEnabled = true;

  constructor() {
    const notif = localStorage.getItem('dm-sound-notif');
    const click = localStorage.getItem('dm-sound-click');
    this.notificationSoundEnabled = notif === null ? true : notif === 'true';
    this.clickSoundEnabled        = click === null ? true : click === 'true';
  }

  toggleNotification(): void {
    this.notificationSoundEnabled = !this.notificationSoundEnabled;
    localStorage.setItem('dm-sound-notif', String(this.notificationSoundEnabled));
    if (this.notificationSoundEnabled) this.playNotification();
  }

  toggleClick(): void {
    this.clickSoundEnabled = !this.clickSoundEnabled;
    localStorage.setItem('dm-sound-click', String(this.clickSoundEnabled));
    if (this.clickSoundEnabled) this.playToggleOn();
  }

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  /** Soft two-tone chime — played when click sound is switched ON */
  playToggleOn(): void {
    this.chime([523.25, 783.99], [0, 0.12], 0.18, 'sine');
  }

  /** Single soft click — UI interactions */
  playClick(): void {
    if (!this.clickSoundEnabled) return;
    this.tone(880, 0, 0.06, 0.08, 'sine', 0.12);
  }

  /** Notification pop — bell-like */
  playNotification(): void {
    if (!this.notificationSoundEnabled) return;
    this.chime([1046.5, 1318.5, 1568], [0, 0.1, 0.2], 0.22, 'sine');
  }

  /** Success save — ascending ding */
  playSuccess(): void {
    if (!this.clickSoundEnabled) return;
    this.chime([523.25, 659.25, 783.99], [0, 0.1, 0.2], 0.18, 'triangle');
  }

  /** Error / warning — low buzz */
  playError(): void {
    if (!this.clickSoundEnabled) return;
    this.tone(220, 0, 0.12, 0.18, 'sawtooth', 0.08);
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private chime(
    freqs: number[], offsets: number[],
    duration: number, type: OscillatorType
  ): void {
    freqs.forEach((freq, i) => {
      this.tone(freq, offsets[i], duration, duration * 0.6, type, 0.13);
    });
  }

  private tone(
    freq: number, startOffset: number,
    duration: number, fadeOut: number,
    type: OscillatorType, gain: number
  ): void {
    try {
      const ctx  = this.getCtx();
      const osc  = ctx.createOscillator();
      const env  = ctx.createGain();
      const now  = ctx.currentTime + startOffset;

      osc.type      = type;
      osc.frequency.setValueAtTime(freq, now);

      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(gain, now + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(env);
      env.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch { /* AudioContext blocked before user gesture — silently ignore */ }
  }
}
