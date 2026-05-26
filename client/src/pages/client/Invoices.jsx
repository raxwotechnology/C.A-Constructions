import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiCreditCard, FiDownload } from 'react-icons/fi'

export default function ClientInvoices() {
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('invoice')
  const [voucherMap, setVoucherMap] = useState({})
  const [previewMap, setPreviewMap] = useState({})
  const { data, isLoading } = useQuery({
    queryKey: ['client-invoices'],
    queryFn: () => api.get('/invoices').then(r => r.data),
  })
  const invoices = data?.invoices || []

  useEffect(() => {
    if (!highlightId || !invoices.length) return
    const el = document.getElementById(`invoice-${highlightId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightId, invoices])

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((a, b) => a + (b.total || 0), 0)
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((a, b) => a + (b.total || 0), 0)

  const statusColor = { draft:'badge-gray', sent:'badge-blue', paid:'badge-green', overdue:'badge-red', cancelled:'badge-gray' }

  const handlePreview = async (inv) => {
    const code = voucherMap[inv._id]
    if (!code) return toast.error('Enter voucher code first')
    try {
      const { data } = await api.post('/rewards/vouchers/preview', { invoiceId: inv._id, voucherCode: code })
      setPreviewMap((s) => ({ ...s, [inv._id]: data }))
      toast.success('Voucher applied in preview')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed')
    }
  }

  const handlePay = async (inv) => {
    try {
      const { data } = await api.post('/payments/payhere/init', { invoiceId: inv._id, voucherCode: voucherMap[inv._id] || '' })
      const pd = data.paymentData
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = pd.sandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout'
      Object.entries(pd).filter(([k]) => k !== 'sandbox' && k !== 'paymentId').forEach(([k, v]) => {
        const input = document.createElement('input')
        input.type = 'hidden'; input.name = k; input.value = v
        form.appendChild(input)
      })
      document.body.appendChild(form)
      form.submit()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initiation failed')
    }
  }

  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero pt-32 pb-10">
        <div className="container-max">
          <p className="text-white/70 text-sm">Client Portal</p>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mt-2">Invoices & Payments</h1>
          <p className="text-white/75 mt-2">{invoices.length} invoices total</p>
        </div>
      </section>

      <section className="section-padding bg-slate-50">
        <div className="container-max space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label:'Total Paid', value:`LKR ${totalPaid.toLocaleString()}`, color:'kpi-green' },
          { label:'Pending Payment', value:`LKR ${totalPending.toLocaleString()}`, color:'kpi-blue' },
          { label:'Total Invoices', value:invoices.length, color:'kpi-navy' },
        ].map(s=>(
          <div key={s.label} className={`kpi-card ${s.color}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-xl font-bold text-primary font-heading">{s.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FiCreditCard size={48} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium">No invoices yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv, i) => (
            <motion.div
              id={`invoice-${inv._id}`}
              key={inv._id}
              initial={{opacity:0,y:10}}
              animate={{opacity:1,y:0}}
              transition={{delay:i*0.05}}
              className={`card card-body ${highlightId === inv._id ? 'ring-2 ring-secondary ring-offset-2' : ''}`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="badge badge-navy">{inv.invoiceNo}</span>
                    <span className={`badge ${statusColor[inv.status]} capitalize`}>{inv.status}</span>
                  </div>
                  <p className="text-gray-500 text-sm">{inv.project?.title ? `This invoice belongs to ${inv.project.title}` : 'General Services'}</p>
                  {inv.dueDate && (
                    <p className={`text-xs mt-1 ${inv.status==='overdue'?'text-red-500':'text-gray-400'}`}>
                      Due: {new Date(inv.dueDate).toLocaleDateString('en-LK')}
                    </p>
                  )}
                  {inv.notes && <p className="text-xs text-gray-400 mt-1">{inv.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-2xl font-bold text-primary font-heading">LKR {Number(previewMap[inv._id]?.finalAmount ?? inv.total)?.toLocaleString()}</p>
                  {previewMap[inv._id]?.discount ? <p className="text-xs text-green-600">Discount: LKR {Number(previewMap[inv._id].discount).toLocaleString()}</p> : null}
                  <div className="flex gap-2">
                    {inv.status === 'sent' && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          className="form-input text-xs py-1.5"
                          placeholder="Voucher code"
                          value={voucherMap[inv._id] || ''}
                          onChange={(e) => setVoucherMap((s) => ({ ...s, [inv._id]: e.target.value.toUpperCase() }))}
                        />
                        <button onClick={() => handlePreview(inv)} className="btn-outline btn-sm">Apply Voucher</button>
                        <button onClick={() => handlePay(inv)} className="btn-primary btn-sm">
                          <FiCreditCard size={13}/> Pay Now
                        </button>
                      </div>
                    )}
                    {inv.status === 'paid' && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">✓ Paid on {new Date(inv.paidAt || inv.updatedAt).toLocaleDateString('en-LK')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items breakdown */}
              {inv.items?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {inv.items.map((item, ii) => (
                    <div key={ii} className="flex justify-between text-xs text-gray-500 py-0.5">
                      <span>{item.description} (×{item.quantity})</span>
                      <span>LKR {item.total?.toLocaleString()}</span>
                    </div>
                  ))}
                  {(inv.tax > 0) && <div className="flex justify-between text-xs text-gray-400 py-0.5"><span>Tax</span><span>LKR {inv.tax?.toLocaleString()}</span></div>}
                  {(inv.discount > 0) && <div className="flex justify-between text-xs text-green-600 py-0.5"><span>Discount</span><span>−LKR {inv.discount?.toLocaleString()}</span></div>}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
        </div>
      </section>
    </div>
  )
}
