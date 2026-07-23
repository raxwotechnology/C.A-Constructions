import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSiteBranding } from '../../hooks/useSiteBranding'

/**
 * @param {'light' | 'dark'} variant — dark = on dark background (white text); light = on white/light sidebar/cards
 */
export default function SiteLogo({
  to = '/',
  variant = 'light',
  showName = true,
  className = '',
  imgClassName = '',
  asLink = true,
}) {
  const { siteName, siteTagline, logoUrl } = useSiteBranding()
  const isDark = variant === 'dark'

  const logoSrc = logoUrl ? logoUrl : ''
  const [logoBroken, setLogoBroken] = useState(false)

  useEffect(() => {
    setLogoBroken(false)
  }, [logoSrc])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') setLogoBroken(false)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const inner = (
    <>
      {logoSrc && !logoBroken ? (
        <div className="flex items-center gap-3">
          <img
            src={logoSrc}
            alt={siteName || 'R A Creations & Home Designs'}
            onError={() => setLogoBroken(true)}
            className={`object-contain flex-shrink-0 max-h-12 md:max-h-14 w-auto max-w-[220px] transition-transform hover:scale-[1.02] ${imgClassName}`}
          />
        </div>
      ) : (
        <div className="flex flex-col items-start justify-center">
          <div className={`font-black font-heading ${isDark ? 'text-white' : 'text-slate-900'} text-lg sm:text-xl tracking-tight leading-tight`}>
            {siteName || 'R A CREATIONS & HOME DESIGNS'}
          </div>
          <span className={`text-[10px] font-bold tracking-widest leading-none uppercase mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            {siteTagline || 'Construction & Architectural Solutions'}
          </span>
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
