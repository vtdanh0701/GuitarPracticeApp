import React from 'react';

/**
 * Metronome controls: BPM slider, play/stop, visual beat indicator
 */
export default function MetronomeControls({ bpm, setBpm, isPlaying, toggle, beat }) {
  // beat is 1-based: 1=first accent, 2, 3, 4, 5=second accent, etc.
  const beatInMeasure = beat > 0 ? ((beat - 1) % 4) : -1;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      padding: '16px 20px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#aaa',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
      }}>
        Metronome
      </div>

      {/* Beat visualization */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: isPlaying && beatInMeasure === i
                ? (i === 0 ? '#e74c3c' : '#3498db')
                : 'rgba(255,255,255,0.1)',
              border: `2px solid ${i === 0 ? '#e74c3c44' : '#3498db44'}`,
              transition: 'background 0.08s',
            }}
          />
        ))}
      </div>

      {/* BPM display */}
      <div style={{
        fontSize: 36,
        fontWeight: 800,
        color: '#fff',
        fontVariantNumeric: 'tabular-nums',
        fontFamily: "'Inter', monospace",
      }}>
        {bpm}
        <span style={{ fontSize: 14, fontWeight: 400, color: '#888', marginLeft: 6 }}>BPM</span>
      </div>

      {/* BPM slider */}
      <input
        type="range"
        min={30}
        max={240}
        value={bpm}
        onChange={e => setBpm(Number(e.target.value))}
        style={{
          width: '100%',
          maxWidth: 240,
          accentColor: '#3498db',
          cursor: 'pointer',
        }}
      />

      {/* Quick BPM buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[60, 80, 100, 120].map(v => (
          <button
            key={v}
            onClick={() => setBpm(v)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: bpm === v ? '1px solid #3498db' : '1px solid rgba(255,255,255,0.15)',
              background: bpm === v ? '#3498db22' : 'rgba(255,255,255,0.05)',
              color: bpm === v ? '#3498db' : '#999',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Play/Stop button */}
      <button
        onClick={toggle}
        style={{
          padding: '10px 32px',
          borderRadius: 8,
          border: 'none',
          background: isPlaying ? '#e74c3c' : '#2ecc71',
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: 0.5,
          transition: 'all 0.15s',
          minWidth: 120,
        }}
      >
        {isPlaying ? '⏹ Stop' : '▶ Start'}
      </button>
    </div>
  );
}
