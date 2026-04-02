import React, { useEffect, useState, useCallback } from 'react'
import {
  getSegments, getPresenceTable, getGrowthTable,
  getHistoricalGrowth, getVariables,
  calculateForecast, calculateWaterfall,
  getVolumeOverviewSegments, getVolumeOverviewData,
  getFeatureCategories, getFeatureVariable
} from '../api/client'
import DataTable from '../components/DataTable'
import ChartPanel from '../components/ChartPanel'
import ExpanderSection from '../components/ExpanderSection'
import SliderControl from '../components/SliderControl'

// ── Theme tokens ──────────────────────────────────────────────
const C = {
  bg: '#F5F5F5', card: '#ffffff', border: '#e8e8e8',
  ochre: '#333333', ochreDim: '#666666', ochreFaint: 'rgba(255,189,89,0.12)',
  text: '#333333', textDim: '#666666', black: '#333333'
}

const TABS = [
  { id: 'volume',    label: '📦 Volume Overview' },
  { id: 'features',  label: '🔬 Feature Overview' },
  { id: 'overview',  label: '🔍 Overview' },
  { id: 'growth',    label: '📈 Growth Rates' },
  { id: 'forecast',  label: '📊 Volume Forecast' },
]

const s = {
  page: { padding: '0', flex: 1, overflowY: 'auto', background: C.bg, display: 'flex', flexDirection: 'column' },
  header: {
    padding: '0 36px',
    background: '#333333',
    borderBottom: '1px solid #FFBD59',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  title: { fontSize: 26, fontWeight: 800, color: '#FFBD59', letterSpacing: '-0.5px', paddingTop: 22 },
  subtitle: { fontSize: 13, color: '#999999', marginTop: 3, marginBottom: 0, paddingBottom: 16 },
  tabBar: { display: 'flex', gap: 4, marginTop: 16 },
  tab: (active) => ({
    padding: '11px 28px', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    border: 'none', background: active ? '#ffffff' : 'transparent',
    color: active ? '#FFBD59' : '#999999',
    borderTop: active ? '3px solid #FFBD59' : '3px solid transparent',
    borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
    borderRadius: '8px 8px 0 0',
    transition: 'all 0.15s', letterSpacing: '0.02em',
    boxShadow: active ? '0 -2px 8px rgba(255,189,89,0.15)' : 'none'
  }),
  tabContent: { flex: 1, padding: '28px 36px', overflowY: 'auto' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, marginBottom: 10, color: C.ochre,
    textTransform: 'uppercase', letterSpacing: '0.06em'
  },
  card: { background: '#ffffff', borderRadius: 12, padding: 20, border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  select: { padding: '8px 14px', borderRadius: 8, border: '1px solid #e8e8e8', fontSize: 14, minWidth: 220, background: '#ffffff', cursor: 'pointer', color: '#333333' },
  btn: { padding: '10px 24px', background: '#FFBD59', color: '#333333', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, boxShadow: '0 2px 8px rgba(255,189,89,0.4)' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#FFF8EC', color: '#FFBD59', border: '1px solid #FFBD59' },
  segmentBar: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: '#ffffff', borderRadius: 12, border: '1px solid #e8e8e8', marginBottom: 24 },
  textarea: { width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid #e8e8e8', fontSize: 13, resize: 'vertical', background: '#F5F5F5', color: '#333333' },
  editInput: { width: '100%', padding: '5px 8px', border: '1px solid #e8e8e8', borderRadius: 6, fontSize: 12, background: '#F5F5F5', color: '#333333' },
  multiselect: { width: '100%', height: 130, padding: 6, border: '1px solid #e8e8e8', borderRadius: 8, fontSize: 13, background: '#F5F5F5', color: '#333333' },
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
  if (col === 'Variable') return { fontWeight: 600, color: '#333333' }
  if (val === '✓') return { color: '#41C185', fontWeight: 700, fontSize: 15, background: 'rgba(65,193,133,0.1)', textAlign: 'center' }
  if (val === '✗') return { color: '#e53e3e', fontWeight: 700, fontSize: 15, background: 'rgba(229,62,62,0.08)', textAlign: 'center' }
  return {}
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('volume')
  const [segments, setSegments] = useState([])
  const [selectedSegment, setSelectedSegment] = useState('')
  // Volume Overview state
  const [voSegments, setVoSegments] = useState([])
  const [voSelectedSegment, setVoSelectedSegment] = useState('')
  const [voData, setVoData] = useState(null)
  const [voShowForecast, setVoShowForecast] = useState(false)
  const [voLoading, setVoLoading] = useState(false)
  // Feature Overview state
  const [featureCategories, setFeatureCategories] = useState({})
  const [featureOpenCat, setFeatureOpenCat] = useState(null)
  const [foSegment, setFoSegment] = useState('')
  const [foVolumeData, setFoVolumeData] = useState(null)
  const [foSelectedVar, setFoSelectedVar] = useState(null)   // { variable_name, display_name }
  const [foVarData, setFoVarData] = useState(null)
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
    getVolumeOverviewSegments().then(r => setVoSegments(r.data.segments)).catch(() => {})
    getFeatureCategories().then(r => setFeatureCategories(r.data.categories)).catch(() => {})
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

  // Auto-regenerate waterfall when config changes or forecast first runs
  useEffect(() => {
    if (!forecastResult || selectedVars.length === 0 || !wfStartFy || !wfEndFy) return
    const timer = setTimeout(() => {
      calculateWaterfall({
        segment: selectedSegment, start_fy: wfStartFy, end_fy: wfEndFy,
        selected_vars: selectedVars, variable_scale: variableScale,
        growth_data: editedGrowthData, final_df: forecastResult.final_df
      }).then(r => setWaterfallResult(r.data.waterfall)).catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [selectedVars, wfStartFy, wfEndFy, variableScale, forecastResult])

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

      {/* ── TAB 0: Volume Overview ── */}
      {activeTab === 'volume' && (
        <div style={s.tabContent}>
          {/* Segment selector */}
          <div style={s.segmentBar}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#333333' }}>Segment:</span>
            <select style={s.select} value={voSelectedSegment} onChange={async e => {
              const seg = e.target.value
              setVoSelectedSegment(seg)
              setVoData(null)
              setVoShowForecast(false)
              if (!seg) return
              setVoLoading(true)
              try {
                const r = await getVolumeOverviewData(seg)
                setVoData(r.data)
              } catch (err) { alert('Failed to load: ' + err.message) }
              setVoLoading(false)
            }}>
              <option value="">— Select a segment —</option>
              {voSegments.map(seg => <option key={seg} value={seg}>{seg}</option>)}
            </select>
            {voSelectedSegment && <span style={s.badge}>{voSelectedSegment}</span>}
            {voLoading && <span style={{ fontSize: 13, color: '#666666' }}>Loading...</span>}
          </div>

          {voData && (() => {
            const MODEL_COLORS = {
              'SMA': '#FFBD59', 'Holt-Winters': '#41C185', 'ETS': '#458EE2',
              'SARIMA': '#e53e3e', 'Prophet': '#8b5cf6'
            }
            const forecastStart = voData.forecast_start_date

            // Actual-only traces (solid historical, dotted if actual exists in forecast period)
            const actualTraces = []
            const actualHist = voData.data.filter(r => r.Actual != null && (!forecastStart || r.Date < forecastStart))
            const actualFc = voData.data.filter(r => r.Actual != null && forecastStart && r.Date >= forecastStart)
            if (actualHist.length > 0)
              actualTraces.push({ x: actualHist.map(r => r.Date), y: actualHist.map(r => r.Actual), mode: 'lines', name: 'Actual', type: 'scatter', line: { color: '#333333', width: 2.5, dash: 'solid' } })
            if (actualFc.length > 0)
              actualTraces.push({ x: actualFc.map(r => r.Date), y: actualFc.map(r => r.Actual), mode: 'lines', name: 'Actual (Forecast Period)', type: 'scatter', line: { color: '#333333', width: 2.5, dash: 'dot' } })

            // Forecast chart traces: actual solid + model dotted
            const forecastTraces = [...actualTraces]
            voData.model_cols.forEach(col => {
              const fcRows = voData.data.filter(r => r[col] != null && forecastStart && r.Date >= forecastStart)
              const bridgeRow = voData.data.filter(r => r.Actual != null && r.Date < forecastStart).slice(-1)[0]
              const rows = bridgeRow ? [{ ...bridgeRow, [col]: bridgeRow.Actual }, ...fcRows] : fcRows
              if (rows.length > 0)
                forecastTraces.push({ x: rows.map(r => r.Date), y: rows.map(r => r[col]), mode: 'lines+markers', name: col, type: 'scatter', line: { color: MODEL_COLORS[col] || '#999', width: 2, dash: 'dot' }, marker: { size: 4 } })
            })

            return (
              <>
                {/* Chart 1: Actual only */}
                <div style={s.section}>
                  <div style={s.sectionTitle}>📈 Actual Volume — {voSelectedSegment}</div>
                  <div style={s.card}>
                    <ChartPanel data={actualTraces} layout={{
                      title: '', xaxis: { title: { text: 'Date' } }, yaxis: { title: { text: 'Volume' } },
                      legend: { orientation: 'h', y: -0.25 }, height: 380
                    }} />
                  </div>
                </div>

                {/* Show Forecast button — below actual chart */}
                {!voShowForecast && (
                  <div style={{ ...s.section, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button style={s.btn} onClick={() => setVoShowForecast(true)}>📊 Show Forecast</button>
                  </div>
                )}

                {/* Chart 2: Actual + all model forecasts */}
                {voShowForecast && (
                  <div style={s.section}>
                    <div style={s.sectionTitle}>📊 Volume Forecast — {voSelectedSegment}</div>
                    <div style={s.card}>
                      <ChartPanel data={forecastTraces} layout={{
                        title: '', xaxis: { title: { text: 'Date' } }, yaxis: { title: { text: 'Volume' } },
                        legend: { orientation: 'h', y: -0.25 }, height: 420
                      }} />
                    </div>
                  </div>
                )}

                <div style={s.section}>
                  <ExpanderSection title="📋 Data Overview" defaultOpen={false}>
                    <DataTable
                      maxHeight="400px"
                      data={voData.data.map(r => {
                        const row = { Date: r.Date, Actual: r.Actual != null ? parseFloat(r.Actual).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '-' }
                        voData.model_cols.forEach(col => { row[col] = r[col] != null ? parseFloat(r[col]).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '-' })
                        return row
                      })}
                    />
                  </ExpanderSection>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ── TAB: Feature Overview ── */}
      {activeTab === 'features' && (
        <div style={s.tabContent}>
          {/* Segment selector */}
          <div style={s.segmentBar}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#333333' }}>Segment:</span>
            <select style={s.select} value={foSegment} onChange={async e => {
              const seg = e.target.value
              setFoSegment(seg)
              setFoVolumeData(null)
              setFoSelectedVar(null)
              setFoVarData(null)
              if (!seg) return
              try {
                const r = await getVolumeOverviewData(seg)
                setFoVolumeData(r.data)
              } catch (err) { console.error(err) }
            }}>
              <option value="">— Select a segment —</option>
              {voSegments.map(seg => <option key={seg} value={seg}>{seg}</option>)}
            </select>
            {foSegment && <span style={s.badge}>{foSegment}</span>}
          </div>

          <div style={{ display: 'flex', gap: 16, minHeight: '70vh' }}>
            {/* Left — actual volume chart */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {foVolumeData ? (() => {
                const actualRows = foVolumeData.data.filter(r => r.Actual != null)

                // Compute correlation if variable selected — match by year-month
                let correlation = null
                if (foVarData && foVarData.length > 0) {
                  const varMap = Object.fromEntries(
                    foVarData.map(r => [r.date.substring(0, 7), r.value])
                  )
                  const pairs = actualRows
                    .map(r => ({ vol: r.Actual, feat: varMap[r.Date.substring(0, 7)] }))
                    .filter(p => p.vol != null && p.feat != null)
                  if (pairs.length > 1) {
                    const n = pairs.length
                    const meanV = pairs.reduce((s, p) => s + p.vol, 0) / n
                    const meanF = pairs.reduce((s, p) => s + p.feat, 0) / n
                    const num = pairs.reduce((s, p) => s + (p.vol - meanV) * (p.feat - meanF), 0)
                    const denV = Math.sqrt(pairs.reduce((s, p) => s + (p.vol - meanV) ** 2, 0))
                    const denF = Math.sqrt(pairs.reduce((s, p) => s + (p.feat - meanF) ** 2, 0))
                    correlation = denV * denF !== 0 ? (num / (denV * denF)).toFixed(3) : null
                  }
                }

                const traces = [{
                  x: actualRows.map(r => r.Date),
                  y: actualRows.map(r => r.Actual),
                  mode: 'lines', name: 'Actual Volume', type: 'scatter',
                  line: { color: '#333333', width: 2.5, dash: 'solid' }
                }]
                if (foVarData) {
                  // Align feature dates to volume dates by year-month so x-axis matches
                  const varMap = Object.fromEntries(
                    foVarData.map(r => [r.date.substring(0, 7), r.value])
                  )
                  const alignedY = actualRows.map(r => varMap[r.Date.substring(0, 7)] ?? null)
                  traces.push({
                    x: actualRows.map(r => r.Date),
                    y: alignedY,
                    mode: 'lines', name: foSelectedVar.display_name, type: 'scatter',
                    yaxis: 'y2',
                    line: { color: '#FFBD59', width: 2.5, dash: 'solid' },
                    marker: { color: '#FFBD59' }
                  })
                }
                return (
                  <div style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#333333', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📈 {foSelectedVar ? `${foSegment} Volume vs ${foSelectedVar.display_name}` : `Actual Volume — ${foSegment}`}
                      </div>
                      {correlation !== null && (
                        <div style={{ background: '#FFF8EC', border: '1px solid #FFBD59', borderRadius: 8, padding: '6px 14px', textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: '#666666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correlation</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: parseFloat(correlation) >= 0 ? '#41C185' : '#e53e3e' }}>{correlation}</div>
                        </div>
                      )}
                    </div>
                    <ChartPanel data={traces} layout={{
                      title: '', xaxis: { title: { text: 'Date' } },
                      yaxis: { title: { text: 'Volume' } },
                      yaxis2: foVarData ? { title: { text: foSelectedVar.display_name }, overlaying: 'y', side: 'right' } : undefined,
                      legend: { orientation: 'h', y: -0.25 },
                      height: 420
                    }} />
                    {foSelectedVar && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#666666' }}>
                        Click another variable to compare, or click the same to deselect.
                      </div>
                    )}
                  </div>
                )
              })() : (
                <div style={{ ...s.card, ...s.placeholder }}>
                  {foSegment ? 'Loading...' : '☝ Select a segment to view volume'}
                </div>
              )}
            </div>

            {/* Right panel — category accordion */}
            <div style={{ width: 280, flexShrink: 0, background: '#ffffff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '16px 12px', overflowY: 'auto', maxHeight: '75vh' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333333', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Categories</div>
              {Object.entries(featureCategories).map(([cat, vars]) => (
                <div key={cat} style={{ marginBottom: 6, border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
                  <div
                    onClick={() => setFeatureOpenCat(featureOpenCat === cat ? null : cat)}
                    style={{
                      padding: '9px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                      background: featureOpenCat === cat ? '#FFBD59' : '#F5F5F5',
                      color: '#333333', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      userSelect: 'none'
                    }}
                  >
                    <span>{cat}</span>
                    <span style={{ fontSize: 10 }}>{featureOpenCat === cat ? '▲' : '▼'}</span>
                  </div>
                  {featureOpenCat === cat && (
                    <div style={{ background: '#ffffff' }}>
                      {vars.map(v => (
                        <div key={v.variable_name}
                          onClick={async () => {
                            if (foSelectedVar?.variable_name === v.variable_name) {
                              setFoSelectedVar(null); setFoVarData(null); return
                            }
                            setFoSelectedVar(v)
                            try {
                              const r = await getFeatureVariable(v.variable_name)
                              setFoVarData(r.data.data)
                            } catch (e) { console.error(e) }
                          }}
                          style={{
                            padding: '8px 12px', fontSize: 12,
                            color: foSelectedVar?.variable_name === v.variable_name ? '#FFBD59' : '#333333',
                            background: foSelectedVar?.variable_name === v.variable_name ? '#FFF8EC' : '#ffffff',
                            borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                            fontWeight: foSelectedVar?.variable_name === v.variable_name ? 700 : 400
                          }}>
                          {v.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                const scColors = { 'Base Elasticity': '#FFBD59', '+10% Elasticity': '#41C185', '-10% Elasticity': '#458EE2' }
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
                // Use forecast_scenarios (Forecast Comparison table) as source
                const scenarioRows = forecastResult.forecast_scenarios
                  ?.filter(r => r.Scenario === scenarioTab && r.FiscalYear !== 'A26') || []

                // Recalculate 3-yr CAGR from growth rates in forecast_scenarios
                // CAGR = (∏(1 + g_i))^(1/n) - 1
                const growthValues = scenarioRows
                  .map(r => parseFloat(r['VolumeGrowth_%']))
                  .filter(v => !isNaN(v))
                const n = growthValues.length
                const cagr = n > 0
                  ? (growthValues.reduce((prod, g) => prod * (1 + g / 100), 1) ** (1 / n) - 1) * 100
                  : null

                const kpis = [
                  ...scenarioRows.map(r => ({
                    label: toFY(r.FiscalYear),
                    value: r['VolumeGrowth_%'] != null ? `${parseFloat(r['VolumeGrowth_%']).toFixed(1)}%` : '-',
                    sub: r.PredictedVolume != null ? parseFloat(r.PredictedVolume).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '-'
                  })),
                  ...(cagr !== null ? [{ label: `${n}-YR CAGR`, value: `${cagr.toFixed(1)}%`, sub: labelScenario(scenarioTab), isCAGR: true }] : [])
                ]
                if (!kpis.length) return null
                return (
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
                    {kpis.map((k, i) => (
                      <div key={i} style={{
                        flex: '1 1 120px', background: k.isCAGR ? '#333333' : '#ffffff',
                        borderRadius: 12, padding: '16px 20px',
                        border: k.isCAGR ? `2px solid #FFBD59` : '1px solid #e8e8e8',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: k.isCAGR ? '#FFBD59' : '#666666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: k.isCAGR ? '#FFBD59' : (parseFloat(k.value) >= 0 ? '#41C185' : '#458EE2'), lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 13, color: '#999999', marginTop: 5 }}>{k.sub}</div>
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

              {/* Volume table: same data as line chart */}
              <div style={s.section}>
                <ExpanderSection title="📋 Annual Volume — Historical & Forecast" defaultOpen={false}>
                  <DataTable
                    maxHeight="320px"
                    data={(forecastResult.plot_data || [])
                      .filter(r => r.Scenario === scenarioTab || r.Scenario === 'Historical')
                      .sort((a, b) => parseInt(a.FiscalYear.replace(/\D/g, '')) - parseInt(b.FiscalYear.replace(/\D/g, '')))
                      .map(r => ({
                        'Fiscal Year': toFY(r.FiscalYear),
                        'Segment': r.Segment,
                        'Volume': r.PredictedVolume != null ? parseFloat(r.PredictedVolume).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '-',
                        'Growth Rate (%)': r['VolumeGrowth_%'] != null ? `${parseFloat(r['VolumeGrowth_%']).toFixed(1)}%` : '-',
                        'Scenario': r.Scenario === 'Historical' ? 'Historical' : labelScenario(r.Scenario)
                      }))}
                  />
                </ExpanderSection>
              </div>

              {/* ── Waterfall ── */}
              <ExpanderSection title="🌊 Waterfall Configuration" defaultOpen>
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
                <div style={{ marginTop: 16 }}>
                  <span style={{ fontSize: 13, color: C.ochreDim }}>{toFY(wfStartFy)} → {toFY(wfEndFy)}</span>
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
