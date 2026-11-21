let engine = null;

export function createSound(settings) {
  let audioCtx = null;
  function ac() {
    if (!settings.sound) return null;
    if (typeof window === "undefined") return null;
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function tone(freq, dur, type, delay, slideTo) {
    const ctx = ac(); if (!ctx) return;
    const vol = [0.04, 0.10, 0.20][settings.volume - 1] || 0.10;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  return {
    unlock: ac,
    cursor() { tone(1320, 0.045, "square"); },
    decide() { tone(196, 0.16, "triangle"); tone(98, 0.22, "sine", 0.01); tone(880, 0.05, "square", 0.0); },
    cancel() { tone(520, 0.11, "square", 0, 260); },
    complete() { tone(523.25, 0.11, "triangle"); tone(659.25, 0.11, "triangle", 0.09); tone(783.99, 0.24, "triangle", 0.18); },
    warn() { tone(220, 0.14, "sawtooth"); tone(220, 0.14, "sawtooth", 0.18); },
  };
}

export function initSound(settings) { engine = createSound(settings); return engine; }
export function sCursor() { if (engine) engine.cursor(); }
export function sDecide() { if (engine) engine.decide(); }
export function sCancel() { if (engine) engine.cancel(); }
export function sComplete() { if (engine) engine.complete(); }
export function sWarn() { if (engine) engine.warn(); }
export function unlockAudio() { if (engine) engine.unlock(); }
