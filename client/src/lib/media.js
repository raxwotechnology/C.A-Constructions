const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const SERVER_ORIGIN = API_BASE.replace(/\/api\/?$/, '')

export function mediaUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${SERVER_ORIGIN}${url}`
  return `${SERVER_ORIGIN}/${url}`
}

