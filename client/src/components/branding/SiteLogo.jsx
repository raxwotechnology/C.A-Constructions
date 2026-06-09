import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSiteBranding } from '../../hooks/useSiteBranding'

/**
 * @param {'light' | 'dark'} variant — dark = on navy/hero (white text); light = on white sidebar/cards
 */
export default function SiteLogo({
  to = '/',
  variant = 'light',
  showName = true,
  className = '',
  imgClassName = '',
  asLink = true,
}) {
  const { logoSrc, siteName, siteTagline, settings } = useSiteBranding()
  const [logoBroken, setLogoBroken] = useState(false)
  const isDark = variant === 'dark'
  const showLogoImg = Boolean(logoSrc && settings?.logoUrl && !logoBroken)

  // Reset broken state when the logo source changes
  useEffect(() => {
    setLogoBroken(false)
  }, [logoSrc, settings?.logoUrl])

  // Auto-retry loading the logo when the user returns to the tab (fixes disappearing after inactivity)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') setLogoBroken(false)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const nameCls = isDark ? 'text-white' : 'text-primary'
  const tagCls = isDark ? 'text-white/50' : 'text-slate-400'
  const tagline = (siteTagline && siteTagline.length <= 48) ? siteTagline : ''

  const inner = (
    <>
      {showLogoImg ? (
        <img
          src={logoSrc}
          alt={siteName}
          onError={() => setLogoBroken(true)}
          className={`object-contain flex-shrink-0 ${isDark ? 'h-10 w-auto max-w-[160px]' : 'h-10 w-auto max-w-[140px]'} ${imgClassName}`}
        />
      ) : (
        <div
          className={`flex-shrink-0 rounded-xl bg-gradient-blue flex items-center justify-center shadow-blue ${
            isDark ? 'w-10 h-10' : 'w-9 h-9'
          }`}
        >
          <span className={`text-white font-bold font-heading ${isDark ? 'text-lg' : ''}`}>R</span>
        </div>
      )}
      {showName && (
        <div className="min-w-0">
          <span className={`font-heading font-bold leading-none block truncate ${nameCls} ${isDark ? 'text-xl' : 'text-lg'}`}>
            {siteName}
          </span>
          {tagline && <p className={`text-xs leading-none mt-0.5 truncate ${tagCls}`}>{tagline}</p>}
        </div>
      )}
    </>
  )

  const wrapCls = `flex items-center gap-3 min-w-0 ${className}`

  if (asLink) {
    return (
      <Link to={to} className={wrapCls}>
        {inner}
      </Link>
    )
  }

  return <div className={wrapCls}>{inner}</div>
}
