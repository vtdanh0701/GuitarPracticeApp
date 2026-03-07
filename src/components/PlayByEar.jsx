import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ALL_NOTES, GUITAR_STRINGS, NUM_FRETS, getNoteAt, getNoteDisplayName, getFilteredNotes } from '../data/notes';
import { notesMatch } from '../utils/pitchDetection';
import { useAudioDetection } from '../hooks/useAudioDetection';
import StringSelector from './StringSelector';
import NoteFilterSelector from './NoteFilterSelector';

/**
 * Play By Ear mode:
 * Shows a note/position on the fretboard — user plays it on their real guitar.
 * The app listens via the microphone and detects if the correct note was played.
 */

function getRandomPosition(selectedStrings, noteFilter = 'all', maxFret = 12) {
  const strings = selectedStrings.length > 0 ? selectedStrings : [0, 1, 2, 3, 4, 5];
  const filtered = getFilteredNotes(noteFilter);
  const filteredNames = new Set(filtered.map(n => n.name));

  const validPositions = [];
  for (const s of strings) {
    for (let f = 0; f <= maxFret; f++) {
      const note = getNoteAt(s + 1, f);
      if (filteredNames.has(note.name)) {
        validPositions.push({ stringIdx: s, fret: f });
      }
    }
  }
  if (validPositions.length === 0) {
    const stringIdx = strings[Math.floor(Math.random() * strings.length)];
    const fret = Math.floor(Math.random() * (maxFret + 1));
    return { stringIdx, fret };
  }
  return validPositions[Math.floor(Math.random() * validPositions.length)];
}

const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15];
const DOUBLE_DOT_FRETS = [12];

// MIDI numbers for each open string (E2, A2, D3, G3, B3, E4)
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];

function getOctaveForPosition(stringIdx, fret) {
  const midi = OPEN_STRING_MIDI[stringIdx] + fret;
  return Math.floor(midi / 12) - 1;
}

/**
 * Get all fretboard positions where a given note name appears,
 * filtered by selected strings.
 */
function getPositionsForNote(noteName, selectedStrings, maxFret = NUM_FRETS) {
  const strings = selectedStrings.length > 0 ? selectedStrings : [0, 1, 2, 3, 4, 5];
  const positions = [];
  for (const s of strings) {
    for (let f = 0; f <= maxFret; f++) {
      const note = getNoteAt(s + 1, f);
      if (note.name === noteName) {
        positions.push({ stringIdx: s, fret: f, octave: getOctaveForPosition(s, f) });
      }
    }
  }
  return positions;
}

