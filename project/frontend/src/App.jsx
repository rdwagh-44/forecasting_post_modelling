import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [fileStatuses, setFileStatuses] = useState({
    dataset: { type: 'info', msg: 'Using default dataset' },
    elasticity: { type: 'info', msg: 'Using default elasticity' },
    growth: { type: 'info', msg: 'Using default growth file' }
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6fb' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 270 : 0,
        minWidth: sidebarOpen ? 270 : 0,
        overflow: 'hidden',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        flexShrink: 0
      }}>
        {sidebarOpen && (
          <Sidebar
            fileStatuses={fileStatuses}
            setFileStatuses={setFileStatuses}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {/* Toggle button — always visible */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          style={{
            position: 'fixed', top: 16, left: sidebarOpen ? 278 : 12,
            zIndex: 200, background: '#4f46e5', border: 'none',
            borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff', fontWeight: 900,
            boxShadow: '0 2px 8px rgba(79,70,229,0.4)',
            transition: 'left 0.25s ease'
          }}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
        <Dashboard />
      </main>
    </div>
  )
}
