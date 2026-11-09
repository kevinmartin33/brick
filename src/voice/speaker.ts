// Text-to-speech in French. Tells the listener when it talks, so the mic does not hear the app itself.

export class Speaker {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  onStart?: () => void;
  onEnd?: () => void;
  private voice: SpeechSynthesisVoice | null = null;
  private current: SpeechSynthesisUtterance | null = null;
  private safety = 0;

  constructor() {
    if (!this.supported) return;
    const pick = () => {
      const fr = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('fr'));
      const score = (v: SpeechSynthesisVoice) =>
        (v.lang.toLowerCase() === 'fr-fr' ? 2 : 0) + (/google|amélie|amelie|thomas|audrey|premium|enhanced/i.test(v.name) ? 1 : 0);
      this.voice = fr.sort((a, b) => score(b) - score(a))[0] ?? null;
    };
    pick();
    speechSynthesis.addEventListener('voiceschanged', pick);
  }

  get speaking() { return this.current !== null; }

  speak(text: string) {
    if (!this.supported || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    if (this.voice) u.voice = this.voice;
    const done = () => {
      if (this.current !== u) return; // an older utterance that was cancelled
      this.current = null;
      clearTimeout(this.safety);
      this.onEnd?.();
    };
    u.onend = done;
    u.onerror = done;
    this.current = u;
    this.onStart?.(); // before audio starts, so the mic is already paused
    speechSynthesis.speak(u);
    // some browsers drop onend: never leave the mic paused for good
    clearTimeout(this.safety);
    this.safety = window.setTimeout(done, 2000 + text.length * 90);
  }

  stop() {
    if (!this.supported) return;
    const was = this.current;
    this.current = null;
    clearTimeout(this.safety);
    speechSynthesis.cancel();
    if (was) this.onEnd?.();
  }
}
