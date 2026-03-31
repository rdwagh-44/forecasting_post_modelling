import React from 'react'
import { uploadDataset, uploadElasticity, uploadGrowth } from '../api/client'

const s = {
  sidebar: { width: 270, minHeight: '100vh', background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)', color: '#eee', padding: '28px 18px', display: 'flex', flexDirection: 'column', gap: 28, boxShadow: '2px 0 12px rgba(0,0,0,0.15)' },
  logo: { fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.3 },
  logoSub: { fontSize: 11, color: '#6b7db3', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' },
  divider: { height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' },
  label: { fontSize: 11, color: '#8892b0', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 },
  badge: { fontSize: 11, padding: '3px 10px', borderRadius: 12, marginTop: 6, display: 'inline-block', fontWeight: 600 },
  success: { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' },
  info: { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' },
  fileInput: { width: '100%', fontSize: 12, color: '#94a3b8', cursor: 'pointer' },
  sectionLabel: { fontSize: 12, color: '#6b7db3', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }
}

function FileUploader({ label, onUpload, status }) {
  const handleChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try { await onUpload(file) } catch (err) { console.error(err) }
  }
  return (
    <div>
      <label style={s.label}>{label}</label>
      <input type="file" accept=".csv,.xlsx" onChange={handleChange} style={s.fileInput} />
      {status && <span style={{ ...s.badge, ...(status.type === 'success' ? s.success : s.info) }}>{status.msg}</span>}
    </div>
  )
}

export default function Sidebar({ fileStatuses, setFileStatuses, onClose }) {
  const handle = (uploadFn, key) => async (file) => {
    await uploadFn(file)
    setFileStatuses(prev => ({ ...prev, [key]: { type: 'success', msg: 'Custom file uploaded' } }))
  }

  return (
    <aside style={s.sidebar}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={s.logo}>📊 Post-Modeling</div>
          <div style={s.logoSub}>Analysis Dashboard</div>
        </div>
        <button onClick={onClose} title="Close sidebar"
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#8892b0', cursor: 'pointer', fontSize: 13, padding: '3px 8px', lineHeight: 1, marginTop: 2 }}>✕</button>
      </div>
      <div style={s.divider} />
      <div style={s.sectionLabel}>Data Sources</div>
      <FileUploader label="Modeling Dataset" onUpload={handle(uploadDataset, 'dataset')} status={fileStatuses.dataset} />
      <FileUploader label="Elasticity File" onUpload={handle(uploadElasticity, 'elasticity')} status={fileStatuses.elasticity} />
      <FileUploader label="Growth Rate File" onUpload={handle(uploadGrowth, 'growth')} status={fileStatuses.growth} />
    </aside>
  )
}
