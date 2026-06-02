import { useMemo } from 'react'
import { FiPrinter, FiSave, FiSend, FiDownload } from 'react-icons/fi'
import QuotationPrintBody from './QuotationPrintBody'
import { printHtmlContent } from '../../lib/documentPrint'
import {
  layoutPrintExtraCss,
  layoutToStyle,
  quotationLayoutFromSettings,
} from '../../lib/quotationPrintLayout'

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
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
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

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100/80">
        <div
          id={printRootId}
          className={`quotation-doc doc-print-frame mx-auto bg-white shadow-lg ${layout.showDocumentFrame ? 'border border-slate-200' : ''}`}
          style={layoutToStyle(layout)}
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
  )
}
