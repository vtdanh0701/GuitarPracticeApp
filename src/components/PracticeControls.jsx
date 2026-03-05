import React from 'react';

/**
 * Practice settings: note count, auto-switch toggle, auto-switch duration
 */
const STRING_LABELS = ['6 (E)', '5 (A)', '4 (D)', '3 (G)', '2 (B)', '1 (E)'];
const NOTE_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'natural', label: 'Natural' },
  { value: 'sharp', label: 'Sharps (♯)' },
  { value: 'flat', label: 'Flats (♭)' },
];

export default function PracticeControls({
  noteCount,
  setNoteCount,
  noteFilter,
  setNoteFilter,
  selectedStrings,
  setSelectedStrings,
  autoSwitch,
  setAutoSwitch,
  switchDuration,
  setSwitchDuration,
  autoShuffle,
  setAutoShuffle,
  shuffleAfterCycles,
  setShuffleAfterCycles,
  voiceEnabled,
  setVoiceEnabled,
  onShuffle,
  onNext,
  currentIndex,
  totalNotes,
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
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
        Practice Settings
      </div>

      {/* Note count selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 13, color: '#ccc', minWidth: 100 }}>Notes to practice:</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setNoteCount(Math.max(1, noteCount - 1))}
            style={stepBtnStyle}
          >
            −
          </button>
          <span style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
            minWidth: 30,
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {noteCount}
          </span>
          <button
            onClick={() => setNoteCount(Math.min(12, noteCount + 1))}
            style={stepBtnStyle}
          >
            +
          </button>
        </div>
      </div>

      {/* Note filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#ccc' }}>Note types:</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {NOTE_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setNoteFilter(opt.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: noteFilter === opt.value ? '1.5px solid #9b59b6' : '1.5px solid rgba(255,255,255,0.12)',
                background: noteFilter === opt.value ? '#9b59b622' : 'rgba(255,255,255,0.04)',
                color: noteFilter === opt.value ? '#9b59b6' : '#888',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* String selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 13, color: '#ccc' }}>Strings to show:</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: isSelected ? '1.5px solid #3498db' : '1.5px solid rgba(255,255,255,0.12)',
                  background: isSelected ? '#3498db22' : 'rgba(255,255,255,0.04)',
                  color: isSelected ? '#3498db' : '#888',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  transition: 'all 0.15s',
                  minWidth: 44,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setSelectedStrings([0, 1, 2, 3, 4, 5])}
          style={{ fontSize: 11, color: '#666', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
        >
          Select all
        </button>
      </div>

      {/* Auto switch toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 13, color: '#ccc', minWidth: 100 }}>Auto switch:</label>
        <button
          onClick={() => setAutoSwitch(!autoSwitch)}
          style={toggleStyle(autoSwitch)}
        >
          <div style={toggleKnobStyle(autoSwitch)} />
        </button>
      </div>

      {/* Switch duration (in beats) */}
      {autoSwitch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, color: '#ccc', minWidth: 100 }}>Duration (beats):</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setSwitchDuration(Math.max(1, switchDuration - 1))}
              style={stepBtnStyle}
            >
              −
            </button>
            <span style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              minWidth: 30,
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {switchDuration}
            </span>
            <button
              onClick={() => setSwitchDuration(Math.min(32, switchDuration + 1))}
              style={stepBtnStyle}
            >
              +
            </button>
          </div>
          <span style={{ fontSize: 11, color: '#888' }}>beats per note</span>
        </div>
      )}

      {/* Auto shuffle toggle */}
      {autoSwitch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, color: '#ccc', minWidth: 100 }}>Auto shuffle:</label>
          <button
            onClick={() => setAutoShuffle(!autoShuffle)}
            style={toggleStyle(autoShuffle)}
          >
            <div style={toggleKnobStyle(autoShuffle)} />
          </button>
        </div>
      )}

      {/* Shuffle after N cycles */}
      {autoSwitch && autoShuffle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, color: '#ccc', minWidth: 100 }}>Shuffle after:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setShuffleAfterCycles(Math.max(1, shuffleAfterCycles - 1))}
              style={stepBtnStyle}
            >
              −
            </button>
            <span style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              minWidth: 30,
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {shuffleAfterCycles}
            </span>
            <button
              onClick={() => setShuffleAfterCycles(Math.min(10, shuffleAfterCycles + 1))}
              style={stepBtnStyle}
            >
              +
            </button>
          </div>
          <span style={{ fontSize: 11, color: '#888' }}>{shuffleAfterCycles === 1 ? 'cycle' : 'cycles'}</span>
        </div>
      )}

      {/* Navigation */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginTop: 4,
      }}>
        <button onClick={onShuffle} style={actionBtnStyle}>
          🔀 Shuffle
        </button>
        <button onClick={onNext} style={actionBtnStyle}>
          ⏭ Next
        </button>
        <div style={{
          marginLeft: 'auto',
          fontSize: 13,
          color: '#888',
          display: 'flex',
          alignItems: 'center',
        }}>
          {currentIndex + 1} / {totalNotes}
        </div>
      </div>

      {/* Voice announcement toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 13, color: '#ccc', minWidth: 100 }}>Voice callout:</label>
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          style={toggleStyle(voiceEnabled)}
        >
          <div style={toggleKnobStyle(voiceEnabled)} />
        </button>
        <span style={{ fontSize: 11, color: '#888' }}>{voiceEnabled ? '🔊 On' : '🔇 Off'}</span>
      </div>
    </div>
  );
}

const stepBtnStyle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  fontSize: 18,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
};

const toggleStyle = (active) => ({
  width: 48,
  height: 26,
  borderRadius: 13,
  border: 'none',
  background: active ? '#2ecc71' : 'rgba(255,255,255,0.15)',
  cursor: 'pointer',
  position: 'relative',
  transition: 'background 0.2s',
  padding: 0,
});

const toggleKnobStyle = (active) => ({
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: '#fff',
  position: 'absolute',
  top: 3,
  left: active ? 25 : 3,
  transition: 'left 0.2s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
});

const actionBtnStyle = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.06)',
  color: '#ccc',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
};
