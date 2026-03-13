import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
})

// Auth header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Products ─────────────────────────────────────────────────
export const getProducts = (params) => api.get('/products', { params })
export const getProduct = (id) => api.get(`/products/${id}`)
export const getFeaturedProducts = () => api.get('/products/featured')

// ─── Categories ───────────────────────────────────────────────
export const getCategories = () => api.get('/categories')
export const getCategory = (slug) => api.get(`/categories/${slug}`)

// ─── Filters ──────────────────────────────────────────────────
export const getFilters = (params) => api.get('/filters', { params })

// ─── Currency ─────────────────────────────────────────────────
export const getCurrencyRate = () => api.get('/currency')

// ─── WhatsApp ─────────────────────────────────────────────────
export const createOrder = (data) => api.post('/whatsapp/order', data)
export const getWhatsappSettings = () => api.get('/whatsapp/settings')

// ─── Admin ────────────────────────────────────────────────────
export const adminLogin = (data) => api.post('/admin/login', data)
export const adminStats = () => api.get('/admin/stats')
export const adminGetProducts = (params) => api.get('/admin/products', { params })
export const adminUpdateProduct = (id, data) => api.patch(`/admin/products/${id}`, data)
export const adminGetCategories = () => api.get('/admin/categories')
export const adminCreateCategory = (data) => api.post('/admin/categories', data)
export const adminUpdateCategory = (id, data) => api.patch(`/admin/categories/${id}`, data)
export const adminGetSettings = () => api.get('/admin/settings')
export const adminUpdateSettings = (data) => api.patch('/admin/settings', data)
export const adminRunParser = (data) => api.post('/admin/parser/run', data)
export const adminUpdateProduct2 = (id) => api.post(`/admin/parser/update-product/${id}`)
export const adminParserStatus = () => api.get('/admin/parser/status')
export const adminParserLogs = () => api.get('/admin/parser/logs')
export const adminUpdateCurrency = () => api.post('/admin/currency/update')

export default api
