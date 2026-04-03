import React, { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, LineChart,
  Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, Cell
} from 'recharts'
import { displayVar } from '../api/variableLabels'

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

const AXIS_STYLE = { fontSize: 11, fill: '#718096' }
const GRID_COLOR = '#f0f2f8'

// ── Custom Tooltip ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Waterfall bar chart using Recharts Bar ────────────────────
const cleanLabel = (s) => displayVar(s.replace(/^(Res_|Lag_|lag_)/g, '').replace(/\bA(\d+)\b/g, 'FY$1').trim())
function WaterfallChart({ data, height }) {
  // data: array of { Label, Type, DisplayValue, LabelText }
  // Build running base for stacked invisible bar
  const chartData = useMemo(() => {
    let running = 0
    return data.map(d => {
      const val = (d.DisplayValue || 0) * 150
      let base = 0
      let bar = 0
      if (d.Type === 'start') {
        base = 0; bar = val; running = val
      } else if (d.Type === 'end') {
        base = 0; bar = running
      } else {
        base = val >= 0 ? running : running + val
        bar = Math.abs(val)
        running += val
      }
      return {
        label: cleanLabel(d.Label),
        type: d.Type,
        base,
        bar,
        rawVal: val,
        labelText: d.LabelText,
        color: d.Type === 'start' ? '#1f77b4' : d.Type === 'end' ? '#1f77b4' : val >= 0 ? '#2ca02c' : '#d62728'
      }
    })
  }, [data])

  return (
    <ResponsiveContainer width="100%" height={height || 500}>
      <ComposedChart data={chartData} margin={{ top: 30, right: 30, bottom: 60, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="label" tick={AXIS_STYLE} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ ...AXIS_STYLE, fill: 'transparent' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {/* Invisible base bar */}
        <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
        {/* Visible value bar with custom label */}
        <Bar dataKey="bar" stackId="wf" isAnimationActive={false}
          label={(props) => {
            const { x, y, width, value, index } = props
            const d = chartData[index]
            if (!d?.labelText) return null
            return (
              <text
                x={x + width / 2} y={y - 6}
                textAnchor="middle" fontSize={11}
                fill={d.color} fontWeight={600}
              >
                {d.labelText}
              </text>
            )
          }}>
          {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── Main ChartPanel ───────────────────────────────────────────
export default function ChartPanel({ data, layout, style, onCellClick }) {
  const height = layout?.height || 350
  const titleText = typeof layout?.title === 'string' ? layout.title : layout?.title?.text || ''

  if (!data || data.length === 0) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0', fontSize: 13 }}>
      No chart data
    </div>
  )

  // Waterfall
  if (data[0]?.type === 'waterfall') {
    return (
      <div style={{ width: '100%', ...style }}>
        {titleText && <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 8, paddingLeft: 4 }}>{titleText}</div>}
        <WaterfallChart data={data[0]._rawData || []} height={height} />
      </div>
    )
  }

  // Heatmap
  if (data[0]?.type === 'heatmap') {
    const hm = data[0]
    const labels = hm.x || []
    const z = hm.z || []
    const n = labels.length

    // Use a ref to measure container width and fill it
    const [containerW, setContainerW] = React.useState(600)
    const containerRef = React.useRef(null)
    React.useEffect(() => {
      if (!containerRef.current) return
      const obs = new ResizeObserver(entries => {
        setContainerW(entries[0].contentRect.width || 600)
      })
      obs.observe(containerRef.current)
      return () => obs.disconnect()
    }, [])

    const labelW = Math.min(180, Math.max(80, containerW * 0.22))
    const gridW = containerW - labelW - 20
    const cellSize = n > 0 ? Math.floor(gridW / n) : 40
    const labelH = labelW  // rotated labels need same space
    const totalH = labelH + n * cellSize + 10

    const cellColor = (v) => {
      if (v == null) return '#f0f0f0'
      if (v >= 0) {
        const g = Math.round(65 + (193 - 65) * v)
        const rb = Math.round(255 - 190 * v)
        return `rgb(${rb},${g},${rb})`
      }
      const r = Math.round(229 + (255 - 229) * (-v))
      const gb = Math.round(255 - 193 * (-v))
      return `rgb(${r},${gb},${gb})`
    }

    return (
      <div ref={containerRef} style={{ width: '100%', overflowX: 'hidden', ...style }}>
        {titleText && <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>{titleText}</div>}
        <svg width={containerW} height={totalH}>
          {/* Y labels */}
          {labels.map((lbl, i) => (
            <text key={`yl${i}`} x={labelW - 6} y={labelH + i * cellSize + cellSize / 2 + 4}
              textAnchor="end" fontSize={Math.max(9, Math.min(12, cellSize * 0.28))} fill="#333">{lbl}</text>
          ))}
          {/* X labels — rotated */}
          {labels.map((lbl, i) => (
            <text key={`xl${i}`} x={labelW + i * cellSize + cellSize / 2} y={labelH - 6}
              textAnchor="start" fontSize={Math.max(9, Math.min(12, cellSize * 0.28))} fill="#333"
              transform={`rotate(-45, ${labelW + i * cellSize + cellSize / 2}, ${labelH - 6})`}>{lbl}</text>
          ))}
          {/* Cells */}
          {z.map((row, ri) => row.map((val, ci) => {
            // Font size: scales with cell, capped between 9 and 14px
            const fs = Math.max(9, Math.min(14, cellSize * 0.32))
            // Text color: white on dark green/red, dark on light cells
            const textColor = Math.abs(val ?? 0) > 0.4 ? '#ffffff' : '#1a1a2e'
            return (
              <g key={`${ri}-${ci}`}
                onClick={() => onCellClick && onCellClick({ rowLabel: labels[ri], colLabel: labels[ci], rowIdx: ri, colIdx: ci, value: val })}
                style={{ cursor: onCellClick ? 'pointer' : 'default' }}>
                <rect x={labelW + ci * cellSize} y={labelH + ri * cellSize}
                  width={cellSize} height={cellSize}
                  fill={cellColor(val)} stroke="#fff" strokeWidth={1} />
                {val != null && (
                  <text x={labelW + ci * cellSize + cellSize / 2}
                    y={labelH + ri * cellSize + cellSize / 2 + fs * 0.35}
                    textAnchor="middle" fontSize={fs} fontWeight="600"
                    fill={textColor}>
                    {val.toFixed(2)}
                  </text>
                )}
              </g>
            )
          }))}
        </svg>
      </div>
    )
  }

  // Horizontal bar chart
  if (data[0]?.type === 'bar' && data[0]?.orientation === 'h') {
    const barData = data[0]
    const chartH = layout?.height || 400
    const marginL = layout?.margin?.l || 160
    const items = (barData.y || []).map((label, i) => ({
      label, value: (barData.x || [])[i] ?? 0,
      color: Array.isArray(barData.marker?.color) ? barData.marker.color[i] : (barData.marker?.color || '#41C185')
    }))
    return (
      <div style={{ width: '100%', ...style }}>
        {titleText && <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 8, paddingLeft: 4 }}>{titleText}</div>}
        <ResponsiveContainer width="100%" height={chartH}>
          <ComposedChart layout="vertical" data={items} margin={{ top: 10, right: 40, bottom: 30, left: marginL }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
            <XAxis type="number" domain={layout?.xaxis?.range || [-1, 1]} tick={AXIS_STYLE}
              label={layout?.xaxis?.title?.text ? { value: layout.xaxis.title.text, position: 'insideBottom', offset: -10, fontSize: 12, fill: '#666666' } : undefined} />
            <YAxis type="category" dataKey="label" tick={{ ...AXIS_STYLE, fontSize: 11 }} width={marginL - 10} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="#999999" strokeWidth={1} />
            <Bar dataKey="value" isAnimationActive={false} name={barData.name || 'Value'}>
              {items.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const toFY = (s) => typeof s === 'string' ? s.replace(/\bA(\d+)\b/g, 'FY$1') : s

  // Build unified x-axis from all traces
  const allX = [...new Set(data.flatMap(t => t.x || []))]
    .sort((a, b) => {
      const na = parseInt(String(a).replace(/\D/g, ''))
      const nb = parseInt(String(b).replace(/\D/g, ''))
      return isNaN(na) || isNaN(nb) ? String(a).localeCompare(String(b)) : na - nb
    })

  // Convert to recharts row format with FY labels
  const chartData = allX.map(x => {
    const row = { x: toFY(x) }
    data.forEach((trace, i) => {
      const idx = (trace.x || []).indexOf(x)
      row[`t${i}`] = idx >= 0 && trace.y[idx] != null ? trace.y[idx] : null
    })
    return row
  })

  // Determine if we need dual Y axis
  const hasDualY = data.some(t => t.yaxis === 'y2')

  return (
    <div style={{ width: '100%', ...style }}>
      {titleText && <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 8, paddingLeft: 4 }}>{titleText}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 10, right: hasDualY ? 60 : 20, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis dataKey="x" tick={AXIS_STYLE}
            label={layout?.xaxis?.title?.text ? { value: layout.xaxis.title.text, position: 'insideBottom', offset: -10, fontSize: 12, fill: '#718096' } : undefined} />
          <YAxis yAxisId="y" tick={AXIS_STYLE}
            label={layout?.yaxis?.title?.text ? { value: layout.yaxis.title.text, angle: -90, position: 'insideLeft', fontSize: 12, fill: '#718096' } : undefined} />
          {hasDualY && (
            <YAxis yAxisId="y2" orientation="right" tick={AXIS_STYLE}
              label={layout?.yaxis2?.title?.text ? { value: layout.yaxis2.title.text, angle: 90, position: 'insideRight', fontSize: 12, fill: '#718096' } : undefined} />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <ReferenceLine yAxisId="y" y={0} stroke="#cbd5e0" strokeWidth={1} />
          {data.map((trace, i) => {
            const color = trace.line?.color || trace.marker?.color || COLORS[i % COLORS.length]
            const isDot = trace.line?.dash === 'dot'
            const showDots = trace.mode !== 'lines'
            const yId = trace.yaxis === 'y2' ? 'y2' : 'y'
            return (
              <Line
                key={i}
                yAxisId={yId}
                type="linear"
                dataKey={`t${i}`}
                name={trace.name || `Series ${i + 1}`}
                stroke={color}
                strokeWidth={trace.line?.width || 2}
                strokeDasharray={isDot ? '5 4' : undefined}
                dot={showDots ? { r: 4, fill: color, strokeWidth: 0 } : false}
                activeDot={{ r: 6 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
