import React, { useState } from 'react'

const s = {
  wrapper: { border: '1px solid #e8ecf4', borderRadius: 10, marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 18px', background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f2fb 100%)',
    cursor: 'pointer', userSelect: 'none', fontWeight: 700, fontSize: 13,
    color: '#1a1a2e', letterSpacing: '0.01em', borderBottom: '1px solid #e8ecf4'
  },
  chevron: { fontSize: 10, color: '#4f46e5', fontWeight: 900 },
  body: { padding: '18px 18px', background: '#fff' }
}

export default function ExpanderSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={s.wrapper}>
      <div style={s.header} onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span style={s.chevron}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div style={s.body}>{children}</div>}
    </div>
  )
}
