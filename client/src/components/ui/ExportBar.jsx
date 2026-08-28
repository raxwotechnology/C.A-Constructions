import { useState, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiDownload, FiPrinter, FiX, FiCheck, FiFileText } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useSiteBranding } from '../../hooks/useSiteBranding'
import { buildCompanyFromSettings } from '../../lib/companyBranding'
import { drawQuotationStylePdfHeader, drawPdfReportMeta } from '../../lib/exportPdfHeader'
/**
 * ExportBar — PDF, Excel, and Print export buttons with preview confirmation modal
 *
 * Props:
 *   data           — array of records to export
 *   columns        — [{ header: string, accessor: fn | string }]
 *   title          — report title shown in modal and PDF header
 *   filters        — object describing active filters (shown in modal)
 *   onExportPDF    — optional override; if not provided uses built-in jsPDF
 *   onExportExcel  — optional override; if not provided uses built-in xlsx
 *   hidePrint      — boolean to hide print button
 */
const ExportBar = forwardRef(({
  data = [],
  columns = [],
  title = 'Report',
  filters = {},
  onExportPDF,
  onExportExcel,
  hidePrint = false,
  customTrigger = false,
}, ref) => {
  const [modal, setModal] = useState(null) // null | 'pdf' | 'excel'

  useImperativeHandle(ref, () => ({
    exportPDF: () => setModal('pdf'),
    exportExcel: () => setModal('excel'),
    print: () => handlePrint(),
  }))

  const filterSummary = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')

  const previewRows = data.slice(0, 5)
  const { settings } = useSiteBranding()
  const company = buildCompanyFromSettings(settings)

  // ── Built-in PDF export via jsPDF + jsPDF-autoTable ────────────────────────
  const doPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape' })
      const pageWidth = doc.internal.pageSize.width
      const headerEnd = await drawQuotationStylePdfHeader(doc, company, { pageWidth })
      const contentY = drawPdfReportMeta(doc, {
        title,
        filterSummary,
        recordCount: data.length,
        startY: headerEnd,
      })

      autoTable(doc, {
        startY: contentY,
        head: [columns.map(c => c.header)],
        body: data.map(row => columns.map(c =>
          typeof c.accessor === 'function' ? c.accessor(row) : (row[c.accessor] ?? '')
        )),
        styles: { fontSize: 9, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.3 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, cellPadding: 5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { textColor: [51, 65, 85] },
        didDrawPage: (d) => {
          const pageCount = doc.internal.getNumberOfPages()
          const pw = doc.internal.pageSize.width
          const ph = doc.internal.pageSize.height
          // Footer line
          doc.setDrawColor(226, 232, 240)
          doc.setLineWidth(0.3)
          doc.line(14, ph - 14, pw - 14, ph - 14)
          doc.setFontSize(7.5)
          doc.setTextColor(148, 163, 184)
          doc.text(`Page ${d.pageNumber} of ${pageCount}`, pw - 14, ph - 8, { align: 'right' })
          doc.text(company?.name || '', 14, ph - 8)
        },
      })

      doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF exported')
    } catch (e) {
      console.error(e)
      toast.error('PDF export failed — ensure jspdf and jspdf-autotable are installed')
    }
  }

  // ── Built-in Excel export via xlsx / SheetJS ───────────────────────────────
  const doExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const ws_data = [
        // Filters summary row
        filterSummary ? [`Filters: ${filterSummary}`] : [],
        [`Generated: ${new Date().toLocaleString()}  |  Records: ${data.length}`],
        [], // blank
        columns.map(c => c.header), // header row
        ...data.map(row => columns.map(c =>
          typeof c.accessor === 'function' ? c.accessor(row) : (row[c.accessor] ?? '')
        )),
      ].filter(r => r.length > 0)

      const ws = XLSX.utils.aoa_to_sheet(ws_data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
      XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel exported')
    } catch (e) {
      console.error(e)
      toast.error('Excel export failed — ensure xlsx is installed')
    }
  }

  const handleConfirm = () => {
    if (modal === 'pdf') { onExportPDF ? onExportPDF() : doPDF() }
    else { onExportExcel ? onExportExcel() : doExcel() }
    setModal(null)
  }

  const handlePrint = () => window.print()

  return (
    <>
      {!customTrigger && (
        <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
          <button
            type="button"
            onClick={() => setModal('pdf')}
            className="btn-export bg-red-600 hover:bg-red-700 text-white"
          >
            <FiFileText size={12} />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setModal('excel')}
            className="btn-export bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FiDownload size={12} />
            <span>Excel</span>
          </button>
          {!hidePrint && (
            <button
              type="button"
              onClick={handlePrint}
              className="btn-export bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <FiPrinter size={12} />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      {createPortal(
        <AnimatePresence>
          {modal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h3 className="font-bold text-primary font-heading">
                    Confirm {modal === 'pdf' ? 'PDF' : 'Excel'} Export
                  </h3>
                  <button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <FiX size={16} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">Report</p>
                      <p className="font-semibold text-primary text-sm">{title}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">Total Records</p>
                      <p className="font-bold text-primary text-lg">{data.length}</p>
                    </div>
                  </div>
                  {filterSummary && (
                    <div className="bg-blue-50 text-blue-700 rounded-xl p-3 text-sm">
                      <span className="font-medium">Filters:</span> {filterSummary}
                    </div>
                  )}

                  {/* Preview table */}
                  {previewRows.length > 0 && columns.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">
                        Preview (first {previewRows.length} rows)
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              {columns.map(c => (
                                <th key={c.header} className="text-left px-3 py-2 font-medium text-slate-600 whitespace-nowrap">
                                  {c.header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((row, i) => (
                              <tr key={i} className="border-t border-gray-50 hover:bg-slate-50">
                                {columns.map(c => (
                                  <td key={c.header} className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-[150px] truncate">
                                    {typeof c.accessor === 'function' ? c.accessor(row) : (row[c.accessor] ?? '—')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t flex justify-end gap-3">
                  <button onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-medium transition-colors ${modal === 'pdf' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    <FiCheck size={14} />
                    Confirm & Download
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
})

export default ExportBar
