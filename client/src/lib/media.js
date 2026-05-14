import { getApiBaseUrl } from './devApi'

const API_BASE = getApiBaseUrl()
const SERVER_ORIGIN = API_BASE.startsWith('http')
  ? API_BASE.replace(/\/api\/?$/i, '')
  : ''

export function mediaUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${SERVER_ORIGIN}${url}`
  return `${SERVER_ORIGIN}/${url}`
}

