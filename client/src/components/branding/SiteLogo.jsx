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
  const { siteName, siteTagline } = useSiteBranding()
  const isDark = variant === 'dark'
  
  // Use the old URL for dark variant (home page & footer), local curved badge for light variant (sidebar)
  const logoSrc = isDark 
    ? 'https://raxwo.net/wp-content/uploads/2025/07/1-1-e1753477709460.png' 
    : '/raxwo-logo-final.png'

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

  const nameCls = isDark ? 'text-white' : 'text-primary'

  const inner = (
    <>
      {!logoBroken ? (
        isDark ? (
          // Home page and Footer logo (plain image)
          <img
            src={logoSrc}
            alt={siteName || "Raxwo"}
            onError={() => setLogoBroken(true)}
            className={`object-contain flex-shrink-0 h-14 w-auto max-w-[200px] ${imgClassName}`}
          />
        ) : (
          // Sidebar logo (curved modern badge)
          <div className="relative group perspective-1000">
            <img
              src={logoSrc}
              alt={siteName || "Raxwo"}
              onError={() => setLogoBroken(true)}
              className={`object-cover flex-shrink-0 bg-black/90 rounded-2xl shadow-lg border border-white/10 group-hover:shadow-xl group-hover:scale-[1.02] transition-all duration-300 ease-out h-16 sm:h-20 w-auto ${imgClassName}`}
              style={{ transformStyle: 'preserve-3d' }}
            />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />
          </div>
        )
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
