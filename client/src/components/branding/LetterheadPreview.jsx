import { buildDocumentLetterheadHtml } from '../../lib/documentPrint'

/** Live preview — matches quotation / invoice letterhead exactly */
export default function LetterheadPreview({ settings }) {
  const merged = settings || {}

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
        Letterhead preview (Quotations, Invoices, Exports &amp; Letters)
      </p>
      <div className="overflow-x-auto w-full rounded bg-slate-50 border border-slate-100 pb-2">
        <div
          className="min-w-[700px] p-4"
          dangerouslySetInnerHTML={{
            __html: buildDocumentLetterheadHtml(merged, {
              forPrint: false,
              showTagline: merged.letterheadTagline || merged.siteDescription || 'Next Level Tech',
            }),
          }}
        />
      </div>
    </div>
  )
}
