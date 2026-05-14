import axios from 'axios'
import { getApiBaseUrl } from './devApi'

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('raxwo-auth')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`
    }
    // Instance default is application/json; FormData must omit Content-Type so the boundary is set.
    if (config.data instanceof FormData && config.headers) {
      if (typeof config.headers.delete === 'function') config.headers.delete('Content-Type')
      else delete config.headers['Content-Type']
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('raxwo-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
