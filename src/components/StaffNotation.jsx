import React from 'react';
import { getNoteDisplayName } from '../data/notes';

/**
 * Renders a note on a treble clef staff using SVG.
 * Maps C4-B4 onto a 5-line staff with ledger lines as needed.
 */

// Note positions on the staff (semitones from middle C, measured in half-staff-spaces from bottom line E4)
// Bottom line = E4, each line/space is a step in the diatonic scale
const STAFF_POSITIONS = {
  'C':  -2,  // 2 below bottom line (ledger line)
  'C#': -2,
  'D':  -1,  // 1 below bottom line (space)
  'D#': -1,
  'E':   0,  // bottom line
  'F':   1,  // first space
  'F#':  1,
  'G':   2,  // second line
  'G#':  2,
  'A':   3,  // second space
  'A#':  3,
  'B':   4,  // middle line
};

const STAFF_WIDTH = 260;
const STAFF_HEIGHT = 160;
const LINE_SPACING = 14;
const TOP_MARGIN = 40;

function getYPosition(noteName) {
  const pos = STAFF_POSITIONS[noteName] ?? 0;
  // Bottom line (E) is at y = TOP_MARGIN + 4 * LINE_SPACING
  // Each position step moves up by half a LINE_SPACING
  return TOP_MARGIN + 4 * LINE_SPACING - pos * (LINE_SPACING / 2);
}

function isSharp(noteName) {
  return noteName.includes('#');
}

function isFlat(displayName) {
  return displayName.includes('b') && displayName.length === 2;
}

export default function StaffNotation({ note, noteFilter = 'all' }) {
  if (!note) return null;

  const displayName = getNoteDisplayName(note, noteFilter);
  const noteY = getYPosition(note.name);
  const noteX = 160;
  const noteRadius = 7;

  // Check if we need ledger lines (for C and D below the staff)
  const needsLedgerBelow = STAFF_POSITIONS[note.name] < 0;
  const ledgerLines = [];
  if (needsLedgerBelow) {
    // Ledger line for C (one full step below bottom line)
    const ledgerY = TOP_MARGIN + 4 * LINE_SPACING + LINE_SPACING;
    ledgerLines.push(ledgerY);
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      padding: '8px 0',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <svg width={STAFF_WIDTH} height={STAFF_HEIGHT} viewBox={`0 0 ${STAFF_WIDTH} ${STAFF_HEIGHT}`}>
        {/* Staff lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <line
            key={i}
            x1={30}
            y1={TOP_MARGIN + i * LINE_SPACING}
            x2={STAFF_WIDTH - 20}
            y2={TOP_MARGIN + i * LINE_SPACING}
            stroke="#666"
            strokeWidth={1.5}
          />
        ))}

        {/* Treble clef symbol */}
        <text
          x={36}
          y={TOP_MARGIN + 4 * LINE_SPACING - 4}
          fontSize={52}
          fill="#999"
          fontFamily="serif"
        >
          𝄞
        </text>

        {/* Ledger lines */}
        {ledgerLines.map((y, i) => (
          <line
            key={`ledger-${i}`}
            x1={noteX - 16}
            y1={y}
            x2={noteX + 16}
            y2={y}
            stroke="#666"
            strokeWidth={1.5}
          />
        ))}

        {/* Note head (filled ellipse) */}
        <ellipse
          cx={noteX}
          cy={noteY}
          rx={noteRadius}
          ry={noteRadius * 0.75}
          fill={note.color}
          transform={`rotate(-15, ${noteX}, ${noteY})`}
        />

        {/* Stem */}
        <line
          x1={noteX + noteRadius - 1}
          y1={noteY}
          x2={noteX + noteRadius - 1}
          y2={noteY - 35}
          stroke={note.color}
          strokeWidth={2}
        />

        {/* Accidental symbol if needed */}
        {noteFilter === 'flat' && isFlat(displayName) && (
          <text
            x={noteX - 20}
            y={noteY + 6}
            fontSize={20}
            fill={note.color}
            fontWeight="bold"
          >
            ♭
          </text>
        )}
        {noteFilter !== 'flat' && isSharp(note.name) && (
          <text
            x={noteX - 20}
            y={noteY + 5}
            fontSize={18}
            fill={note.color}
            fontWeight="bold"
          >
            ♯
          </text>
        )}
      </svg>
    </div>
  );
}
