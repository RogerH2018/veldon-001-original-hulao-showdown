const cues = {
  round: [[165, 0, 0.11, 'triangle'], [220, 0.11, 0.14, 'triangle']],
  fight: [[330, 0, 0.13, 'square'], [440, 0.1, 0.23, 'triangle']],
  swing: [[115, 0, 0.09, 'triangle']],
  hit: [[75, 0, 0.15, 'square'], [133, 0.015, 0.09, 'triangle']],
  guard: [[264, 0, 0.08, 'triangle'], [397, 0.01, 0.1, 'sine']],
  surge: [[117, 0, 0.25, 'sawtooth'], [234, 0.06, 0.22, 'triangle']],
  roundEnd: [[294, 0, 0.2, 'triangle'], [196, 0.14, 0.23, 'triangle']],
  match: [[262, 0, 0.18, 'triangle'], [392, 0.12, 0.23, 'triangle'], [523, 0.24, 0.38, 'triangle']],
};

export class FightSound {
  constructor() { this.enabled = true; }
  unlock() {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio || !this.enabled) return;
    this.context ??= new Audio();
    void this.context.resume().catch(() => {});
  }
  play(event) {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== 'running' || !cues[event]) return;
    for (const [frequency, offset, length, type] of cues[event]) {
      const start = ctx.currentTime + offset;
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * (event === 'match' ? 0.95 : 0.55), start + length);
      volume.gain.setValueAtTime(0.001, start);
      volume.gain.exponentialRampToValueAtTime(type === 'square' ? 0.042 : 0.09, start + 0.014);
      volume.gain.exponentialRampToValueAtTime(0.001, start + length);
      oscillator.connect(volume).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + length);
    }
  }
}
