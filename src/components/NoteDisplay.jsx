import React from 'react';
import { getNoteDisplayName } from '../data/notes';

/**
 * Displays a note name as a large alphabet character with its assigned color.
 */
export default function NoteDisplay({ note, size = 160, noteFilter = 'all' }) {
  if (!note) return null;

  const displayName = getNoteDisplayName(note, noteFilter);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}>
      <div
        style={{
          fontSize: size,
          fontWeight: 900,
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          color: note.color,
          textShadow: `0 0 40px ${note.color}44, 0 4px 8px rgba(0,0,0,0.3)`,
          lineHeight: 1,
          userSelect: 'none',
          transition: 'all 0.25s ease',
        }}
      >
        {displayName}
      </div>
    </div>
  );
}
