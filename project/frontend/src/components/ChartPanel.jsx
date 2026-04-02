import React, { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, LineChart,
  Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, Cell
} from 'recharts'

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
const cleanLabel = (s) => s.replace(/^(Res_|Lag_|lag_)/g, '').replace(/\bA(\d+)\b/g, 'FY$1').trim()
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
export default function ChartPanel({ data, layout, style }) {
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
