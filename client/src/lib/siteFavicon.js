import { mediaUrl } from './media'

/** Update document favicon & Open Graph share preview image from site logo URL. */
export function applySiteFavicon(logoUrl, cacheKey) {
  if (typeof document === 'undefined') return

  const logo = (logoUrl || '').trim()
  const v = cacheKey || Date.now()

  document
    .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="image_src"]')
    .forEach((el) => el.remove())

  const link = document.createElement('link')
  link.rel = 'icon'

  let fullLogoUrl = '/favicon.png'

  if (logo) {
    let href = mediaUrl(logo)
    if (!href.startsWith('data:') && !href.startsWith('blob:')) {
      href = `${href}?v=${v}`
    }
    link.href = href
    link.type = href.startsWith('data:') ? 'image/png' : (/\.(png|jpe?g|webp|gif|ico)(\?|$)/i.test(href) ? 'image/png' : 'image/svg+xml')
    fullLogoUrl = href
  } else {
    const origin = window.location.origin
    link.href = `${origin}/favicon.png`
    link.type = 'image/png'
    fullLogoUrl = `${origin}/favicon.png`
  }

  document.head.appendChild(link)

  // Update link[rel="image_src"] for WhatsApp/Viber link share crawlers
  const imageSrcLink = document.createElement('link')
  imageSrcLink.rel = 'image_src'
  imageSrcLink.href = fullLogoUrl
  document.head.appendChild(imageSrcLink)

  // Update Open Graph & Twitter meta tags for social link sharing
  const updateMeta = (selector, attr, value) => {
    let el = document.querySelector(selector)
    if (!el) {
      el = document.createElement('meta')
      const match = selector.match(/meta\[([^=]+)="([^"]+)"\]/)
      if (match) {
        el.setAttribute(match[1], match[2])
      }
      document.head.appendChild(el)
    }
    el.setAttribute(attr, value)
  }

  if (fullLogoUrl && !fullLogoUrl.startsWith('data:')) {
    updateMeta('meta[property="og:image"]', 'content', fullLogoUrl)
    updateMeta('meta[property="og:image:secure_url"]', 'content', fullLogoUrl)
    updateMeta('meta[name="twitter:image"]', 'content', fullLogoUrl)
  }
}
