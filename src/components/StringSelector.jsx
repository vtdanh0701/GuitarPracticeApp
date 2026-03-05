import React from 'react';

const STRING_LABELS = ['6 (E)', '5 (A)', '4 (D)', '3 (G)', '2 (B)', '1 (E)'];

/**
 * Compact inline string toggle selector for quiz modes.
 * Always requires at least one string selected.
 */
export default function StringSelector({ selectedStrings, setSelectedStrings }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
      <span style={{ fontSize: 12, color: '#999', fontWeight: 600 }}>Strings:</span>
      {STRING_LABELS.map((label, idx) => {
        const isSelected = selectedStrings.includes(idx);
        return (
          <button
            key={idx}
            onClick={() => {
              if (isSelected && selectedStrings.length > 1) {
                setSelectedStrings(selectedStrings.filter(s => s !== idx));
              } else if (!isSelected) {
                setSelectedStrings([...selectedStrings, idx].sort((a, b) => a - b));
              }
            }}
            style={{
              padding: '3px 7px',
              borderRadius: 5,
              border: isSelected ? '1.5px solid #3498db' : '1.5px solid rgba(255,255,255,0.12)',
              background: isSelected ? '#3498db22' : 'rgba(255,255,255,0.04)',
              color: isSelected ? '#3498db' : '#666',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'all 0.15s',
              minWidth: 40,
            }}
          >
            {label}
          </button>
        );
      })}
      <button
        onClick={() => setSelectedStrings([0, 1, 2, 3, 4, 5])}
        style={{
          fontSize: 10, color: '#555', background: 'none', border: 'none',
          cursor: 'pointer', padding: '2px 4px', textDecoration: 'underline',
        }}
      >
        All
      </button>
    </div>
  );
}
