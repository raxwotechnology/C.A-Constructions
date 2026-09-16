import React, { useState, useMemo, useEffect } from 'react'
import { useSiteBranding } from '../../hooks/useSiteBranding'
import { mediaUrl } from '../../lib/media'

/**
 * Printable Document/Invoice/BOQ Layout Header Component for R.A CREATIONS & HOME DESIGNS (PVT) LTD
 */
export default function LetterheadHeader({
  logoUrl,
  companyTitle = 'R A CREATIONS & HOME DESIGNS (PVT) LTD',
  tagline = '',
  address = 'Sri Lanka / Kossinna',
  phone = '0770749690',
  email = 'racreationshd@gmail.com',
  website = 'www.rac.lk',
  refNo,
  projectName,
  siteLocation,
  date,
  className = '',
  showTagline = false,
}) {
  const { logoSrc: globalLogoSrc, siteName } = useSiteBranding()
  const [imgError, setImgError] = useState(false)

  // Format passed logoUrl using mediaUrl, or fallback to site branding logoSrc
  const finalLogoUrl = useMemo(() => {
    if (logoUrl && typeof logoUrl === 'string' && logoUrl.trim()) {
      const formatted = mediaUrl(logoUrl.trim());
      if (formatted) return formatted;
    }
    return globalLogoSrc;
  }, [logoUrl, globalLogoSrc]);

  useEffect(() => {
    setImgError(false)
  }, [finalLogoUrl])

  return (
    <header className={`rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 shadow-lg border-b-4 border-amber-500 mb-6 ${className}`}>
      {/* Top Main Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Logo & Company Title */}
        <div className="flex items-center gap-4">
          <div className="shrink-0 bg-white rounded-lg p-1.5 shadow-md w-[115px] h-[75px] flex items-center justify-center overflow-hidden">
            {finalLogoUrl && !imgError ? (
              <img
                src={finalLogoUrl}
                alt={companyTitle || siteName || 'Company Logo'}
                onError={() => setImgError(true)}
                className="w-[115px] h-[75px] object-contain"
              />
            ) : (
              <div className="w-[115px] h-[75px] bg-slate-900 text-white border border-slate-700 flex flex-col items-center justify-center text-center p-1 rounded">
                <span className="font-black text-base tracking-wider leading-none text-cyan-400">RA</span>
                <span className="text-[8px] font-extrabold text-amber-400 uppercase tracking-widest leading-none mt-1">CREATIONS</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-base sm:text-lg md:text-xl font-black tracking-wide text-white uppercase leading-tight max-w-lg break-words">
              {companyTitle || siteName}
            </h1>
            {showTagline && tagline && (
              <p className="text-xs font-bold text-cyan-400 tracking-wider mt-0.5">
                {tagline}
              </p>
            )}
            <div className="h-1 w-full max-w-[260px] bg-gradient-to-r from-amber-500 via-orange-400 to-cyan-400 rounded-full mt-2" />
          </div>
        </div>

        {/* Right: Contact Information */}
        <div className="text-left md:text-right shrink-0 text-xs text-slate-300 leading-relaxed font-medium">
          <p><span className="text-amber-400 font-bold">Address:</span> {address}</p>
          <p><span className="text-amber-400 font-bold">Tel:</span> {phone}</p>
          <p><span className="text-amber-400 font-bold">Email:</span> {email}</p>
          <p><span className="text-amber-400 font-bold">Web:</span> {website}</p>
        </div>
      </div>

      {/* Dynamic Metadata Fields */}
      {(refNo || projectName || siteLocation || date) && (
        <div className="mt-4 pt-3 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200 bg-slate-800/60 px-3 py-2 rounded-lg">
          {refNo && (
            <div>
              <span className="text-amber-400 font-bold uppercase tracking-wider">Ref No:</span>{' '}
              <span className="font-semibold text-white">{refNo}</span>
            </div>
          )}
          {projectName && (
            <div>
              <span className="text-cyan-400 font-bold uppercase tracking-wider">Project:</span>{' '}
              <span className="font-semibold text-white">{projectName}</span>
            </div>
          )}
          {siteLocation && (
            <div>
              <span className="text-amber-400 font-bold uppercase tracking-wider">Site Location:</span>{' '}
              <span className="font-semibold text-white">{siteLocation}</span>
            </div>
          )}
          {date && (
            <div>
              <span className="text-cyan-400 font-bold uppercase tracking-wider">Date:</span>{' '}
              <span className="font-semibold text-white">{date}</span>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
