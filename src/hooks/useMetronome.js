import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Shared AudioContext singleton — created once on first user gesture.
 * Mobile browsers (iOS Safari, Chrome Android) require AudioContext creation
 * and resume() to happen inside a direct user-interaction event handler.
 */
let sharedAudioCtx = null;

export function getSharedAudioContext() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedAudioCtx;
}

/**
 * Unlock audio on mobile.  Call this from a click / touchend handler.
 * - Resumes a suspended AudioContext (iOS requirement)
 * - Plays a silent buffer so the OS audio session is active
 * - Unlocks speechSynthesis with an empty utterance
 * Safe to call multiple times — subsequent calls are cheap no-ops.
 */
export async function unlockAudio() {
  const ctx = getSharedAudioContext();

  // Resume suspended context (must happen inside user gesture on iOS)
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch (_) { /* ignore */ }
  }

  // Play a silent buffer to fully activate the audio session on iOS
  try {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch (_) { /* ignore */ }

  // Unlock speechSynthesis on iOS — must call .speak() inside a user gesture
  if (window.speechSynthesis) {
    try {
      const silent = new SpeechSynthesisUtterance('');
      silent.volume = 0;
      silent.rate = 1;
      window.speechSynthesis.speak(silent);
    } catch (_) { /* ignore */ }
  }
}

export function useMetronome(initialBpm = 80) {
  const [bpm, setBpm] = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const nextBeatTimeRef = useRef(0);
  const timerIdRef = useRef(null);
  const beatRef = useRef(0);
  const bpmRef = useRef(bpm);

  // Keep bpmRef in sync
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const playClick = useCallback((time, isAccent = false) => {
    const ctx = getSharedAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = isAccent ? 1000 : 800;
    // Anchor gain at the scheduled time, then ramp down
    const volume = isAccent ? 0.3 : 0.15;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    
    osc.start(time);
    osc.stop(time + 0.07);
  }, []);

  const scheduler = useCallback(() => {
    const ctx = getSharedAudioContext();
    const scheduleAhead = 0.1; // seconds
    
    while (nextBeatTimeRef.current < ctx.currentTime + scheduleAhead) {
      const currentBeat = beatRef.current;
      const isAccent = (currentBeat - 1) % 4 === 0; // beats 1, 5, 9... get accent
      playClick(nextBeatTimeRef.current, isAccent);
      setBeat(currentBeat);
      
      beatRef.current += 1;
      const secondsPerBeat = 60.0 / bpmRef.current;
      nextBeatTimeRef.current += secondsPerBeat;
    }
  }, [playClick]);

  const start = useCallback(async () => {
    // Unlock + resume — called inside user gesture context
    await unlockAudio();
    const ctx = getSharedAudioContext();

    beatRef.current = 1;
    setBeat(0);
    nextBeatTimeRef.current = ctx.currentTime;
    
    timerIdRef.current = setInterval(scheduler, 25);
    setIsPlaying(true);
  }, [scheduler]);

  const stop = useCallback(() => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    setIsPlaying(false);
    beatRef.current = 0;
    setBeat(0);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) stop();
    else start();
  }, [isPlaying, start, stop]);

  // Re-resume audio context when page becomes visible again (iOS suspends it)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        const ctx = getSharedAudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPlaying]);

  // Cleanup timer only — don't close the shared context
  useEffect(() => {
    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    };
  }, []);

  return { bpm, setBpm, isPlaying, beat, toggle, start, stop };
}
