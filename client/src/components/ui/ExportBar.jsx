import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiDownload, FiPrinter, FiX, FiCheck, FiFileText } from 'react-icons/fi'
import toast from 'react-hot-toast'

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
export default function ExportBar({
  data = [],
  columns = [],
  title = 'Report',
  filters = {},
  onExportPDF,
  onExportExcel,
  hidePrint = false,
}) {
  const [modal, setModal] = useState(null) // null | 'pdf' | 'excel'

  const filterSummary = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')

  const previewRows = data.slice(0, 5)

  // ── Built-in PDF export via jsPDF + jsPDF-autoTable ────────────────────────
  const doPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape' })

      // Header
      doc.setFontSize(16)
      doc.setTextColor(0, 0, 128)
      doc.text('Raxwo Technology', 14, 18)
      doc.setFontSize(11)
      doc.setTextColor(80, 80, 80)
      doc.text(title, 14, 26)
      if (filterSummary) doc.text(`Filters: ${filterSummary}`, 14, 33)
      doc.setFontSize(9)
      doc.text(`Generated: ${new Date().toLocaleString()}  |  Records: ${data.length}`, 14, 40)

      autoTable(doc, {
        startY: 46,
        head: [columns.map(c => c.header)],
        body: data.map(row => columns.map(c =>
          typeof c.accessor === 'function' ? c.accessor(row) : (row[c.accessor] ?? '')
        )),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [0, 0, 128], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        didDrawPage: (d) => {
          const pageCount = doc.internal.getNumberOfPages()
          doc.setFontSize(8)
          doc.setTextColor(150)
          doc.text(`Page ${d.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 8)
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
      <div className="flex items-center gap-2">
        <button
          onClick={() => setModal('pdf')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
        >
          <FiFileText size={14} />
          <span>Export PDF</span>
        </button>
        <button
          onClick={() => setModal('excel')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          <FiDownload size={14} />
          <span>Export Excel</span>
        </button>
        {!hidePrint && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
          >
            <FiPrinter size={14} />
            <span className="hidden sm:inline">Print</span>
          </button>
        )}
      </div>

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
                    onClick={handleConfirm}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-medium transition-colors ${modal === 'pdf' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                    <FiCheck size={15} />
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
}
