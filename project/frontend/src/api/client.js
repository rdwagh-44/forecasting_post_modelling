import axios from 'axios'

// For local dev: '/api' (uses Vite proxy)
// For ngrok sharing: replace with your ngrok backend URL e.g. 'https://abc123.ngrok-free.app'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '/api'

const api = axios.create({ baseURL: BACKEND_URL })

export const uploadDataset   = (file) => { const f = new FormData(); f.append('file', file); return api.post('/upload/dataset', f) }
export const uploadElasticity = (file) => { const f = new FormData(); f.append('file', file); return api.post('/upload/elasticity', f) }
export const uploadGrowth    = (file) => { const f = new FormData(); f.append('file', file); return api.post('/upload/growth', f) }

export const getSegments      = ()        => api.get('/data/segments')
export const getPresenceTable = ()        => api.get('/data/presence-table')
export const getGrowthTable   = (segment) => api.get('/data/growth-table', { params: { segment } })
export const getHistoricalGrowth = (segment) => api.get('/data/historical-growth', { params: segment ? { segment } : {} })
export const getVariables     = (segment) => api.get('/data/variables', { params: { segment } })

export const calculateForecast  = (payload) => api.post('/calculate/forecast', payload)
export const calculateWaterfall = (payload) => api.post('/calculate/waterfall', payload)

export const getVolumeOverviewSegments = () => api.get('/volume-overview/segments')
export const getVolumeOverviewData = (segment) => api.get('/volume-overview/data', { params: { segment } })
export const getFeatureCategories = () => api.get('/feature-overview/categories')
export const getFeatureVariable = (variable) => api.get('/feature-overview/variable', { params: { variable } })
export const getFeatureCorrelations = (segment) => api.get('/feature-overview/correlations', { params: { segment } })
export const getCorrelationMatrix = (segment) => api.get('/feature-overview/correlation-matrix', { params: { segment } })

export default api
