import React, { useState, useCallback, useEffect } from 'react';
import { ALL_NOTES, GUITAR_STRINGS, OPEN_STRING_INDICES, NUM_FRETS, getNoteAt, getNoteDisplayName } from '../data/notes';

/**
 * String Focus
 * Learn one string at a time by walking through every fret, then quiz yourself.
 */

export default function StringFocus({ noteFilter }) {
  const [stringIdx, setStringIdx] = useState(0); // 0=low E
  const [phase, setPhase] = useState('learn'); // 'learn' | 'quiz'
  const [currentFret, setCurrentFret] = useState(0);
  const [showNote, setShowNote] = useState(true);
  const [quizFret, setQuizFret] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizCorrect, setQuizCorrect] = useState(null);
  const [quizStats, setQuizStats] = useState({ correct: 0, total: 0 });
  const [maxFret, setMaxFret] = useState(12);

  const getNote = (sIdx, fret) => {
    const openIndex = OPEN_STRING_INDICES[sIdx];
    const noteIndex = (openIndex + fret) % 12;
    return ALL_NOTES[noteIndex];
  };

  // Build the notes for current string
  const stringNotes = [];
  for (let f = 0; f <= maxFret; f++) {
    stringNotes.push({ fret: f, note: getNote(stringIdx, f) });
  }

  const generateQuizFret = useCallback(() => {
    const fret = Math.floor(Math.random() * (maxFret + 1));
    setQuizFret(fret);
    setQuizAnswer(null);
    setQuizCorrect(null);
  }, [maxFret]);

  const startQuiz = () => {
    setPhase('quiz');
    setQuizStats({ correct: 0, total: 0 });
    generateQuizFret();
  };

  const handleQuizAnswer = (noteName) => {
    if (quizAnswer !== null) return;
    const correctNote = getNote(stringIdx, quizFret);
    const correctName = getNoteDisplayName(correctNote, noteFilter);
    const isCorrect = noteName === correctName;
    setQuizAnswer(noteName);
    setQuizCorrect(isCorrect);
    setQuizStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(() => generateQuizFret(), isCorrect ? 600 : 1200);
  };

  useEffect(() => {
    setCurrentFret(0);
    setPhase('learn');
    setShowNote(true);
  }, [stringIdx, maxFret]);

  // All unique note names for quiz choices
  const allChoices = ALL_NOTES.map(n => getNoteDisplayName(n, noteFilter));
  const uniqueChoices = [...new Set(allChoices)];

  return (
    <div className="quiz-mode">
      {/* String selector */}
      <div className="sf-string-selector">
        {GUITAR_STRINGS.map((name, idx) => (
          <button
            key={idx}
            className={`sf-string-btn ${idx === stringIdx ? 'active' : ''}`}
            onClick={() => setStringIdx(idx)}
          >
            <span className="sf-string-num">{idx + 1}</span>
            <span className="sf-string-name">{name}</span>
          </button>
        ))}
      </div>

      {/* Fret range control */}
      <div className="sf-fret-range">
        <label>Frets: 0 – {maxFret}</label>
        <input
          type="range"
          min={3}
          max={NUM_FRETS}
          value={maxFret}
          onChange={e => setMaxFret(Number(e.target.value))}
        />
      </div>

      {/* Phase toggle */}
      <div className="sf-phase-toggle">
        <button
          className={`sf-phase-btn ${phase === 'learn' ? 'active' : ''}`}
          onClick={() => setPhase('learn')}
        >
          📖 Learn
        </button>
        <button
          className={`sf-phase-btn ${phase === 'quiz' ? 'active' : ''}`}
          onClick={startQuiz}
        >
          ❓ Quiz
        </button>
      </div>

      {phase === 'learn' ? (
        /* LEARN MODE */
        <div className="sf-learn">
          {/* Visual string with all notes */}
          <div className="sf-string-visual">
            {stringNotes.map(({ fret, note }) => {
              const isCurrent = fret === currentFret;
              const displayName = getNoteDisplayName(note, noteFilter);
              return (
                <div
                  key={fret}
                  className={`sf-fret-cell ${isCurrent ? 'active' : ''}`}
                  onClick={() => { setCurrentFret(fret); setShowNote(true); }}
                  style={{
                    '--note-color': note.color,
                    borderColor: isCurrent ? note.color : 'transparent',
                  }}
                >
                  <div className="sf-fret-num">{fret}</div>
                  <div
                    className="sf-fret-note"
                    style={{
                      background: note.color,
                      opacity: showNote || isCurrent ? 1 : 0,
                    }}
                  >
                    {displayName}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current note detail */}
          <div className="sf-note-detail" style={{ color: stringNotes[currentFret]?.note.color }}>
            <div className="sf-note-big">
              {getNoteDisplayName(stringNotes[currentFret]?.note, noteFilter)}
            </div>
            <div className="sf-note-info">
              String {stringIdx + 1} ({GUITAR_STRINGS[stringIdx]}) · Fret {currentFret}
            </div>
          </div>

          {/* Controls */}
          <div className="sf-learn-controls">
            <button
              className="quiz-action-btn"
              onClick={() => setCurrentFret(prev => Math.max(0, prev - 1))}
              disabled={currentFret === 0}
            >
              ← Prev
            </button>
            <button
              className="quiz-action-btn"
              onClick={() => setShowNote(prev => !prev)}
            >
              {showNote ? '🙈 Hide Notes' : '👁 Show Notes'}
            </button>
            <button
              className="quiz-action-btn"
              onClick={() => setCurrentFret(prev => Math.min(maxFret, prev + 1))}
              disabled={currentFret === maxFret}
            >
              Next →
            </button>
          </div>
        </div>
      ) : (
        /* QUIZ MODE */
        <div className="sf-quiz">
          <div className="quiz-stats" style={{ marginBottom: 16 }}>
            <div className="stat-item">
              <span className="stat-value">{quizStats.correct}/{quizStats.total}</span>
              <span className="stat-label">Score</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {quizStats.total > 0 ? Math.round((quizStats.correct / quizStats.total) * 100) : 0}%
              </span>
              <span className="stat-label">Accuracy</span>
            </div>
          </div>

          {/* Question */}
          <div className="sf-quiz-question">
            <span>String {stringIdx + 1} ({GUITAR_STRINGS[stringIdx]})</span>
            <span className="sf-quiz-fret-highlight">Fret {quizFret}</span>
          </div>

          {/* Visual: single string showing position */}
          <div className="sf-quiz-string-visual">
            {stringNotes.map(({ fret }) => {
              const isTarget = fret === quizFret;
              const note = getNote(stringIdx, fret);
              return (
                <div key={fret} className={`sf-quiz-fret ${isTarget ? 'target' : ''}`}>
                  <div className="sf-quiz-fret-num">{fret}</div>
                  <div className="sf-quiz-fret-wire" />
                  {isTarget && (
                    <div className="sf-quiz-target-dot" style={{
                      background: quizCorrect === true ? '#2ecc71' : quizCorrect === false ? '#e74c3c' : '#fff',
                    }}>
                      {quizAnswer !== null ? getNoteDisplayName(note, noteFilter) : '?'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Choices — natural notes only for easier picking */}
          <div className="sf-quiz-choices">
            {uniqueChoices.map(name => {
              const note = ALL_NOTES.find(n => getNoteDisplayName(n, noteFilter) === name);
              let className = 'sf-quiz-choice';
              if (quizAnswer !== null) {
                const correctName = getNoteDisplayName(getNote(stringIdx, quizFret), noteFilter);
                if (name === correctName) className += ' correct';
                else if (name === quizAnswer) className += ' wrong';
              }
              return (
                <button
                  key={name}
                  className={className}
                  onClick={() => handleQuizAnswer(name)}
                  disabled={quizAnswer !== null}
                  style={{ '--note-color': note ? note.color : '#888' }}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {quizCorrect !== null && (
            <div className={`quiz-feedback ${quizCorrect ? 'correct' : 'wrong'}`}>
              {quizCorrect ? '✅ Correct!' : `❌ It was ${getNoteDisplayName(getNote(stringIdx, quizFret), noteFilter)}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
