import { useEffect, useState } from 'react'
import { FiDownload, FiPrinter, FiSave, FiSend } from 'react-icons/fi'
import InvoicePrintBody from './InvoicePrintBody'
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
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-sky-600" />
    </label>
  )
}

export default function InvoicePreviewPanel({
  invoice,
  siteSettings = {},
  onSaveDraft,
  onSend,
  onFieldSync,
  onDownloadPdf,
  saving = false,
  isDraft = false,
  printRootId = 'invoice-form-preview-root',
}) {
  const inv = invoice || {}
  const [layout, setLayout] = useState(loadQuotationLayout)
  const [draft, setDraft] = useState({ notes: inv.notes || '', paymentTerms: inv.paymentTerms || '', showRefOnDocument: true })

  const patchDraft = (partial) => {
    setDraft((d) => ({ ...d, ...partial }))
    onFieldSync?.(partial)
  }

  useEffect(() => {
    setDraft({ notes: inv.notes || '', paymentTerms: inv.paymentTerms || '', showRefOnDocument: !isDraft })
    setLayout(loadQuotationLayout())
  }, [inv._id])

  useEffect(() => {
    if (!isDraft) return
    setDraft((d) => ({
      ...d,
      notes: inv.notes ?? d.notes,
      paymentTerms: inv.paymentTerms ?? d.paymentTerms,
    }))
  }, [isDraft, inv.notes, inv.paymentTerms])

  const merged = { ...inv, notes: draft.notes, paymentTerms: draft.paymentTerms }

  const handlePrint = () => {
    const inner = document.getElementById(printRootId)?.innerHTML
    if (!inner) return
    printHtmlContent({
      title: siteSettings.siteName || 'Invoice',
      bodyHtml: `<div class="doc-print-frame">${inner}</div>`,
      extraCss: layoutPrintExtraCss({ ...layout, showRefOnDocument: draft.showRefOnDocument }),
    })
  }

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 h-full overflow-hidden">
      <aside className="no-print w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r bg-slate-50 p-4 overflow-y-auto space-y-4 max-h-[40vh] lg:max-h-none">
        {isDraft && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            Live preview — click <strong>Create Invoice</strong> to save.
          </p>
        )}
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Layout</p>
        <LabelRange label="Font size (pt)" value={layout.fontSizePt} min={9} max={14} step={0.5} onChange={(v) => setLayout((l) => ({ ...l, fontSizePt: v }))} />
        <LabelRange label="Line height" value={layout.lineHeight} min={1.2} max={2} step={0.1} onChange={(v) => setLayout((l) => ({ ...l, lineHeight: v }))} />
        <LabelRange label="Page padding (mm)" value={layout.pagePaddingMm} min={8} max={24} step={1} onChange={(v) => setLayout((l) => ({ ...l, pagePaddingMm: v }))} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={layout.showDocumentFrame} onChange={(e) => setLayout((l) => ({ ...l, showDocumentFrame: e.target.checked }))} />
          Border frame
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.showRefOnDocument} onChange={(e) => patchDraft({ showRefOnDocument: e.target.checked })} />
          Show reference on document
        </label>
        <button type="button" className="btn-outline btn-sm w-full justify-center" onClick={() => saveQuotationLayout(layout)}>
          Save layout as default
        </button>
        <div className="border-t pt-3 space-y-2">
          <label className="form-label text-xs">Notes</label>
          <textarea className="form-input text-sm resize-none" rows={2} value={draft.notes} onChange={(e) => patchDraft({ notes: e.target.value })} />
          <label className="form-label text-xs">Payment terms</label>
          <textarea className="form-input text-sm resize-none" rows={2} value={draft.paymentTerms} onChange={(e) => patchDraft({ paymentTerms: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2 pt-2">
          {onSaveDraft && (
            <button type="button" disabled={saving} className="btn-outline btn-sm w-full justify-center" onClick={() => onSaveDraft(draft)}>
              <FiSave size={14} /> Save to invoice
            </button>
          )}
          {onSend && (
            <button type="button" className="btn-outline btn-sm w-full justify-center" onClick={() => onSend(draft)}>
              <FiSend size={14} /> Send…
            </button>
          )}
          {onDownloadPdf && inv._id && (
            <button type="button" className="btn-outline btn-sm w-full justify-center" onClick={() => onDownloadPdf(inv._id)}>
              <FiDownload size={14} /> Download PDF
            </button>
          )}
          <button type="button" className="btn-primary btn-sm w-full justify-center" onClick={handlePrint}>
            <FiPrinter size={14} /> Print / PDF
          </button>
        </div>
      </aside>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100/80">
        <div
          id={printRootId}
          className={`invoice-doc doc-print-frame mx-auto bg-white shadow-lg ${layout.showDocumentFrame ? 'border border-slate-200' : ''}`}
          style={layoutToStyle(layout)}
        >
          <InvoicePrintBody invoice={merged} siteSettings={siteSettings} showRefOnDocument={draft.showRefOnDocument} />
        </div>
      </div>
    </div>
  )
}
