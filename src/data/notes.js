// All 12 chromatic notes with colors, staff positions, and fretboard mappings
export const ALL_NOTES = [
  { name: 'C',  color: '#e74c3c', staffLine: 0,   natural: true },   // Red
  { name: 'C#', color: '#e67e22', staffLine: 0.5, natural: false, flat: 'Db' },  // Orange
  { name: 'D',  color: '#f1c40f', staffLine: 1,   natural: true },    // Yellow
  { name: 'D#', color: '#2ecc71', staffLine: 1.5, natural: false, flat: 'Eb' },  // Green
  { name: 'E',  color: '#1abc9c', staffLine: 2,   natural: true },    // Teal
  { name: 'F',  color: '#3498db', staffLine: 2.5, natural: true },    // Blue
  { name: 'F#', color: '#9b59b6', staffLine: 3,   natural: false, flat: 'Gb' },  // Purple
  { name: 'G',  color: '#e91e63', staffLine: 3.5, natural: true },    // Pink
  { name: 'G#', color: '#ff5722', staffLine: 4,   natural: false, flat: 'Ab' },  // Deep Orange
  { name: 'A',  color: '#00bcd4', staffLine: 4.5, natural: true },    // Cyan
  { name: 'A#', color: '#8bc34a', staffLine: 5,   natural: false, flat: 'Bb' },  // Light Green
  { name: 'B',  color: '#ff9800', staffLine: 5.5, natural: true },    // Amber
];

// Note filter options: 'all' | 'natural' | 'sharp' | 'flat'
export function getFilteredNotes(filter = 'all') {
  switch (filter) {
    case 'natural':
      return ALL_NOTES.filter(n => n.natural);
    case 'sharp':
      return ALL_NOTES.filter(n => !n.natural);
    case 'flat':
      return ALL_NOTES.filter(n => !n.natural).map(n => ({ ...n, displayName: n.flat }));
    default:
      return ALL_NOTES;
  }
}

/**
 * Get display name for a note based on filter
 */
export function getNoteDisplayName(note, filter = 'all') {
  if (filter === 'flat' && note.flat) return note.flat;
  return note.name;
}

// Standard guitar tuning (string 6=low E to string 1=high E)
export const GUITAR_STRINGS = ['E', 'A', 'D', 'G', 'B', 'E'];
// Open string note indices in ALL_NOTES
export const OPEN_STRING_INDICES = [4, 9, 2, 7, 11, 4]; // E A D G B E

export const NUM_FRETS = 15;

/**
 * Get all fretboard positions for a given note name
 * Returns array of { string, fret } objects (string is 1-indexed from high E)
 */
export function getFretPositions(noteName) {
  const noteIndex = ALL_NOTES.findIndex(n => n.name === noteName);
  if (noteIndex === -1) return [];
  
  const positions = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= NUM_FRETS; f++) {
      const currentNote = (OPEN_STRING_INDICES[s] + f) % 12;
      if (currentNote === noteIndex) {
        positions.push({ string: s + 1, fret: f });
      }
    }
  }
  return positions;
}

/**
 * Get the note at a specific string and fret
 */
export function getNoteAt(stringNum, fret) {
  const openIndex = OPEN_STRING_INDICES[stringNum - 1];
  const noteIndex = (openIndex + fret) % 12;
  return ALL_NOTES[noteIndex];
}

/**
 * Pick n random unique notes from the filtered pool
 * Uses Fisher-Yates shuffle for truly uniform distribution
 */
export function pickRandomNotes(count, filter = 'all') {
  const pool = getFilteredNotes(filter);
  const shuffled = [...pool];
  // Fisher-Yates (Knuth) shuffle — unbiased
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
