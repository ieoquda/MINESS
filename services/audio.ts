
class AudioService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playClick() {
    this.playTone(600, 'sine', 0.1, 0.1);
  }

  playReveal() {
    this.playTone(800, 'sine', 0.2, 0.15);
  }

  playMine() {
    this.playTone(100, 'sawtooth', 0.5, 0.2);
  }

  playWin() {
    this.playTone(1200, 'sine', 0.3, 0.2);
    setTimeout(() => this.playTone(1500, 'sine', 0.4, 0.2), 100);
  }

  playCashout() {
    this.playTone(1000, 'sine', 0.5, 0.2);
  }
}

export const audioService = new AudioService();
