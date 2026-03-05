import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ALL_NOTES, GUITAR_STRINGS, OPEN_STRING_INDICES, NUM_FRETS, getNoteAt, getNoteDisplayName, getFretPositions, getFilteredNotes, pickRandomNotes } from '../data/notes';
import StringSelector from './StringSelector';
import NoteFilterSelector from './NoteFilterSelector';

/**
 * Quiz: Find the Note
 * Shows a note name, user clicks the correct position(s) on the fretboard.
 */

export default function FindTheNote({ selectedStrings: initialStrings, noteFilter: initialFilter }) {
  const [selectedStrings, setSelectedStrings] = useState(initialStrings || [0, 1, 2, 3, 4, 5]);
  const [noteFilter, setNoteFilter] = useState(initialFilter || 'all');
  const [targetNote, setTargetNote] = useState(() => pickRandomNotes(1, noteFilter)[0]);
  const [clickedPositions, setClickedPositions] = useState([]); // [{stringIdx, fret}]
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ rounds: 0, perfect: 0 });
  const [findMode, setFindMode] = useState('all'); // 'all' = find all positions, 'one' = find any one

  const targetName = getNoteDisplayName(targetNote, noteFilter);
  const allCorrectPositions = getFretPositions(targetNote.name).filter(
    p => selectedStrings.includes(p.string - 1) && p.fret <= NUM_FRETS
  );

  const newRound = useCallback(() => {
    const note = pickRandomNotes(1, noteFilter)[0];
    setTargetNote(note);
    setClickedPositions([]);
    setRevealed(false);
  }, [noteFilter]);

  useEffect(() => {
    newRound();
  }, [selectedStrings, noteFilter]);

  const handleFretClick = (stringIdx, fret) => {
    if (revealed) return;
    const key = `${stringIdx}-${fret}`;
    if (clickedPositions.some(p => p.key === key)) return; // Already clicked

    const note = getNoteAt(stringIdx + 1, fret);
    const isCorrect = note.name === targetNote.name;

    const newPos = { stringIdx, fret, key, correct: isCorrect };
    const updated = [...clickedPositions, newPos];
    setClickedPositions(updated);

    if (findMode === 'one' && isCorrect) {
      // Found one — success!
      setRevealed(true);
      setStats(prev => ({ rounds: prev.rounds + 1, perfect: prev.perfect + 1 }));
      setTimeout(newRound, 1200);
    } else if (findMode === 'all') {
      // Check if all correct positions found
      const correctClicks = updated.filter(p => p.correct);
      if (correctClicks.length === allCorrectPositions.length) {
        const wrongClicks = updated.filter(p => !p.correct);
        setRevealed(true);
        setStats(prev => ({
          rounds: prev.rounds + 1,
          perfect: prev.perfect + (wrongClicks.length === 0 ? 1 : 0),
        }));
        setTimeout(newRound, 1500);
      }
    }

    if (!isCorrect) {
      // Wrong — brief feedback, don't end round
    }
  };

  const handleReveal = () => {
    setRevealed(true);
    setStats(prev => ({ rounds: prev.rounds + 1, perfect: prev.perfect }));
  };

  const correctFound = clickedPositions.filter(p => p.correct).length;
  const wrongCount = clickedPositions.filter(p => !p.correct).length;

  return (
    <div className="quiz-mode">
      {/* Options bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        <StringSelector selectedStrings={selectedStrings} setSelectedStrings={setSelectedStrings} />
        <NoteFilterSelector noteFilter={noteFilter} setNoteFilter={setNoteFilter} />
      </div>

      {/* Stats */}
      <div className="quiz-stats">
        <div className="stat-item">
          <span className="stat-value">{stats.perfect}/{stats.rounds}</span>
          <span className="stat-label">Perfect</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{correctFound}/{allCorrectPositions.length}</span>
          <span className="stat-label">Found</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ color: wrongCount > 0 ? '#e74c3c' : '#2ecc71' }}>{wrongCount}</span>
          <span className="stat-label">Mistakes</span>
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
        <button
          className={`quiz-mode-btn ${findMode === 'one' ? 'active' : ''}`}
          onClick={() => { setFindMode('one'); newRound(); }}
        >
          Find One
        </button>
        <button
          className={`quiz-mode-btn ${findMode === 'all' ? 'active' : ''}`}
          onClick={() => { setFindMode('all'); newRound(); }}
        >
          Find All
        </button>
      </div>

      {/* Target note */}
      <div className="find-note-target" style={{ '--note-color': targetNote.color }}>
        <div className="find-note-label">Find:</div>
        <div className="find-note-name" style={{ color: targetNote.color }}>
          {targetName}
        </div>
        {findMode === 'all' && (
          <div className="find-note-count">
            {correctFound} / {allCorrectPositions.length} positions
          </div>
        )}
      </div>

      {/* Interactive fretboard */}
      <div className="find-fretboard-wrap">
        <div className="find-fretboard" style={{
          display: 'grid',
          gridTemplateColumns: `44px repeat(${NUM_FRETS}, 1fr)`,
          gridTemplateRows: 'repeat(6, 34px)',
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
            top: 0, left: 44, right: 0, bottom: 0,
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
                  gap: isDouble ? '22%' : 0, height: '100%',
                }}>
                  <div style={{
                    width: 11, height: 11, borderRadius: '50%',
                    background: 'radial-gradient(circle at 40% 35%, #a1887f, #6d4c41)',
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.3)',
                  }} />
                  {isDouble && (
                    <div style={{
                      width: 11, height: 11, borderRadius: '50%',
                      background: 'radial-gradient(circle at 40% 35%, #a1887f, #6d4c41)',
                      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.3)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
          {[5, 4, 3, 2, 1, 0].map(stringIdx => {
            const isSelected = selectedStrings.includes(stringIdx);
            return (
              <React.Fragment key={stringIdx}>
                {/* String label */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: isSelected ? '#bcaaa4' : '#5d4037',
                  fontFamily: 'monospace', cursor: isSelected ? 'pointer' : 'default',
                }}
                  onClick={() => isSelected && handleFretClick(stringIdx, 0)}
                >
                  {GUITAR_STRINGS[stringIdx]}
                  {/* Open string click area */}
                  {(() => {
                    const clicked = clickedPositions.find(p => p.stringIdx === stringIdx && p.fret === 0);
                    const isRevealedCorrect = revealed && allCorrectPositions.some(p => p.string === stringIdx + 1 && p.fret === 0);
                    if (clicked) {
                      return (
                        <div style={{
                          position: 'absolute',
                          width: 22, height: 22, borderRadius: '50%',
                          background: clicked.correct ? '#2ecc71' : '#e74c3c',
                          opacity: 0.7,
                        }} />
                      );
                    }
                    if (isRevealedCorrect) {
                      return (
                        <div style={{
                          position: 'absolute',
                          width: 22, height: 22, borderRadius: '50%',
                          border: `2px dashed ${targetNote.color}`,
                          opacity: 0.5,
                        }} />
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Frets */}
                {[...Array(NUM_FRETS)].map((_, fIdx) => {
                  const fret = fIdx + 1;
                  const clicked = clickedPositions.find(p => p.stringIdx === stringIdx && p.fret === fret);
                  const isRevealedCorrect = revealed && allCorrectPositions.some(p => p.string === stringIdx + 1 && p.fret === fret);
                  const canClick = isSelected && !revealed && !clicked;

                  return (
                    <div
                      key={fret}
                      onClick={() => canClick && handleFretClick(stringIdx, fret)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderLeft: '2px solid #795548',
                        position: 'relative',
                        cursor: canClick ? 'pointer' : 'default',
                      }}
                    >
                      {/* String wire */}
                      <div style={{
                        position: 'absolute', width: '100%',
                        height: stringIdx < 3 ? 2 : 1,
                        background: stringIdx < 3
                          ? 'linear-gradient(90deg, #bdbdbd, #e0e0e0, #bdbdbd)'
                          : 'linear-gradient(90deg, #ffd54f, #ffecb3, #ffd54f)',
                        opacity: 0.5,
                      }} />

                      {/* Clicked dot */}
                      {clicked && (
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: clicked.correct ? '#2ecc71' : '#e74c3c',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800, color: '#fff', zIndex: 1,
                          boxShadow: `0 0 8px ${clicked.correct ? '#2ecc71' : '#e74c3c'}88`,
                        }}>
                          {clicked.correct ? '✓' : '✗'}
                        </div>
                      )}

                      {/* Revealed correct position (not yet found) */}
                      {!clicked && isRevealedCorrect && (
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          border: `2px dashed ${targetNote.color}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800, color: targetNote.color, zIndex: 1,
                          opacity: 0.7,
                        }}>
                          {targetName}
                        </div>
                      )}

                      {/* Hover hint for clickable cells */}
                      {canClick && !clicked && (
                        <div style={{
                          position: 'absolute',
                          width: 20, height: 20, borderRadius: '50%',
                          border: '1px dashed rgba(255,255,255,0.1)',
                          zIndex: 0,
                        }} />
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
          display: 'grid', gridTemplateColumns: `44px repeat(${NUM_FRETS}, 1fr)`,
          minWidth: 700, padding: '2px 4px 0',
        }}>
          <div />
          {[...Array(NUM_FRETS)].map((_, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 11, color: '#666', fontFamily: 'monospace' }}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="quiz-actions">
        {!revealed && (
          <button className="quiz-action-btn" onClick={handleReveal}>
            👁 Reveal All
          </button>
        )}
        <button className="quiz-action-btn" onClick={newRound}>
          Next Note →
        </button>
        <button className="quiz-action-btn" onClick={() => setStats({ rounds: 0, perfect: 0 })}>
          Reset Stats
        </button>
      </div>
    </div>
  );
}
