import React, { useState, useEffect, useCallback, useRef } from 'react';
import NoteDisplay from './components/NoteDisplay';
import StaffNotation from './components/StaffNotation';
import Fretboard from './components/Fretboard';
import MetronomeControls from './components/MetronomeControls';
import PracticeControls from './components/PracticeControls';
import NameTheNote from './components/NameTheNote';
import FindTheNote from './components/FindTheNote';
import SpeedDrill from './components/SpeedDrill';
import StringFocus from './components/StringFocus';
import { useMetronome } from './hooks/useMetronome';
import { ALL_NOTES, pickRandomNotes, getFilteredNotes, getNoteDisplayName } from './data/notes';
import './App.css';

const MODES = [
  { id: 'free',        label: '🎸 Free Practice',   desc: 'Cycle through notes with metronome' },
  { id: 'name-note',   label: '🎯 Name the Note',   desc: 'Identify notes at fretboard positions' },
  { id: 'find-note',   label: '🔍 Find the Note',   desc: 'Locate notes on the fretboard' },
  { id: 'speed-drill', label: '⚡ Speed Drill',     desc: 'Timed identification challenge' },
  { id: 'string-focus', label: '🎵 String Focus',   desc: 'Learn one string at a time' },
];

function App() {
  // Mode
  const [mode, setMode] = useState('free');

  // Practice state
  const [noteCount, setNoteCount] = useState(4);
  const [noteFilter, setNoteFilter] = useState('all'); // 'all' | 'natural' | 'sharp' | 'flat'
  const [practiceNotes, setPracticeNotes] = useState(() => pickRandomNotes(4));
  const [currentIndex, setCurrentIndex] = useState(0);
  // Which strings to show (0-indexed: 0=low E, 1=A, 2=D, 3=G, 4=B, 5=high E)
  const [selectedStrings, setSelectedStrings] = useState([0, 1, 2, 3, 4, 5]);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [switchDuration, setSwitchDuration] = useState(4); // beats
  const [autoShuffle, setAutoShuffle] = useState(false);
  const [shuffleAfterCycles, setShuffleAfterCycles] = useState(1); // reshuffle after N full cycles
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Metronome
  const metronome = useMetronome(80);

  // Track beats for auto-switch
  const lastBeatRef = useRef(0);
  const beatAccumulatorRef = useRef(0);
  const [beatAccumulator, setBeatAccumulator] = useState(0);
  const cycleCountRef = useRef(0);

  const currentNote = practiceNotes[currentIndex] || ALL_NOTES[0];
  const currentDisplayName = getNoteDisplayName(currentNote, noteFilter);

  // Pick the best available speech voice
  const voiceRef = useRef(null);
  useEffect(() => {
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      // Prefer high-quality English voices (ranked)
      const preferred = [
        'Google US English',
        'Google UK English Female',
        'Samantha',           // macOS high quality
        'Karen',              // macOS
        'Daniel',             // macOS
        'Microsoft Zira',
        'Microsoft David',
      ];
      for (const name of preferred) {
        const found = voices.find(v => v.name.includes(name));
        if (found) { voiceRef.current = found; return; }
      }
      // Fallback: first English voice
      const english = voices.find(v => v.lang.startsWith('en'));
      if (english) voiceRef.current = english;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Speak the note name when it changes
  const speechTimeoutRef = useRef(null);
  useEffect(() => {
    // Clear any pending speech
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);

    if (!voiceEnabled) { window.speechSynthesis.cancel(); return; }
    if (!currentNote) return;

    // Build a speakable name: "c sharp", "d flat", etc.
    // Use lowercase to prevent speech engine from saying "capital A"
    let speakName = currentDisplayName.toLowerCase();
    if (speakName.includes('#')) {
      speakName = speakName.replace('#', ' sharp');
    } else if (speakName.length === 2 && speakName[1] === 'b') {
      speakName = speakName[0] + ' flat';
    }

    // Small delay so the metronome click plays first and doesn't compete
    speechTimeoutRef.current = setTimeout(() => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speakName);
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }, 80);

    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, [currentDisplayName, voiceEnabled]);

  // Helper to reset beat tracking
  const resetBeatTracking = useCallback(() => {
    beatAccumulatorRef.current = 0;
    setBeatAccumulator(0);
    cycleCountRef.current = 0;
  }, []);

  // When noteCount or noteFilter changes, reshuffle
  const handleNoteCountChange = useCallback((count) => {
    setNoteCount(count);
    const newNotes = pickRandomNotes(count, noteFilter);
    setPracticeNotes(newNotes);
    setCurrentIndex(0);
    resetBeatTracking();
  }, [noteFilter, resetBeatTracking]);

  // When noteFilter changes, reshuffle with current count
  const handleNoteFilterChange = useCallback((filter) => {
    setNoteFilter(filter);
    const newNotes = pickRandomNotes(noteCount, filter);
    setPracticeNotes(newNotes);
    setCurrentIndex(0);
    resetBeatTracking();
  }, [noteCount, resetBeatTracking]);

  // Shuffle notes
  const handleShuffle = useCallback(() => {
    const newNotes = pickRandomNotes(noteCount, noteFilter);
    setPracticeNotes(newNotes);
    setCurrentIndex(0);
    resetBeatTracking();
  }, [noteCount, noteFilter, resetBeatTracking]);

  // Next note
  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % practiceNotes.length);
    beatAccumulatorRef.current = 0;
    setBeatAccumulator(0);
  }, [practiceNotes.length]);

  // Auto-switch based on metronome beats
  useEffect(() => {
    if (!autoSwitch || !metronome.isPlaying) {
      // Reset tracking when stopped so next start begins fresh
      lastBeatRef.current = 0;
      beatAccumulatorRef.current = 0;
      setBeatAccumulator(0);
      cycleCountRef.current = 0;
      return;
    }

    const newBeats = metronome.beat - lastBeatRef.current;
    if (newBeats > 0) {
      lastBeatRef.current = metronome.beat;
      beatAccumulatorRef.current += newBeats;

      if (beatAccumulatorRef.current > switchDuration) {
        // Switch to next note, reset accumulator to 1 (this beat is beat 1 of new note)
        beatAccumulatorRef.current = 1;
        setCurrentIndex(prevIdx => {
          const nextIdx = (prevIdx + 1) % practiceNotes.length;
          if (nextIdx === 0 && autoShuffle) {
            cycleCountRef.current += 1;
            if (cycleCountRef.current >= shuffleAfterCycles) {
              cycleCountRef.current = 0;
              const newNotes = pickRandomNotes(noteCount, noteFilter);
              setPracticeNotes(newNotes);
              return 0;
            }
          }
          return nextIdx;
        });
      }

      setBeatAccumulator(beatAccumulatorRef.current);
    }
  }, [metronome.beat, metronome.isPlaying, autoSwitch, switchDuration, practiceNotes.length, autoShuffle, shuffleAfterCycles, noteCount, noteFilter]);

  // Progress for the beat counter visualization
  // accumulator is 1-based: beat 1 = 25%, beat 2 = 50%, beat 3 = 75%, beat 4 = 100% then switch
  const beatProgress = autoSwitch && metronome.isPlaying
    ? (beatAccumulator / switchDuration) * 100
    : 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎸 Guitar Fretboard Trainer</h1>
        <p className="subtitle">Memorize notes across the fretboard</p>
      </header>

      {/* Mode selector tabs */}
      <nav className="mode-tabs">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`mode-tab ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </nav>

      {mode === 'free' ? (
        /* ===== FREE PRACTICE MODE ===== */
        <div className="main-layout">
          {/* Left Panel: Controls */}
          <aside className="controls-panel">
            <MetronomeControls
              bpm={metronome.bpm}
              setBpm={metronome.setBpm}
              isPlaying={metronome.isPlaying}
              toggle={metronome.toggle}
              beat={metronome.beat}
            />
            <PracticeControls
              noteCount={noteCount}
              setNoteCount={handleNoteCountChange}
              noteFilter={noteFilter}
              setNoteFilter={handleNoteFilterChange}
              selectedStrings={selectedStrings}
              setSelectedStrings={setSelectedStrings}
              autoSwitch={autoSwitch}
              setAutoSwitch={setAutoSwitch}
              switchDuration={switchDuration}
              setSwitchDuration={setSwitchDuration}
              autoShuffle={autoShuffle}
              setAutoShuffle={setAutoShuffle}
              shuffleAfterCycles={shuffleAfterCycles}
              setShuffleAfterCycles={setShuffleAfterCycles}
              voiceEnabled={voiceEnabled}
              setVoiceEnabled={setVoiceEnabled}
              onShuffle={handleShuffle}
              onNext={handleNext}
              currentIndex={currentIndex}
              totalNotes={practiceNotes.length}
            />

            {/* Note palette */}
            <div className="note-palette">
              <div className="section-label">Current Set</div>
              <div className="note-chips">
                {practiceNotes.map((note, i) => (
                  <button
                    key={note.name}
                    className={`note-chip ${i === currentIndex ? 'active' : ''}`}
                    style={{
                      '--chip-color': note.color,
                      borderColor: i === currentIndex ? note.color : 'transparent',
                      background: i === currentIndex ? `${note.color}22` : 'rgba(255,255,255,0.05)',
                    }}
                    onClick={() => {
                      setCurrentIndex(i);
                      setBeatAccumulator(0);
                    }}
                  >
                    {getNoteDisplayName(note, noteFilter)}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Center: Note Display */}
          <main className="display-panel">
            {/* Beat progress bar */}
            {autoSwitch && metronome.isPlaying && (
              <div className="beat-progress-bar">
                {/* Red segment for beat 1 */}
                {beatAccumulator >= 1 && (
                  <div
                    className="beat-progress-fill"
                    style={{
                      width: `${(1 / switchDuration) * 100}%`,
                      background: '#e74c3c',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                    }}
                  />
                )}
                {/* Blue segment for remaining beats */}
                {beatAccumulator > 1 && (
                  <div
                    className="beat-progress-fill"
                    style={{
                      width: `${((beatAccumulator - 1) / switchDuration) * 100}%`,
                      background: '#3498db',
                      position: 'absolute',
                      left: `${(1 / switchDuration) * 100}%`,
                      top: 0,
                      height: '100%',
                    }}
                  />
                )}
              </div>
            )}

            <div className="note-main-display">
              <NoteDisplay note={currentNote} size={180} noteFilter={noteFilter} />
            </div>

            <StaffNotation note={currentNote} noteFilter={noteFilter} />

            {/* Fretboard */}
            <div className="fretboard-container">
              <Fretboard currentNote={currentNote} selectedStrings={selectedStrings} noteFilter={noteFilter} />
            </div>
          </main>
        </div>
      ) : mode === 'name-note' ? (
        /* ===== NAME THE NOTE QUIZ ===== */
        <div className="mode-content">
          <NameTheNote selectedStrings={selectedStrings} noteFilter={noteFilter} />
        </div>
      ) : mode === 'find-note' ? (
        /* ===== FIND THE NOTE QUIZ ===== */
        <div className="mode-content">
          <FindTheNote selectedStrings={selectedStrings} noteFilter={noteFilter} />
        </div>
      ) : mode === 'speed-drill' ? (
        /* ===== SPEED DRILL ===== */
        <div className="mode-content">
          <SpeedDrill selectedStrings={selectedStrings} noteFilter={noteFilter} />
        </div>
      ) : mode === 'string-focus' ? (
        /* ===== STRING FOCUS ===== */
        <div className="mode-content">
          <StringFocus noteFilter={noteFilter} />
        </div>
      ) : null}
    </div>
  );
}

export default App;
