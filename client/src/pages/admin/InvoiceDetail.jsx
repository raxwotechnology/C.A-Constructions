import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiX, FiPrinter, FiDollarSign, FiCreditCard, FiCalendar, FiClock, FiCheckCircle, FiAlertTriangle, FiFileText, FiDownload } from 'react-icons/fi'
import { printHtmlContent } from '../../lib/documentPrint'
import { layoutPrintExtraCss, loadQuotationLayout } from '../../lib/quotationPrintLayout'
import InvoicePrintBody from '../../components/documents/InvoicePrintBody'
import InvoicePreviewPanel from '../../components/documents/InvoicePreviewPanel'

const STATUS_COLORS = { draft: 'badge-gray', unpaid: 'badge-yellow', partial: 'badge-blue', paid: 'badge-green', overdue: 'badge-red', cancelled: 'badge-gray' }

export default function InvoiceDetail({ invoiceId, onClose }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('Overview')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { date: new Date().toISOString().split('T')[0], method: 'cash' } })

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => api.get(`/invoices/${invoiceId}`).then(r => r.data),
    enabled: !!invoiceId,
  })

  const { data: bankData } = useQuery({ queryKey: ['bank-accounts'], queryFn: () => api.get('/bank-accounts').then(r => r.data) })
  const bankAccounts = bankData?.accounts || []

  const { data: siteRes } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.get('/site-settings').then((r) => r.data),
  })
  const site = siteRes?.settings || {}

  const invalidateFinance = () => {
    qc.invalidateQueries({ queryKey: ['finance-overview'] })
    qc.invalidateQueries({ queryKey: ['finance-entries-category'] })
    qc.invalidateQueries({ queryKey: ['finance-pl'] })
    qc.invalidateQueries({ queryKey: ['finance-entries'] })
    qc.invalidateQueries({ queryKey: ['analytics'] })
  }

  const recordPayMut = useMutation({
    mutationFn: d => api.post(`/invoices/${invoiceId}/payments`, d),
    onSuccess: () => {
      qc.invalidateQueries(['invoice', invoiceId])
      qc.invalidateQueries(['admin-invoices'])
      qc.invalidateQueries({ queryKey: ['bank-accounts'] })
      invalidateFinance()
      toast.success('Payment recorded')
      setShowPaymentModal(false)
      reset()
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to record payment'),
  })

  const recordAdvMut = useMutation({
    mutationFn: d => api.post(`/invoices/${invoiceId}/advances`, d),
    onSuccess: () => {
      qc.invalidateQueries(['invoice', invoiceId])
      qc.invalidateQueries(['admin-invoices'])
      qc.invalidateQueries({ queryKey: ['bank-accounts'] })
      invalidateFinance()
      toast.success('Advance recorded')
      setShowAdvanceModal(false)
      reset()
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to record advance'),
  })

  const cancelMut = useMutation({
    mutationFn: () => api.put(`/invoices/${invoiceId}`, { status: 'cancelled' }),
    onSuccess: () => {
      qc.invalidateQueries(['invoice', invoiceId])
      qc.invalidateQueries(['admin-invoices'])
      invalidateFinance()
      toast.success('Invoice cancelled')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to cancel'),
  })

  if (!invoiceId) return null
  if (isLoading) return null
  const inv = data?.invoice
  if (!inv) return null

  const isOverdue = inv.status === 'overdue'
  const cur = inv.currency || 'LKR'

  const handlePrint = () => {
    const el = document.getElementById('invoice-print-export-root')
    if (!el) return
    const layout = loadQuotationLayout()
    printHtmlContent({
      title: site.siteName || 'Invoice',
      bodyHtml: `<div class="invoice-doc doc-print-frame" style="font-size:${layout.fontSizePt}pt;line-height:${layout.lineHeight};padding:${layout.pagePaddingMm}mm">${el.innerHTML}</div>`,
      extraCss: layoutPrintExtraCss(layout),
    })
  }

  const handlePdfPaymentHistory = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()
      const { buildCompanyFromSettings } = await import('../../lib/companyBranding')
      const { drawQuotationStylePdfHeader, drawPdfReportMeta } = await import('../../lib/exportPdfHeader')
      const company = buildCompanyFromSettings(site)
      const headerEnd = await drawQuotationStylePdfHeader(doc, company)
      const y = drawPdfReportMeta(doc, {
        title: `Payment history — Invoice ${inv.invoiceNo}`,
        recordCount: (inv.payments || []).length,
        startY: headerEnd,
      })
      const rows = (inv.payments || []).map((p) => [
        new Date(p.date).toLocaleDateString('en-LK'),
        p.isAdvance ? 'Advance' : 'Payment',
        String(p.method || '').replace('_', ' '),
        p.reference || '—',
        `${cur} ${Number(p.amount || 0).toLocaleString()}`,
      ])
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Type', 'Method', 'Reference', `Amount (${cur})`]],
        body: rows.length ? rows : [['—', '—', '—', '—', 'No payments']],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [11, 31, 58] },
      })
      doc.save(`invoice-${inv.invoiceNo}-payment-history.pdf`)
      toast.success('PDF downloaded')
    } catch (e) {
      console.error(e)
      toast.error('Could not generate PDF')
    }
  }

  const downloadInvoicePdf = async (id, invoiceNo) => {
    try {
      const { htmlStringToPdfDownload } = await import('../../lib/pdfGenerator')
      const res = await api.get(`/invoices/${id}/pdf?html=true`, { responseType: 'text' })
      const htmlStr = typeof res.data === 'string' ? res.data : await res.data.text()
      const fname = `Invoice_${invoiceNo}.pdf`
      toast.loading('Generating PDF...', { id: 'pdf-toast' })
      await htmlStringToPdfDownload(htmlStr, fname)
      toast.success('PDF downloaded', { id: 'pdf-toast' })
    } catch (e) {
      console.error(e)
      toast.error('Failed to download PDF', { id: 'pdf-toast' })
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" >
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`relative p-4 sm:p-6 border-b text-white flex-shrink-0 ${isOverdue ? 'bg-gradient-to-r from-red-900 to-red-700' : 'bg-gradient-to-r from-slate-900 to-slate-800'}`}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg text-white transition-colors z-10"><FiX size={20}/></button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-white">{inv?.invoiceNo}</h2>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-white/20 shrink-0`}>{inv?.status}</span>
              </div>
              <p className="text-sm text-slate-300 flex items-start sm:items-center gap-1.5 line-clamp-2 sm:line-clamp-1">
                <FiFileText className="shrink-0 mt-0.5 sm:mt-0"/> <span>{inv?.client?.name} {inv?.project ? `— ${inv.project.title}` : ''}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
              {inv?.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => { if (window.confirm('Cancel this invoice? It will be excluded from revenue and reports.')) cancelMut.mutate() }}
                  disabled={cancelMut.isPending}
                  className="btn-outline border-amber-300/50 text-amber-100 hover:bg-amber-500/20 btn-sm shrink-0 whitespace-nowrap"
                >
                  Cancel
                </button>
              )}
              <button type="button" onClick={() => downloadInvoicePdf(inv._id, inv.invoiceNo)} className="btn-primary btn-sm shrink-0 whitespace-nowrap"><FiDownload size={14}/> PDF</button>
              <button type="button" onClick={() => { setActiveTab('Overview'); setTimeout(handlePrint, 100) }} className="btn-outline border-white/30 text-white hover:bg-white/10 btn-sm shrink-0 whitespace-nowrap"><FiPrinter size={14}/> Print</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 sm:px-6 border-b bg-slate-50 overflow-x-auto hide-scrollbar flex-shrink-0">
          {['Overview', 'Line Items', 'Payments & Advances', 'Document Preview'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 sm:px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors shrink-0 ${activeTab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              {/* Financial Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm flex sm:block justify-between items-center">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider sm:mb-1">Total Amount</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{inv?.currency} {(inv?.total || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm flex sm:block justify-between items-center">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider sm:mb-1">Total Paid</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{inv?.currency} {(inv?.totalPaid || 0).toLocaleString()}</p>
                </div>
                <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex sm:block justify-between items-center ${inv?.remainingBalance > 0 ? (isOverdue ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200') : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider sm:mb-1 ${inv?.remainingBalance > 0 ? (isOverdue ? 'text-red-500' : 'text-orange-500') : 'text-green-600'}`}>Balance Due</p>
                  <p className={`text-xl sm:text-2xl font-bold ${inv?.remainingBalance > 0 ? (isOverdue ? 'text-red-700' : 'text-orange-700') : 'text-green-700'}`}>{inv?.currency} {(inv?.remainingBalance || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-slate-50 font-semibold text-slate-700 flex items-center gap-2"><FiClock/> Invoice Details</div>
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                  <div className="p-5 space-y-4">
                    <div><p className="text-xs text-slate-400 mb-0.5">Invoice Date</p><p className="font-medium text-slate-800">{new Date(inv?.invoiceDate).toLocaleDateString('en-LK')}</p></div>
                    <div><p className="text-xs text-slate-400 mb-0.5">Due Date</p><p className={`font-medium ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-800'}`}>{inv?.dueDate ? new Date(inv?.dueDate).toLocaleDateString('en-LK') : 'N/A'}</p></div>
                    {inv?.invoiceNo && <div><p className="text-xs text-slate-400 mb-0.5">Invoice No.</p><p className="font-medium text-secondary font-mono">{inv.invoiceNo}</p></div>}
                  </div>
                  <div className="p-5 space-y-4">
                    <div><p className="text-xs text-slate-400 mb-0.5">Client</p><p className="font-medium text-slate-800">{inv?.client?.name}</p><p className="text-sm text-slate-500">{inv?.client?.email}</p></div>
                    {inv?.branch && <div><p className="text-xs text-slate-400 mb-0.5">Branch</p><p className="font-medium text-slate-800">{inv?.branch?.name}</p></div>}
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid md:grid-cols-2 gap-6">
                {inv?.notes && (
                  <div className="bg-white rounded-2xl shadow-sm border p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Notes</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{inv.notes}</p>
                  </div>
                )}
                {inv?.paymentTerms && (
                  <div className="bg-white rounded-2xl shadow-sm border p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Terms & Conditions</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{inv.paymentTerms || inv.terms}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Line Items' && (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto hide-scrollbar">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b text-slate-600">
                    <tr>
                      <th className="p-4 font-semibold min-w-[200px]">Description</th>
                      <th className="p-4 font-semibold text-center">Qty</th>
                      <th className="p-4 font-semibold text-right">Unit Price</th>
                      <th className="p-4 font-semibold text-right">Disc %</th>
                      <th className="p-4 font-semibold text-right">Tax %</th>
                      <th className="p-4 font-semibold text-right">Total ({inv?.currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inv?.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="p-4 font-medium text-slate-800">{item.description}</td>
                        <td className="p-4 text-center text-slate-600">{item.quantity}</td>
                        <td className="p-4 text-right text-slate-600">{item.unitPrice?.toLocaleString()}</td>
                        <td className="p-4 text-right text-slate-600">{item.discount || 0}%</td>
                        <td className="p-4 text-right text-slate-600">{item.tax || 0}%</td>
                        <td className="p-4 text-right font-medium text-slate-800">{item.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 p-4 sm:p-6 border-t flex justify-end">
                <div className="w-full sm:w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>{(inv?.subtotal || 0).toLocaleString()}</span></div>
                  {inv?.discountTotal > 0 && <div className="flex justify-between text-slate-600"><span>Discount:</span><span>-{(inv?.discountTotal || 0).toLocaleString()}</span></div>}
                  {inv?.tax > 0 && <div className="flex justify-between text-slate-600"><span>Tax ({inv?.taxRate}% global):</span><span>+{(inv?.tax || 0).toLocaleString()}</span></div>}
                  <div className="flex justify-between font-bold text-lg text-slate-800 pt-2 border-t"><span>Grand Total:</span><span>{(inv?.total || 0).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Payments & Advances' && (
            <div className="space-y-6">
              <div className="flex gap-2 sm:justify-end overflow-x-auto hide-scrollbar pb-2">
                <button onClick={() => { setShowAdvanceModal(true); reset() }} className="btn-outline btn-sm shrink-0 whitespace-nowrap"><FiDollarSign size={14}/> Record Advance</button>
                <button onClick={() => { setShowPaymentModal(true); reset() }} disabled={inv?.remainingBalance === 0} className="btn-primary btn-sm shrink-0 whitespace-nowrap"><FiCreditCard size={14}/> Record Payment</button>
                <button type="button" onClick={handlePrint} className="btn-outline btn-sm shrink-0 whitespace-nowrap"><FiPrinter size={14}/> Print History</button>
                <button type="button" onClick={handlePdfPaymentHistory} className="btn-outline btn-sm shrink-0 whitespace-nowrap"><FiDownload size={14}/> PDF History</button>
              </div>

              {/* Payments Table */}
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-slate-50 font-semibold text-slate-700">Payment & Advance History</div>
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="border-b text-slate-500">
                      <tr>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold">Type</th>
                        <th className="p-3 font-semibold">Method</th>
                        <th className="p-3 font-semibold">Reference</th>
                        <th className="p-3 font-semibold">Recorded By</th>
                        <th className="p-3 font-semibold text-right">Amount ({inv?.currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inv?.payments?.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">No payments recorded yet.</td></tr>
                      ) : inv?.payments?.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-slate-600">{new Date(p.date).toLocaleDateString('en-LK')}</td>
                          <td className="p-3">{p.isAdvance ? <span className="badge badge-purple">Advance</span> : <span className="badge badge-blue">Payment</span>}</td>
                          <td className="p-3 capitalize text-slate-600">{p.method.replace('_', ' ')}</td>
                          <td className="p-3 text-slate-500 text-xs font-mono">{p.reference || '-'}</td>
                          <td className="p-3 text-slate-600">{p.recordedBy?.name || 'System'}</td>
                          <td className="p-3 text-right font-bold text-slate-800">{p.amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-8 text-sm">
                  <div className="flex justify-between sm:block text-right"><p className="text-slate-500 text-left sm:text-right">Total Advances:</p><p className="font-bold text-slate-800">{cur} {(inv?.totalAdvances || 0).toLocaleString()}</p></div>
                  <div className="flex justify-between sm:block text-right"><p className="text-slate-500 text-left sm:text-right">Total Paid (All):</p><p className="font-bold text-green-600">{cur} {(inv?.totalPaid || 0).toLocaleString()}</p></div>
                  <div className="flex justify-between sm:block text-right"><p className="text-slate-500 text-left sm:text-right">Remaining Balance:</p><p className="font-bold text-red-600">{cur} {(inv?.remainingBalance || 0).toLocaleString()}</p></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Document Preview' && (
            <div className="h-[600px] border border-slate-200 rounded-xl overflow-hidden bg-slate-100 flex flex-col">
              <InvoicePreviewPanel
                invoice={inv}
                siteSettings={site}
                onDownloadPdf={() => downloadInvoicePdf(inv._id, inv.invoiceNo)}
                printRootId="invoice-detail-preview-root"
                isDraft={false}
              />
            </div>
          )}

        </div>

        <div className="hidden" aria-hidden="true">
          <div id="invoice-print-export-root">
            <InvoicePrintBody invoice={inv} siteSettings={site} forPrint />
          </div>
        </div>

      </motion.div>

      {/* Modals for Payment / Advance */}
      <AnimatePresence>
        {(showPaymentModal || showAdvanceModal) && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-800 mb-4">{showPaymentModal ? 'Record Payment' : 'Record Advance Payment'}</h3>
              <form onSubmit={handleSubmit(d => showPaymentModal ? recordPayMut.mutate(d) : recordAdvMut.mutate(d))} className="space-y-4">
                <div>
                  <label className="form-label">Amount (Max: {inv?.remainingBalance?.toLocaleString()})</label>
                  <input {...register('amount', { required: true, valueAsNumber: true, max: showPaymentModal ? inv?.remainingBalance : undefined })} type="number" step="0.01" className="form-input" placeholder="0.00"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Date</label>
                    <input {...register('date')} type="date" className="form-input"/>
                  </div>
                  <div>
                    <label className="form-label">Method</label>
                    <select {...register('method')} className="form-select">
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online_transfer">Online Transfer</option>
                      <option value="payhere">PayHere</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>
                {['bank_transfer', 'card', 'online_transfer', 'payhere', 'cheque'].includes(watch('method')) && (
                  <div>
                    <label className="form-label">Bank Account</label>
                    <select {...register('bankAccount')} className="form-select">
                      <option value="">Select Bank Account...</option>
                      {bankAccounts.map(b => <option key={b._id} value={b._id}>{b.bankName} ({b.accountNumber})</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="form-label">Reference (Optional)</label>
                  <input {...register('reference')} className="form-input" placeholder="Cheque no / Txn ID"/>
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  <textarea {...register('notes')} rows={2} className="form-input resize-none" placeholder="Internal notes..."/>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowPaymentModal(false); setShowAdvanceModal(false); reset() }} className="btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={recordPayMut.isPending || recordAdvMut.isPending} className="btn-primary flex-1 justify-center">
                    {recordPayMut.isPending || recordAdvMut.isPending ? <span className="spinner"/> : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>,
    document.body
  )
}
