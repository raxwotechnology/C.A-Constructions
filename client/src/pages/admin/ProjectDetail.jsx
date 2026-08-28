import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiEdit2, FiUsers, FiDollarSign, FiClock, FiFileText, FiLink, FiMessageSquare, FiUpload, FiX, FiCheckCircle, FiAlertTriangle, FiTrash2, FiExternalLink, FiPrinter, FiPlus } from 'react-icons/fi'
import { mediaUrl } from '../../lib/media'
import useAuthStore from '../../store/authStore'
import { isInvoiceFullyPaid, invoicePaymentDisplay } from '../../lib/invoicePayment'
import PaymentReceiptModal from '../../components/documents/PaymentReceiptModal'

const statusColor = { planning:'badge-gray', active:'badge-green', on_hold:'badge-yellow', completed:'badge-blue', cancelled:'badge-red', overdue:'badge-red' }

/** Match other admin modals (Invoices, Agreements); must clear shell header z-[220]. */
const MODAL_OVERLAY_Z = 999999

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('Overview')
  
  // Modals state
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showDocModal, setShowDocModal] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  // Separate forms so Note + Link modals never cross-validate (shared useForm = silent submit failures).
  const noteForm = useForm({ defaultValues: { content: '' }, shouldUnregister: true })
  const linkForm = useForm({ defaultValues: { label: '', url: '' }, shouldUnregister: true })
  const user = useAuthStore((s) => s.user)
  const canManageNotes = ['admin', 'manager'].includes(user?.role)

  const patchProjectCache = (json) => {
    if (json?.project) qc.setQueryData(['project', id], { success: true, project: json.project })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data),
  })

  const { data: siteRes } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.get('/site-settings').then((r) => r.data),
  })
  const site = siteRes?.settings || {}

  // Agreements linked to this project
  const { data: agreementData } = useQuery({
    queryKey: ['agreements', 'project', id],
    queryFn: () => api.get(`/agreements?project=${id}`).then(r => r.data),
  })

  const p = data?.project
  const agreements = agreementData?.agreements || []

  // Mutations
  const addNoteMut = useMutation({
    mutationFn: d => api.post(`/projects/${id}/notes`, d).then((r) => r.data),
    onSuccess: (json) => {
      patchProjectCache(json)
      qc.invalidateQueries({ queryKey: ['project', id] })
      qc.invalidateQueries({ queryKey: ['agreements', 'project', id] })
      toast.success('Note added')
      setShowNoteModal(false)
      noteForm.reset({ content: '' })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const updateNoteMut = useMutation({
    mutationFn: ({ noteId, content }) => api.put(`/projects/${id}/notes/${noteId}`, { content }).then((r) => r.data),
    onSuccess: (json) => {
      patchProjectCache(json)
      qc.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Note updated')
      setEditingNote(null)
      noteForm.reset({ content: '' })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const deleteNoteMut = useMutation({
    mutationFn: noteId => api.delete(`/projects/${id}/notes/${noteId}`).then((r) => r.data),
    onSuccess: (json) => {
      patchProjectCache(json)
      qc.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Note removed')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const addLinkMut = useMutation({
    mutationFn: d => api.post(`/projects/${id}/links`, d).then((r) => r.data),
    onSuccess: (json) => {
      patchProjectCache(json)
      qc.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Link added')
      setShowLinkModal(false)
      linkForm.reset({ label: '', url: '' })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const removeLinkMut = useMutation({
    mutationFn: linkId => api.delete(`/projects/${id}/links/${linkId}`).then((r) => r.data),
    onSuccess: (json) => {
      patchProjectCache(json)
      qc.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Link removed')
    }
  })

  const uploadDocMut = useMutation({
    mutationFn: fd => api.post(`/projects/${id}/documents`, fd).then((r) => r.data),
    onSuccess: (json) => {
      patchProjectCache(json)
      qc.invalidateQueries({ queryKey: ['project', id] })
      toast.success('Document uploaded')
      setShowDocModal(false)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const removeDocMut = useMutation({
    mutationFn: docId => api.delete(`/projects/${id}/documents/${docId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); toast.success('Document removed') }
  })

  if (isLoading) return <div className="text-center py-20"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
  if (!p) return <div className="text-center py-20 text-gray-500">Project not found</div>

  const isOverdue = p.status === 'overdue'
  const linkedInvUi = p.invoice ? invoicePaymentDisplay(p.invoice) : null
  const invRb = p.invoice?.remainingBalance
  const hasInvRb = typeof invRb === 'number'
  /** Outstanding amount due when we know balance; otherwise infer from paid status only */
  const invOutstanding = Boolean(p.invoice && (hasInvRb ? invRb > 0 : !isInvoiceFullyPaid(p.invoice)))

  const onDocSubmit = e => {
    e.preventDefault()
    const file = e.target.file.files[0]
    if (!file) return toast.error('Please select a file')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', e.target.name.value || file.name)
    uploadDocMut.mutate(fd)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"><FiArrowLeft size={20}/></button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold font-heading text-slate-800">{p.title}</h1>
              <span className={`badge capitalize ${statusColor[p.status] || 'badge-gray'}`}>{p.status?.replace('_',' ')}</span>
              {p.serviceType && <span className="badge badge-navy">{p.serviceType}</span>}
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
              <FiClock size={12}/> Created {new Date(p.createdAt).toLocaleDateString()}
              {p.branch && <span>• Branch: {p.branch.name}</span>}
            </p>
          </div>
        </div>

        {/* Generate Invoice Header Action Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/invoices', { state: { generateForProject: p } })}
            className="btn-primary btn-sm flex items-center gap-1.5 shadow-sm text-xs font-bold shrink-0 cursor-pointer"
            title="Generate a new invoice linked to this project"
          >
            <FiFileText size={14}/>
            <span>Generate Project Invoice</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto hide-scrollbar">
        {['Overview', 'Team & Allocations', 'Financial', 'Documents & Links', 'Notes & Agreements'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {activeTab === 'Overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6">
                <h3 className="font-bold text-slate-800 mb-4 font-heading">Project Summary</h3>
                <div className="prose prose-sm max-w-none text-slate-600 mb-6 whitespace-pre-wrap">{p.description}</div>
                
                <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                  <div><p className="text-xs text-slate-400 mb-1">Client</p><p className="font-medium text-slate-800">{p.client?.name || 'Internal'}</p><p className="text-xs text-slate-500">{p.client?.email}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Project Manager</p><p className="font-medium text-slate-800">{p.projectManager?.name || 'Not assigned'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Start Date</p><p className="font-medium text-slate-800">{p.startDate ? new Date(p.startDate).toLocaleDateString('en-LK') : '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Deadline</p><p className={`font-medium ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-800'}`}>{p.deadline ? new Date(p.deadline).toLocaleDateString('en-LK') : '—'}</p></div>
                </div>
              </div>

              {/* Quick Tasks preview */}
              <div className="card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 font-heading">Tasks Progress</h3>
                  <span className="text-sm font-medium text-secondary">{p.progress}% Complete</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4"><div className="h-full bg-secondary transition-all" style={{width: `${p.progress}%`}}/></div>
                <div className="space-y-2">
                  {p.tasks?.slice(0, 3).map(t => (
                    <div key={t._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm border border-slate-100">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={t.status === 'done'} readOnly className="accent-secondary w-4 h-4 rounded"/>
                        <span className={t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}>{t.title}</span>
                      </div>
                      <span className="text-xs text-slate-500">{t.assignedTo?.name || 'Unassigned'}</span>
                    </div>
                  ))}
                  {(!p.tasks || p.tasks.length === 0) && <p className="text-center text-sm text-slate-400 py-2">No tasks defined</p>}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Financial Snapshot */}
              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 font-heading flex items-center gap-2"><FiDollarSign className="text-emerald-500"/> Financials</h3>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/invoices', { state: { generateForProject: p } })}
                    className="text-xs font-bold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FiPlus size={13}/> + New Invoice
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                    <p className="text-xs uppercase tracking-wider font-semibold opacity-70 mb-1">Project Budget / Value</p>
                    <p className="text-xl font-bold">LKR {(p.budget || p.contractValue || 0).toLocaleString()}</p>
                  </div>
                  {p.invoice && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Linked invoice</p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => navigate('/admin/invoices', { state: { openInvoiceId: p.invoice._id } })}
                          className="font-mono text-sm font-bold text-secondary hover:underline text-left"
                        >
                          {p.invoice.invoiceNo}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className={`badge ${linkedInvUi?.badgeClass || 'badge-gray'}`}>
                            {linkedInvUi?.label || '—'}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${linkedInvUi?.settled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                            {linkedInvUi?.settled ? 'Settled' : 'Balance due'}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm flex justify-between text-slate-600">
                        <span>Balance ({p.invoice.currency || 'LKR'})</span>
                        <span className="font-semibold text-slate-900">
                          {hasInvRb ? invRb.toLocaleString() : isInvoiceFullyPaid(p.invoice) ? '0' : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Click the invoice number to open it in Invoices.</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate('/admin/invoices', { state: { generateForProject: p } })}
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl transition-all flex justify-center items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FiPlus size={14} /> Generate Progress / Project Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Team & Allocations' && (
          <div className="card p-0 overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="font-bold text-slate-800 font-heading">Team & Commissions</h3>
              <p className="text-sm text-slate-500 mt-1">Project Budget: <strong className="text-slate-800">LKR {p.budget?.toLocaleString()}</strong></p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b text-slate-600">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Team Member</th>
                    <th className="px-6 py-3 font-semibold text-right">Commission (LKR)</th>
                    <th className="px-6 py-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {p.salaryAllocations?.length === 0 ? (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">No team commissions defined for this project.</td></tr>
                  ) : (
                    p.salaryAllocations?.map((alloc, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{alloc.employeeName || alloc.employee?.name}</p>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-purple-700">{(alloc.commission || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                          {!p.invoice ? (
                            <span className="badge badge-gray">No invoice</span>
                          ) : isInvoiceFullyPaid(p.invoice) ? (
                            <span className="badge badge-green">Paid</span>
                          ) : (
                            <span className="badge badge-yellow">Unpaid</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {p.salaryAllocations?.length > 0 && (
                <div className="bg-slate-50 px-6 py-4 border-t flex justify-end font-medium text-sm">
                  <div className="text-right">
                    <p className="text-slate-500 text-xs mb-0.5">Total Commission</p>
                    <p className="text-purple-800">LKR {p.salaryAllocations.reduce((s,a)=>s+(a.commission||0),0).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Financial' && (
          <div className="space-y-6">
            {/* Top Financial Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-5 bg-white border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Project Value</p>
                <p className="text-2xl font-black text-slate-900">LKR {(p.totalBilled || p.contractValue || p.invoice?.total || 0).toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Contract / Invoiced Value</p>
              </div>
              <div className="card p-5 bg-white border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Collected (Paid)</p>
                <p className="text-2xl font-black text-emerald-600">LKR {(p.totalCollected || p.invoice?.totalPaid || p.advancePaid || 0).toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">Advances &amp; Installments Received</p>
              </div>
              <div className={`card p-5 ${p.remainingBalance > 0 || invOutstanding ? 'bg-amber-50/60 border-amber-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${p.remainingBalance > 0 || invOutstanding ? 'text-amber-700' : 'text-emerald-700'}`}>
                  Remaining Balance Due
                </p>
                <p className={`text-2xl font-black ${p.remainingBalance > 0 || invOutstanding ? 'text-amber-800' : 'text-emerald-800'}`}>
                  LKR {(typeof p.remainingBalance === 'number' ? p.remainingBalance : (hasInvRb ? invRb : Math.max(0, (p.totalBilled || p.contractValue || 0) - (p.totalCollected || 0)))).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Outstanding Balance</p>
              </div>
            </div>

            {/* Payment & Installment Ledger */}
            <div className="card p-0 overflow-hidden border border-slate-200 shadow-sm bg-white rounded-2xl">
              <div className="p-4 border-b bg-slate-50 font-bold text-slate-800 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <FiDollarSign className="text-emerald-600" />
                  <span>Project Installment &amp; Payment Ledger</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                  {p.invoice?.invoiceNo && <span>Invoice: <strong className="text-secondary">{p.invoice.invoiceNo}</strong></span>}
                  <span>Status: <strong className="capitalize text-slate-700">{p.paymentStatus || 'None'}</strong></span>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/invoices', { state: { generateForProject: p } })}
                    className="btn-primary btn-xs px-2.5 py-1 flex items-center gap-1 font-bold text-xs cursor-pointer shadow-2xs"
                    title="Generate a new invoice for this project"
                  >
                    <FiPlus size={12}/>
                    <span>+ Generate Invoice</span>
                  </button>
                </div>
              </div>

              {(() => {
                const paymentsList = p.allPayments?.length
                  ? p.allPayments
                  : (p.invoice?.payments || []);
                const totalVal = p.totalBilled || p.contractValue || p.invoice?.total || 0;

                if (!paymentsList || paymentsList.length === 0) {
                  return (
                    <div className="p-12 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <FiDollarSign size={20} />
                      </div>
                      <p className="text-base font-semibold text-slate-700 mb-1">No Installments or Payments Recorded</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        When advances or partial payments are recorded on the linked invoice, they will automatically track here.
                      </p>
                    </div>
                  );
                }

                let running = 0;
                return (
                  <div className="overflow-x-auto hide-scrollbar">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="border-b text-slate-500 bg-slate-50/50">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Date / Receipt</th>
                          <th className="px-4 py-3 font-semibold">Invoice Ref</th>
                          <th className="px-4 py-3 font-semibold">Type</th>
                          <th className="px-4 py-3 font-semibold">Method &amp; Ref</th>
                          <th className="px-4 py-3 font-semibold text-right">Amount Paid (LKR)</th>
                          <th className="px-4 py-3 font-semibold text-right">Remaining Balance</th>
                          <th className="px-4 py-3 font-semibold text-center">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paymentsList.map((pay, i) => {
                          running += Number(pay.amount || 0);
                          const balAfter = typeof pay.remainingBalanceAfter === 'number'
                            ? pay.remainingBalanceAfter
                            : Math.max(0, totalVal - running);
                          const linkedInvDoc = pay.invoiceId && p.linkedInvoices?.find(li => String(li._id) === String(pay.invoiceId)) || p.invoice;

                          return (
                            <tr key={pay._id || i} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3 text-slate-600">
                                <span className="font-semibold text-slate-800">{new Date(pay.date).toLocaleDateString('en-LK')}</span>
                                {pay.receiptNo && <span className="block text-[11px] font-mono text-secondary">{pay.receiptNo}</span>}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-700">
                                {pay.invoiceNo || p.invoice?.invoiceNo || '—'}
                              </td>
                              <td className="px-4 py-3">
                                {pay.isAdvance ? <span className="badge badge-purple">Advance</span> : <span className="badge badge-blue">Installment</span>}
                              </td>
                              <td className="px-4 py-3 capitalize text-slate-600">
                                {(pay.method || 'cash').replace('_', ' ')}
                                {pay.reference && <span className="text-slate-400 text-xs font-mono block">{pay.reference}</span>}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                {pay.amount?.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-amber-700">
                                {balAfter?.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceipt({ payment: pay, invoice: linkedInvDoc || p.invoice })}
                                  className="btn-outline btn-xs px-2 py-1 inline-flex items-center gap-1 text-slate-700 hover:text-primary"
                                  title="View and Print Receipt"
                                >
                                  <FiPrinter size={12} /> Receipt
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'Documents & Links' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Documents */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 font-heading flex items-center gap-2"><FiFileText/> Documents</h3>
                <button type="button" onClick={() => setShowDocModal(true)} className="btn-outline btn-sm"><FiUpload size={14}/> Upload</button>
              </div>
              <div className="space-y-3">
                {!(p.documents && p.documents.length) ? (
                  <p className="text-sm text-slate-400 text-center py-4">No documents uploaded</p>
                ) : p.documents.map(doc => (
                  <div key={doc._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border hover:border-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-secondary border shadow-sm"><FiFileText size={18}/></div>
                      <div>
                        <a href={mediaUrl(doc.url)} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-800 hover:text-secondary hover:underline">{doc.name}</a>
                        <p className="text-xs text-slate-400">By {doc.uploadedByName} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { if(window.confirm('Remove document?')) removeDocMut.mutate(doc._id) }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><FiTrash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 font-heading flex items-center gap-2"><FiLink/> Important Links</h3>
                <button type="button" onClick={() => { linkForm.reset({ label: '', url: '' }); setShowLinkModal(true) }} className="btn-outline btn-sm"><FiPlus size={14}/> Add Link</button>
              </div>
              <div className="space-y-3">
                {!(p.links && p.links.length) ? (
                  <p className="text-sm text-slate-400 text-center py-4">No links added</p>
                ) : p.links.map(link => (
                  <div key={link._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border hover:border-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-500 border shadow-sm"><FiLink size={18}/></div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{link.label}</p>
                        <a href={link.url} target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline break-all flex items-center gap-1 mt-0.5">{link.url} <FiExternalLink size={10}/></a>
                      </div>
                    </div>
                    <button type="button" onClick={() => { if(window.confirm('Remove link?')) removeLinkMut.mutate(link._id) }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><FiTrash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Notes & Agreements' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Notes */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 font-heading flex items-center gap-2"><FiMessageSquare/> Project Notes</h3>
                <button
                  type="button"
                  onClick={() => { setEditingNote(null); noteForm.reset({ content: '' }); setShowNoteModal(true) }}
                  className="btn-outline btn-sm"
                >
                  <FiPlus size={14}/> Add Note
                </button>
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {!(p.notes && p.notes.length) ? (
                  <p className="text-sm text-slate-400 text-center py-4">No notes added</p>
                ) : p.notes.slice().reverse().map(note => (
                  <div key={note._id} className="p-4 bg-yellow-50/50 rounded-xl border border-yellow-100">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span className="text-xs font-bold text-yellow-800">{note.createdByName || 'User'}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-yellow-600 opacity-70">{new Date(note.createdAt).toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        {canManageNotes && (
                          <>
                            <button
                              type="button"
                              className="text-xs text-secondary hover:underline"
                              onClick={() => { setEditingNote(note); noteForm.setValue('content', note.content); setShowNoteModal(true) }}
                            >Edit</button>
                            <button
                              type="button"
                              className="text-xs text-red-500 hover:underline"
                              onClick={() => { if (window.confirm('Delete this note?')) deleteNoteMut.mutate(note._id) }}
                            >Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Agreements */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 font-heading flex items-center gap-2"><FiFileText/> Client Agreements</h3>
                <button type="button" onClick={() => navigate(`/admin/agreements?project=${p._id}`)} className="btn-outline btn-sm">Manage Agreements</button>
              </div>
              <div className="space-y-3">
                {agreements.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed">
                    <p className="text-sm text-slate-500 mb-3">No agreements generated for this project.</p>
                    <button type="button" onClick={() => navigate(`/admin/agreements?new=true&project=${p._id}&client=${p.client?._id}`)} className="btn-primary btn-sm mx-auto">Generate Agreement</button>
                  </div>
                ) : agreements.map(agr => (
                  <div key={agr._id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border shadow-sm hover:shadow transition-all">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{agr.title}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{agr.agreementNo} • {new Date(agr.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge ${agr.status === 'signed' ? 'badge-green' : agr.status === 'draft' ? 'badge-gray' : 'badge-blue'}`}>{agr.status}</span>
                      <button
                        type="button"
                        className="btn-outline btn-sm py-1 px-2 text-xs"
                        onClick={() => navigate(`/admin/agreements?agreement=${agr._id}`)}
                      >Open</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS — portaled + high z-index; separate RHF instances so submits never cross-validate */}
      {showNoteModal && createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: MODAL_OVERLAY_Z }}>
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">{editingNote ? 'Edit Project Note' : 'Add Project Note'}</h3>
                <button type="button" onClick={() => { setShowNoteModal(false); setEditingNote(null); noteForm.reset({ content: '' }) }} className="p-1 hover:bg-slate-200 rounded"><FiX/></button>
              </div>
              <form onSubmit={noteForm.handleSubmit(
                (d) => {
                  if (editingNote?._id) updateNoteMut.mutate({ noteId: editingNote._id, content: d.content })
                  else addNoteMut.mutate(d)
                },
                () => toast.error('Please enter note text')
              )} className="p-6">
                <textarea {...noteForm.register('content', { required: true })} rows={5} className="form-input resize-none mb-4" placeholder="Type your note here..."></textarea>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowNoteModal(false); setEditingNote(null); noteForm.reset({ content: '' }) }} className="btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={addNoteMut.isPending || updateNoteMut.isPending} className="btn-primary flex-1 justify-center">{(addNoteMut.isPending || updateNoteMut.isPending) ? <span className="spinner"/> : (editingNote ? 'Save Changes' : 'Save Note')}</button>
                </div>
              </form>
            </motion.div>
          </div>, document.body
        )}

        {showLinkModal && createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: MODAL_OVERLAY_Z }}>
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Add Important Link</h3>
                <button type="button" onClick={() => setShowLinkModal(false)} className="p-1 hover:bg-slate-200 rounded"><FiX/></button>
              </div>
              <form onSubmit={linkForm.handleSubmit(
                (d) => addLinkMut.mutate(d),
                () => toast.error('Please enter label and URL')
              )} className="p-6 space-y-4">
                <div><label className="form-label">Label</label><input {...linkForm.register('label', { required: true })} className="form-input" placeholder="e.g. GitHub Repo, Figma Design"/></div>
                <div><label className="form-label">URL</label><input {...linkForm.register('url', { required: true })} type="text" className="form-input" placeholder="https://example.com or example.com"/></div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowLinkModal(false)} className="btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={addLinkMut.isPending} className="btn-primary flex-1 justify-center">{addLinkMut.isPending ? <span className="spinner"/> : 'Save Link'}</button>
                </div>
              </form>
            </motion.div>
          </div>, document.body
        )}

        {showDocModal && createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: MODAL_OVERLAY_Z }}>
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Upload Document</h3>
                <button type="button" onClick={() => setShowDocModal(false)} className="p-1 hover:bg-slate-200 rounded"><FiX/></button>
              </div>
              <form onSubmit={onDocSubmit} className="p-6 space-y-4">
                <div><label className="form-label">Document Name (Optional)</label><input name="name" className="form-input" placeholder="Custom name for file"/></div>
                <div><label className="form-label">File *</label><input name="file" type="file" required className="form-input p-2"/></div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowDocModal(false)} className="btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={uploadDocMut.isPending} className="btn-primary flex-1 justify-center">{uploadDocMut.isPending ? <span className="spinner"/> : 'Upload'}</button>
                </div>
              </form>
            </motion.div>
          </div>, document.body
        )}

      {/* Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        invoice={selectedReceipt?.invoice || p.invoice}
        payment={selectedReceipt?.payment}
        siteSettings={site}
      />
    </div>
  )
}
