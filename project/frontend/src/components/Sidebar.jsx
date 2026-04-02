import React from 'react'

const s = {
  sidebar: {
    width: 270, minHeight: '100vh',
    background: 'linear-gradient(180deg, #333333 0%, #444444 100%)',
    color: '#fff', padding: '28px 18px', display: 'flex', flexDirection: 'column', gap: 20,
    boxShadow: '2px 0 12px rgba(0,0,0,0.15)'
  },
  logo: { fontSize: 20, fontWeight: 800, color: '#FFBD59', letterSpacing: '-0.3px', lineHeight: 1.3 },
  logoSub: { fontSize: 11, color: '#999999', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' },
  divider: { height: 1, background: 'rgba(255,189,89,0.25)', margin: '4px 0' },
}

export default function Sidebar({ onClose }) {
  return (
    <aside style={s.sidebar}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={s.logo}>📊 Post-Modeling</div>
          <div style={s.logoSub}>Analysis Dashboard</div>
        </div>
        <button onClick={onClose} title="Close sidebar"
          style={{ background: 'transparent', border: '1px solid rgba(255,189,89,0.3)', borderRadius: 6, color: '#FFBD59', cursor: 'pointer', fontSize: 13, padding: '3px 8px', lineHeight: 1, marginTop: 2 }}>✕</button>
      </div>
      <div style={s.divider} />
    </aside>
  )
}
