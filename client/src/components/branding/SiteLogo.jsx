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

  const nameCls = isDark ? 'text-white' : 'text-primary'

  const inner = (
    <>
      {logoSrc && !logoBroken ? (
        isDark ? (
          <img
            src={logoSrc}
            alt={siteName || "R A Creations & Home Designs"}
            onError={() => setLogoBroken(true)}
            className={`object-contain flex-shrink-0 h-10 md:h-14 w-auto max-w-[200px] ${imgClassName}`}
          />
        ) : (
          <div className="relative group perspective-1000 inline-block">
            <div className="relative bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.1)] border border-slate-700/50 p-[1px] group-hover:shadow-[0_8px_25px_rgba(32,178,245,0.25)] group-hover:border-[#20b2f5]/30 transition-all duration-500 ease-out">
              <div className="bg-gradient-to-b from-[#0A0F1C] to-[#0d1326] rounded-xl px-4 py-2 flex items-center justify-center relative overflow-hidden z-10">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-[#20b2f5]/20 to-transparent -skew-x-12 -translate-x-[150%] group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out" />
                </div>
                
                <img
                  src={logoSrc}
                  alt={siteName || "R A Creations & Home Designs"}
                  onError={() => setLogoBroken(true)}
                  className={`object-contain h-7 md:h-10 w-auto max-w-[160px] drop-shadow-md relative z-10 ${imgClassName}`}
                />
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-col items-start justify-center">
          <div className={`font-black font-heading ${isDark ? 'text-xl text-white' : 'text-xl text-slate-800'} tracking-wide leading-tight`}>
            R A CREATIONS
          </div>
          <span className="text-[#20b2f5] text-[10px] font-extrabold tracking-wider leading-none uppercase mt-0.5">
            {siteTagline || "Home Designs & Construction"}
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
