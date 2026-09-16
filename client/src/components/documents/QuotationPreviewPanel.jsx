import { useMemo } from 'react'
import { FiPrinter, FiSave, FiSend, FiDownload } from 'react-icons/fi'
import QuotationPrintBody from './QuotationPrintBody'
import { printHtmlContent } from '../../lib/documentPrint'
import {
  layoutPrintExtraCss,
  layoutToStyle,
  quotationLayoutFromSettings,
} from '../../lib/quotationPrintLayout'
import { useRef, useState, useEffect } from 'react'

const DOC_WIDTH_PX = 794


export default function QuotationPreviewPanel({
  quotation,
  siteSettings = {},
  bankLabel = '',
  onSaveDraft,
  onSend,
  onDownloadPdf,
  saving = false,
  isDraft = false,
  showSeal,
  printRootId = 'quotation-print-export-root',
}) {
  const q = quotation || {}
  const layout = useMemo(() => quotationLayoutFromSettings(siteSettings), [siteSettings])
  const mergedQuotation = q

  const resolvedShowSeal = showSeal !== undefined ? showSeal : (mergedQuotation.showSeal ?? true)

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
  }, [layout, mergedQuotation])

  const handlePrint = () => {
    const root = document.getElementById(printRootId)
    const inner = root?.innerHTML
    if (!inner) return
    const company = siteSettings.siteName || 'Quotation'
    printHtmlContent({
      title: company,
      bodyHtml: `<div class="doc-print-frame">${inner}</div>`,
      extraCss: layoutPrintExtraCss(layout),
    })
  }

  return (
    <div className="doc-preview-panel flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      {!isDraft && (
        <div className="no-print shrink-0 border-b bg-slate-50 px-4 py-3 flex flex-wrap items-center gap-2">
          {onSaveDraft && (
            <button type="button" disabled={saving} className="btn-outline btn-sm" onClick={() => onSaveDraft(mergedQuotation)}>
              <FiSave size={14} /> Save
            </button>
          )}
          {onSend && (
            <button type="button" className="btn-outline btn-sm" onClick={() => onSend(mergedQuotation)}>
              <FiSend size={14} /> Send
            </button>
          )}
          {onDownloadPdf && q._id && (
            <button type="button" className="btn-outline btn-sm" onClick={() => onDownloadPdf(q._id)}>
              <FiDownload size={14} /> PDF
            </button>
          )}
          <button type="button" className="btn-primary btn-sm" onClick={handlePrint}>
            <FiPrinter size={14} /> Print
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-0 md:p-8 bg-slate-100/80">
        <div style={{ width: DOC_WIDTH_PX * fitScale, height: docHeight > 0 ? docHeight * fitScale : 'auto', margin: '0 auto' }}>
          <div
            id={printRootId}
            ref={docRef}
            className={`quotation-doc doc-print-frame mx-auto bg-white shadow-lg ${layout.showDocumentFrame ? 'border border-slate-200' : ''}`}
            style={{
              ...layoutToStyle(layout),
              width: DOC_WIDTH_PX,
              boxSizing: 'border-box',
              transform: `scale(${fitScale})`,
              transformOrigin: 'top center',
            }}
          >
          <QuotationPrintBody
            quotation={mergedQuotation}
            siteSettings={siteSettings}
            preparedByDisplay={mergedQuotation.preparedBy}
            bankLabel={bankLabel}
            thankYouMessage={siteSettings.quotationThankYouMessage}
            showRefOnDocument={layout.showRefOnDocument}
            showSeal={resolvedShowSeal}
          />
        </div>
        </div>
      </div>
    </div>
  )
}
