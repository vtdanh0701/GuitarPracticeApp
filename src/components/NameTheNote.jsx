import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ALL_NOTES, GUITAR_STRINGS, OPEN_STRING_INDICES, NUM_FRETS, getNoteAt, getNoteDisplayName, getFilteredNotes } from '../data/notes';
import StringSelector from './StringSelector';
import NoteFilterSelector from './NoteFilterSelector';

/**
 * Quiz: Name the Note
 * Shows a highlighted position on the fretboard, user picks the correct note name.
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
    // Fallback: any position
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
  
  // Remove correct answer, shuffle, take count-1
  const others = unique.filter(n => n !== correctName);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  
  const choices = [correctName, ...others.slice(0, count - 1)];
  // Shuffle choices
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

export default function NameTheNote({ selectedStrings: initialStrings, noteFilter: initialFilter }) {
  const [selectedStrings, setSelectedStrings] = useState(initialStrings || [0, 1, 2, 3, 4, 5]);
  const [noteFilter, setNoteFilter] = useState(initialFilter || 'all');
  const [position, setPosition] = useState(() => getRandomPosition(selectedStrings, noteFilter));
  const [choices, setChoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [stats, setStats] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef(null);

  const correctNote = getNoteAt(position.stringIdx + 1, position.fret);
  const correctName = getNoteDisplayName(correctNote, noteFilter);

  // Generate new question
  const newQuestion = useCallback(() => {
    const pos = getRandomPosition(selectedStrings, noteFilter);
    setPosition(pos);
    const note = getNoteAt(pos.stringIdx + 1, pos.fret);
    setChoices(generateChoices(note, noteFilter));
    setSelected(null);
    setIsCorrect(null);
    setShowHint(false);
  }, [selectedStrings, noteFilter]);

  // Initialize choices
  useEffect(() => {
    setChoices(generateChoices(correctNote, noteFilter));
  }, []);

  // Re-generate on settings change
  useEffect(() => {
    newQuestion();
  }, [selectedStrings, noteFilter]);

  const handleChoice = (choice) => {
    if (selected !== null) return; // Already answered
    setSelected(choice);
    const correct = choice === correctName;
    setIsCorrect(correct);
    setStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
      streak: correct ? prev.streak + 1 : 0,
      bestStreak: correct ? Math.max(prev.bestStreak, prev.streak + 1) : prev.bestStreak,
    }));

    // Auto-advance after delay
    timerRef.current = setTimeout(() => {
      newQuestion();
    }, correct ? 800 : 1500);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="quiz-mode">
      {/* Options bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        <StringSelector selectedStrings={selectedStrings} setSelectedStrings={setSelectedStrings} />
        <NoteFilterSelector noteFilter={noteFilter} setNoteFilter={setNoteFilter} />
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

      {/* Question */}
      <div className="quiz-question-card">
        <div className="quiz-question-text">
          What note is at <strong>String {position.stringIdx + 1} ({GUITAR_STRINGS[position.stringIdx]})</strong>,{' '}
          <strong>Fret {position.fret}</strong>?
        </div>

        {/* Fretboard — same style as Free Practice / Find the Note */}
        <div style={{ overflowX: 'auto', margin: '0 -8px', padding: '0 8px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `50px repeat(${NUM_FRETS}, 1fr)`,
            gridTemplateRows: 'repeat(6, 36px)',
            gap: 0,
            minWidth: 700,
            position: 'relative',
            background: 'linear-gradient(180deg, #3e2723 0%, #4e342e 100%)',
            borderRadius: 8,
            padding: '8px 4px',
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

            {/* Strings and frets — reversed so 6th string at bottom */}
            {[5, 4, 3, 2, 1, 0].map(stringIdx => {
              const isTargetString = stringIdx === position.stringIdx;
              return (
                <React.Fragment key={`string-${stringIdx}`}>
                  {/* String label (open) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    color: isTargetString ? '#fff' : '#bcaaa4',
                    fontFamily: 'monospace',
                    position: 'relative',
                  }}>
                    {GUITAR_STRINGS[stringIdx]}
                    {/* Open string target indicator */}
                    {isTargetString && position.fret === 0 && (
                      <div style={{
                        position: 'absolute',
                        width: 26, height: 26, borderRadius: '50%',
                        background: isCorrect === true ? '#2ecc71' : isCorrect === false ? '#e74c3c' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, color: '#000', zIndex: 1,
                        boxShadow: `0 0 10px ${isCorrect === true ? '#2ecc71' : isCorrect === false ? '#e74c3c' : '#fff'}88`,
                      }}>
                        {isCorrect !== null ? correctName : '?'}
                      </div>
                    )}
                  </div>

                  {/* Frets */}
                  {[...Array(NUM_FRETS)].map((_, fretIdx) => {
                    const fret = fretIdx + 1;
                    const isTarget = isTargetString && fret === position.fret;

                    return (
                      <div
                        key={`${stringIdx}-${fret}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderLeft: '2px solid #795548',
                          position: 'relative',
                        }}
                      >
                        {/* String wire */}
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: stringIdx < 3 ? 2 : 1,
                          background: stringIdx < 3
                            ? 'linear-gradient(90deg, #bdbdbd, #e0e0e0, #bdbdbd)'
                            : 'linear-gradient(90deg, #ffd54f, #ffecb3, #ffd54f)',
                          opacity: isTarget ? 0.3 : 0.6,
                        }} />

                        {/* Target dot */}
                        {isTarget && (
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: isCorrect === true ? '#2ecc71' : isCorrect === false ? '#e74c3c' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 800, color: '#000', zIndex: 1,
                            boxShadow: `0 0 10px ${isCorrect === true ? '#2ecc71' : isCorrect === false ? '#e74c3c' : '#fff'}88`,
                            animation: isCorrect === null ? 'pulse 1.5s infinite' : 'none',
                          }}>
                            {isCorrect !== null ? correctName : '?'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>

          {/* Fret numbers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `50px repeat(${NUM_FRETS}, 1fr)`,
            minWidth: 700,
            padding: '4px 4px 0',
          }}>
            <div />
            {[...Array(NUM_FRETS)].map((_, i) => (
              <div key={i} style={{
                textAlign: 'center',
                fontSize: 11,
                color: '#888',
                fontFamily: 'monospace',
              }}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Hint button */}
        {selected === null && (
          <button
            className="quiz-hint-btn"
            onClick={() => setShowHint(true)}
            style={{ opacity: showHint ? 0.5 : 1 }}
          >
            💡 {showHint ? `String ${position.stringIdx + 1} open = ${GUITAR_STRINGS[position.stringIdx]}, count ${position.fret} half steps` : 'Show Hint'}
          </button>
        )}
      </div>

      {/* Answer choices */}
      <div className="quiz-choices">
        {choices.map(choice => {
          const note = ALL_NOTES.find(n => n.name === choice || n.flat === choice);
          let btnClass = 'quiz-choice-btn';
          if (selected !== null) {
            if (choice === correctName) btnClass += ' correct';
            else if (choice === selected) btnClass += ' wrong';
          }
          return (
            <button
              key={choice}
              className={btnClass}
              onClick={() => handleChoice(choice)}
              disabled={selected !== null}
              style={{
                '--note-color': note ? note.color : '#888',
              }}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {isCorrect !== null && (
        <div className={`quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
          {isCorrect ? '✅ Correct!' : `❌ It was ${correctName}`}
        </div>
      )}

      {/* Skip / New Question */}
      <div className="quiz-actions">
        <button className="quiz-action-btn" onClick={newQuestion}>
          Skip →
        </button>
        <button className="quiz-action-btn" onClick={() => setStats({ correct: 0, total: 0, streak: 0, bestStreak: 0 })}>
          Reset Stats
        </button>
      </div>
    </div>
  );
}
