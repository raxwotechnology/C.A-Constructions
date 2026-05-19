import { buildCompanyFromSettings, companyContactLines } from '../../lib/companyBranding'
import { absoluteMediaUrl } from '../../lib/media'

/** Live preview of agreement/letter header from site settings */
export default function LetterheadPreview({ settings }) {
  const company = buildCompanyFromSettings(settings || {})
  const logoSrc = absoluteMediaUrl(company.logoPath || company.logo)
  const lines = companyContactLines(company)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Letterhead preview (Agreements & Letters)</p>
      <div className="flex gap-4 border-b-2 border-primary/30 pb-4">
        <div className="shrink-0 w-20 h-16 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 p-1">
          {logoSrc ? (
            <img src={logoSrc} alt="" className="max-h-full max-w-full object-contain" onError={(e) => { e.target.style.display = 'none' }} />
          ) : (
            <span className="text-2xl font-black text-primary">{(company.name || 'C').charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-base font-bold text-primary leading-tight">{company.name}</p>
          {company.tagline ? <p className="text-xs text-slate-500 italic mt-0.5">{company.tagline}</p> : null}
          <div className="mt-2 space-y-0.5 text-xs text-slate-600">
            {lines.length === 0 ? (
              <p className="text-amber-600">Add address, phone, and email below — then save.</p>
            ) : (
              lines.map((l) => (
                <p key={l.label}>
                  <span className="text-slate-400">{l.label}:</span> {l.text}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
