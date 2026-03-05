/**
 * Pitch detection using the YIN algorithm.
 * Optimized for guitar frequencies (E2 ~82Hz to E6 ~1319Hz).
 * 
 * Reference: "YIN, a fundamental frequency estimator for speech and music"
 * by Alain de Cheveigné and Hideki Kawahara (2002)
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert frequency to nearest note info
 * @param {number} frequency - Hz
 * @returns {{ note: string, octave: number, cents: number, frequency: number, midiNote: number }}
 */
export function frequencyToNote(frequency) {
  if (!frequency || frequency < 60 || frequency > 1400) return null;

  // MIDI note number: A4 = 440Hz = MIDI 69
  const midiNote = 12 * Math.log2(frequency / 440) + 69;
  const roundedMidi = Math.round(midiNote);
  const cents = Math.round((midiNote - roundedMidi) * 100);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;

  return {
    note: NOTE_NAMES[noteIndex],
    octave,
    cents,
    frequency: Math.round(frequency * 10) / 10,
    midiNote: roundedMidi,
  };
}

/**
 * YIN pitch detection algorithm
 * @param {Float32Array} buffer - Audio sample buffer
 * @param {number} sampleRate - Audio sample rate (e.g. 44100)
 * @param {number} threshold - YIN threshold (lower = stricter, 0.05-0.2 typical)
 * @returns {number|null} - Detected frequency in Hz, or null if no clear pitch
 */
export function detectPitch(buffer, sampleRate, threshold = 0.15) {
  const bufferSize = buffer.length;
  const halfSize = Math.floor(bufferSize / 2);

  // Step 1: Check if signal has enough energy (silence gate)
  let rms = 0;
  for (let i = 0; i < bufferSize; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / bufferSize);
  if (rms < 0.01) return null; // Too quiet

  // Step 2: Difference function
  const yinBuffer = new Float32Array(halfSize);
  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  // Step 3: Cumulative mean normalized difference
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }

  // Step 4: Absolute threshold — find first dip below threshold
  // Start from lag corresponding to highest guitar frequency (~1400Hz)
  const minTau = Math.floor(sampleRate / 1400);
  const maxTau = Math.floor(sampleRate / 60); // Lowest guitar note ~60Hz

  let bestTau = -1;
  for (let tau = minTau; tau < Math.min(maxTau, halfSize); tau++) {
    if (yinBuffer[tau] < threshold) {
      // Find the local minimum
      while (tau + 1 < halfSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      bestTau = tau;
      break;
    }
  }

  if (bestTau === -1) return null; // No clear pitch found

  // Step 5: Parabolic interpolation for sub-sample accuracy
  let betterTau = bestTau;
  if (bestTau > 0 && bestTau < halfSize - 1) {
    const s0 = yinBuffer[bestTau - 1];
    const s1 = yinBuffer[bestTau];
    const s2 = yinBuffer[bestTau + 1];
    const adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    if (Math.abs(adjustment) < 1) {
      betterTau = bestTau + adjustment;
    }
  }

  return sampleRate / betterTau;
}

/**
 * Check if a detected note matches a target note name (ignoring octave)
 * @param {string} detectedNote - e.g. 'C#'
 * @param {string} targetNoteName - e.g. 'C#' or 'Db'
 * @returns {boolean}
 */
export function notesMatch(detectedNote, targetNoteName) {
  if (!detectedNote || !targetNoteName) return false;

  // Normalize: handle flats → sharps
  const flatToSharp = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  };
  const normalizedTarget = flatToSharp[targetNoteName] || targetNoteName;
  const normalizedDetected = flatToSharp[detectedNote] || detectedNote;

  return normalizedDetected === normalizedTarget;
}
