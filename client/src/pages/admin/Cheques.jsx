import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiTrash2, FiEye, FiX } from 'react-icons/fi'
import { statusNeedsBankLedger } from '../../lib/chequeLedger'
import { useDeleteWithPassword } from '../../components/admin/DeletePasswordGate'
import ExportBar from '../../components/ui/ExportBar'
import { CHEQUE_STATUS_OPTIONS, CHEQUE_STATUS_LABEL } from '../../constants/chequeStatuses'

const STATUS_BADGE = {
  pending: 'badge-yellow',
  unpaid: 'badge-yellow',
  paid: 'badge-green',
  cleared: 'badge-green',
  bounced: 'badge-red',
  expected: 'badge-gray',
  received: 'badge-blue',
  deposited: 'badge-green',
  returned: 'badge-red',
  renewed: 'badge-blue',
  cancelled: 'badge-gray',
}

const CHEQUE_EXPORT_COLUMNS = [
  { header: 'Cheque No', accessor: (c) => c.chequeNumber || '' },
  { header: 'Direction', accessor: (c) => c.direction || '' },
  { header: 'Source', accessor: (c) => c.source || '' },
  { header: 'Status', accessor: (c) => CHEQUE_STATUS_LABEL[c.status] || c.status },
  { header: 'Amount (LKR)', accessor: (c) => Number(c.amount || 0) },
  { header: 'Bank', accessor: (c) => c.bankName || '' },
  { header: 'Bank Account', accessor: (c) => c.bankAccount?.bankName ? `${c.bankAccount.bankName} · ${c.bankAccount.accountNumber || ''}` : '' },
  { header: 'Drawer / Payee', accessor: (c) => c.drawerOrPayee || '' },
  { header: 'Cheque Date', accessor: (c) => { const fd = fmtDate(c.chequeDate); return fd === '—' ? '' : fd } },
  { header: 'Notes', accessor: (c) => c.notes || '' },
]

function fmtDate(d) {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return '—'
    return dt.toLocaleDateString('en-LK')
  } catch {
    return '—'
  }
}