export default function PlayByEar({ selectedStrings: initialStrings, noteFilter: initialFilter }) {
  const [selectedStrings, setSelectedStrings] = useState(initialStrings || [0, 1, 2, 3, 4, 5]);
  const [noteFilter, setNoteFilter] = useState(initialFilter || 'all');
  const [quizMode, setQuizMode] = useState('position'); // 'position' = show fretboard position, 'note' = show note name
  const [position, setPosition] = useState(() => getRandomPosition(selectedStrings, noteFilter));
  const [result, setResult] = useState(null); // null | 'correct' | 'wrong'
  const [stats, setStats] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
  const [showAnswer, setShowAnswer] = useState(false);
  const [noteMatchMode, setNoteMatchMode] = useState('any'); // 'any' = match any position, 'all' = play all positions
  const [allPositionsForNote, setAllPositionsForNote] = useState([]);
  const [hitOctaves, setHitOctaves] = useState(new Set());

  const { isListening, detectedNote, startListening, stopListening, error, volume } = useAudioDetection({
    bufferSize: 4096,
    threshold: 0.15,
  });

  const correctNote = getNoteAt(position.stringIdx + 1, position.fret);
  const correctName = getNoteDisplayName(correctNote, noteFilter);

  // Cooldown to prevent rapid re-triggering
  const cooldownRef = useRef(false);
  const advanceTimerRef = useRef(null);

  const nextQuestion = useCallback(() => {
    const pos = getRandomPosition(selectedStrings, noteFilter);
    setPosition(pos);
    setResult(null);
    setShowAnswer(false);
    cooldownRef.current = false;
    setHitOctaves(new Set());
  }, [selectedStrings, noteFilter]);

  // Compute all positions for current note in "all positions" mode
  useEffect(() => {
    if (quizMode === 'note' && noteMatchMode === 'all') {
      const note = getNoteAt(position.stringIdx + 1, position.fret);
      const positions = getPositionsForNote(note.name, selectedStrings);
      setAllPositionsForNote(positions);
      setHitOctaves(new Set());
    }
  }, [position, quizMode, noteMatchMode, selectedStrings]);

  // Reset on settings change
  useEffect(() => {
    nextQuestion();
  }, [selectedStrings, noteFilter]);

  // Check detected note against target
  useEffect(() => {
    if (!isListening || !detectedNote || cooldownRef.current) return;
    if (Math.abs(detectedNote.cents) > 30) return;

    const isCorrect = notesMatch(detectedNote.note, correctNote.name);

    // "All positions" sub-mode: track each unique octave hit
    if (quizMode === 'note' && noteMatchMode === 'all') {
      if (!isCorrect || result !== null) return;
      const octave = detectedNote.octave;
      if (hitOctaves.has(octave)) return;
      // Only count if this octave actually appears in our target positions
      if (!allPositionsForNote.some(p => p.octave === octave)) return;

      const newHitOctaves = new Set(hitOctaves);
      newHitOctaves.add(octave);
      setHitOctaves(newHitOctaves);

      const hitCount = allPositionsForNote.filter(p => newHitOctaves.has(p.octave)).length;
      if (hitCount >= allPositionsForNote.length) {
        cooldownRef.current = true;
        setResult('correct');
        setStats(prev => ({
          correct: prev.correct + 1,
          total: prev.total + 1,
          streak: prev.streak + 1,
          bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
        }));
        advanceTimerRef.current = setTimeout(() => nextQuestion(), 2000);
      }
      return;
    }

    // Default: single match (position mode or "any" note mode)
    if (result !== null) return;
    if (isCorrect) {
      cooldownRef.current = true;
      setResult('correct');
      setStats(prev => ({
        correct: prev.correct + 1,
        total: prev.total + 1,
        streak: prev.streak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
      }));
      // Auto-advance after 1.2s
      advanceTimerRef.current = setTimeout(() => nextQuestion(), 1200);
    }
  }, [detectedNote, isListening, result, correctNote, nextQuestion, quizMode, noteMatchMode, hitOctaves, allPositionsForNote]);

  // Skip / give up on current note
  const handleSkip = () => {
    if (result === null) {
      setResult('wrong');
      setShowAnswer(true);
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        streak: 0,
      }));
      cooldownRef.current = true;
      advanceTimerRef.current = setTimeout(() => nextQuestion(), 2000);
    } else {
      nextQuestion();
    }
  };

  useEffect(() => {
    return () => { if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current); };
  }, []);

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="quiz-mode">
      {/* Options bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        <StringSelector selectedStrings={selectedStrings} setSelectedStrings={setSelectedStrings} />
        <NoteFilterSelector noteFilter={noteFilter} setNoteFilter={setNoteFilter} />
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
        <button
          className={`quiz-mode-btn ${quizMode === 'position' ? 'active' : ''}`}
          onClick={() => { setQuizMode('position'); nextQuestion(); }}
        >
          🎯 Show Position
        </button>
        <button
          className={`quiz-mode-btn ${quizMode === 'note' ? 'active' : ''}`}
          onClick={() => { setQuizMode('note'); nextQuestion(); }}
        >
          🎵 Show Note Name
        </button>
      </div>

      {/* Note match sub-mode toggle (only in note mode) */}
      {quizMode === 'note' && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
          <button
            className={`quiz-mode-btn ${noteMatchMode === 'any' ? 'active' : ''}`}
            onClick={() => setNoteMatchMode('any')}
            style={{ fontSize: 12, padding: '4px 14px' }}
          >
            🎯 Any Position
          </button>
          <button
            className={`quiz-mode-btn ${noteMatchMode === 'all' ? 'active' : ''}`}
            onClick={() => setNoteMatchMode('all')}
            style={{ fontSize: 12, padding: '4px 14px' }}
          >
            📍 All Positions
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="quiz-stats">
        <div className="stat-item">
          <span className="stat-value">{stats.correct}/{stats.total}</span>
          <span className="stat-label">Score</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{accuracy}%</span>
          <span className="stat-label">Accuracy</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">🔥 {stats.streak}</span>
          <span className="stat-label">Streak</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">⭐ {stats.bestStreak}</span>
          <span className="stat-label">Best</span>
        </div>
      </div>

      {/* Microphone control */}
      {!isListening ? (
        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <button
            onClick={startListening}
            style={{
              padding: '14px 32px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            🎤 Start Listening
          </button>
          {error && (
            <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 8 }}>{error}</div>
          )}
          <div style={{ color: '#666', fontSize: 12, marginTop: 8 }}>
            Allow microphone access to detect your guitar notes
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', margin: '10px 0' }}>
          {/* Volume meter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#999' }}>🎤</span>
            <div style={{
              width: 120, height: 6, borderRadius: 3,
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${volume * 100}%`,
                height: '100%',
                background: volume > 0.5 ? '#2ecc71' : volume > 0.15 ? '#f39c12' : '#e74c3c',
                borderRadius: 3,
                transition: 'width 0.05s',
              }} />
            </div>
            <button
              onClick={stopListening}
              style={{
                padding: '4px 12px', borderRadius: 6, border: '1px solid #e74c3c',
                background: 'transparent', color: '#e74c3c', fontSize: 11,
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              Stop
            </button>
          </div>

          {/* Detected note display */}
          <div style={{
            fontSize: 13, color: '#888', minHeight: 20,
          }}>
            {detectedNote ? (
              <span>
                Hearing: <strong style={{ color: '#fff', fontSize: 15 }}>{detectedNote.note}{detectedNote.octave}</strong>
                <span style={{ color: '#666', marginLeft: 6 }}>
                  {detectedNote.frequency}Hz {detectedNote.cents > 0 ? '+' : ''}{detectedNote.cents}¢
                </span>
              </span>
            ) : (
              <span style={{ color: '#555' }}>Play a note...</span>
            )}
          </div>
        </div>
      )}

      {/* Question display */}
      {quizMode === 'note' ? (
        <div style={{ margin: '16px 0' }}>
          {/* Note name */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#999', marginBottom: 4 }}>
              {noteMatchMode === 'all' ? 'Play this note in every position:' : 'Play this note:'}
            </div>
            <div style={{
              fontSize: 72, fontWeight: 800, color: correctNote.color,
              textShadow: `0 0 30px ${correctNote.color}44`,
              lineHeight: 1.1,
            }}>
              {correctName}
            </div>
          </div>

          {/* "Any" mode answer hint */}
          {noteMatchMode === 'any' && (showAnswer || result === 'correct') && (
            <div style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 8 }}>
              String {position.stringIdx + 1} ({GUITAR_STRINGS[position.stringIdx]}), Fret {position.fret}
            </div>
          )}

          {/* "All positions" mode — progress + fretboard */}
          {noteMatchMode === 'all' && (() => {
            const hitCount = allPositionsForNote.filter(p => hitOctaves.has(p.octave)).length;
            const totalCount = allPositionsForNote.length;
            const uniqueOctaves = [...new Set(allPositionsForNote.map(p => p.octave))];
            const hitOctaveCount = uniqueOctaves.filter(o => hitOctaves.has(o)).length;
            return (
              <>
                {/* Progress counter */}
                <div style={{ textAlign: 'center', margin: '10px 0' }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: hitCount === totalCount ? '#2ecc71' : '#f39c12' }}>
                    {hitCount}
                  </span>
                  <span style={{ fontSize: 18, color: '#888' }}> / {totalCount}</span>
                  <span style={{ fontSize: 13, color: '#666', marginLeft: 6 }}>positions</span>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                    {hitOctaveCount} / {uniqueOctaves.length} unique octaves played
                  </div>
                </div>

                {/* Fretboard with all positions shown */}
                <div style={{ overflowX: 'auto', padding: '0 4px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `var(--fb-label) repeat(${NUM_FRETS}, 1fr)`,
                    gridTemplateRows: 'repeat(6, var(--fb-row))',
                    gap: 0,
                    position: 'relative',
                    background: 'linear-gradient(180deg, #3e2723 0%, #4e342e 100%)',
                    borderRadius: 8,
                    padding: '8px 4px',
                    border: result === 'correct' ? '2px solid #2ecc71' : '2px solid #5d4037',
                    transition: 'border-color 0.3s',
                  }}>
                    {/* Fret marker dots */}
                    <div style={{
                      position: 'absolute', top: 0, left: 'var(--fb-label)', right: 0, bottom: 0,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${NUM_FRETS}, 1fr)`,
                      pointerEvents: 'none', zIndex: 0,
                    }}>
                      {[...Array(NUM_FRETS)].map((_, i) => {
                        const fret = i + 1;
                        const isSingle = SINGLE_DOT_FRETS.includes(fret);
                        const isDouble = DOUBLE_DOT_FRETS.includes(fret);
                        if (!isSingle && !isDouble) return <div key={i} />;
                        return (
                          <div key={i} style={{
                            display: 'flex', flexDirection: 'column',
                            justifyContent: 'center', alignItems: 'center',
                            gap: isDouble ? '24%' : 0, height: '100%',
                          }}>
                            <div style={{
                              width: 12, height: 12, borderRadius: '50%',
                              background: 'radial-gradient(circle at 40% 35%, #a1887f, #6d4c41)',
                              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.3)',
                            }} />
                            {isDouble && (
                              <div style={{
                                width: 12, height: 12, borderRadius: '50%',
                                background: 'radial-gradient(circle at 40% 35%, #a1887f, #6d4c41)',
                                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.3)',
                              }} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Strings and frets */}
                    {[5, 4, 3, 2, 1, 0].map(stringIdx => (
                      <React.Fragment key={`string-${stringIdx}`}>
                        {/* String label + open string position */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 13,
                          color: allPositionsForNote.some(p => p.stringIdx === stringIdx) ? '#fff' : '#bcaaa4',
                          fontFamily: 'monospace', position: 'relative',
                        }}>
                          {GUITAR_STRINGS[stringIdx]}
                          {(() => {
                            const posInfo = allPositionsForNote.find(p => p.stringIdx === stringIdx && p.fret === 0);
                            if (!posInfo) return null;
                            const isHit = hitOctaves.has(posInfo.octave);
                            return (
                              <div style={{
                                position: 'absolute',
                                width: 'var(--fb-dot)', height: 'var(--fb-dot)', borderRadius: '50%',
                                background: isHit ? '#2ecc71' : correctNote.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 'var(--fb-dot-font)', fontWeight: 800, color: '#000', zIndex: 1,
                                boxShadow: `0 0 10px ${isHit ? '#2ecc71' : correctNote.color}88`,
                                animation: !isHit && result !== 'correct' ? 'pulse 1.2s ease-in-out infinite' : 'none',
                                opacity: isHit ? 0.65 : 1,
                              }}>
                                {isHit ? '✓' : correctName}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Frets 1 through NUM_FRETS */}
                        {[...Array(NUM_FRETS)].map((_, fretIdx) => {
                          const fret = fretIdx + 1;
                          const posInfo = allPositionsForNote.find(p => p.stringIdx === stringIdx && p.fret === fret);
                          const isTarget = !!posInfo;
                          const isHit = isTarget && hitOctaves.has(posInfo.octave);
                          return (
                            <div key={`${stringIdx}-${fret}`} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderLeft: '2px solid #795548', position: 'relative',
                            }}>
                              <div style={{
                                position: 'absolute', width: '100%',
                                height: stringIdx < 3 ? 2 : 1,
                                background: stringIdx < 3
                                  ? 'linear-gradient(90deg, #bdbdbd, #e0e0e0, #bdbdbd)'
                                  : 'linear-gradient(90deg, #ffd54f, #ffecb3, #ffd54f)',
                                opacity: isTarget ? 0.3 : 0.6,
                              }} />
                              {isTarget && (
                                <div style={{
                                  width: 'var(--fb-dot)', height: 'var(--fb-dot)', borderRadius: '50%',
                                  background: isHit ? '#2ecc71' : correctNote.color,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 'var(--fb-dot-font)', fontWeight: 800, color: '#000', zIndex: 1,
                                  boxShadow: `0 0 10px ${isHit ? '#2ecc71' : correctNote.color}88`,
                                  animation: !isHit && result !== 'correct' ? 'pulse 1.2s ease-in-out infinite' : 'none',
                                  opacity: isHit ? 0.65 : 1,
                                }}>
                                  {isHit ? '✓' : correctName}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        /* Show fretboard position — user plays it */
        <div style={{ margin: '12px 0' }}>
          <div style={{ textAlign: 'center', fontSize: 14, color: '#999', marginBottom: 8 }}>
            Play the highlighted note:
          </div>
          <div style={{ overflowX: 'auto', padding: '0 4px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `var(--fb-label) repeat(${NUM_FRETS}, 1fr)`,
              gridTemplateRows: 'repeat(6, var(--fb-row))',
              gap: 0,
              position: 'relative',
              background: 'linear-gradient(180deg, #3e2723 0%, #4e342e 100%)',
              borderRadius: 8,
              padding: '8px 4px',
              border: result === 'correct' ? '2px solid #2ecc71' :
                      result === 'wrong' ? '2px solid #e74c3c' : '2px solid #5d4037',
              transition: 'border-color 0.3s',
            }}>
              {/* Fret marker dots */}
              <div style={{
                position: 'absolute', top: 0, left: 'var(--fb-label)', right: 0, bottom: 0,
                display: 'grid',
                gridTemplateColumns: `repeat(${NUM_FRETS}, 1fr)`,
                pointerEvents: 'none', zIndex: 0,
              }}>
                {[...Array(NUM_FRETS)].map((_, i) => {
                  const fret = i + 1;
                  const isSingle = SINGLE_DOT_FRETS.includes(fret);
                  const isDouble = DOUBLE_DOT_FRETS.includes(fret);
                  if (!isSingle && !isDouble) return <div key={i} />;
                  return (
                    <div key={i} style={{
                      display: 'flex', flexDirection: 'column',
                      justifyContent: 'center', alignItems: 'center',
                      gap: isDouble ? '24%' : 0, height: '100%',
                    }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: 'radial-gradient(circle at 40% 35%, #a1887f, #6d4c41)',
                        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.3)',
                      }} />
                      {isDouble && (
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%',
                          background: 'radial-gradient(circle at 40% 35%, #a1887f, #6d4c41)',
                          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.3)',
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Strings and frets */}
              {[5, 4, 3, 2, 1, 0].map(stringIdx => {
                const isTargetString = stringIdx === position.stringIdx;
                return (
                  <React.Fragment key={`string-${stringIdx}`}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13, color: isTargetString ? '#fff' : '#bcaaa4',
                      fontFamily: 'monospace', position: 'relative',
                    }}>
                      {GUITAR_STRINGS[stringIdx]}
                      {isTargetString && position.fret === 0 && (
                        <div style={{
                          position: 'absolute',
                          width: 'var(--fb-dot)', height: 'var(--fb-dot)', borderRadius: '50%',
                          background: result === 'correct' ? '#2ecc71' : result === 'wrong' ? '#e74c3c' : correctNote.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'var(--fb-dot-font)', fontWeight: 800, color: '#000', zIndex: 1,
                          boxShadow: `0 0 10px ${result === 'correct' ? '#2ecc71' : result === 'wrong' ? '#e74c3c' : correctNote.color}88`,
                          animation: result === null ? 'pulse 1.2s ease-in-out infinite' : 'none',
                        }}>
                          {showAnswer || result === 'correct' ? correctName : '?'}
                        </div>
                      )}
                    </div>

                    {[...Array(NUM_FRETS)].map((_, fretIdx) => {
                      const fret = fretIdx + 1;
                      const isTarget = isTargetString && fret === position.fret;
                      return (
                        <div key={`${stringIdx}-${fret}`} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderLeft: '2px solid #795548', position: 'relative',
                        }}>
                          <div style={{
                            position: 'absolute', width: '100%',
                            height: stringIdx < 3 ? 2 : 1,
                            background: stringIdx < 3
                              ? 'linear-gradient(90deg, #bdbdbd, #e0e0e0, #bdbdbd)'
                              : 'linear-gradient(90deg, #ffd54f, #ffecb3, #ffd54f)',
                            opacity: isTarget ? 0.3 : 0.6,
                          }} />
                          {isTarget && (
                            <div style={{
                              width: 'var(--fb-dot)', height: 'var(--fb-dot)', borderRadius: '50%',
                              background: result === 'correct' ? '#2ecc71' : result === 'wrong' ? '#e74c3c' : correctNote.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 'var(--fb-dot-font)', fontWeight: 800, color: '#000', zIndex: 1,
                              boxShadow: `0 0 10px ${result === 'correct' ? '#2ecc71' : result === 'wrong' ? '#e74c3c' : correctNote.color}88`,
                              animation: result === null ? 'pulse 1.2s ease-in-out infinite' : 'none',
                            }}>
                              {showAnswer || result === 'correct' ? correctName : '?'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      {result && (
        <div style={{
          textAlign: 'center', fontSize: 24, fontWeight: 800, marginTop: 8,
          color: result === 'correct' ? '#2ecc71' : '#e74c3c',
        }}>
          {result === 'correct'
            ? (quizMode === 'note' && noteMatchMode === 'all'
              ? `✓ All ${allPositionsForNote.length} positions found!`
              : '✓ Correct!')
            : `✗ The answer was ${correctName}`}
        </div>
      )}

      {/* Actions */}
      <div className="quiz-actions" style={{ marginTop: 12 }}>
        <button className="quiz-action-btn" onClick={handleSkip}>
          {result === null ? '⏭ Skip' : 'Next →'}
        </button>
        {result === null && !showAnswer && (
          <button className="quiz-action-btn" onClick={() => setShowAnswer(true)}>
            💡 Show Answer
          </button>
        )}
        <button className="quiz-action-btn" onClick={() => setStats({ correct: 0, total: 0, streak: 0, bestStreak: 0 })}>
          Reset Stats
        </button>
      </div>
    </div>
  );
}
