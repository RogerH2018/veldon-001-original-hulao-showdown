// Original Web Audio percussion and five-note phrases. No recordings or network requests.
function tone(ctx, bus, at, hz, tail, level, wave = 'sine', end = hz, attack = .004) {
  const osc = ctx.createOscillator(), env = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(hz, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(24, end), at + tail);
  env.gain.setValueAtTime(.0001, at);
  env.gain.exponentialRampToValueAtTime(level, at + attack);
  env.gain.exponentialRampToValueAtTime(.0001, at + tail);
  osc.connect(env).connect(bus); osc.start(at); osc.stop(at + tail + .015);
}
function pluck(ctx, bus, at, note, gain = 1) {
  for (const [ratio, length, strength] of [[1,.46,.15],[2,.27,.05],[3,.15,.037],[5,.08,.018]]) {
    tone(ctx,bus,at,note*ratio,length,strength*gain,'sine',note*ratio*.996);
  }
}
function gong(ctx, bus, at, base, gain = 1) {
  for (const [ratio, length, strength] of [[1,.83,.13],[1.54,.63,.085],[2.39,.48,.05],[3.81,.32,.042],[5.17,.21,.018]]) {
    tone(ctx,bus,at,base*ratio,length,strength*gain,'sine',base*ratio*1.045,.013);
  }
}
function drum(ctx, bus, at, level = 1, pitch = 1) {
  tone(ctx,bus,at,139*pitch,.29,.26*level,'sine',57*pitch);
  tone(ctx,bus,at,228*pitch,.13,.073*level,'triangle',87*pitch);
}
function clack(ctx, bus, at) {
  tone(ctx,bus,at,813,.051,.082,'triangle',611);
  tone(ctx,bus,at+.009,1362,.048,.045,'sine',996);
}
function flute(ctx, bus, at, note, length) {
  tone(ctx,bus,at,note,length,.09,'sine',note*1.008,.033);
  tone(ctx,bus,at,note*2,length*.75,.022,'sine',note*2.012,.025);
}
const heavy = new Set(['hammer', 'axe', 'mace', 'shield']);
const silk = new Set(['fan', 'ribbon', 'scroll', 'staff']);

export class FightSound {
  constructor() { this.on = true; }
  set enabled(value) {
    this.on = value;
    if (this.master) this.master.gain.setTargetAtTime(value ? .72 : 0, this.context.currentTime, .012);
  }
  get enabled() { return this.on; }
  unlock() {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio || !this.on) return;
    if (!this.context) {
      this.context = new Audio();
      this.master = this.context.createGain(); this.master.gain.value = .72;
      const limiter = this.context.createDynamicsCompressor();
      this.master.connect(limiter).connect(this.context.destination);
      const n = Math.ceil(this.context.sampleRate * .35);
      this.noise = this.context.createBuffer(1,n,this.context.sampleRate);
      const pcm = this.noise.getChannelData(0);
      let state = 37;
      for (let i = 0; i < n; i++) { state = (state * 1664525 + 1013904223) >>> 0; pcm[i] = state / 2147483648 - 1; }
    }
    void this.context.resume().catch(() => {});
  }
  brush(at, bright, length, gain) {
    const ctx = this.context, src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), env = ctx.createGain();
    src.buffer = this.noise; filter.type = 'bandpass'; filter.Q.value = .8;
    filter.frequency.setValueAtTime(bright,at); filter.frequency.exponentialRampToValueAtTime(bright*.37,at+length);
    env.gain.setValueAtTime(.0001,at); env.gain.exponentialRampToValueAtTime(gain,at+.013);
    env.gain.exponentialRampToValueAtTime(.0001,at+length);
    src.connect(filter).connect(env).connect(this.master); src.start(at); src.stop(at+length);
  }
  play(event, data) {
    const ctx = this.context;
    if (!this.on || !ctx || ctx.state !== 'running') return;
    const bus = this.master, at = ctx.currentTime;
    const weapon = data?.weapon, note = data?.skill?.pitch ?? 196;
    switch (event) {
      case 'round':
        drum(ctx,bus,at); drum(ctx,bus,at+.24,.72,1.15); drum(ctx,bus,at+.43,1.18,.9);
        gong(ctx,bus,at+.52,134,.8); break;
      case 'fight': gong(ctx,bus,at,222,.85); clack(ctx,bus,at+.14); break;
      case 'swing':
        if (weapon === 'bow' || weapon === 'lute') pluck(ctx,bus,at,weapon === 'bow' ? 248 : 294,.85);
        else if (heavy.has(weapon)) { drum(ctx,bus,at,.5,.84); this.brush(at,910,.14,.14); }
        else if (silk.has(weapon)) { this.brush(at,2350,.16,.13); clack(ctx,bus,at+.034); }
        else { this.brush(at,2830,.13,.18); tone(ctx,bus,at+.018,762,.13,.023,'sine',1090); }
        break;
      case 'signature':
        pluck(ctx,bus,at,note); pluck(ctx,bus,at+.068,note*1.5,.85);
        if (data.skill.slot === 2) { gong(ctx,bus,at,149,.53); flute(ctx,bus,at+.12,note*2,.27); }
        break;
      case 'signatureHit':
        if (heavy.has(weapon) || ['crush','dive'].includes(data.beat.kind)) drum(ctx,bus,at,.85);
        else if (silk.has(weapon) || weapon === 'lute' || weapon === 'bow') pluck(ctx,bus,at,note*(data.last?2:1.5),.9);
        else clack(ctx,bus,at);
        if (data.last) gong(ctx,bus,at+.02,data.skill.slot===2?146:242,.53);
        break;
      case 'hit': drum(ctx,bus,at,.55,1.17); this.brush(at,1350,.08,.14); break;
      case 'guard': gong(ctx,bus,at,392,.47); break;
      case 'counter': clack(ctx,bus,at); gong(ctx,bus,at+.035,314,.82); break;
      case 'surge': flute(ctx,bus,at,392,.22); this.brush(at,2600,.25,.18); break;
      case 'roundEnd': drum(ctx,bus,at,.8); gong(ctx,bus,at+.13,112); break;
      case 'match':
        [294,330,392,440,588].forEach((hz,i)=>{pluck(ctx,bus,at+i*.14,hz); flute(ctx,bus,at+i*.14+.04,hz,.26);});
        gong(ctx,bus,at+.59,147,.66); break;
    }
  }
}
