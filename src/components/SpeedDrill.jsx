import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ALL_NOTES, GUITAR_STRINGS, OPEN_STRING_INDICES, NUM_FRETS, getNoteAt, getNoteDisplayName, getFilteredNotes } from '../data/notes';
import StringSelector from './StringSelector';
import NoteFilterSelector from './NoteFilterSelector';

/**
 * Speed Drill
 * Timed challenge: identify as many notes as possible in a set duration.
 */

function getRandomPosition(selectedStrings, noteFilter = 'all', maxFret = 12) {
  const strings = selectedStrings.length > 0 ? selectedStrings : [0, 1, 2, 3, 4, 5];
  const filtered = getFilteredNotes(noteFilter);
  const filteredNames = new Set(filtered.map(n => n.name));

  // Build list of valid positions
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

function generateChoices(correctNote, noteFilter, count = 4) {
  const correctName = getNoteDisplayName(correctNote, noteFilter);
  const pool = getFilteredNotes(noteFilter);
  const allNames = pool.map(n => getNoteDisplayName(n, noteFilter));
  const unique = [...new Set(allNames)];
  const others = unique.filter(n => n !== correctName);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const choices = [correctName, ...others.slice(0, count - 1)];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

const DRILL_DURATIONS = [30, 60, 90, 120];

export default function SpeedDrill({ selectedStrings: initialStrings, noteFilter: initialFilter }) {
  const [selectedStrings, setSelectedStrings] = useState(initialStrings || [0, 1, 2, 3, 4, 5]);
  const [noteFilter, setNoteFilter] = useState(initialFilter || 'all');
  const [duration, setDuration] = useState(60);
  const [phase, setPhase] = useState('setup'); // 'setup' | 'playing' | 'results'
  const [timeLeft, setTimeLeft] = useState(60);
  const [position, setPosition] = useState(() => getRandomPosition(selectedStrings, noteFilter));
  const [choices, setChoices] = useState([]);
  const [flashColor, setFlashColor] = useState(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0, avgTime: 0 });
  const [history, setHistory] = useState([]); // [{position, correctName, answered, correct, time}]
  const timerRef = useRef(null);
  const questionStartRef = useRef(Date.now());
  const statsRef = useRef({ correct: 0, wrong: 0, total: 0, totalTime: 0 });

  const correctNote = getNoteAt(position.stringIdx + 1, position.fret);
  const correctName = getNoteDisplayName(correctNote, noteFilter);

  const nextQuestion = useCallback(() => {
    const pos = getRandomPosition(selectedStrings, noteFilter);
    setPosition(pos);
    const note = getNoteAt(pos.stringIdx + 1, pos.fret);
    setChoices(generateChoices(note, noteFilter, 6)); // 6 choices for harder drill
    questionStartRef.current = Date.now();
    setFlashColor(null);
  }, [selectedStrings, noteFilter]);

  const startDrill = useCallback(() => {
    setPhase('playing');
    setTimeLeft(duration);
    statsRef.current = { correct: 0, wrong: 0, total: 0, totalTime: 0 };
    setStats({ correct: 0, wrong: 0, total: 0, avgTime: 0 });
    setHistory([]);
    nextQuestion();

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPhase('results');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [duration, nextQuestion]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleChoice = (choice) => {
    if (phase !== 'playing') return;
    const answerTime = Date.now() - questionStartRef.current;
    const isCorrect = choice === correctName;

    statsRef.current.total += 1;
    statsRef.current.totalTime += answerTime;
    if (isCorrect) statsRef.current.correct += 1;
    else statsRef.current.wrong += 1;

    setStats({
      correct: statsRef.current.correct,
      wrong: statsRef.current.wrong,
      total: statsRef.current.total,
      avgTime: Math.round(statsRef.current.totalTime / statsRef.current.total),
    });

    setHistory(prev => [...prev, {
      stringIdx: position.stringIdx,
      fret: position.fret,
      correctName,
      answered: choice,
      correct: isCorrect,
      time: answerTime,
    }]);

    // Flash feedback
    setFlashColor(isCorrect ? '#2ecc71' : '#e74c3c');
    setTimeout(() => nextQuestion(), isCorrect ? 200 : 500);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const timePercent = (timeLeft / duration) * 100;

  if (phase === 'setup') {
    return (
      <div className="quiz-mode">
        <div className="speed-setup">
          <div className="speed-setup-title">⚡ Speed Drill</div>
          <p className="speed-setup-desc">
            Identify notes as fast as you can! Choose your time limit and hit Start.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            <StringSelector selectedStrings={selectedStrings} setSelectedStrings={setSelectedStrings} />
            <NoteFilterSelector noteFilter={noteFilter} setNoteFilter={setNoteFilter} />
          </div>

          <div className="speed-duration-picker">
            {DRILL_DURATIONS.map(d => (
              <button
                key={d}
                className={`speed-duration-btn ${d === duration ? 'active' : ''}`}
                onClick={() => setDuration(d)}
              >
                {d}s
              </button>
            ))}
          </div>

          <button className="speed-start-btn" onClick={startDrill}>
            🚀 Start Drill
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    const notesPerMin = stats.total > 0 ? Math.round((stats.total / duration) * 60) : 0;
    return (
      <div className="quiz-mode">
        <div className="speed-results">
          <div className="speed-results-title">⚡ Drill Complete!</div>

          <div className="speed-results-grid">
            <div className="speed-result-card">
              <div className="speed-result-value" style={{ color: '#2ecc71' }}>{stats.correct}</div>
              <div className="speed-result-label">Correct</div>
            </div>
            <div className="speed-result-card">
              <div className="speed-result-value" style={{ color: '#e74c3c' }}>{stats.wrong}</div>
              <div className="speed-result-label">Wrong</div>
            </div>
            <div className="speed-result-card">
              <div className="speed-result-value">{accuracy}%</div>
              <div className="speed-result-label">Accuracy</div>
            </div>
            <div className="speed-result-card">
              <div className="speed-result-value">{stats.avgTime}ms</div>
              <div className="speed-result-label">Avg Time</div>
            </div>
            <div className="speed-result-card">
              <div className="speed-result-value">{notesPerMin}</div>
              <div className="speed-result-label">Notes/min</div>
            </div>
          </div>

          {/* Wrong answers review */}
          {history.filter(h => !h.correct).length > 0 && (
            <div className="speed-review">
              <div className="speed-review-title">Review Mistakes:</div>
              {history.filter(h => !h.correct).map((h, i) => (
                <div key={i} className="speed-review-item">
                  <span>String {h.stringIdx + 1} Fret {h.fret}</span>
                  <span style={{ color: '#e74c3c' }}>You: {h.answered}</span>
                  <span style={{ color: '#2ecc71' }}>Answer: {h.correctName}</span>
                </div>
              ))}
            </div>
          )}

          <button className="speed-start-btn" onClick={() => setPhase('setup')}>
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="quiz-mode" style={{
      borderColor: flashColor || undefined,
      transition: 'border-color 0.15s',
    }}>
      {/* Timer bar */}
      <div className="speed-timer-bar">
        <div
          className="speed-timer-fill"
          style={{
            width: `${timePercent}%`,
            background: timeLeft <= 10 ? '#e74c3c' : timeLeft <= 30 ? '#f39c12' : '#2ecc71',
          }}
        />
      </div>

      <div className="speed-timer-text">
        ⏱ {formatTime(timeLeft)}
        <span className="speed-score-live">{stats.correct} ✓ / {stats.wrong} ✗</span>
      </div>

      {/* Question: fretboard showing position */}
      <div style={{ overflowX: 'auto', margin: '8px 0', padding: '0 4px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `50px repeat(${NUM_FRETS}, 1fr)`,
          gridTemplateRows: 'repeat(6, 32px)',
          gap: 0,
          minWidth: 700,
          position: 'relative',
          background: 'linear-gradient(180deg, #3e2723 0%, #4e342e 100%)',
          borderRadius: 8,
          padding: '6px 4px',
          border: '2px solid #5d4037',
        }}>
          {/* Fret marker dots overlay */}
          <div style={{
            position: 'absolute',
            top: 0, left: 50, right: 0, bottom: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${NUM_FRETS}, 1fr)`,
            pointerEvents: 'none',
            zIndex: 0,
          }}>
            {[...Array(NUM_FRETS)].map((_, i) => {
              const fret = i + 1;
              const isSingle = [3, 5, 7, 9, 15].includes(fret);
              const isDouble = fret === 12;
              if (!isSingle && !isDouble) return <div key={i} />;
              return (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'center', alignItems: 'center',
                  gap: isDouble ? '24%' : 0, height: '100%',
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: 'radial-gradient(circle at 40% 35%, #a1887f, #6d4c41)',
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.3)',
                  }} />
                  {isDouble && (
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: 'radial-gradient(circle at 40% 35%, #a1887f, #6d4c41)',
                      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.3)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Strings and frets — 6th string at bottom */}
          {[5, 4, 3, 2, 1, 0].map(stringIdx => {
            const isTargetString = stringIdx === position.stringIdx;
            return (
              <React.Fragment key={`string-${stringIdx}`}>
                {/* String label */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 12, color: isTargetString ? '#fff' : '#bcaaa4',
                  fontFamily: 'monospace', position: 'relative',
                }}>
                  {GUITAR_STRINGS[stringIdx]}
                  {isTargetString && position.fret === 0 && (
                    <div style={{
                      position: 'absolute',
                      width: 22, height: 22, borderRadius: '50%',
                      background: flashColor || '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: '#000', zIndex: 1,
                      boxShadow: `0 0 10px ${flashColor || '#fff'}88`,
                    }}>?</div>
                  )}
                </div>

                {/* Frets */}
                {[...Array(NUM_FRETS)].map((_, fretIdx) => {
                  const fret = fretIdx + 1;
                  const isTarget = isTargetString && fret === position.fret;
                  return (
                    <div key={`${stringIdx}-${fret}`} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderLeft: '2px solid #795548', position: 'relative',
                    }}>
                      {/* String wire */}
                      <div style={{
                        position: 'absolute', width: '100%',
                        height: stringIdx < 3 ? 2 : 1,
                        background: stringIdx < 3
                          ? 'linear-gradient(90deg, #bdbdbd, #e0e0e0, #bdbdbd)'
                          : 'linear-gradient(90deg, #ffd54f, #ffecb3, #ffd54f)',
                        opacity: isTarget ? 0.3 : 0.6,
                      }} />
                      {/* Target dot */}
                      {isTarget && (
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: flashColor || '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800, color: '#000', zIndex: 1,
                          boxShadow: `0 0 10px ${flashColor || '#fff'}88`,
                          animation: !flashColor ? 'pulse 1.2s ease-in-out infinite' : 'none',
                        }}>?</div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Choices: 6 buttons in 2 rows for speed */}
      <div className="speed-choices">
        {choices.map(choice => {
          const note = ALL_NOTES.find(n => n.name === choice || n.flat === choice);
          return (
            <button
              key={choice}
              className="speed-choice-btn"
              onClick={() => handleChoice(choice)}
              style={{ '--note-color': note ? note.color : '#888' }}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}
