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
  
  // Use the new URL for both variants
  const logoSrc = 'https://raxwo.net/wp-content/uploads/2025/07/1-1-e1753477709460.png'

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
            className={`object-contain flex-shrink-0 h-10 md:h-14 w-auto max-w-[200px] ${imgClassName}`}
          />
        ) : (
          // Premium Admin Sidebar Logo (Advanced Pill)
          <div className="relative group perspective-1000 inline-block">
            {/* Outer wrapper for gradient border effect */}
            <div className="relative bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.1)] border border-slate-700/50 p-[1px] group-hover:shadow-[0_8px_25px_rgba(32,178,245,0.25)] group-hover:border-[#20b2f5]/30 transition-all duration-500 ease-out">
              
              {/* Inner container */}
              <div className="bg-gradient-to-b from-[#0A0F1C] to-[#0d1326] rounded-full px-6 py-2.5 flex items-center justify-center relative overflow-hidden z-10">
                {/* Shine effect on hover */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-[#20b2f5]/20 to-transparent -skew-x-12 -translate-x-[150%] group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out" />
                </div>
                
                <img
                  src={logoSrc}
                  alt={siteName || "Raxwo"}
                  onError={() => setLogoBroken(true)}
                  className={`object-contain h-8 md:h-12 w-auto max-w-[180px] drop-shadow-md relative z-10 group-hover:drop-shadow-[0_0_8px_rgba(32,178,245,0.4)] transition-all duration-300 ${imgClassName}`}
                />
              </div>
            </div>
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
