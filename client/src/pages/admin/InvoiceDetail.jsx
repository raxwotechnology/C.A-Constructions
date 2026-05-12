import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiX, FiPrinter, FiDollarSign, FiCreditCard, FiCalendar, FiClock, FiCheckCircle, FiAlertTriangle, FiFileText } from 'react-icons/fi'

const STATUS_COLORS = { draft: 'badge-gray', unpaid: 'badge-yellow', partial: 'badge-blue', paid: 'badge-green', overdue: 'badge-red', cancelled: 'badge-gray' }

export default function InvoiceDetail({ invoiceId, onClose }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('Overview')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const printRef = useRef()

  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { date: new Date().toISOString().split('T')[0], method: 'cash' } })

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => api.get(`/invoices/${invoiceId}`).then(r => r.data),
    enabled: !!invoiceId,
  })

  const { data: bankData } = useQuery({ queryKey: ['bank-accounts'], queryFn: () => api.get('/bank-accounts').then(r => r.data) })
  const bankAccounts = bankData?.accounts || []

  const recordPayMut = useMutation({
    mutationFn: d => api.post(`/invoices/${invoiceId}/payments`, d),
    onSuccess: () => { qc.invalidateQueries(['invoice', invoiceId]); qc.invalidateQueries(['admin-invoices']); toast.success('Payment recorded'); setShowPaymentModal(false); reset() },
    onError: e => toast.error(e.response?.data?.message || 'Failed to record payment'),
  })

  const recordAdvMut = useMutation({
    mutationFn: d => api.post(`/invoices/${invoiceId}/advances`, d),
    onSuccess: () => { qc.invalidateQueries(['invoice', invoiceId]); qc.invalidateQueries(['admin-invoices']); toast.success('Advance recorded'); setShowAdvanceModal(false); reset() },
    onError: e => toast.error(e.response?.data?.message || 'Failed to record advance'),
  })

  const handlePrint = (type) => {
    const content = printRef.current.innerHTML
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Print ${type}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.5; padding: 40px; }
            h1, h2, h3 { margin-top: 0; color: #1e293b; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .meta-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .meta-box { background: #f8fafc; padding: 15px; border-radius: 8px; width: 45%; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background: #f1f5f9; font-weight: 600; color: #475569; }
            .text-right { text-align: right; }
            .totals { width: 300px; margin-left: auto; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .totals-row.grand { font-size: 1.2em; font-weight: bold; border-top: 2px solid #cbd5e1; margin-top: 10px; padding-top: 10px; }
            .text-red { color: #ef4444; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .badge-paid { background: #dcfce7; color: #166534; }
            .badge-unpaid { background: #fef9c3; color: #854d0e; }
            .badge-overdue { background: #fee2e2; color: #991b1b; }
            .badge-partial { background: #dbeafe; color: #1e40af; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${content}
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (!invoiceId) return null
  const inv = data?.invoice
  if (isLoading) return null

  const isOverdue = inv?.status === 'overdue'

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className={`p-6 border-b text-white flex-shrink-0 flex items-center justify-between ${isOverdue ? 'bg-gradient-to-r from-red-900 to-red-700' : 'bg-gradient-to-r from-slate-900 to-slate-800'}`}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold font-heading">{inv?.invoiceNo}</h2>
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-white/20`}>{inv?.status}</span>
            </div>
            <p className="text-slate-300 flex items-center gap-2">
              <FiFileText/> {inv?.client?.name} {inv?.project ? `— ${inv.project.title}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setActiveTab('Overview'); handlePrint('Invoice') }} className="btn-outline border-white/30 text-white hover:bg-white/10 btn-sm"><FiPrinter size={14}/> Print Invoice</button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"><FiX size={20}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b bg-slate-50 overflow-x-auto hide-scrollbar flex-shrink-0">
          {['Overview', 'Line Items', 'Payments & Advances'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              {/* Financial Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-slate-800">{inv?.currency} {(inv?.total || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Paid (Inc. Advances)</p>
                  <p className="text-2xl font-bold text-green-600">{inv?.currency} {(inv?.totalPaid || 0).toLocaleString()}</p>
                </div>
                <div className={`p-5 rounded-2xl border shadow-sm ${inv?.remainingBalance > 0 ? (isOverdue ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200') : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${inv?.remainingBalance > 0 ? (isOverdue ? 'text-red-500' : 'text-orange-500') : 'text-green-600'}`}>Balance Due</p>
                  <p className={`text-2xl font-bold ${inv?.remainingBalance > 0 ? (isOverdue ? 'text-red-700' : 'text-orange-700') : 'text-green-700'}`}>{inv?.currency} {(inv?.remainingBalance || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-slate-50 font-semibold text-slate-700 flex items-center gap-2"><FiClock/> Invoice Details</div>
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                  <div className="p-5 space-y-4">
                    <div><p className="text-xs text-slate-400 mb-0.5">Invoice Date</p><p className="font-medium text-slate-800">{new Date(inv?.invoiceDate).toLocaleDateString('en-LK')}</p></div>
                    <div><p className="text-xs text-slate-400 mb-0.5">Due Date</p><p className={`font-medium ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-800'}`}>{inv?.dueDate ? new Date(inv?.dueDate).toLocaleDateString('en-LK') : 'N/A'}</p></div>
                    {inv?.quotationRef && <div><p className="text-xs text-slate-400 mb-0.5">From Quotation</p><p className="font-medium text-secondary">{inv?.quotationRef?.quotationNo}</p></div>}
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
                    <p className="text-sm font-semibold text-slate-700 mb-2">Payment Terms</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{inv.paymentTerms}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Line Items' && (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b text-slate-600">
                  <tr>
                    <th className="p-4 font-semibold">Description</th>
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
              <div className="bg-slate-50 p-6 border-t flex justify-end">
                <div className="w-64 space-y-2 text-sm">
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
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowAdvanceModal(true); reset() }} className="btn-outline btn-sm"><FiDollarSign size={14}/> Record Advance</button>
                <button onClick={() => { setShowPaymentModal(true); reset() }} disabled={inv?.remainingBalance === 0} className="btn-primary btn-sm"><FiCreditCard size={14}/> Record Payment</button>
                <button onClick={() => handlePrint('Payment History')} className="btn-outline btn-sm"><FiPrinter size={14}/> Print History</button>
              </div>

              {/* Payments Table */}
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-slate-50 font-semibold text-slate-700">Payment & Advance History</div>
                <table className="w-full text-left text-sm">
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
                <div className="p-4 bg-slate-50 border-t flex justify-end gap-8 text-sm">
                  <div className="text-right"><p className="text-slate-500">Total Advances:</p><p className="font-bold text-slate-800">LKR {(inv?.totalAdvances || 0).toLocaleString()}</p></div>
                  <div className="text-right"><p className="text-slate-500">Total Paid (All):</p><p className="font-bold text-green-600">LKR {(inv?.totalPaid || 0).toLocaleString()}</p></div>
                  <div className="text-right"><p className="text-slate-500">Remaining Balance:</p><p className="font-bold text-red-600">LKR {(inv?.remainingBalance || 0).toLocaleString()}</p></div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Hidden Print Templates */}
        <div className="hidden">
          <div ref={printRef}>
            <div className="header">
              <h1>Invoice: ${inv?.invoiceNo}</h1>
              <p>Generated on: ${new Date().toLocaleDateString('en-LK')}</p>
            </div>
            <div className="meta-grid">
              <div className="meta-box">
                <h3>Billed To</h3>
                <p><strong>Name:</strong> ${inv?.client?.name}</p>
                <p><strong>Email:</strong> ${inv?.client?.email}</p>
                <p><strong>Project:</strong> ${inv?.project?.title || 'N/A'}</p>
              </div>
              <div className="meta-box">
                <h3>Invoice Details</h3>
                <p><strong>Date:</strong> ${new Date(inv?.invoiceDate).toLocaleDateString('en-LK')}</p>
                <p><strong>Due Date:</strong> ${inv?.dueDate ? new Date(inv?.dueDate).toLocaleDateString('en-LK') : 'N/A'}</p>
                <p><strong>Status:</strong> <span className="badge badge-${inv?.status}">${inv?.status}</span></p>
                <p><strong>Quotation Ref:</strong> ${inv?.quotationRef?.quotationNo || 'N/A'}</p>
              </div>
            </div>

            <h2>Line Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${inv?.items?.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td className="text-center">${item.quantity}</td>
                    <td className="text-right">${item.unitPrice.toLocaleString()}</td>
                    <td className="text-right">${item.total.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div className="totals">
              <div className="totals-row"><span>Subtotal:</span><span>${inv?.subtotal.toLocaleString()}</span></div>
              ${inv?.discountTotal > 0 ? `<div className="totals-row"><span>Discount:</span><span>-${inv.discountTotal.toLocaleString()}</span></div>` : ''}
              ${inv?.tax > 0 ? `<div className="totals-row"><span>Tax (${inv.taxRate}%):</span><span>+${inv.tax.toLocaleString()}</span></div>` : ''}
              <div className="totals-row grand"><span>Total (${inv?.currency}):</span><span>${inv?.total.toLocaleString()}</span></div>
              <div className="totals-row text-green-600"><span>Total Paid:</span><span>-${inv?.totalPaid.toLocaleString()}</span></div>
              <div className="totals-row grand text-red"><span>Balance Due:</span><span>${inv?.remainingBalance.toLocaleString()}</span></div>
            </div>

            ${inv?.payments?.length > 0 ? `
              <h2 style="margin-top: 50px;">Payment History</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Method</th>
                    <th>Ref</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${inv.payments.map(p => `
                    <tr>
                      <td>${new Date(p.date).toLocaleDateString('en-LK')}</td>
                      <td>${p.isAdvance ? 'Advance' : 'Payment'}</td>
                      <td style="text-transform: capitalize;">${p.method.replace('_', ' ')}</td>
                      <td>${p.reference || '-'}</td>
                      <td className="text-right">${p.amount.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            ${inv?.notes || inv?.paymentTerms ? `
              <div style="margin-top: 50px;">
                ${inv?.notes ? `<h3>Notes</h3><p style="white-space: pre-wrap;">${inv.notes}</p>` : ''}
                ${inv?.paymentTerms ? `<h3>Payment Terms</h3><p style="white-space: pre-wrap;">${inv.paymentTerms}</p>` : ''}
              </div>
            ` : ''}
          </div>
        </div>

      </motion.div>

      {/* Modals for Payment / Advance */}
      <AnimatePresence>
        {(showPaymentModal || showAdvanceModal) && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={() => { setShowPaymentModal(false); setShowAdvanceModal(false) }}>
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
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>
                {['bank_transfer', 'card'].includes(watch('method')) && (
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
