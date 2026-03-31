import React, { useState, useCallback } from 'react'

const BASE_COL_WIDTH = 140

const s = {
  wrapper: { overflowX: 'auto', overflowY: 'auto', width: '100%' },
  table: { borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' },
  th: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff', padding: '10px 10px', textAlign: 'left',
    borderBottom: '2px solid #0f3460', whiteSpace: 'nowrap',
    fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase',
    position: 'sticky', top: 0, zIndex: 1, overflow: 'hidden', userSelect: 'none'
  },
  thInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  resizeHandle: { width: 4, cursor: 'col-resize', background: '#0f3460', borderRadius: 2, flexShrink: 0, alignSelf: 'stretch', minHeight: 16, transition: 'background 0.15s' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f0f2f8', whiteSpace: 'nowrap', fontSize: 13, color: '#2d3748', overflow: 'hidden', textOverflow: 'ellipsis' },
  trEven: { background: '#fafbff' },
  trOdd: { background: '#ffffff' },
  trSelected: { background: '#e8f0fe', outline: '2px solid #4f46e5' },
  trClickable: { cursor: 'pointer' }
}

export default function DataTable({ data, selectedRow, onRowClick, cellStyle, maxHeight, colWidthMap }) {
  const [colWidths, setColWidths] = useState(colWidthMap || {})

  const startResize = useCallback((col, e) => {
    e.preventDefault()
    const startX = e.clientX
    const effectiveW = { ...(colWidthMap || {}), ...colWidths }
    const startW = effectiveW[col] || BASE_COL_WIDTH
    const onMove = (me) => {
      const newW = Math.max(60, startW + me.clientX - startX)
      setColWidths(prev => ({ ...prev, [col]: newW }))
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [colWidths, colWidthMap])

  if (!data || data.length === 0) return (
    <p style={{ color: '#a0aec0', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>No data available</p>
  )

  const cols = Object.keys(data[0])
  // Merge colWidthMap (prop) with user drag overrides (state)
  const effectiveWidths = { ...(colWidthMap || {}), ...colWidths }
  const hasCustomWidths = cols.some(c => effectiveWidths[c])
  const tableWidth = hasCustomWidths
    ? cols.reduce((sum, c) => sum + (effectiveWidths[c] || BASE_COL_WIDTH), 0)
    : '100%'

  return (
    <div style={{ ...s.wrapper, maxHeight: maxHeight || 'none', display: 'block', width: '100%' }}>
      <table style={{ ...s.table, width: tableWidth, minWidth: '100%' }}>
        <colgroup>
          {cols.map(c => (
            <col key={c} style={effectiveWidths[c] ? { width: effectiveWidths[c] } : {}} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ ...s.th, ...(effectiveWidths[c] ? { width: effectiveWidths[c] } : {}) }}>
                <div style={s.thInner}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</span>
                  <span style={s.resizeHandle} onMouseDown={e => startResize(c, e)}
                    onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
                    onMouseLeave={e => e.currentTarget.style.background = '#0f3460'} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const baseStyle = selectedRow === i ? s.trSelected : i % 2 === 0 ? s.trEven : s.trOdd
            return (
              <tr key={i} style={{ ...baseStyle, ...(onRowClick ? s.trClickable : {}) }}
                onClick={() => onRowClick && onRowClick(i, row)}
                onMouseEnter={e => { if (selectedRow !== i) e.currentTarget.style.background = '#eef2ff' }}
                onMouseLeave={e => { if (selectedRow !== i) e.currentTarget.style.background = i % 2 === 0 ? '#fafbff' : '#ffffff' }}>
                {cols.map(c => {
                  const extra = cellStyle ? cellStyle(c, row[c]) : {}
                  return <td key={c} style={{ ...s.td, ...extra }}>{row[c]}</td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
