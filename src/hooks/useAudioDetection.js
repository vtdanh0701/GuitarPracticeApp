import { useState, useRef, useCallback, useEffect } from 'react';
import { detectPitch, frequencyToNote } from '../utils/pitchDetection';

/**
 * Hook for real-time pitch detection from microphone input.
 * Uses Web Audio API + YIN algorithm.
 * 
 * @param {Object} options
 * @param {number} options.bufferSize - FFT/buffer size (default 4096, larger = more accuracy for low notes)
 * @param {number} options.threshold - YIN threshold (default 0.15)
 * @returns {{ 
 *   isListening: boolean,
 *   detectedNote: { note, octave, cents, frequency, midiNote } | null,
 *   startListening: () => Promise<void>,
 *   stopListening: () => void,
 *   error: string | null,
 *   volume: number
 * }}
 */
export function useAudioDetection({ bufferSize = 4096, threshold = 0.15 } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [detectedNote, setDetectedNote] = useState(null);
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const bufferRef = useRef(null);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !bufferRef.current) return;

    analyserRef.current.getFloatTimeDomainData(bufferRef.current);

    // Calculate volume (RMS)
    let rms = 0;
    for (let i = 0; i < bufferRef.current.length; i++) {
      rms += bufferRef.current[i] * bufferRef.current[i];
    }
    rms = Math.sqrt(rms / bufferRef.current.length);
    setVolume(Math.min(1, rms * 10)); // Normalize to 0-1

    // Detect pitch
    const sampleRate = audioContextRef.current.sampleRate;
    const frequency = detectPitch(bufferRef.current, sampleRate, threshold);
    const noteInfo = frequency ? frequencyToNote(frequency) : null;

    setDetectedNote(noteInfo);

    rafRef.current = requestAnimationFrame(analyze);
  }, [threshold]);

  const startListening = useCallback(async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      // Create audio context and analyser
      // Use a separate AudioContext for mic input (needs its own lifecycle)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Resume immediately — startListening is called from a user gesture
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = bufferSize;
      analyserRef.current = analyser;

      // Connect microphone -> analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Allocate buffer
      bufferRef.current = new Float32Array(analyser.fftSize);

      setIsListening(true);

      // Start analysis loop
      rafRef.current = requestAnimationFrame(analyze);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError(`Audio error: ${err.message}`);
      }
      setIsListening(false);
    }
  }, [bufferSize, analyze]);

  const stopListening = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    bufferRef.current = null;
    setIsListening(false);
    setDetectedNote(null);
    setVolume(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  return { isListening, detectedNote, startListening, stopListening, error, volume };
}
