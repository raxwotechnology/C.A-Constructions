import { useEffect, useState } from 'react'
import { FiPrinter, FiSave, FiSend, FiDownload } from 'react-icons/fi'
import QuotationPrintBody from './QuotationPrintBody'
import { printHtmlContent } from '../../lib/documentPrint'
import {
  layoutPrintExtraCss,
  layoutToStyle,
  loadQuotationLayout,
  saveQuotationLayout,
} from '../../lib/quotationPrintLayout'

function LabelRange({ label, value, min, max, step, onChange }) {
  return (
    <label className="block text-xs">
      <span className="text-slate-500 flex justify-between mb-1">
        <span>{label}</span>
        <span className="font-mono text-slate-700">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-600"
      />
    </label>
  )
}

export default function QuotationPreviewPanel({
  quotation,
  siteSettings = {},
  bankLabel = '',
  onSaveDraft,
  onSend,
  onFieldSync,
  onDownloadPdf,
  saving = false,
  isDraft = false,
  printRootId = 'quotation-print-export-root',
}) {
  const q = quotation || {}
  const [layout, setLayout] = useState(loadQuotationLayout)
  const [draft, setDraft] = useState({
    preparedBy: q.preparedBy || q.generatedBy?.name || '',
    directorName: q.directorName || siteSettings.quotationDirectorName || '',
    notes: q.notes || '',
    terms: q.terms || '',
    thankYou: siteSettings.quotationThankYouMessage || 'Thank you for your business.',
    showSeal: true,
    showRefOnDocument: true,
  })

  const patchDraft = (partial) => {
    setDraft((d) => ({ ...d, ...partial }))
    onFieldSync?.(partial)
  }

  useEffect(() => {
    setDraft({
      preparedBy: q.preparedBy || q.generatedBy?.name || '',
      directorName: q.directorName || siteSettings.quotationDirectorName || '',
      notes: q.notes || '',
      terms: q.terms || '',
      thankYou: siteSettings.quotationThankYouMessage || 'Thank you for your business.',
      showSeal: true,
      showRefOnDocument: !isDraft,
    })
    setLayout(loadQuotationLayout())
  }, [q._id])

  useEffect(() => {
    if (!isDraft) return
    setDraft((d) => ({
      ...d,
      preparedBy: q.preparedBy ?? d.preparedBy,
      directorName: q.directorName ?? d.directorName,
      notes: q.notes ?? d.notes,
      terms: q.terms ?? d.terms,
    }))
  }, [isDraft, q.preparedBy, q.directorName, q.notes, q.terms])

  const mergedQuotation = {
    ...q,
    notes: draft.notes,
    terms: draft.terms,
    directorName: draft.directorName,
    preparedBy: draft.preparedBy,
  }

  const handlePrint = () => {
    const root = document.getElementById(printRootId)
    const inner = root?.innerHTML
    if (!inner) return
    const company = siteSettings.siteName || 'Quotation'
    printHtmlContent({
      title: company,
      bodyHtml: `<div class="doc-print-frame">${inner}</div>`,
      extraCss: layoutPrintExtraCss({ ...layout, showRefOnDocument: draft.showRefOnDocument }),
    })
  }

  const persistLayout = () => {
    saveQuotationLayout(layout)
  }

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 h-full overflow-hidden">
      <aside className="no-print w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r bg-slate-50 p-4 overflow-y-auto space-y-4 max-h-[40vh] lg:max-h-none">
        {isDraft && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            Live preview — fill the form and click <strong>Create Quotation</strong> to save.
          </p>
        )}
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Layout & typography</p>
        <LabelRange label="Font size (pt)" value={layout.fontSizePt} min={9} max={14} step={0.5} onChange={(v) => setLayout((l) => ({ ...l, fontSizePt: v }))} />
        <LabelRange label="Line height" value={layout.lineHeight} min={1.2} max={2} step={0.1} onChange={(v) => setLayout((l) => ({ ...l, lineHeight: v }))} />
        <LabelRange label="Page padding (mm)" value={layout.pagePaddingMm} min={8} max={24} step={1} onChange={(v) => setLayout((l) => ({ ...l, pagePaddingMm: v }))} />
        <LabelRange label="Header spacing" value={layout.headerSpacingPx} min={8} max={48} step={2} onChange={(v) => setLayout((l) => ({ ...l, headerSpacingPx: v }))} />
        <LabelRange label="Footer / seal spacing" value={layout.footerSpacingPx} min={16} max={64} step={2} onChange={(v) => setLayout((l) => ({ ...l, footerSpacingPx: v }))} />
        <LabelRange label="Table cell padding" value={layout.tableCellPaddingPx} min={6} max={16} step={1} onChange={(v) => setLayout((l) => ({ ...l, tableCellPaddingPx: v }))} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={layout.showDocumentFrame} onChange={(e) => setLayout((l) => ({ ...l, showDocumentFrame: e.target.checked }))} />
          Border frame on print
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={draft.showRefOnDocument} onChange={(e) => setDraft((d) => ({ ...d, showRefOnDocument: e.target.checked }))} />
          Show reference no. on document
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={draft.showSeal} onChange={(e) => setDraft((d) => ({ ...d, showSeal: e.target.checked }))} />
          Show director seal
        </label>
        <button type="button" className="btn-outline btn-sm w-full justify-center" onClick={persistLayout}>
          Save layout as default
        </button>

        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 pt-2 border-t">Editable content</p>
        <div>
          <label className="form-label text-xs">Prepared by</label>
          <input className="form-input text-sm" value={draft.preparedBy} onChange={(e) => patchDraft({ preparedBy: e.target.value })} />
        </div>
        <div>
          <label className="form-label text-xs">Director name</label>
          <input className="form-input text-sm" value={draft.directorName} onChange={(e) => patchDraft({ directorName: e.target.value })} />
        </div>
        <div>
          <label className="form-label text-xs">Thank you message</label>
          <textarea className="form-input text-sm resize-none" rows={2} value={draft.thankYou} onChange={(e) => setDraft((d) => ({ ...d, thankYou: e.target.value }))} />
        </div>
        <div>
          <label className="form-label text-xs">Notes</label>
          <textarea className="form-input text-sm resize-none" rows={3} value={draft.notes} onChange={(e) => patchDraft({ notes: e.target.value })} />
        </div>
        <div>
          <label className="form-label text-xs">Terms & conditions</label>
          <textarea className="form-input text-sm resize-none" rows={3} value={draft.terms} onChange={(e) => patchDraft({ terms: e.target.value })} />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {onSaveDraft && (
            <button type="button" disabled={saving} className="btn-outline btn-sm w-full justify-center" onClick={() => onSaveDraft(draft)}>
              <FiSave size={14} /> Save to quotation
            </button>
          )}
          {onSend && (
            <button type="button" className="btn-outline btn-sm w-full justify-center" onClick={() => onSend(draft)}>
              <FiSend size={14} /> Send…
            </button>
          )}
          {onDownloadPdf && q._id && (
            <button type="button" className="btn-outline btn-sm w-full justify-center" onClick={() => onDownloadPdf(q._id)}>
              <FiDownload size={14} /> Download PDF
            </button>
          )}
          <button type="button" className="btn-primary btn-sm w-full justify-center" onClick={handlePrint}>
            <FiPrinter size={14} /> Print / PDF
          </button>
        </div>
        <p className="text-[10px] text-slate-400 leading-snug">
          In the print dialog, turn off <strong>Headers and footers</strong> to hide date, URL, and page title.
        </p>
      </aside>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100/80">
        <div
          id={printRootId}
          className={`quotation-doc doc-print-frame mx-auto bg-white shadow-lg ${layout.showDocumentFrame ? 'border border-slate-200' : ''}`}
          style={layoutToStyle(layout)}
        >
          <QuotationPrintBody
            quotation={mergedQuotation}
            siteSettings={siteSettings}
            preparedByDisplay={draft.preparedBy}
            bankLabel={bankLabel}
            thankYouMessage={draft.thankYou}
            showRefOnDocument={draft.showRefOnDocument}
            showSeal={draft.showSeal}
            editableNotes={draft.notes}
            editableTerms={draft.terms}
            onNotesChange={(notes) => patchDraft({ notes })}
            onTermsChange={(terms) => patchDraft({ terms })}
            onThankYouChange={(thankYou) => setDraft((d) => ({ ...d, thankYou }))}
          />
        </div>
      </div>
    </div>
  )
}
