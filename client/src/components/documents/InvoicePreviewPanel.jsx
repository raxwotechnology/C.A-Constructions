import { useEffect, useRef, useState } from 'react'
import { FiDownload, FiPrinter, FiSave, FiSend } from 'react-icons/fi'
import InvoicePrintBody from './InvoicePrintBody'
import { printHtmlContent } from '../../lib/documentPrint'
import { resolveDocumentTerms } from '../../lib/documentTerms'
import {
  layoutPrintExtraCss,
  layoutToStyle,
  loadQuotationLayout,
} from '../../lib/quotationPrintLayout'

const DOC_WIDTH_PX = 794

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
  const scrollRef = useRef(null)
  const docRef = useRef(null)
  const [fitScale, setFitScale] = useState(1)
  const [docHeight, setDocHeight] = useState(0)

  useEffect(() => {
    if (!scrollRef.current) return
    const ro = new ResizeObserver((entries) => {
      const container = entries[0]
      if (!container) return
      const cw = container.contentRect.width
      // 32px for padding if we want
      if (cw > 0 && cw < DOC_WIDTH_PX) {
        setFitScale(cw / DOC_WIDTH_PX)
      } else {
        setFitScale(1)
      }
    })
    ro.observe(scrollRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!docRef.current) return
    const ro = new ResizeObserver(() => {
      if (docRef.current) {
        setDocHeight(docRef.current.clientHeight)
      }
    })
    ro.observe(docRef.current)
    return () => ro.disconnect()
  }, [layout])

  const [draft, setDraft] = useState({
    notes: inv.notes || '',
    paymentTerms: resolveDocumentTerms(inv),
    showRefOnDocument: true,
  })

  useEffect(() => {
    setDraft({
      notes: inv.notes || '',
      paymentTerms: resolveDocumentTerms(inv),
      showRefOnDocument: !isDraft,
    })
  }, [inv._id])

  useEffect(() => {
    if (!isDraft) return
    setDraft((d) => ({
      ...d,
      notes: inv.notes ?? d.notes,
      paymentTerms: resolveDocumentTerms(inv) || d.paymentTerms,
    }))
  }, [isDraft, inv.notes, inv.paymentTerms, inv.terms])

  const merged = {
    ...inv,
    notes: draft.notes,
    paymentTerms: draft.paymentTerms,
    terms: draft.paymentTerms,
  }

  const handlePrint = () => {
    const el = document.getElementById(printRootId)
    if (!el) return
    const clone = el.cloneNode(true)
    clone.style.transform = ''
    clone.style.width = `${DOC_WIDTH_PX}px`
    printHtmlContent({
      title: siteSettings.siteName || 'Invoice',
      bodyHtml: clone.outerHTML,
      extraCss: layoutPrintExtraCss({ ...layout, showRefOnDocument: draft.showRefOnDocument }),
    })
  }

  const scaledWidth = DOC_WIDTH_PX * fitScale

  return (
    <div className="doc-preview-panel flex flex-col flex-1 min-h-0 min-w-0 h-full overflow-hidden">
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

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto p-0 md:p-8 bg-slate-100/80"
      >
        <div style={{ width: DOC_WIDTH_PX * fitScale, height: docHeight > 0 ? docHeight * fitScale : 'auto', margin: '0 auto' }}>
          <div
            id={printRootId}
            ref={docRef}
            className={`invoice-doc doc-print-frame mx-auto bg-white shadow-lg ${layout.showDocumentFrame ? 'border border-slate-200' : ''}`}
            style={{
              ...layoutToStyle(layout),
              width: DOC_WIDTH_PX,
              boxSizing: 'border-box',
              transform: `scale(${fitScale})`,
              transformOrigin: 'top center',
            }}
          >
            <InvoicePrintBody
              invoice={merged}
              siteSettings={siteSettings}
              showRefOnDocument={draft.showRefOnDocument}
              forPrint={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
