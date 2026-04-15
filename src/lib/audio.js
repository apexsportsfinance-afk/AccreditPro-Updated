/**
 * Audio Utility for Scanner Feedback
 * Uses Web Audio API to generate synthesized beeps without external assets.
 */

class AudioService {
  constructor() {
    this.context = null;
  }

  init() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  beep(frequency = 440, duration = 150, type = 'sine', volume = 0.1) {
    try {
      this.init();
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
      
      gainNode.gain.setValueAtTime(volume, this.context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration / 1000);

      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);

      oscillator.start();
      oscillator.stop(this.context.currentTime + duration / 1000);
    } catch (e) {
      console.warn("Audio feedback failed:", e);
    }
  }

  playSuccessEntry() {
    // High-pitched single beep (Louder)
    this.beep(880, 200, 'sine', 0.4);
  }

  playSuccessExit() {
    // Medium-pitched single beep (Louder)
    this.beep(660, 200, 'sine', 0.4);
  }

  playAccessDenied() {
    // Three low-pitched beeps (Louder and sharper)
    const playBeep = (delay) => {
      setTimeout(() => {
        this.beep(330, 120, 'square', 0.3);
      }, delay);
    };

    playBeep(0);
    playBeep(200);
    playBeep(400);
  }
}

export const audioService = new AudioService();
