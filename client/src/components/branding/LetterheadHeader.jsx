import React from 'react'

/**
/ * Printable Document/Invoice/BOQ Layout Header Component for R.A CREATIONS & HOME DESIGNS (PVT) LTD
 * 
 * Features:
 * - Header Banner: Modern top banner with dark navy/black background (#0f172a / #1e293b) & gold/cyan accents
 * - Logo Configuration: Top-left, fixed CSS dimensions width: 115px; height: 75px; object-fit: contain
 * - Company Title: R.A CREATIONS & HOME DESIGNS (PVT) LTD
 * - Tagline: Construction & Home Designs (Cyan Blue / Gold text)
 * - Right Contact Info: Address: Sri Lanka / Kossinna | Tel: 0770749690 | Email: racreationshd@gmail.com | Web: www.rac.lk
 * - Dynamic Metadata Fields: Ref No, Project Name, Site Location, Date
 */
export default function LetterheadHeader({
  logoUrl,
  companyTitle = 'R.A CREATIONS & HOME DESIGNS (PVT) LTD',
  tagline = 'Construction & Home Designs',
  address = 'Sri Lanka / Kossinna',
  phone = '0770749690',
  email = 'racreationshd@gmail.com',
  website = 'www.rac.lk',
  refNo,
  projectName,
  siteLocation,
  date,
  className = '',
}) {
  return (
    <header className={`rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 shadow-lg border-b-4 border-amber-500 mb-6 ${className}`}>
      {/* Top Main Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Logo & Company Title */}
        <div className="flex items-center gap-4">
          <div className="shrink-0 bg-white rounded-lg p-1 shadow-md w-[115px] h-[75px] flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Company Logo"
                className="w-[115px] h-[75px] object-contain"
              />
            ) : (
              <div className="w-[115px] h-[75px] bg-cyan-600 text-slate-900 flex items-center justify-center font-black text-2xl tracking-wider rounded">
                RAC
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-wide text-white uppercase leading-tight">
              {companyTitle}
            </h1>
            <p className="text-sm font-bold text-cyan-400 tracking-wider mt-0.5">
              {tagline}
            </p>
            <div className="h-1 w-44 bg-gradient-to-r from-amber-500 to-cyan-400 rounded-full mt-1.5" />
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