export default function AdminCheques() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState({ status: '', source: '', direction: '', fromDate: '', toDate: '' })
  const [viewId, setViewId] = useState(null)
  /** Row from list when GET /cheques/:id is missing on older APIs */
  const [viewFallback, setViewFallback] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    direction: 'received',
    source: 'manual',
    status: 'pending',
    amount: '',
    currency: 'LKR',
    chequeNumber: '',
    chequeDate: '',
    bankName: '',
    drawerOrPayee: '',
    renewalDate: '',
    notes: '',
    bankAccount: '',
  })
  const f = (k) => (v) => setForm((p) => ({ ...p, [k]: v }))

  const qs = new URLSearchParams()
  if (filter.status) qs.set('status', filter.status)
  if (filter.source) qs.set('source', filter.source)
  if (filter.direction) qs.set('direction', filter.direction)
  if (filter.fromDate) qs.set('fromDate', filter.fromDate)
  if (filter.toDate) qs.set('toDate', filter.toDate)

  const { data, isLoading } = useQuery({
    queryKey: ['cheques', filter],
    queryFn: () => api.get(`/cheques?${qs.toString()}`).then((r) => r.data),
  })
  const {
    data: detailCheque,
    isLoading: detailLoading,
    isError: detailError,
    error: detailQueryError,
    isFetching: detailFetching,
  } = useQuery({
    queryKey: ['cheque', viewId],
    queryFn: async () => {
      const { data } = await api.get(`/cheques/${viewId}`)
      const ch = data?.cheque ?? data?.data?.cheque
      if (!ch) {
        const msg = data?.message || 'Could not load cheque'
        throw new Error(msg)
      }
      return ch
    },
    enabled: Boolean(viewId),
    retry: 0,
  })

  const displayCheque = useMemo(() => {
    if (detailCheque) return detailCheque
    if (viewId && viewFallback && String(viewFallback._id) === String(viewId)) return viewFallback
    return null
  }, [detailCheque, viewId, viewFallback])

  const closeView = () => {
    setViewId(null)
    setViewFallback(null)
  }

  const showListFallback = Boolean(
    detailError && !detailCheque && viewFallback && viewId && String(viewFallback._id) === String(viewId)
  )
  const { data: bankData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get('/bank-accounts').then((r) => r.data),
  })

  const cheques = data?.cheques || []
  const banks = bankData?.accounts || []

  const createMut = useMutation({
    mutationFn: (body) => api.post('/cheques', body).then((r) => r.data),
    onSuccess: () => {
      toast.success('Cheque recorded')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['cheques'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`/cheques/${id}`, body).then((r) => r.data),
    onSuccess: (data) => {
      if (data?.ledgerAction === 'reversed') {
        toast.success('Cheque updated — bank ledger reversed')
      } else if (data?.bankUpdated) {
        toast.success('Cheque updated — bank balance adjusted')
      } else {
        toast.success('Updated')
      }
      qc.invalidateQueries({ queryKey: ['cheques'] })
      qc.invalidateQueries({ queryKey: ['bank-accounts'] })
      qc.invalidateQueries({ queryKey: ['bank-tx-history-all'] })
      qc.invalidateQueries({ queryKey: ['finance'] })
      qc.invalidateQueries({ queryKey: ['financial-reports'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const handleStatusChange = (cheque, newStatus) => {
    const bankId = cheque.bankAccount?._id || cheque.bankAccount
    if (statusNeedsBankLedger(newStatus, cheque.direction) && !bankId) {
      toast.error('Select a bank account for this cheque before marking as paid or cleared')
      return
    }
    const body = { status: newStatus }
    if (bankId) body.bankAccount = bankId
    updateMut.mutate({ id: cheque._id, body })
  }

  const handleBankChange = (chequeId, bankAccountId) => {
    updateMut.mutate({ id: chequeId, body: { bankAccount: bankAccountId || undefined } })
  }

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/cheques/${id}`),
    onSuccess: () => {
      toast.success('Removed')
      qc.invalidateQueries({ queryKey: ['cheques'] })
    },
  })
  const { requestDelete: requestDeleteCheque, DeletePasswordModal: chequeDeleteModal } = useDeleteWithPassword(deleteMut, {
    title: 'Delete cheque record',
    message: 'Enter your admin password to delete this cheque record.',
  })

  const submit = () => {
    if (!form.chequeNumber.trim()) return toast.error('Cheque number is required')
    const amount = Number(form.amount)
    if (!amount || amount <= 0) return toast.error('Valid amount required')
    createMut.mutate({
      direction: form.direction,
      source: form.source,
      status: form.status,
      amount,
      currency: form.currency || 'LKR',
      chequeNumber: form.chequeNumber.trim(),
      chequeDate: form.chequeDate || undefined,
      bankName: form.bankName || '',
      drawerOrPayee: form.drawerOrPayee || '',
      renewalDate: form.renewalDate || undefined,
      notes: form.notes || '',
      bankAccount: form.bankAccount || undefined,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cheque management</h1>
          <p className="page-subtitle">Track received and issued cheques. Link to bank accounts and update clearing status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportBar
            data={cheques}
            columns={CHEQUE_EXPORT_COLUMNS}
            title="Cheque Management Report"
            filters={{
              Status: filter.status ? (CHEQUE_STATUS_LABEL[filter.status] || filter.status) : 'All',
              Direction: filter.direction || 'All',
              Source: filter.source || 'All',
              From: filter.fromDate || '—',
              To: filter.toDate || '—',
            }}
          />
          <button type="button" className="btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <FiPlus size={14} /> Add cheque
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select className="form-select w-auto" value={filter.direction} onChange={(e) => setFilter((p) => ({ ...p, direction: e.target.value }))}>
          <option value="">Incoming & outgoing</option>
          <option value="incoming">Incoming</option>
          <option value="outgoing">Outgoing</option>
        </select>
        <select className="form-select w-auto" value={filter.status} onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}>
          <option value="">All statuses</option>
          {CHEQUE_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input type="date" className="form-input w-auto py-2 text-sm" value={filter.fromDate} onChange={(e) => setFilter((p) => ({ ...p, fromDate: e.target.value }))} />
        <input type="date" className="form-input w-auto py-2 text-sm" value={filter.toDate} onChange={(e) => setFilter((p) => ({ ...p, toDate: e.target.value }))} />
        <select className="form-select w-auto" value={filter.source} onChange={(e) => setFilter((p) => ({ ...p, source: e.target.value }))}>
          <option value="">All sources</option>
          <option value="manual">Manual</option>
          <option value="subscription">Subscription</option>
          <option value="invoice">Invoice</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="payroll">Payroll</option>
        </select>
      </div>

      {showForm && (
        <div className="card card-body border border-slate-200 space-y-4">
          <h3 className="font-bold text-primary font-heading">New cheque</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Direction</label>
              <select className="form-select" value={form.direction} onChange={(e) => f('direction')(e.target.value)}>
                <option value="incoming">Incoming cheque</option>
                <option value="outgoing">Outgoing cheque</option>
                <option value="received">Received (legacy)</option>
                <option value="issued">Issued (legacy)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Source</label>
              <select className="form-select" value={form.source} onChange={(e) => f('source')(e.target.value)}>
                <option value="manual">Manual</option>
                <option value="subscription">Subscription</option>
                <option value="invoice">Invoice</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="payroll">Payroll</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={(e) => f('status')(e.target.value)}>
                {CHEQUE_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Amount (LKR)</label>
              <input className="form-input" type="number" value={form.amount} onChange={(e) => f('amount')(e.target.value)} min="0" step="0.01" />
            </div>
            <div>
              <label className="form-label">Cheque number *</label>
              <input className="form-input" value={form.chequeNumber} onChange={(e) => f('chequeNumber')(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Cheque date</label>
              <input className="form-input" type="date" value={form.chequeDate} onChange={(e) => f('chequeDate')(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Bank / branch</label>
              <input className="form-input" value={form.bankName} onChange={(e) => f('bankName')(e.target.value)} placeholder="Drawee bank" />
            </div>
            <div>
              <label className="form-label">Drawer / payee</label>
              <input className="form-input" value={form.drawerOrPayee} onChange={(e) => f('drawerOrPayee')(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Renewal / follow-up date</label>
              <input className="form-input" type="date" value={form.renewalDate} onChange={(e) => f('renewalDate')(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Company bank account</label>
              <select className="form-select" value={form.bankAccount} onChange={(e) => f('bankAccount')(e.target.value)}>
                <option value="">None</option>
                {banks.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.bankName} · {b.accountNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={(e) => f('notes')(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={createMut.isPending} onClick={submit}>
              Save
            </button>
          </div>
        </div>
      )}

      <div className="card hidden md:block">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Cheque</th>
                <th>Direction</th>
                <th>Source</th>
                <th>Amount</th>
                <th>Bank account</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="w-6 h-6 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              )}
              {!isLoading &&
                cheques.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <p className="font-mono text-sm font-semibold text-slate-800">{c.chequeNumber}</p>
                      <p className="text-xs text-slate-500">{c.bankName || '—'} · {fmtDate(c.chequeDate)}</p>
                    </td>
                    <td className="capitalize text-sm">{c.direction}</td>
                    <td className="capitalize text-sm text-slate-600">{c.source}</td>
                    <td className="font-semibold">LKR {Number(c.amount || 0).toLocaleString()}</td>
                    <td>
                      <select
                        className="form-select py-1 text-xs min-w-[140px]"
                        value={c.bankAccount?._id || c.bankAccount || ''}
                        onChange={(e) => handleBankChange(c._id, e.target.value)}
                      >
                        <option value="">— Select bank —</option>
                        {banks.filter((b) => b.isActive !== false).map((b) => (
                          <option key={b._id} value={b._id}>{b.bankName} · {b.accountNumber}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className={`form-select py-1 text-xs capitalize ${STATUS_BADGE[c.status] || 'badge-gray'}`}
                        value={c.status}
                        onChange={(e) => handleStatusChange(c, e.target.value)}
                      >
                        {CHEQUE_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                        {!CHEQUE_STATUS_OPTIONS.some((o) => o.value === c.status) && c.status && (
                          <option value={c.status}>{CHEQUE_STATUS_LABEL[c.status] || c.status}</option>
                        )}
                      </select>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-0.5 justify-end">
                        <button
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-secondary"
                          title="View details"
                          onClick={() => {
                            setViewFallback(c)
                            setViewId(c._id)
                          }}
                        >
                          <FiEye size={14} />
                        </button>
                        <button type="button" className="p-1.5 text-slate-400 hover:text-red-500" title="Delete" onClick={() => requestDeleteCheque(c._id)}>
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!isLoading && cheques.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No cheques yet. Add one or record subscription payments as cheque.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-12"><div className="w-7 h-7 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto" /></div>
        ) : cheques.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">No cheques yet.</div>
        ) : cheques.map((c) => (
          <div key={c._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono font-bold text-slate-800 text-sm">{c.chequeNumber}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.bankName || '—'} · {fmtDate(c.chequeDate)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`badge text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[c.status] || 'badge-gray'}`}>
                  {CHEQUE_STATUS_LABEL[c.status] || c.status}
                </span>
              </div>
            </div>

            {/* Direction + Source + Amount row */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full">{c.direction}</span>
                <span className="bg-slate-100 text-slate-500 text-[10px] capitalize px-2 py-0.5 rounded-full">{c.source}</span>
              </div>
              <p className={`font-bold text-sm ${c.direction === 'received' ? 'text-emerald-600' : 'text-red-600'}`}>
                LKR {Number(c.amount || 0).toLocaleString()}
              </p>
            </div>

            {/* Bank account selector */}
            <div>
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide block mb-1">Bank Account</label>
              <select
                className="form-select text-xs py-1.5 w-full"
                value={c.bankAccount?._id || c.bankAccount || ''}
                onChange={(e) => handleBankChange(c._id, e.target.value)}
              >
                <option value="">— Select bank —</option>
                {banks.filter((b) => b.isActive !== false).map((b) => (
                  <option key={b._id} value={b._id}>{b.bankName} · {b.accountNumber}</option>
                ))}
              </select>
            </div>

            {/* Status selector + Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <select
                className="form-select text-xs py-1.5 flex-1 capitalize"
                value={c.status}
                onChange={(e) => handleStatusChange(c, e.target.value)}
              >
                {CHEQUE_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                {!CHEQUE_STATUS_OPTIONS.some((o) => o.value === c.status) && c.status && (
                  <option value={c.status}>{CHEQUE_STATUS_LABEL[c.status] || c.status}</option>
                )}
              </select>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button"
                  className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  title="View details"
                  onClick={() => { setViewFallback(c); setViewId(c._id) }}
                >
                  <FiEye size={14} />
                </button>
                <button type="button"
                  className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                  title="Delete"
                  onClick={() => requestDeleteCheque(c._id)}
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewId &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cheque details</p>
                  <h2 className="text-lg font-heading font-bold text-primary">
                    {!displayCheque && detailLoading ? '…' : displayCheque?.chequeNumber || '—'}
                  </h2>
                </div>
                <button type="button" className="p-2 rounded-xl hover:bg-slate-200/80 text-slate-500" onClick={closeView} aria-label="Close">
                  <FiX size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-5 space-y-4 text-sm">
                {detailLoading && !displayCheque && (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                  </div>
                )}
                {detailError && !displayCheque && !detailLoading && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-semibold">Could not load cheque details</p>
                    <p className="mt-1 text-red-700">
                      {detailQueryError?.response?.data?.message || detailQueryError?.message || 'Request failed. Check that you are on the latest API and try again.'}
                    </p>
                  </div>
                )}
                {displayCheque && (
                  <>
                    {showListFallback && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950">
                        <p className="font-semibold">Using list data</p>
                        <p className="mt-1 opacity-90">
                          This API does not expose <code className="font-mono">GET /api/cheques/:id</code> yet. Details below match the cheques list. Redeploy the server with the latest routes to enable live detail refresh.
                        </p>
                      </div>
                    )}
                    {detailFetching && detailCheque && (
                      <p className="text-[11px] text-slate-400">Refreshing…</p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div><span className="text-xs text-slate-500 block">Amount</span><span className="font-bold text-slate-900">{displayCheque.currency || 'LKR'} {Number(displayCheque.amount || 0).toLocaleString()}</span></div>
                      <div><span className="text-xs text-slate-500 block">Status</span><span className="capitalize font-semibold">{displayCheque.status}</span></div>
                      <div><span className="text-xs text-slate-500 block">Direction</span><span className="capitalize">{displayCheque.direction}</span></div>
                      <div><span className="text-xs text-slate-500 block">Source</span><span className="capitalize">{displayCheque.source}</span></div>
                      <div><span className="text-xs text-slate-500 block">Cheque date</span>{fmtDate(displayCheque.chequeDate)}</div>
                      <div><span className="text-xs text-slate-500 block">Renewal / follow-up</span>{fmtDate(displayCheque.renewalDate)}</div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Bank & parties</p>
                      <p><span className="text-slate-500">Drawee bank / branch:</span> <span className="font-medium text-slate-800">{displayCheque.bankName || '—'}</span></p>
                      <p><span className="text-slate-500">Drawer / payee:</span> <span className="font-medium text-slate-800">{displayCheque.drawerOrPayee || '—'}</span></p>
                    </div>
                    {displayCheque.bankAccount && (
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Company bank account</p>
                        <p className="font-semibold text-slate-800">{displayCheque.bankAccount.bankName}</p>
                        <p className="text-slate-600 text-xs">A/C {displayCheque.bankAccount.accountNumber}{displayCheque.bankAccount.accountHolder ? ` · ${displayCheque.bankAccount.accountHolder}` : ''}</p>
                        {displayCheque.bankAccount.branchName && <p className="text-xs text-slate-500">Branch: {displayCheque.bankAccount.branchName}</p>}
                        {displayCheque.bankAccount.currentBalance != null && (
                          <p className="text-xs text-slate-500">Ledger balance (ref.): LKR {Number(displayCheque.bankAccount.currentBalance).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                    {displayCheque.linkedSubscription && (
                      <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3 space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-600/80">Linked subscription</p>
                        <p className="font-semibold text-slate-800">{displayCheque.linkedSubscription.title}</p>
                        <p className="text-xs text-slate-600">No. {displayCheque.linkedSubscription.subscriptionNo}{displayCheque.linkedSubscription.status ? ` · ${displayCheque.linkedSubscription.status}` : ''}</p>
                        {displayCheque.linkedSubscription.nextDueDate && (
                          <p className="text-xs text-slate-500">Next due: {fmtDate(displayCheque.linkedSubscription.nextDueDate)}</p>
                        )}
                      </div>
                    )}
                    {displayCheque.linkedInvoice && (
                      <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3 space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-amber-800/80">Linked invoice</p>
                        <p className="font-semibold text-slate-800">{displayCheque.linkedInvoice.invoiceNo}</p>
                        <p className="text-xs text-slate-600">
                          {displayCheque.linkedInvoice.status} · Total LKR {Number(displayCheque.linkedInvoice.total || 0).toLocaleString()}
                          {displayCheque.linkedInvoice.remainingBalance != null && ` · Remaining LKR ${Number(displayCheque.linkedInvoice.remainingBalance).toLocaleString()}`}
                        </p>
                      </div>
                    )}
                    {displayCheque.branch && (
                      <p className="text-xs"><span className="text-slate-500">Branch:</span> <span className="font-medium">{displayCheque.branch.name}</span></p>
                    )}
                    {displayCheque.recordedBy && (
                      <p className="text-xs"><span className="text-slate-500">Recorded by:</span> <span className="font-medium">{displayCheque.recordedBy.name}</span>{displayCheque.recordedBy.email ? <span className="text-slate-400"> ({displayCheque.recordedBy.email})</span> : null}</p>
                    )}
                    {displayCheque.notes && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Notes</p>
                        <p className="text-slate-700 whitespace-pre-wrap">{displayCheque.notes}</p>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      Created {fmtDate(displayCheque.createdAt)} · Updated {fmtDate(displayCheque.updatedAt)}
                    </div>
                  </>
                )}
              </div>
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button type="button" className="btn-secondary btn-sm" onClick={closeView}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {chequeDeleteModal}
    </div>
  )
}
