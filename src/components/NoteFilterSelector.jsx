import React from 'react';

const NOTE_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'natural', label: 'Natural' },
  { value: 'sharp', label: '♯ Sharp' },
  { value: 'flat', label: '♭ Flat' },
];

/**
 * Compact inline note filter selector for quiz modes.
 */
export default function NoteFilterSelector({ noteFilter, setNoteFilter }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
      <span style={{ fontSize: 12, color: '#999', fontWeight: 600 }}>Notes:</span>
      {NOTE_FILTER_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => setNoteFilter(opt.value)}
          style={{
            padding: '3px 8px',
            borderRadius: 5,
            border: noteFilter === opt.value ? '1.5px solid #e67e22' : '1.5px solid rgba(255,255,255,0.12)',
            background: noteFilter === opt.value ? '#e67e2222' : 'rgba(255,255,255,0.04)',
            color: noteFilter === opt.value ? '#e67e22' : '#666',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
