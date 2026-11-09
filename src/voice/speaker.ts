// Text-to-speech (French, English or Spanish). Tells the listener when it talks, so the mic does not hear the app itself.

import { SPEECH_LOCALE, type Lang } from '../shared/i18n';

export class Speaker {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  onStart?: () => void;
  onEnd?: () => void;
  private voice: SpeechSynthesisVoice | null = null;
  private current: SpeechSynthesisUtterance | null = null;
  private safety = 0;
  private lang: Lang = 'fr';

  constructor(lang: Lang = 'fr') {
    this.lang = lang;
    if (!this.supported) return;
    this.pick();
    speechSynthesis.addEventListener('voiceschanged', () => this.pick());
  }

  setLang(lang: Lang) {
    this.lang = lang;
    this.stop();
    this.pick();
  }

  private pick() {
    if (!this.supported) return;
    const locale = SPEECH_LOCALE[this.lang].toLowerCase();
    const same = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(this.lang));
    const score = (v: SpeechSynthesisVoice) =>
      (v.lang.toLowerCase() === locale ? 2 : 0) + (/google|premium|enhanced|natural|amélie|thomas|samantha|mónica|monica/i.test(v.name) ? 1 : 0);
    this.voice = same.sort((a, b) => score(b) - score(a))[0] ?? null;
  }

  get speaking() { return this.current !== null; }

  speak(text: string) {
    if (!this.supported || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LOCALE[this.lang];
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
