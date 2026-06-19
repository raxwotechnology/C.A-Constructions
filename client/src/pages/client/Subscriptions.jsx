import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  FiFileText, FiLink, FiServer, FiDollarSign, FiClock, FiAlertCircle, FiDownload
} from 'react-icons/fi'
import { mediaUrl } from '../../lib/media'
import { motion, AnimatePresence } from 'framer-motion'

export default function ClientSubscriptions() {
  const qc = useQueryClient()
  const [selectedSub, setSelectedSub] = useState(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['client-subscriptions'],
    queryFn: () => api.get('/subscriptions/my-summary').then(r => r.data)
  })

  const subs = data?.subscriptions || []
  const summary = data?.summary || {}

  const payMut = useMutation({
    mutationFn: (payload) => api.post(`/subscriptions/${selectedSub._id}/payments`, payload).then(r => r.data),
    onSuccess: () => {
      toast.success('Payment recorded successfully')
      setShowPaymentForm(false)
      setSelectedSub(null)
      qc.invalidateQueries({ queryKey: ['client-subscriptions'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Payment failed')
  })

  const handlePay = (sub) => {
    setSelectedSub(sub)
    setShowPaymentForm(true)
  }

  // Initialize PayHere checkout
  const handlePayHereCheckout = async () => {
    try {
      const { data } = await api.post('/payments/payhere/init', { 
        itemId: selectedSub._id, 
        itemType: 'subscription' 
      })
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Subscriptions</h1>
          <p className="page-subtitle">Manage your active subscriptions, billing, hosting, and agreements.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card kpi-blue">
          <p className="text-xs uppercase text-slate-500">Active Subscriptions</p>
          <p className="text-xl font-bold text-primary">{summary.active || 0}</p>
        </div>
        <div className="kpi-card kpi-red">
          <p className="text-xs uppercase text-slate-500">Overdue Payments</p>
          <p className="text-xl font-bold text-red-600">{summary.overdue || 0}</p>
        </div>
        <div className="kpi-card kpi-navy">
          <p className="text-xs uppercase text-slate-500">Total Due</p>
          <p className="text-xl font-bold text-primary">LKR {(summary.totalDue || 0).toLocaleString()}</p>
        </div>
        <div className="kpi-card kpi-green">
          <p className="text-xs uppercase text-slate-500">Total Paid</p>
          <p className="text-xl font-bold text-green-600">LKR {(summary.totalPaid || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subs.map(sub => (
          <div key={sub._id} className="card overflow-hidden hover:shadow-xl transition-shadow border-t-4 border-t-primary flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 font-heading">{sub.title}</h3>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider mt-1">{sub.typeLabel}</p>
                  <p className="text-xs text-slate-400 mt-0.5">#{sub.subscriptionNo}</p>
                </div>
                <span className={`badge ${sub.status === 'active' ? 'badge-green' : sub.status === 'overdue' ? 'badge-red' : 'badge-gray'}`}>
                  {sub.status}
                </span>
              </div>

              {sub.description && <p className="text-sm text-slate-600 mb-4">{sub.description}</p>}

              <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Monthly Amount</span>
                  <span className="font-semibold text-slate-800">LKR {sub.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Next Due Date</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1"><FiClock className="text-primary"/> {new Date(sub.nextDueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-3">
                  <span className="text-slate-500">Remaining Balance</span>
                  <span className={`font-bold ${sub.remainingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    LKR {sub.remainingBalance?.toLocaleString()}
                  </span>
                </div>
                {sub.overdueDays > 0 && (
                  <div className="bg-red-50 text-red-600 p-2 rounded text-xs font-semibold flex items-center gap-2">
                    <FiAlertCircle /> {sub.overdueDays} days overdue!
                  </div>
                )}
              </div>

              {sub.hostingDetails?.domainName && (
                <div className="mb-4 text-sm">
                  <p className="font-semibold text-slate-800 flex items-center gap-2 mb-1"><FiServer className="text-primary"/> Hosting & Domain</p>
                  <div className="text-slate-600 pl-6 text-xs space-y-1">
                    <p>Domain: <span className="font-medium text-slate-800">{sub.hostingDetails.domainName}</span></p>
                    {sub.hostingDetails.provider && <p>Provider: {sub.hostingDetails.provider}</p>}
                    {sub.hostingDetails.expiryDate && <p>Expiry: {new Date(sub.hostingDetails.expiryDate).toLocaleDateString()}</p>}
                    {sub.hostingDetails.hostingUrl && <p><a href={sub.hostingDetails.hostingUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Manage Hosting</a></p>}
                  </div>
                </div>
              )}

              {sub.project && (
                <div className="mb-4 text-sm">
                  <p className="font-semibold text-slate-800 flex items-center gap-2 mb-1"><FiLink className="text-primary"/> Linked Project</p>
                  <p className="text-slate-600 pl-6 text-xs">{sub.project.title}</p>
                </div>
              )}

              {sub.agreements?.length > 0 && (
                <div className="mb-4 text-sm">
                  <p className="font-semibold text-slate-800 flex items-center gap-2 mb-2"><FiFileText className="text-primary"/> Agreements</p>
                  <div className="space-y-2 pl-6">
                    {sub.agreements.map(agr => (
                      <a key={agr._id} href={mediaUrl(agr.fileUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline bg-blue-50 p-2 rounded-lg">
                        <FiDownload /> {agr.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              {sub.remainingBalance > 0 ? (
                <button className="btn-primary w-full justify-center text-sm" onClick={() => handlePay(sub)}>
                  <FiDollarSign size={14}/> Pay Now
                </button>
              ) : (
                <button className="btn-success w-full justify-center text-sm cursor-default" disabled>
                  Fully Paid
                </button>
              )}
            </div>
          </div>
        ))}
        {subs.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
            <FiServer size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">You don't have any active subscriptions yet.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPaymentForm && selectedSub && createPortal(
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" style={{ zIndex: 9999 }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h2 className="text-xl font-bold font-heading text-primary">Pay Subscription</h2>
                <button onClick={() => setShowPaymentForm(false)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Total amount due for {selectedSub.title}</p>
                  <p className="text-xl font-bold text-slate-800">LKR {selectedSub.remainingBalance?.toLocaleString()}</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-800 text-center">Secure payments powered by PayHere</p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button className="btn-secondary flex-1" onClick={() => setShowPaymentForm(false)}>Cancel</button>
                  <button className="btn-primary flex-1" onClick={handlePayHereCheckout}>
                    Pay with PayHere
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  )
}
