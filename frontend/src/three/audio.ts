/**
 * 程序化音频引擎（Web Audio 合成，零外部素材）：
 * - 环境音：海浪（LFO 涌浪）、风声、鸟鸣、夜间虫鸣 —— 随昼夜/天气平滑变化
 * - 动作音效：脚步、入水/出水、划桨、门轴、彩蛋、宠物、NPC、时光魔法等
 * 首次用户交互时解锁 AudioContext（浏览器自动播放策略），静音状态持久化。
 */

const MUTE_KEY = 'mali.sound.muted';
const MASTER_VOL = 0.85;

export interface SoundEnv {
  night: number;
  rain: number;
  wind: number;
}

export type StepKind = 'walk' | 'run' | 'swim';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private oceanGain: GainNode | null = null;
  private oceanFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private started = false;
  private stepFlip = false;
  private birdT = 6;
  private cricketT = 10;
  private musicT = 12;
  private animalT = 10;
  muted = false;

  constructor() {
    try {
      this.muted = window.localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  /** 在任意用户手势（点击/按键）中调用，创建并恢复音频上下文。 */
  unlock(): void {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      return;
    }
    try {
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : MASTER_VOL;
      master.connect(ctx.destination);
      const sfx = ctx.createGain();
      sfx.gain.value = 1;
      sfx.connect(master);
      const amb = ctx.createGain();
      amb.gain.value = 0.9;
      amb.connect(master);
      this.ctx = ctx;
      this.master = master;
      this.sfxBus = sfx;
      this.ambBus = amb;
      this.noiseBuf = this.makeNoise(ctx, 2);
      this.startAmbience();
      this.started = true;
      void ctx.resume();
    } catch {
      // 音频不可用时静默降级
    }
  }

  private makeNoise(ctx: AudioContext, sec: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private startAmbience(): void {
    const ctx = this.ctx as AudioContext;
    const amb = this.ambBus as GainNode;
    const noise = this.noiseBuf as AudioBuffer;

    // 海浪：循环噪声 → 低通，LFO 调制截止频率与增益形成涌浪
    const oSrc = ctx.createBufferSource();
    oSrc.buffer = noise;
    oSrc.loop = true;
    const oF = ctx.createBiquadFilter();
    oF.type = 'lowpass';
    oF.frequency.value = 480;
    oF.Q.value = 0.6;
    const oG = ctx.createGain();
    oG.gain.value = 0.5;
    oSrc.connect(oF);
    oF.connect(oG);
    oG.connect(amb);
    oSrc.start();
    this.oceanGain = oG;
    this.oceanFilter = oF;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 220;
    lfo.connect(lfoG);
    lfoG.connect(oF.frequency);
    lfo.start();
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.value = 0.11;
    const lfo2G = ctx.createGain();
    lfo2G.gain.value = 0.16;
    lfo2.connect(lfo2G);
    lfo2G.connect(oG.gain);
    lfo2.start();

    // 风：循环噪声 → 带通，慢速飘移
    const wSrc = ctx.createBufferSource();
    wSrc.buffer = noise;
    wSrc.loop = true;
    wSrc.playbackRate.value = 0.7;
    const wF = ctx.createBiquadFilter();
    wF.type = 'bandpass';
    wF.frequency.value = 380;
    wF.Q.value = 0.5;
    const wG = ctx.createGain();
    wG.gain.value = 0.12;
    wSrc.connect(wF);
    wF.connect(wG);
    wG.connect(amb);
    wSrc.start();
    this.windGain = wG;
    this.windFilter = wF;
    const wlfo = ctx.createOscillator();
    wlfo.frequency.value = 0.05;
    const wlfoG = ctx.createGain();
    wlfoG.gain.value = 90;
    wlfo.connect(wlfoG);
    wlfoG.connect(wF.frequency);
    wlfo.start();
  }

  /** 每帧调用：环境音随昼夜/天气平滑过渡，并安排鸟鸣/虫鸣。 */
  update(dt: number, env: SoundEnv): void {
    if (!this.started || !this.ctx) {
      return;
    }
    const t = this.ctx.currentTime;
    if (this.oceanGain && this.oceanFilter) {
      this.oceanGain.gain.setTargetAtTime(0.42 + env.rain * 0.28, t, 0.4);
      this.oceanFilter.frequency.setTargetAtTime(430 + env.rain * 320 + env.wind * 90, t, 0.5);
    }
    if (this.windGain && this.windFilter) {
      this.windGain.gain.setTargetAtTime(0.08 + env.wind * 0.14 + env.rain * 0.12, t, 0.6);
      this.windFilter.frequency.setTargetAtTime(340 + env.wind * 160 + env.rain * 120, t, 0.6);
    }
    this.birdT -= dt;
    if (this.birdT <= 0) {
      if (env.night < 0.35) {
        this.bird();
      }
      this.birdT = 5 + Math.random() * 9;
    }
    this.cricketT -= dt;
    if (this.cricketT <= 0) {
      if (env.night > 0.4) {
        this.crickets();
      }
      this.cricketT = 6 + Math.random() * 7;
    }
    // 轻柔舒缓的背景乐（缓释和弦垫音）
    this.musicT -= dt;
    if (this.musicT <= 0) {
      this.padChord();
      this.musicT = 11 + Math.random() * 5;
    }
    // 偶尔的场景动物叫声（猫/狗）
    this.animalT -= dt;
    if (this.animalT <= 0) {
      if (env.rain < 0.5) {
        this.animal();
      }
      this.animalT = 14 + Math.random() * 18;
    }
  }

  /** 轻柔背景乐：慢起慢落的和弦垫音，低音量循环。 */
  private padChord(): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.ambBus as GainNode;
    const t0 = ctx.currentTime;
    const chords: number[][] = [
      [261.63, 329.63, 392.0],
      [220.0, 261.63, 329.63],
      [174.61, 220.0, 261.63],
      [196.0, 246.94, 293.66],
    ];
    const chord = chords[Math.floor(Math.random() * chords.length)];
    chord.forEach((f, i) => {
      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = f;
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = f * 1.005;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.042, t0 + 1.6);
      g.gain.linearRampToValueAtTime(0.032, t0 + 5.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 9 + i * 0.4);
      o1.connect(lp);
      o2.connect(lp);
      lp.connect(g);
      g.connect(out);
      o1.start(t0);
      o1.stop(t0 + 10);
      o2.start(t0);
      o2.stop(t0 + 10);
    });
  }

  /** 偶发动物叫声：猫喵或狗吠。 */
  private animal(): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    if (Math.random() > 0.45) {
      // 猫叫
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(520, t0);
      o.frequency.linearRampToValueAtTime(780, t0 + 0.26);
      o.frequency.linearRampToValueAtTime(470, t0 + 0.55);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.05, t0 + 0.12);
      g.gain.linearRampToValueAtTime(0.0001, t0 + 0.7);
      o.connect(g);
      g.connect(out);
      o.start(t0);
      o.stop(t0 + 0.75);
    } else {
      // 狗吠：几声短促低频噪声
      for (let k = 0; k < 3; k++) {
        const t = t0 + k * 0.22;
        const n = ctx.createBufferSource();
        n.buffer = this.noiseBuf as AudioBuffer;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 420;
        f.Q.value = 1.2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        n.connect(f);
        f.connect(g);
        g.connect(out);
        n.start(t);
        n.stop(t + 0.15);
      }
    }
  }

  private ready(): boolean {
    return this.started && this.ctx !== null && this.sfxBus !== null && !this.muted;
  }

  /** 脚步声（走/跑/游泳扑水）。 */
  step(kind: StepKind): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    this.stepFlip = !this.stepFlip;
    const jitter = 0.9 + Math.random() * 0.2;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuf as AudioBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    if (kind === 'swim') {
      f.frequency.value = 900 * jitter;
      f.Q.value = 0.4;
    } else if (kind === 'run') {
      f.frequency.value = 320 * jitter;
      f.Q.value = 0.9;
    } else {
      f.frequency.value = 240 * jitter;
      f.Q.value = 1.1;
    }
    const vol = kind === 'run' ? 0.22 : kind === 'swim' ? 0.11 : 0.16;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + (kind === 'swim' ? 0.22 : 0.08));
    n.connect(f);
    f.connect(g);
    g.connect(out);
    n.start(t0);
    n.stop(t0 + 0.3);
    if (kind !== 'swim') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(kind === 'run' ? 110 : 90, t0);
      o.frequency.exponentialRampToValueAtTime(60, t0 + 0.07);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, t0);
      og.gain.linearRampToValueAtTime(0.12, t0 + 0.01);
      og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
      o.connect(og);
      og.connect(out);
      o.start(t0);
      o.stop(t0 + 0.12);
    }
  }

  /** 跳跃起跳：短促上冲风声。 */
  jump(): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuf as AudioBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(320, t0);
    f.frequency.exponentialRampToValueAtTime(760, t0 + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.1, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
    n.connect(f);
    f.connect(g);
    g.connect(out);
    n.start(t0);
    n.stop(t0 + 0.3);
  }

  /** 入水/出水。 */
  splash(enter: boolean): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    const vol = enter ? 0.34 : 0.2;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuf as AudioBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1800, t0);
    f.frequency.exponentialRampToValueAtTime(260, t0 + (enter ? 0.5 : 0.34));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + (enter ? 0.7 : 0.45));
    n.connect(f);
    f.connect(g);
    g.connect(out);
    n.start(t0);
    n.stop(t0 + 0.8);
    for (let i = 0; i < 5; i++) {
      const bt = t0 + 0.04 + i * 0.05;
      const b = ctx.createOscillator();
      b.type = 'sine';
      const f0 = 380 + Math.random() * 500;
      b.frequency.setValueAtTime(f0, bt);
      b.frequency.exponentialRampToValueAtTime(f0 * 1.7, bt + 0.05);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0, bt);
      bg.gain.linearRampToValueAtTime(0.06, bt + 0.01);
      bg.gain.exponentialRampToValueAtTime(0.001, bt + 0.1);
      b.connect(bg);
      bg.connect(out);
      b.start(bt);
      b.stop(bt + 0.12);
    }
  }

  /** 划桨水声。 */
  row(): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuf as AudioBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.7;
    f.frequency.setValueAtTime(620, t0);
    f.frequency.exponentialRampToValueAtTime(180, t0 + 0.32);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.13, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
    n.connect(f);
    f.connect(g);
    g.connect(out);
    n.start(t0);
    n.stop(t0 + 0.45);
  }

  /** 门轴开合：吱呀 + 到位轻叩。 */
  door(open: boolean): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    const d = open ? 0.5 : 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.045, t0 + 0.06);
    g.gain.linearRampToValueAtTime(0.018, t0 + d - 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 520;
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(110, t0);
    o1.frequency.linearRampToValueAtTime(150, t0 + 0.18);
    o1.frequency.linearRampToValueAtTime(122, t0 + d);
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(116, t0);
    o2.frequency.linearRampToValueAtTime(156, t0 + 0.18);
    o2.frequency.linearRampToValueAtTime(126, t0 + d);
    o1.connect(f);
    o2.connect(f);
    f.connect(g);
    g.connect(out);
    o1.start(t0);
    o1.stop(t0 + d);
    o2.start(t0);
    o2.stop(t0 + d);
    const tt = t0 + d * 0.85;
    const th = ctx.createOscillator();
    th.type = 'sine';
    th.frequency.setValueAtTime(70, tt);
    th.frequency.exponentialRampToValueAtTime(45, tt + 0.08);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0, tt);
    tg.gain.linearRampToValueAtTime(0.09, tt + 0.01);
    tg.gain.exponentialRampToValueAtTime(0.001, tt + 0.1);
    th.connect(tg);
    tg.connect(out);
    th.start(tt);
    th.stop(tt + 0.12);
  }

  /** 彩蛋/进入场馆的清脆音阶。 */
  chime(): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    [1046.5, 1318.5, 1568, 2093].forEach((fr, i) => {
      const t = t0 + i * 0.06;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = fr;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.085, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 0.55);
    });
  }

  /** 轻柔的"叮"（欢迎/靠近）。 */
  pop(): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(240, t0);
    o.frequency.exponentialRampToValueAtTime(520, t0 + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.08, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
    o.connect(g);
    g.connect(out);
    o.start(t0);
    o.stop(t0 + 0.2);
  }

  /** NPC 说话声（短促嘟囔）。 */
  npcTalk(): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = t0 + i * 0.09;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = 300 + Math.random() * 90;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 0.08);
    }
  }

  /** 宠物互动。 */
  pet(): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(520, t0);
    o.frequency.exponentialRampToValueAtTime(780, t0 + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.06, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
    o.connect(g);
    g.connect(out);
    o.start(t0);
    o.stop(t0 + 0.16);
  }

  /** 时光魔法：风声 + 高音泛音。 */
  magic(): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuf as AudioBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.6;
    f.frequency.setValueAtTime(900, t0);
    f.frequency.exponentialRampToValueAtTime(300, t0 + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.75);
    n.connect(f);
    f.connect(g);
    g.connect(out);
    n.start(t0);
    n.stop(t0 + 0.8);
    [1568, 2093, 2637].forEach((fr, i) => {
      const t = t0 + 0.25 + i * 0.08;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = fr;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(0.05, t + 0.015);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.connect(og);
      og.connect(out);
      o.start(t);
      o.stop(t + 0.45);
    });
  }

  private bird(): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 3);
    const base = 1900 + Math.random() * 900;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (0.1 + Math.random() * 0.08);
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f0 = base + (Math.random() - 0.5) * 500;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.86, t + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.035, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 0.1);
    }
  }

  private crickets(): void {
    if (!this.ready()) {
      return;
    }
    const ctx = this.ctx as AudioContext;
    const out = this.sfxBus as GainNode;
    const t0 = ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const t = t0 + i * 0.055;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = 4200 + (Math.random() - 0.5) * 800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.02, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 0.05);
    }
  }

  setMuted(v: boolean): void {
    this.muted = v;
    try {
      window.localStorage.setItem(MUTE_KEY, v ? '1' : '0');
    } catch {
      // 忽略持久化失败
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(v ? 0 : MASTER_VOL, this.ctx.currentTime, 0.05);
    }
  }

  toggle(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }
}

export const sound = new SoundEngine();
