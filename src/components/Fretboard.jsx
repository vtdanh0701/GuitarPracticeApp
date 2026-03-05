import React from 'react';
import { ALL_NOTES, GUITAR_STRINGS, OPEN_STRING_INDICES, NUM_FRETS, getNoteAt, getFretPositions, getNoteDisplayName } from '../data/notes';

const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15];
const DOUBLE_DOT_FRETS = [12];

/**
 * Interactive guitar fretboard that highlights positions of the current note
 */
export default function Fretboard({ currentNote, numFrets = NUM_FRETS, selectedStrings = [0,1,2,3,4,5], noteFilter = 'all' }) {
  const activePositions = currentNote ? getFretPositions(currentNote.name) : [];

  const isActive = (stringNum, fret) => {
    // Only highlight notes on selected strings
    if (!selectedStrings.includes(stringNum - 1)) return false;
    return activePositions.some(p => p.string === stringNum && p.fret === fret);
  };

  return (
    <div style={{
      overflowX: 'auto',
      padding: '12px 0',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `var(--fb-label) repeat(${numFrets}, 1fr)`,
        gridTemplateRows: `repeat(6, var(--fb-row))`,
        gap: 0,
        position: 'relative',
        background: 'linear-gradient(180deg, #3e2723 0%, #4e342e 100%)',
        borderRadius: 8,
        padding: '8px 4px',
        border: '2px solid #5d4037',
      }}>
        {/* Fret marker dots — overlaid on fretboard */}
        <div style={{
          position: 'absolute',
          top: 0, left: 'var(--fb-label)', right: 0, bottom: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${numFrets}, 1fr)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}>
          {[...Array(numFrets)].map((_, i) => {
            const fret = i + 1;
            const isSingle = SINGLE_DOT_FRETS.includes(fret);
            const isDouble = DOUBLE_DOT_FRETS.includes(fret);
            if (!isSingle && !isDouble) return <div key={i} />;
            return (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: isDouble ? '24%' : 0,
                height: '100%',
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

        {/* Strings and frets - reversed so 6th string (low E) is at bottom */}
        {[5, 4, 3, 2, 1, 0].map((stringIdx) => (
          <React.Fragment key={`string-${stringIdx}`}>
            {/* String label (open) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              color: isActive(stringIdx + 1, 0) ? currentNote.color : '#bcaaa4',
              background: isActive(stringIdx + 1, 0) ? `${currentNote.color}20` : 'transparent',
              borderRadius: 4,
              fontFamily: 'monospace',
              position: 'relative',
            }}>
              {GUITAR_STRINGS[stringIdx]}
              {isActive(stringIdx + 1, 0) && (
                <div style={{
                  position: 'absolute',
                  width: 'var(--fb-dot)',
                  height: 'var(--fb-dot)',
                  borderRadius: '50%',
                  border: `2px solid ${currentNote.color}`,
                  opacity: 0.6,
                }} />
              )}
            </div>

            {/* Frets */}
            {[...Array(numFrets)].map((_, fretIdx) => {
              const fret = fretIdx + 1;
              const active = isActive(stringIdx + 1, fret);
              const noteAtPos = getNoteAt(stringIdx + 1, fret);

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
                    opacity: active ? 0.4 : 0.6,
                  }} />

                  {/* Note dot */}
                  {active && (
                    <div style={{
                      width: 'var(--fb-dot)',
                      height: 'var(--fb-dot)',
                      borderRadius: '50%',
                      background: currentNote.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--fb-dot-font)',
                      fontWeight: 800,
                      color: '#fff',
                      zIndex: 1,
                      boxShadow: `0 0 8px ${currentNote.color}88`,
                      transition: 'all 0.2s ease',
                    }}>
                      {getNoteDisplayName(currentNote, noteFilter)}
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Fret numbers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `var(--fb-label) repeat(${numFrets}, 1fr)`,
        padding: '2px 4px 0',
      }}>
        <div />
        {[...Array(numFrets)].map((_, i) => (
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
  );
}
