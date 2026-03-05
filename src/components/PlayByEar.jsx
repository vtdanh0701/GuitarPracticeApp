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

export default function PlayByEar({ selectedStrings: initialStrings, noteFilter: initialFilter }) {
  const [selectedStrings, setSelectedStrings] = useState(initialStrings || [0, 1, 2, 3, 4, 5]);
  const [noteFilter, setNoteFilter] = useState(initialFilter || 'all');
  const [quizMode, setQuizMode] = useState('position'); // 'position' = show fretboard position, 'note' = show note name
  const [position, setPosition] = useState(() => getRandomPosition(selectedStrings, noteFilter));
  const [result, setResult] = useState(null); // null | 'correct' | 'wrong'
  const [stats, setStats] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
  const [showAnswer, setShowAnswer] = useState(false);

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
  }, [selectedStrings, noteFilter]);

  // Reset on settings change
  useEffect(() => {
    nextQuestion();
  }, [selectedStrings, noteFilter]);

  // Check detected note against target
  useEffect(() => {
    if (!isListening || !detectedNote || result !== null || cooldownRef.current) return;

    const isCorrect = notesMatch(detectedNote.note, correctNote.name);
    // Only register if note is within ±30 cents (reasonably in tune)
    if (Math.abs(detectedNote.cents) > 30) return;

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
  }, [detectedNote, isListening, result, correctNote, nextQuestion]);

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
        /* Show note name — user finds and plays it */
        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <div style={{ fontSize: 14, color: '#999', marginBottom: 4 }}>Play this note:</div>
          <div style={{
            fontSize: 72, fontWeight: 800, color: correctNote.color,
            textShadow: `0 0 30px ${correctNote.color}44`,
            lineHeight: 1.1,
          }}>
            {correctName}
          </div>
          {(showAnswer || result === 'correct') && (
            <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
              String {position.stringIdx + 1} ({GUITAR_STRINGS[position.stringIdx]}), Fret {position.fret}
            </div>
          )}
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
          {result === 'correct' ? '✓ Correct!' : `✗ The answer was ${correctName}`}
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
