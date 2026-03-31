import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

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

export default api
