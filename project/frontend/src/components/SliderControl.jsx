import React from 'react'

const s = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#4a5568' },
  row: { display: 'flex', alignItems: 'center', gap: 14 },
  input: { flex: 1, accentColor: '#4f46e5', height: 4, cursor: 'pointer' },
  value: { fontSize: 14, minWidth: 36, textAlign: 'center', color: '#fff', fontWeight: 700, background: '#4f46e5', borderRadius: 6, padding: '2px 8px' }
}

export default function SliderControl({ label, min, max, step = 1, value, onChange }) {
  return (
    <div style={s.wrapper}>
      {label && <span style={s.label}>{label}</span>}
      <div style={s.row}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))} style={s.input} />
        <span style={s.value}>{value}</span>
      </div>
    </div>
  )
}
