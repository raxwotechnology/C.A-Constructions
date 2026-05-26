import { getApiBaseUrl } from './devApi'

/** Normalize any stored upload reference to `/uploads/...` */
export function normalizeUploadPath(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s)
      if (u.pathname.startsWith('/uploads/')) return u.pathname
      return s
    }
  } catch {
    /* ignore */
  }
  if (s.startsWith('/uploads/')) return s
  if (s.startsWith('uploads/')) return `/${s}`
  return s.startsWith('/') ? s : `/${s}`
}

/** Backend origin for uploads (no /api suffix). */
export function getUploadsOrigin() {
  const fromEnv = import.meta.env.VITE_UPLOADS_URL
  if (fromEnv) return String(fromEnv).replace(/\/$/, '')

  const apiBase = getApiBaseUrl()
  if (apiBase.startsWith('http')) {
    return apiBase.replace(/\/api\/?$/i, '') || apiBase
  }
  return ''
}

/**
 * Build a browser-safe URL for `/uploads/...` files.
 * - Dev: always relative `/uploads/...` (Vite proxies to the API server).
 * - Prod: relative when same host; otherwise uses API/uploads origin.
 */
export function mediaUrl(url) {
  const path = normalizeUploadPath(url)
  if (!path) return ''
  if (!path.startsWith('/uploads/')) return path

  if (typeof window === 'undefined') {
    const origin = getUploadsOrigin()
    return origin ? `${origin}${path}` : path
  }

  // Local dev: always use same-origin path so Vite `/uploads` proxy works.
  if (import.meta.env.DEV) {
    return path
  }

  const uploadsOrigin = getUploadsOrigin()
  if (uploadsOrigin && uploadsOrigin !== window.location.origin) {
    return `${uploadsOrigin}${path}`
  }

  return path
}

/** Full URL for print/PDF/html2canvas (same-origin in dev via Vite proxy). */
export function absoluteMediaUrl(url) {
  const path = mediaUrl(url)
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`
  }
  const origin = getUploadsOrigin()
  const suffix = path.startsWith('/') ? path : `/${path}`
  return origin ? `${origin}${suffix}` : path
}
