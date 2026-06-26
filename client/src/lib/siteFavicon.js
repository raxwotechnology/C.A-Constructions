import { mediaUrl } from './media'

/** Update document favicon from site logo URL (empty = default SVG). */
export function applySiteFavicon(logoUrl, cacheKey) {
  if (typeof document === 'undefined') return

  const logo = (logoUrl || '').trim()
  const v = cacheKey || Date.now()

  document
    .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
    .forEach((el) => el.remove())

  const link = document.createElement('link')
  link.rel = 'icon'

  if (logo) {
    let href = mediaUrl(logo)
    if (!href.startsWith('data:')) {
      href = `${href}?v=${v}`
    }
    link.href = href
    link.type = href.startsWith('data:') ? 'image/png' : (/\.(png|jpe?g|webp|gif|ico)(\?|$)/i.test(href) ? 'image/png' : 'image/svg+xml')
  } else {
    const origin = window.location.origin
    link.href = `${origin}/favicon.svg?v=${v}`
    link.type = 'image/svg+xml'
  }

  document.head.appendChild(link)
}
