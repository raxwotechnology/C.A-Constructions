import { useEffect, useState, useRef } from 'react'
import { FiDownload, FiPrinter, FiSave, FiSend } from 'react-icons/fi'
import InvoicePrintBody from './InvoicePrintBody'
import { printHtmlContent } from '../../lib/documentPrint'
import {
  layoutPrintExtraCss,
  layoutToStyle,
  loadQuotationLayout,
} from '../../lib/quotationPrintLayout'

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
  const [layout] = useState(loadQuotationLayout)
  const [draft, setDraft] = useState({ notes: inv.notes || '', paymentTerms: inv.paymentTerms || '', showRefOnDocument: true })

  const contentRef = useRef(null)
  const [autoScale, setAutoScale] = useState(1)

  const patchDraft = (partial) => {
    setDraft((d) => ({ ...d, ...partial }))
    onFieldSync?.(partial)
  }

  useEffect(() => {
    setDraft({ notes: inv.notes || '', paymentTerms: inv.paymentTerms || '', showRefOnDocument: !isDraft })
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

  useEffect(() => {
    const t = setTimeout(() => {
      if (!contentRef.current) return
      // A4 at 96dpi is 1123px tall. Padding top+bottom ~ 120px. Max inner height ~ 1000px.
      const el = contentRef.current.firstElementChild
      if (!el) return
      const h = el.scrollHeight || el.offsetHeight || 0
      if (h > 980) {
        setAutoScale(Math.max(0.65, 980 / h))
      } else {
        setAutoScale(1)
      }
    }, 150)
    return () => clearTimeout(t)
  }, [merged])

  const handlePrint = () => {
    const el = document.getElementById(printRootId)
    if (!el) return
    printHtmlContent({
      title: siteSettings.siteName || 'Invoice',
      bodyHtml: el.outerHTML,
      extraCss: layoutPrintExtraCss({ ...layout, showRefOnDocument: draft.showRefOnDocument }),
    })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      {/* Toolbar — shown only for saved invoices */}
      {!isDraft && (
        <div className="no-print shrink-0 border-b bg-slate-50 px-4 py-3 flex flex-wrap items-center gap-2">
          {onSaveDraft && (
            <button type="button" disabled={saving} className="btn-outline btn-sm" onClick={() => onSaveDraft(draft)}>
              <FiSave size={14} /> Save
            </button>
          )}
          {onSend && (
            <button type="button" className="btn-outline btn-sm" onClick={() => onSend(draft)}>
              <FiSend size={14} /> Send
            </button>
          )}
          {onDownloadPdf && inv._id && (
            <button type="button" className="btn-outline btn-sm" onClick={() => onDownloadPdf(inv._id)}>
              <FiDownload size={14} /> PDF
            </button>
          )}
          <button type="button" className="btn-primary btn-sm" onClick={handlePrint}>
            <FiPrinter size={14} /> Print / PDF
          </button>
        </div>
      )}

      {/* Document preview — full width, no sidebar */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100/80">
        <div
          id={printRootId}
          ref={contentRef}
          className={`invoice-doc doc-print-frame mx-auto bg-white shadow-lg ${layout.showDocumentFrame ? 'border border-slate-200' : ''}`}
          style={{ ...layoutToStyle(layout), minHeight: '1123px', width: '794px' }}
        >
          <div style={{ zoom: autoScale, transformOrigin: 'top left' }}>
            <InvoicePrintBody invoice={merged} siteSettings={siteSettings} showRefOnDocument={draft.showRefOnDocument} forPrint={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
