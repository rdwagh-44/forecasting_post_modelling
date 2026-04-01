import React, { useEffect, useState, useCallback } from 'react'
import {
  getSegments, getPresenceTable, getGrowthTable,
  getHistoricalGrowth, getVariables,
  calculateForecast, calculateWaterfall
} from '../api/client'
import DataTable from '../components/DataTable'
import ChartPanel from '../components/ChartPanel'
import ExpanderSection from '../components/ExpanderSection'
import SliderControl from '../components/SliderControl'

// ── Theme tokens ──────────────────────────────────────────────
const C = {
  bg: '#f4f6fb', card: '#ffffff', border: '#f0f2f8',
  ochre: '#1a1a2e', ochreDim: '#718096', ochreFaint: 'rgba(79,70,229,0.08)',
  text: '#2d3748', textDim: '#718096', black: '#ffffff'
}

const TABS = [
  { id: 'overview',  label: '🔍 Overview' },
  { id: 'growth',    label: '📈 Growth Rates' },
  { id: 'forecast',  label: '📊 Volume Forecast' },
]

const s = {
  page: { padding: '0', flex: 1, overflowY: 'auto', background: C.bg, display: 'flex', flexDirection: 'column' },
  header: {
    padding: '0 36px',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderBottom: '1px solid #0f3460',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)'
  },
  title: { fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', paddingTop: 22 },
  subtitle: { fontSize: 13, color: '#6b7db3', marginTop: 3, marginBottom: 0, paddingBottom: 16 },
  tabBar: { display: 'flex', gap: 4, marginTop: 16 },
  tab: (active) => ({
    padding: '11px 28px', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    border: 'none', background: active ? '#fff' : 'transparent',
    color: active ? '#1a1a2e' : '#8892b0',
    borderTop: active ? '3px solid #4f46e5' : '3px solid transparent',
    borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
    borderRadius: '8px 8px 0 0',
    transition: 'all 0.15s', letterSpacing: '0.02em',
    boxShadow: active ? '0 -2px 8px rgba(79,70,229,0.15)' : 'none'
  }),
  tabContent: { flex: 1, padding: '28px 36px', overflowY: 'auto' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, marginBottom: 10, color: C.ochre,
    textTransform: 'uppercase', letterSpacing: '0.06em'
  },
  card: { background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
  select: { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, minWidth: 220, background: '#fff', cursor: 'pointer', color: '#1a1a2e' },
  btn: { padding: '10px 24px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, boxShadow: '0 2px 8px rgba(79,70,229,0.35)' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#eef2ff', color: '#4f46e5', border: '1px solid #4f46e5' },
  segmentBar: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: '#fff', borderRadius: 12, border: '1px solid #f0f2f8', marginBottom: 24 },
  textarea: { width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical', background: '#fafbff', color: '#2d3748' },
  editInput: { width: '100%', padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#fafbff', color: '#2d3748' },
  multiselect: { width: '100%', height: 130, padding: 6, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#fafbff', color: '#2d3748' },
  row: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  col: { flex: 1, minWidth: 280 },
  placeholder: { textAlign: 'center', padding: '48px 20px', color: C.ochreDim, fontSize: 14 }
}

const cleanVarName = (v) => v.replace(/^(Res_|Lag_|lag_)/g, '').trim()
const toFY = (s) => typeof s === 'string' ? s.replace(/\bA(\d+)\b/g, 'FY$1') : s

const SCENARIO_LABELS = {
  'Base Elasticity': 'Realistic Forecast',
  '+10% Elasticity': 'Optimistic Forecast',
  '-10% Elasticity': 'Conservative Forecast'
}
const labelScenario = (s) => SCENARIO_LABELS[s] || s

function presenceCellStyle(col, val) {
  if (col === 'Variable') return { fontWeight: 600, color: C.ochre }
  if (val === '✓') return { color: '#16a34a', fontWeight: 700, fontSize: 15, background: 'rgba(22,163,74,0.12)', textAlign: 'center' }
  if (val === '✗') return { color: '#dc2626', fontWeight: 700, fontSize: 15, background: 'rgba(220,38,38,0.1)', textAlign: 'center' }
  return {}
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [segments, setSegments] = useState([])
  const [selectedSegment, setSelectedSegment] = useState('')
  const [presenceTable, setPresenceTable] = useState([])
  const [growthData, setGrowthData] = useState([])
  const [editedGrowthData, setEditedGrowthData] = useState([])
  const [growthCols, setGrowthCols] = useState([])
  const [valueCols, setValueCols] = useState([])
  const [selectedGrowthRow, setSelectedGrowthRow] = useState(null)
  const [comments, setComments] = useState({})
  const [historicalGrowth, setHistoricalGrowth] = useState([])
  const [historicalError, setHistoricalError] = useState('')
  const [forecastResult, setForecastResult] = useState(null)
  const [cagrYears, setCagrYears] = useState(3)
  const [scenarioTab, setScenarioTab] = useState('Base Elasticity')
  const [loading, setLoading] = useState(false)
  const [variables, setVariables] = useState([])
  const [selectedVars, setSelectedVars] = useState([])
  const [waterfallResult, setWaterfallResult] = useState(null)
  const [wfStartFy, setWfStartFy] = useState('')
  const [wfEndFy, setWfEndFy] = useState('')
  const [variableScale, setVariableScale] = useState(1.5)

  useEffect(() => {
    getPresenceTable().then(r => setPresenceTable(r.data.table)).catch(() => {})
    getSegments().then(r => setSegments(r.data.segments)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedSegment) return
    getGrowthTable(selectedSegment).then(r => {
      setGrowthData(r.data.growth_data)
      setEditedGrowthData(r.data.growth_data.map(row => ({ ...row })))
      setGrowthCols(r.data.growth_cols)
      setValueCols(r.data.value_cols || [])
      setSelectedGrowthRow(null)
    }).catch(() => {})
    getVariables(selectedSegment).then(r => {
      setVariables(r.data.variables)
      setSelectedVars(r.data.variables)
    }).catch(() => {})
    getHistoricalGrowth(selectedSegment)
      .then(r => { setHistoricalGrowth(r.data.data); setHistoricalError('') })
      .catch(e => setHistoricalError(e.response?.data?.detail || e.message || 'Failed'))
  }, [selectedSegment])

  const handleGrowthEdit = (rowIdx, col, value) => {
    setEditedGrowthData(prev => prev.map((row, i) =>
      i === rowIdx ? { ...row, [col]: parseFloat(value) || 0 } : row
    ))
  }

  const handleRunForecast = async () => {
    setLoading(true)
    try {
      const r = await calculateForecast({ segment: selectedSegment, growth_data: editedGrowthData, cagr_years: cagrYears })
      setForecastResult(r.data)
      const years = r.data.forecast_years || []
      if (years.length > 0) { setWfStartFy(years[0]); setWfEndFy(years[years.length - 1]) }
    } catch (e) { alert('Forecast failed: ' + (e.response?.data?.detail || e.message)) }
    setLoading(false)
  }

  const hasGeneratedWaterfall = React.useRef(false)

  const handleRunWaterfall = async () => {
    if (!forecastResult) return
    hasGeneratedWaterfall.current = true
    try {
      const r = await calculateWaterfall({
        segment: selectedSegment, start_fy: wfStartFy, end_fy: wfEndFy,
        selected_vars: selectedVars, variable_scale: variableScale,
        growth_data: editedGrowthData, final_df: forecastResult.final_df
      })
      setWaterfallResult(r.data.waterfall)
    } catch (e) { alert('Waterfall failed: ' + (e.response?.data?.detail || e.message)) }
  }

  // Auto-regenerate waterfall when config changes — only after first manual generation
  useEffect(() => {
    if (!hasGeneratedWaterfall.current || !forecastResult || selectedVars.length === 0) return
    const timer = setTimeout(() => {
      calculateWaterfall({
        segment: selectedSegment, start_fy: wfStartFy, end_fy: wfEndFy,
        selected_vars: selectedVars, variable_scale: variableScale,
        growth_data: editedGrowthData, final_df: forecastResult.final_df
      }).then(r => setWaterfallResult(r.data.waterfall)).catch(() => {})
    }, 300) // debounce 300ms so rapid chip clicks don't spam the API
    return () => clearTimeout(timer)
  }, [selectedVars, wfStartFy, wfEndFy, variableScale])

  const growthChartData = useCallback(() => {
    if (selectedGrowthRow === null || !editedGrowthData[selectedGrowthRow]) return null
    const row = editedGrowthData[selectedGrowthRow]
    const growthYearMap = {}
    growthCols.forEach(c => { growthYearMap[c.split(' ')[0]] = c })
    const valueYearSet = new Set(valueCols)
    const allYears = [...new Set([...Object.keys(growthYearMap), ...valueCols])]
      .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))

    const FUTURE_FROM = 26  // A26 onwards = future

    // Split into historical (≤A25) and future (≥A26)
    const histYears = allYears.filter(yr => parseInt(yr.slice(1)) <= FUTURE_FROM - 1)
    const futureYears = allYears.filter(yr => parseInt(yr.slice(1)) >= FUTURE_FROM)

    // For continuity, include the last historical point as the first point of the future trace
    const bridgeYear = histYears[histYears.length - 1]

    const getGrowthY = (years) => years.map(yr => {
      const col = growthYearMap[yr]
      return col != null ? (parseFloat(row[col]) || 0) : null
    })

    const traces = [
      // Historical growth — indigo solid
      {
        x: histYears, y: getGrowthY(histYears),
        mode: 'lines+markers', type: 'scatter',
        name: 'Growth Rate (%)',
        yaxis: 'y', line: { dash: 'solid', color: '#4f46e5', width: 2 },
        marker: { color: '#4f46e5', size: 6 },
        connectgaps: false
      }
    ]

    // Future growth — same indigo, dotted
    if (futureYears.length > 0) {
      const futureX = bridgeYear ? [bridgeYear, ...futureYears] : futureYears
      const futureY = getGrowthY(futureX)
      traces.push({
        x: futureX, y: futureY,
        mode: 'lines+markers', type: 'scatter',
        name: 'Growth Rate — Future (FY26+)',
        yaxis: 'y', line: { dash: 'dot', color: '#4f46e5', width: 2 },
        marker: { color: '#4f46e5', size: 6 },
        connectgaps: false
      })
    }

    // Values trace — historical teal solid, future teal dotted
    if (valueCols.length > 0) {
      const histValYears = allYears.filter(yr => parseInt(yr.slice(1)) <= FUTURE_FROM - 1)
      const futureValYears = allYears.filter(yr => parseInt(yr.slice(1)) >= FUTURE_FROM)

      const getValY = (years) => years.map(yr => valueYearSet.has(yr) && row[yr] != null ? parseFloat(row[yr]) : null)

      const histValY = getValY(histValYears)
      if (histValY.some(v => v !== null))
        traces.push({
          x: histValYears, y: histValY,
          mode: 'lines+markers', type: 'scatter',
          name: 'Value', yaxis: 'y2',
          line: { dash: 'solid', width: 2.5, color: '#06b6d4' },
          marker: { color: '#06b6d4', size: 6 },
          connectgaps: false
        })

      if (futureValYears.length > 0) {
        // bridge from last historical value year
        const bridgeValYear = histValYears[histValYears.length - 1]
        const futureValX = bridgeValYear ? [bridgeValYear, ...futureValYears] : futureValYears
        const futureValY = getValY(futureValX)
        if (futureValY.some(v => v !== null))
          traces.push({
            x: futureValX, y: futureValY,
            mode: 'lines+markers', type: 'scatter',
            name: 'Value — Future (FY26+)', yaxis: 'y2',
            line: { dash: 'dot', width: 2.5, color: '#06b6d4' },
            marker: { color: '#06b6d4', size: 6 },
            connectgaps: false
          })
      }
    }

    return traces
  }, [selectedGrowthRow, editedGrowthData, growthCols, valueCols])

  const forecastChartData = useCallback((filterScenario = null) => {
    if (!forecastResult?.plot_data) return []
    const FUTURE_FROM = 26

    const scenarioPalette = {
      'Base Elasticity':  { growth: '#4f46e5', volume: '#06b6d4', growthFuture: '#a78bfa', volumeFuture: '#67e8f9' },
      '+10% Elasticity':  { growth: '#10b981', volume: '#f59e0b', growthFuture: '#6ee7b7', volumeFuture: '#fcd34d' },
      '-10% Elasticity':  { growth: '#ef4444', volume: '#8b5cf6', growthFuture: '#fca5a5', volumeFuture: '#c4b5fd' },
    }
    const fallback = { growth: '#4f46e5', volume: '#06b6d4', growthFuture: '#a78bfa', volumeFuture: '#67e8f9' }

    const allScenarios = [...new Set(forecastResult.plot_data.map(d => d.Scenario))]
    const scenarios = filterScenario ? allScenarios.filter(s => s === filterScenario) : allScenarios

    return scenarios.flatMap(sc => {
      const rows = forecastResult.plot_data.filter(d => d.Scenario === sc)
        .sort((a, b) => parseInt(a.FiscalYear.slice(1)) - parseInt(b.FiscalYear.slice(1)))

      const histRows = rows.filter(r => parseInt(r.FiscalYear.slice(1)) <= FUTURE_FROM - 1)
      const futureRows = rows.filter(r => parseInt(r.FiscalYear.slice(1)) >= FUTURE_FROM)
      const bridge = histRows[histRows.length - 1]
      const futureWithBridge = bridge ? [bridge, ...futureRows] : futureRows

      const p = scenarioPalette[sc] || fallback
      const traces = []

      if (histRows.length > 0) {
        traces.push({ x: histRows.map(r => r.FiscalYear), y: histRows.map(r => r['VolumeGrowth_%']), mode: 'lines+markers', name: `${labelScenario(sc)} Growth`, type: 'scatter', line: { color: p.growth, width: 2, dash: 'solid' }, marker: { color: p.growth } })
        traces.push({ x: histRows.map(r => r.FiscalYear), y: histRows.map(r => r.PredictedVolume), mode: 'lines+markers', name: `${labelScenario(sc)} Volume`, type: 'scatter', line: { color: p.volume, width: 2, dash: 'solid' }, marker: { color: p.volume }, yaxis: 'y2' })
      }
      if (futureWithBridge.length > 0) {
        traces.push({ x: futureWithBridge.map(r => r.FiscalYear), y: futureWithBridge.map(r => r['VolumeGrowth_%']), mode: 'lines+markers', name: `${labelScenario(sc)} Growth (Future)`, type: 'scatter', line: { color: p.growth, width: 2, dash: 'dot' }, marker: { color: p.growth } })
        traces.push({ x: futureWithBridge.map(r => r.FiscalYear), y: futureWithBridge.map(r => r.PredictedVolume), mode: 'lines+markers', name: `${labelScenario(sc)} Volume (Future)`, type: 'scatter', line: { color: p.volume, width: 2, dash: 'dot' }, marker: { color: p.volume }, yaxis: 'y2' })
      }

      return traces
    })
  }, [forecastResult])

  const waterfallChartData = useCallback(() => {
    if (!waterfallResult) return []
    return [{
      type: 'waterfall',
      _rawData: waterfallResult  // passed through to Recharts WaterfallChart
    }]
  }, [waterfallResult])

  const forecastYears = forecastResult?.forecast_years || []

  // ── Segment selector (shared across tabs 2-4) ──
  const SegmentBar = () => (
    <div style={s.segmentBar}>
      <span style={{ fontWeight: 600, fontSize: 14, color: C.ochre }}>Segment:</span>
      <select style={s.select} value={selectedSegment} onChange={e => { setSelectedSegment(e.target.value); setForecastResult(null); setWaterfallResult(null) }}>
        <option value="">— Select a segment —</option>
        {[...segments].sort((a, b) => {
          const order = ['Value', 'Deluxe', 'Premium', 'Super-premium']
          const ai = order.indexOf(a); const bi = order.indexOf(b)
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        }).map(seg => <option key={seg} value={seg}>{seg}</option>)}
      </select>
      {selectedSegment && <span style={s.badge}>{selectedSegment}</span>}
    </div>
  )

  return (
    <div style={s.page}>
      {/* Header + Tab bar */}
      <div style={s.header}>
        <h1 style={s.title}>📊 Post-Modeling Analysis</h1>
        <p style={s.subtitle}>Forecasting dashboard — elasticity-based volume projections</p>
        <div style={s.tabBar}>
          {TABS.map(t => (
            <button key={t.id} style={s.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: Overview ── */}
      {activeTab === 'overview' && (
        <div style={s.tabContent}>
          <div style={s.section}>
            <div style={s.sectionTitle}>🔍 Variable Presence by Segment</div>
            <div style={s.card}>
              <DataTable
                data={presenceTable} cellStyle={presenceCellStyle} maxHeight="520px"
                colWidthMap={presenceTable.length > 0
                  ? Object.fromEntries(Object.keys(presenceTable[0]).filter(c => c !== 'Variable').map(c => [c, 120]))
                  : {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Growth Rates ── */}
      {activeTab === 'growth' && (
        <div style={s.tabContent}>
          <SegmentBar />
          {!selectedSegment ? (
            <div style={{ ...s.card, ...s.placeholder }}>☝ Select a segment to load growth data</div>
          ) : (<>
            <ExpanderSection title="📈 Growth Rate Data" defaultOpen>
              <p style={{ fontSize: 12, color: C.ochreDim, marginBottom: 12 }}>Click a variable to view its growth trend and edit future values.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {growthData.map((row, i) => {
                  const active = selectedGrowthRow === i
                  return (
                    <span key={i} onClick={() => setSelectedGrowthRow(i)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s',
                        background: active ? '#4f46e5' : '#f0f2f8',
                        color: active ? '#fff' : '#4a5568',
                        border: active ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                        boxShadow: active ? '0 2px 6px rgba(79,70,229,0.3)' : 'none'
                      }}>
                      {cleanVarName(row.Variable)}
                    </span>
                  )
                })}
              </div>
            </ExpanderSection>

            <div style={s.section}>
              <div style={s.sectionTitle}>📋 Final Growth Rate Table</div>
              <div style={s.card}>
                <DataTable
                  data={editedGrowthData.map(row => {
                    const r = { Segment: row.Segment, Variable: cleanVarName(row.Variable) }
                    growthCols.filter(c => parseInt(c.split(' ')[0].slice(1)) >= 25).forEach(c => {
                      r[toFY(c)] = row[c] != null ? `${parseFloat(row[c]).toFixed(1)}%` : '-'
                    })
                    return r
                  })}
                  maxHeight="280px"
                />
              </div>
            </div>

            <div style={s.section}>
              <ExpanderSection title="📊 Historical Volume Growth" defaultOpen={false}>
                {historicalError
                  ? <p style={{ color: '#dc2626', fontSize: 13 }}>⚠ {historicalError}</p>
                  : <DataTable maxHeight="280px" data={historicalGrowth.map(r => ({
                      Segment: r.Segment, FiscalYear: toFY(r.FiscalYear),
                      PredictedVolume: r.PredictedVolume != null ? parseFloat(r.PredictedVolume).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '-',
                      'VolumeGrowth_%': r['VolumeGrowth_%'] != null ? parseFloat(r['VolumeGrowth_%']).toFixed(1) + '%' : '-',
                      Scenario: r.Scenario
                    }))} />
                }
              </ExpanderSection>
            </div>
          </>)}
        </div>
      )}

      {/* ── TAB 3: Volume Forecast ── */}
      {activeTab === 'forecast' && (
        <div style={s.tabContent}>
          <SegmentBar />
          {!selectedSegment ? (
            <div style={{ ...s.card, ...s.placeholder }}>☝ Select a segment then run forecast</div>
          ) : (<>
            <div style={{ ...s.section, display: 'flex', alignItems: 'center', gap: 16 }}>
              <button style={s.btn} onClick={handleRunForecast} disabled={loading}>
                {loading ? '⏳ Running...' : '▶ Run Forecast'}
              </button>
              {loading && <span style={{ fontSize: 13, color: C.ochreDim }}>Calculating elasticity scenarios…</span>}
            </div>

            {forecastResult && (<>
              {/* ── Scenario Sub-tabs ── */}
              {(() => {
                const scenarios = ['Base Elasticity', '+10% Elasticity', '-10% Elasticity']
                const scColors = { 'Base Elasticity': '#4f46e5', '+10% Elasticity': '#10b981', '-10% Elasticity': '#ef4444' }
                return (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
                    {scenarios.map(sc => {
                      const active = scenarioTab === sc
                      return (
                        <button key={sc} onClick={() => setScenarioTab(sc)} style={{
                          padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          background: active ? '#fff' : 'transparent',
                          color: active ? scColors[sc] : '#718096',
                          borderBottom: active ? `3px solid ${scColors[sc]}` : '3px solid transparent',
                          borderRadius: '6px 6px 0 0', marginBottom: -2, transition: 'all 0.15s'
                        }}>{labelScenario(sc)}</button>
                      )
                    })}
                  </div>
                )
              })()}

              {/* ── KPI Cards ── */}
              {(() => {
                const baseRows = forecastResult.final_df?.filter(r => r.Scenario === scenarioTab && r.FiscalYear !== 'A26') || []
                const cagrRow = forecastResult.cagr?.table?.find(r => r.Scenario === scenarioTab)
                const cagrKey = cagrRow ? Object.keys(cagrRow).find(k => k.includes('CAGR')) : null
                const kpis = [
                  ...baseRows.map(r => ({
                    label: toFY(r.FiscalYear),
                    value: r['VolumeGrowth_%'] != null ? `${parseFloat(r['VolumeGrowth_%']).toFixed(1)}%` : '-',
                    sub: r.PredictedVolume != null ? parseFloat(r.PredictedVolume).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '-'
                  })),
                  ...(cagrRow && cagrKey ? [{ label: cagrKey, value: `${parseFloat(cagrRow[cagrKey]).toFixed(1)}%`, sub: labelScenario(scenarioTab), isCAGR: true }] : [])
                ]
                if (!kpis.length) return null
                return (
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
                    {kpis.map((k, i) => (
                      <div key={i} style={{
                        flex: '1 1 120px', background: k.isCAGR ? '#1a1a2e' : '#fff',
                        borderRadius: 12, padding: '16px 20px',
                        border: k.isCAGR ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: k.isCAGR ? '#818cf8' : '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: k.isCAGR ? '#fff' : (parseFloat(k.value) >= 0 ? '#10b981' : '#ef4444'), lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 13, color: k.isCAGR ? '#818cf8' : '#a0aec0', marginTop: 5 }}>{k.sub}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}



              <div style={s.section}>
                <div style={s.sectionTitle}>📉 Historical + Forecast — Growth & Volume Scenarios</div>
                <div style={s.card}>
                  <ChartPanel
                    data={forecastChartData(scenarioTab)}
                    layout={{
                      title: { text: 'Historical + Forecast Growth & Volume Scenarios', font: { size: 14, color: C.ochre } },
                      xaxis: { title: { text: 'Fiscal Year' } },
                      yaxis: { title: { text: 'Growth Rate (%)' } },
                      yaxis2: { title: { text: 'Volume' }, overlaying: 'y', side: 'right' },
                      legend: { orientation: 'h', y: -0.25, x: 0 },
                      height: 500
                    }}
                  />
                </div>
              </div>

              <div style={s.section}>
                <ExpanderSection title="⚡ Forecast Comparison (Elasticity Scenarios)" defaultOpen={false}>
                  <DataTable maxHeight="300px" data={forecastResult.forecast_scenarios.map(r => ({
                    ...r,
                    Scenario: labelScenario(r.Scenario),
                    FiscalYear: toFY(r.FiscalYear),
                    PredictedVolume: parseFloat(r.PredictedVolume).toLocaleString('en-IN', { maximumFractionDigits: 0 }),
                    'VolumeGrowth_%': parseFloat(r['VolumeGrowth_%']).toFixed(1) + '%'
                  }))} />
                </ExpanderSection>
              </div>

              <div style={s.section}>
                <ExpanderSection title="📈 Forecasted Volumes & Growth Rates" defaultOpen={false}>
                  <DataTable data={forecastResult.final_df.map(r => ({ ...r, Scenario: labelScenario(r.Scenario), FiscalYear: toFY(r.FiscalYear) }))} maxHeight="300px" />
                </ExpanderSection>
              </div>

              {/* ── Waterfall ── */}
              <ExpanderSection title="🌊 Waterfall Configuration" defaultOpen={false}>
                <div style={s.row}>
                  <div style={s.col}>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4, color: C.ochre }}>Start Fiscal Year</label>
                    <select style={s.select} value={wfStartFy} onChange={e => { setWfStartFy(e.target.value) }}>
                      {forecastYears.map(y => <option key={y} value={y}>{toFY(y)}</option>)}
                    </select>
                    <div style={{ marginTop: 16 }}>
                      <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: C.ochre }}>Variables to include</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {variables.map(v => {
                          const active = selectedVars.includes(v)
                          return (
                            <span key={v}
                              onClick={() => { setSelectedVars(prev => active ? prev.filter(x => x !== v) : [...prev, v]) }}
                              style={{
                                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s',
                                background: active ? '#4f46e5' : '#f0f2f8',
                                color: active ? '#fff' : '#4a5568',
                                border: active ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                                boxShadow: active ? '0 2px 6px rgba(79,70,229,0.3)' : 'none'
                              }}>
                              {v}
                            </span>
                          )
                        })}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                        <span onClick={() => { setSelectedVars([...variables]) }} style={{ fontSize: 11, color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }}>Select all</span>
                        <span onClick={() => { setSelectedVars([]) }} style={{ fontSize: 11, color: '#718096', cursor: 'pointer', textDecoration: 'underline' }}>Clear all</span>
                      </div>
                    </div>
                  </div>
                  <div style={s.col}>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4, color: C.ochre }}>End Fiscal Year</label>
                    <select style={s.select} value={wfEndFy} onChange={e => { setWfEndFy(e.target.value) }}>
                      {forecastYears.map(y => <option key={y} value={y}>{toFY(y)}</option>)}
                    </select>
                    <div style={{ marginTop: 16 }}>
                      <SliderControl label="Emphasize variable contribution" min={1.0} max={3.0} step={0.1} value={variableScale} onChange={v => { setVariableScale(v) }} />
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: C.ochreDim }}>{toFY(wfStartFy)} → {toFY(wfEndFy)}</span>
                  <button style={s.btn} onClick={handleRunWaterfall}>Generate Waterfall</button>
                </div>
              </ExpanderSection>

              {waterfallResult && (
                <div style={{ ...s.card, marginTop: 16 }}>
                  <ChartPanel
                    data={waterfallChartData()}
                    layout={{
                      title: { text: `Volume Growth Waterfall — ${selectedSegment} (Elasticity × Growth)`, font: { size: 14, color: C.ochre } },
                      yaxis: { showticklabels: false, zeroline: true },
                      showlegend: false, height: 600
                    }}
                  />
                </div>
              )}
            </>)}
          </>)}
        </div>
      )}

      {/* ── Growth Variable Modal (available from any tab) ── */}
      {selectedGrowthRow !== null && growthData[selectedGrowthRow] && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
          onClick={() => setSelectedGrowthRow(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '90%', maxWidth: 820, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', padding: '28px 32px', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e' }}>📈 {cleanVarName(growthData[selectedGrowthRow].Variable)}</div>
                <div style={{ fontSize: 12, color: '#718096', marginTop: 3 }}>Segment: {growthData[selectedGrowthRow].Segment}</div>
              </div>
              <button onClick={() => setSelectedGrowthRow(null)}
                style={{ background: '#f4f6fb', border: '1px solid #e2e8f0', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#4a5568', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <ChartPanel data={growthChartData() || []} layout={{
              title: '', xaxis: { title: { text: 'Year' } }, yaxis: { title: { text: 'Growth Rate (%)' } },
              yaxis2: valueCols.length > 0 ? { title: { text: 'Value' }, overlaying: 'y', side: 'right' } : undefined,
              legend: { orientation: 'h', y: -0.3 }, height: 320
            }} />

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Edit Future Growth Rates (A26+)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {growthCols.filter(c => parseInt(c.split(' ')[0].slice(1)) >= 26).map(col => (
                  <div key={col} style={{ background: '#f8f9ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e8ecf4' }}>
                    <div style={{ fontSize: 11, color: '#718096', marginBottom: 5, fontWeight: 600 }}>{toFY(col)}</div>
                    <input type="number" style={{ width: '100%', padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, background: '#fff', color: '#2d3748' }}
                      value={editedGrowthData[selectedGrowthRow]?.[col] ?? ''}
                      onChange={e => handleGrowthEdit(selectedGrowthRow, col, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comment</div>
              <textarea style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical', background: '#fafbff', color: '#2d3748' }}
                value={comments[growthData[selectedGrowthRow].Variable] || ''}
                onChange={e => setComments(prev => ({ ...prev, [growthData[selectedGrowthRow].Variable]: e.target.value }))}
                placeholder="Add a comment for this variable..." />
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button style={s.btn} onClick={() => setSelectedGrowthRow(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
