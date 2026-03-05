import { useState, useEffect, useRef, useCallback } from 'react';

export function useMetronome(initialBpm = 80) {
  const [bpm, setBpm] = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const audioContextRef = useRef(null);
  const nextBeatTimeRef = useRef(0);
  const timerIdRef = useRef(null);
  const beatRef = useRef(0);
  const bpmRef = useRef(bpm);

  // Keep bpmRef in sync
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playClick = useCallback((time, isAccent = false) => {
    const ctx = getAudioContext();
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
  }, [getAudioContext]);

  const scheduler = useCallback(() => {
    const ctx = getAudioContext();
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
  }, [getAudioContext, playClick]);

  const start = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    beatRef.current = 1;
    setBeat(0);
    nextBeatTimeRef.current = ctx.currentTime;
    
    timerIdRef.current = setInterval(scheduler, 25);
    setIsPlaying(true);
  }, [getAudioContext, scheduler]);

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

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return { bpm, setBpm, isPlaying, beat, toggle, start, stop };
}
