import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { FiPlus, FiX, FiCheck, FiEdit2, FiTrash2, FiCreditCard, FiTrendingUp, FiTrendingDown, FiList, FiClipboard } from 'react-icons/fi'

const EMPTY = { bankName: '', accountNumber: '', accountHolder: '', accountType: 'current', branchName: '', currentBalance: 0, currency: 'LKR', notes: '' }

export default function AdminBankManagement() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [txnTarget, setTxnTarget] = useState(null)
  const [txnForm, setTxnForm] = useState({ type: 'deposit', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
  const [historyAccount, setHistoryAccount] = useState(null)
  const [historyPage, setHistoryPage] = useState(1)

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['bank-tx-history', historyAccount?._id, historyPage],
    queryFn: () => api.get(`/bank-accounts/${historyAccount._id}/transactions?page=${historyPage}&limit=25`).then(r => r.data),
    enabled: Boolean(historyAccount?._id),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get('/bank-accounts').then(r => r.data),
  })
  const accounts = data?.accounts || []
  const totalBalance = accounts.filter(a => a.isActive).reduce((s, a) => s + (a.currentBalance || 0), 0)

  const createMut = useMutation({
    mutationFn: p => api.post('/bank-accounts', p),
    onSuccess: () => { qc.invalidateQueries(['bank-accounts']); toast.success('Account added'); setShowCreate(false); setForm(EMPTY) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, ...p }) => api.put(`/bank-accounts/${id}`, p),
    onSuccess: () => { qc.invalidateQueries(['bank-accounts']); toast.success('Updated'); setEditing(null) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/bank-accounts/${id}`),
    onSuccess: () => { qc.invalidateQueries(['bank-accounts']); toast.success('Removed') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const txnMut = useMutation({
    mutationFn: ({ id, ...p }) => api.post(`/bank-accounts/${id}/transaction`, p),
    onSuccess: () => { qc.invalidateQueries(['bank-accounts']); toast.success('Transaction recorded'); setTxnTarget(null); setTxnForm({ type: 'deposit', amount: '', description: '', date: new Date().toISOString().split('T')[0] }) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const openEdit = (acc) => {
    setEditing(acc)
    setForm({ bankName: acc.bankName, accountNumber: acc.accountNumber, accountHolder: acc.accountHolder, accountType: acc.accountType, branchName: acc.branchName || '', currentBalance: acc.currentBalance || 0, currency: acc.currency || 'LKR', notes: acc.notes || '' })
  }

  const save = () => {
    if (!form.bankName || !form.accountNumber || !form.accountHolder) { toast.error('Bank name, account number and holder are required'); return }
    editing ? updateMut.mutate({ id: editing._id, ...form }) : createMut.mutate(form)
  }

  return (
    <div className="erp-module space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bank Management</h1>
          <p className="page-subtitle">{accounts.filter(a => a.isActive).length} active accounts · Total Balance: <strong className="text-emerald-600">LKR {totalBalance.toLocaleString()}</strong></p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/bank-transactions" className="btn-ghost gap-2"><FiClipboard size={14} />Transaction History</Link>
          <button onClick={() => { setForm(EMPTY); setEditing(null); setShowCreate(true) }} className="btn-primary gap-2"><FiPlus size={14} />Add Account</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card kpi-green">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Bank Balance</p>
          <p className="text-2xl font-bold text-emerald-700">LKR {totalBalance.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{accounts.filter(a => a.isActive).length} active accounts</p>
        </div>
        <div className="kpi-card kpi-blue">
          <p className="text-xs text-slate-500 uppercase font-medium">Largest Account</p>
          <p className="text-lg font-bold text-blue-700">{accounts.sort((a, b) => b.currentBalance - a.currentBalance)[0]?.bankName || '—'}</p>
          <p className="text-xs text-slate-400 mt-1">LKR {(accounts[0]?.currentBalance || 0).toLocaleString()}</p>
        </div>
        <div className="kpi-card kpi-purple">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Accounts</p>
          <p className="text-2xl font-bold text-purple-700">{accounts.length}</p>
          <p className="text-xs text-slate-400 mt-1">{accounts.filter(a => !a.isActive).length} inactive</p>
        </div>
      </div>

      {/* Accounts Grid */}
      {isLoading ? (
        <div className="text-center py-16"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto" /></div>
      ) : accounts.length === 0 ? (
        <div className="card card-body text-center py-16 text-slate-400">
          <FiCreditCard size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No bank accounts yet.</p>
          <p className="text-sm mt-1">Add your first bank account to start tracking balances.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <div key={acc._id} className={`card card-body space-y-3 border-l-4 ${acc.isActive ? 'border-l-emerald-500' : 'border-l-slate-300 opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-800">{acc.bankName}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{acc.accountNumber}</p>
                </div>
                <span className={`badge ${acc.accountType === 'current' ? 'badge-blue' : acc.accountType === 'savings' ? 'badge-green' : 'badge-purple'} capitalize`}>
                  {acc.accountType}
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-400">Account Holder</p>
                <p className="text-sm font-medium text-slate-700">{acc.accountHolder}</p>
              </div>
              {acc.branchName && (
                <div>
                  <p className="text-xs text-slate-400">Branch</p>
                  <p className="text-sm text-slate-600">{acc.branchName}</p>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">Current Balance</p>
                <p className={`text-2xl font-extrabold ${acc.currentBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {acc.currency} {(acc.currentBalance || 0).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setHistoryAccount(acc); setHistoryPage(1) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                  <FiList size={12} /> History
                </button>
                <button type="button" onClick={() => setTxnTarget(acc)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors">
                  <FiTrendingUp size={12} /> Transaction
                </button>
                <button onClick={() => openEdit(acc)}
                  className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><FiEdit2 size={13} /></button>
                <button onClick={() => { if (window.confirm('Remove account?')) deleteMut.mutate(acc._id) }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><FiTrash2 size={13} /></button>
              </div>

              {/* Recent transactions */}
              {(acc.transactions || []).length > 0 && (
                <div className="border-t pt-2 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Recent</p>
                  {(acc.transactions || []).slice(-3).reverse().map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 truncate">{t.description || 'Transaction'}</span>
                      <span className={`font-semibold ml-2 flex-shrink-0 ${t.type === 'deposit' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {t.type === 'deposit' ? '+' : '-'} LKR {(t.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreate || editing) && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-bold text-primary font-heading">{editing ? 'Edit Account' : 'Add Bank Account'}</h3>
              <button onClick={() => { setShowCreate(false); setEditing(null) }} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="form-label">Bank Name *</label>
                  <input className="form-input" value={form.bankName} onChange={e => setForm(s => ({ ...s, bankName: e.target.value }))} placeholder="e.g. Commercial Bank of Ceylon" /></div>
                <div><label className="form-label">Account Number *</label>
                  <input className="form-input font-mono" value={form.accountNumber} onChange={e => setForm(s => ({ ...s, accountNumber: e.target.value }))} placeholder="1234567890" /></div>
                <div><label className="form-label">Account Type</label>
                  <select className="form-select" value={form.accountType} onChange={e => setForm(s => ({ ...s, accountType: e.target.value }))}>
                    <option value="current">Current</option>
                    <option value="savings">Savings</option>
                    <option value="fixed">Fixed Deposit</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="form-label">Account Holder *</label>
                  <input className="form-input" value={form.accountHolder} onChange={e => setForm(s => ({ ...s, accountHolder: e.target.value }))} placeholder="Account holder name" /></div>
                <div><label className="form-label">Branch Name</label>
                  <input className="form-input" value={form.branchName} onChange={e => setForm(s => ({ ...s, branchName: e.target.value }))} placeholder="e.g. Colombo 03" /></div>
                <div><label className="form-label">Currency</label>
                  <select className="form-select" value={form.currency} onChange={e => setForm(s => ({ ...s, currency: e.target.value }))}>
                    <option value="LKR">LKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="form-label">Opening / Current Balance (LKR)</label>
                  <input type="number" className="form-input" value={form.currentBalance} onChange={e => setForm(s => ({ ...s, currentBalance: Number(e.target.value) }))} /></div>
                <div className="col-span-2"><label className="form-label">Notes</label>
                  <textarea rows={2} className="form-input resize-none" value={form.notes} onChange={e => setForm(s => ({ ...s, notes: e.target.value }))} placeholder="Optional notes" /></div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={() => { setShowCreate(false); setEditing(null) }} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={save} disabled={createMut.isPending || updateMut.isPending} className="btn-primary flex-1 justify-center gap-2">
                {createMut.isPending || updateMut.isPending ? <span className="spinner" /> : <FiCheck size={14} />} {editing ? 'Save Changes' : 'Add Account'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {/* Transaction Modal */}
      {txnTarget && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="font-bold text-primary font-heading">Record Transaction</h3>
                <p className="text-xs text-slate-500 mt-0.5">{txnTarget.bankName} · {txnTarget.accountNumber}</p>
              </div>
              <button onClick={() => setTxnTarget(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">Current Balance</p>
                <p className="text-xl font-bold text-slate-800">LKR {(txnTarget.currentBalance || 0).toLocaleString()}</p>
              </div>

              <div>
                <label className="form-label">Transaction Type</label>
                <div className="flex gap-3">
                  {[{ v: 'deposit', label: '↑ Deposit', color: 'emerald' }, { v: 'withdrawal', label: '↓ Withdrawal', color: 'red' }].map(opt => (
                    <label key={opt.v} className={`flex-1 cursor-pointer p-3 rounded-xl border-2 text-center transition-all ${txnForm.type === opt.v ? `border-${opt.color}-400 bg-${opt.color}-50` : 'border-slate-200'}`}>
                      <input type="radio" className="hidden" value={opt.v} checked={txnForm.type === opt.v} onChange={e => setTxnForm(s => ({ ...s, type: e.target.value }))} />
                      <p className={`text-sm font-semibold ${txnForm.type === opt.v ? `text-${opt.color}-700` : 'text-slate-500'}`}>{opt.label}</p>
                    </label>
                  ))}
                </div>
              </div>

              <div><label className="form-label">Amount (LKR) *</label>
                <input type="number" className="form-input" value={txnForm.amount} onChange={e => setTxnForm(s => ({ ...s, amount: e.target.value }))} placeholder="0.00" /></div>
              <div><label className="form-label">Description</label>
                <input className="form-input" value={txnForm.description} onChange={e => setTxnForm(s => ({ ...s, description: e.target.value }))} placeholder="e.g. Client payment received" /></div>
              <div><label className="form-label">Date</label>
                <input type="date" className="form-input" value={txnForm.date} onChange={e => setTxnForm(s => ({ ...s, date: e.target.value }))} /></div>

              {txnForm.amount && (
                <div className={`rounded-xl p-3 text-sm text-center ${txnForm.type === 'deposit' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  New balance: <strong>LKR {(txnForm.type === 'deposit'
                    ? (txnTarget.currentBalance || 0) + Number(txnForm.amount || 0)
                    : (txnTarget.currentBalance || 0) - Number(txnForm.amount || 0)
                  ).toLocaleString()}</strong>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={() => setTxnTarget(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={() => { if (!txnForm.amount) { toast.error('Amount required'); return } txnMut.mutate({ id: txnTarget._id, ...txnForm }) }}
                disabled={txnMut.isPending}
                className={`flex-1 justify-center gap-2 btn-primary ${txnForm.type === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600' : 'bg-red-500 hover:bg-red-600 border-red-500'}`}>
                {txnMut.isPending ? <span className="spinner" /> : txnForm.type === 'deposit' ? <FiTrendingUp size={14} /> : <FiTrendingDown size={14} />}
                Record {txnForm.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {historyAccount && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="font-bold text-primary font-heading">Transaction history</h3>
                <p className="text-xs text-slate-500">{historyAccount.bankName} · {historyAccount.accountNumber}</p>
              </div>
              <button type="button" onClick={() => setHistoryAccount(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              {historyLoading ? <p className="text-center py-8 text-slate-400">Loading…</p> : (
                <table className="table text-sm">
                  <thead>
                    <tr>
                      <th>Date</th><th>Type</th><th>Reference</th><th>Module</th><th>Amount</th>
                      <th>Before</th><th>After</th><th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historyData?.transactions || []).length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-8 text-slate-400">No transactions</td></tr>
                    ) : historyData.transactions.map(tx => (
                      <tr key={tx._id}>
                        <td>{tx.date ? new Date(tx.date).toLocaleString('en-LK') : '—'}</td>
                        <td className="capitalize">{tx.transactionType || tx.type}</td>
                        <td className="font-mono text-xs">{tx.referenceId || '—'}</td>
                        <td className="capitalize">{tx.moduleSource || '—'}</td>
                        <td className={tx.type === 'deposit' ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                          {tx.type === 'deposit' ? '+' : '-'} LKR {(tx.amount || 0).toLocaleString()}
                        </td>
                        <td>LKR {(tx.balanceBefore ?? 0).toLocaleString()}</td>
                        <td>LKR {(tx.balanceAfter ?? 0).toLocaleString()}</td>
                        <td>{tx.performedBy || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {historyData?.hasMore && (
              <div className="p-4 border-t flex justify-center">
                <button type="button" className="btn-outline btn-sm" onClick={() => setHistoryPage(p => p + 1)}>Load more</button>
              </div>
            )}
          </motion.div>
        </div>, document.body
      )}
    </div>
  )
}
