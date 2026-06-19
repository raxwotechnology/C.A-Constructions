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
          className={`object-contain flex-shrink-0 ${isDark ? 'h-12 w-auto max-w-[180px]' : 'h-12 w-auto max-w-[160px]'} ${imgClassName}`}
        />
      ) : (
        <div className={`flex flex-col ${isDark ? 'items-start' : 'items-start'} justify-center`}>
          <div className={`flex items-center font-bold font-heading ${isDark ? 'text-[36px]' : 'text-[32px]'} leading-none tracking-widest`}>
            <span className={nameCls}>RAXW</span>
            <div className="relative flex items-center justify-center">
              <span className={nameCls}>O</span>
              <div className="absolute w-[8px] h-[8px] rounded-full bg-[#20b2f5] left-0 translate-x-0.5" />
            </div>
          </div>
          <span className="text-[#20b2f5] text-[10px] font-bold tracking-[0.4em] mt-1.5 ml-1 leading-none uppercase">
            Next Level Tech
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
