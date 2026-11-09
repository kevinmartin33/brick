// Hands-free control with the browser's speech recognition (Chrome, Edge, Safari).
// Listens continuously (French, English or Spanish), restarts itself when the browser stops after a silence,
// and can be paused while the app is speaking.

import { parseCommand, type Command } from './commands';
import { SPEECH_LOCALE, type Lang } from '../shared/i18n';

export type VoiceState = 'off' | 'starting' | 'listening' | 'paused' | 'unsupported' | 'denied' | 'error';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

export class VoiceControl {
  onCommand?: (cmd: Command, heard: string) => void;
  onUnknown?: (heard: string) => void;
  onState?: (state: VoiceState, detail?: string) => void;
  readonly supported: boolean;
  private rec: Recognition = null;
  private wanted = false;
  private paused = false;
  private running = false;
  private restartTimer = 0;
  private failures = 0;
  private lang: Lang;

  constructor(lang: Lang = 'fr') {
    this.lang = lang;
    const C = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.supported = !!C;
    if (!C) return;
    const rec: Recognition = new C();
    rec.lang = SPEECH_LOCALE[lang];
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onstart = () => { this.running = true; this.failures = 0; this.emit(); };
    rec.onend = () => {
      this.running = false;
      if (this.wanted && !this.paused) {
        clearTimeout(this.restartTimer);
        this.restartTimer = window.setTimeout(() => this.tryStart(), Math.min(250 * 2 ** this.failures, 4000));
      }
      this.emit();
    };
    rec.onerror = (e: { error: string }) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.wanted = false;
        this.onState?.('denied');
        return;
      }
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      this.failures++;
      this.onState?.('error', e.error);
    };
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r.isFinal) continue;
        let cmd: Command | null = null;
        let heard = r[0].transcript as string;
        for (let a = 0; a < r.length; a++) {
          const c = parseCommand(r[a].transcript, this.lang);
          if (c) { cmd = c; heard = r[a].transcript; break; }
        }
        if (cmd) this.onCommand?.(cmd, heard.trim());
        else this.onUnknown?.(heard.trim());
      }
    };
    this.rec = rec;
  }

  get active() { return this.wanted; }

  /** Switches language; a running session restarts with the new one. */
  setLang(lang: Lang) {
    this.lang = lang;
    if (!this.rec) return;
    this.rec.lang = SPEECH_LOCALE[lang];
    if (this.running) try { this.rec.abort(); } catch { /* onend restarts it */ }
  }

  start() {
    if (!this.supported) { this.onState?.('unsupported'); return; }
    this.wanted = true;
    this.paused = false;
    this.onState?.('starting');
    this.tryStart();
  }

  stop() {
    this.wanted = false;
    this.paused = false;
    clearTimeout(this.restartTimer);
    if (this.rec) try { this.rec.abort(); } catch { /* already stopped */ }
    this.emit();
  }

  /** Stop hearing while the app talks (no echo of its own voice). */
  pause() {
    if (!this.wanted || this.paused) return;
    this.paused = true;
    clearTimeout(this.restartTimer);
    if (this.running) try { this.rec.abort(); } catch { /* ignore */ }
    this.emit();
  }

  resume() {
    if (!this.wanted || !this.paused) return;
    this.paused = false;
    clearTimeout(this.restartTimer);
    this.restartTimer = window.setTimeout(() => this.tryStart(), 200);
    this.emit();
  }

  private tryStart() {
    if (!this.wanted || this.paused || this.running) return;
    try { this.rec.start(); } catch { /* already starting */ }
  }

  private emit() {
    if (!this.wanted) this.onState?.('off');
    else if (this.paused) this.onState?.('paused');
    else if (this.running) this.onState?.('listening');
    else this.onState?.('starting');
  }
}
