import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import ExportBar from '../../components/ui/ExportBar'
import { FiPlus, FiTrash2, FiPlay, FiEye, FiEdit2, FiX, FiExternalLink } from 'react-icons/fi'
import { assignableEmployeesUrl } from '../../lib/employeeApi'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const EMPTY_PROFILE = {
  employeeId: '',
  year: new Date().getFullYear(),
  tin: '',
  taxResidency: 'resident',
  employmentType: 'permanent',
  filingStatus: 'single',
  calculationMode: 'monthly',
  isExempt: false,
  exemptionReason: '',
  exemptions: [],
  effectiveFrom: '',
  notes: '',
}

function profileToForm(p) {
  if (!p) return { ...EMPTY_PROFILE }
  return {
    id: p._id,
    employeeId: p.employee?._id || p.employee || '',
    year: p.year,
    tin: p.tin || '',
    taxResidency: p.taxResidency || 'resident',
    employmentType: p.employmentType || 'permanent',
    filingStatus: p.filingStatus || 'single',
    calculationMode: p.calculationMode || 'monthly',
    isExempt: !!p.isExempt,
    exemptionReason: p.exemptionReason || '',
    exemptions: p.exemptions || [],
    effectiveFrom: p.effectiveFrom ? new Date(p.effectiveFrom).toISOString().split('T')[0] : '',
    notes: p.notes || '',
  }
}

function defaultFromDate() {
  const d = new Date()
  return `${d.getFullYear()}-01-01`
}

function defaultToDate() {
  return new Date().toISOString().split('T')[0]
}

function formatRecordPeriod(r) {
  if (!r) return '—'
  return `${MONTHS[(r.month || 1) - 1]} ${r.year}`
}

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

const EMPTY_RECORD_FORM = {
  taxableIncome: 0,
  taxAmount: 0,
  exemptionsApplied: 0,
  status: 'calculated',
  notes: '',
}

function recordToForm(r) {
  if (!r) return { ...EMPTY_RECORD_FORM }
  return {
    taxableIncome: r.taxableIncome ?? 0,
    taxAmount: r.taxAmount ?? 0,
    exemptionsApplied: r.exemptionsApplied ?? 0,
    status: r.status || 'calculated',
    notes: r.notes || '',
  }
}

function recordDetailRows(r) {
  const remitted = r.status === 'remitted'
  return [
    ['Employee', r.employee?.userId?.name || '—'],
    ['Email', r.employee?.userId?.email || '—'],
    ['Employee no.', r.employee?.employeeNo || '—'],
    ['Period', formatRecordPeriod(r)],
    ['Tax config', r.config ? `${r.config.name} (${r.config.year})` : '—'],
    ['Branch', r.branch?.name || '—'],
    ['Taxable income (LKR)', Number(r.taxableIncome || 0).toLocaleString()],
    ['Exemptions applied (LKR)', Number(r.exemptionsApplied || 0).toLocaleString()],
    ['Tax amount (LKR)', Number(r.taxAmount || 0).toLocaleString()],
    ['Status', r.status || '—'],
    ['Payment method', remitted ? (r.paymentMethod || '—').replace(/_/g, ' ') : '—'],
    ['Paid from bank', remitted && r.bankAccount ? `${r.bankAccount.bankName} · ${r.bankAccount.accountNumber}` : '—'],
    ['Remitted at', remitted ? fmtDateTime(r.remittedAt) : '—'],
    ['Remitted by', remitted ? (r.remittedBy?.name || '—') : '—'],
    ['Payroll', r.payroll ? `${MONTHS[(r.payroll.month || 1) - 1]} ${r.payroll.year} · Net LKR ${Number(r.payroll.netSalary || 0).toLocaleString()}` : '—'],
    ['Notes', r.notes || '—'],
    ['Created', fmtDateTime(r.createdAt)],
    ['Last updated', fmtDateTime(r.updatedAt)],
  ]
}

export default function IncomeTax() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('configs')
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [toDate, setToDate] = useState(defaultToDate)
  const [configForm, setConfigForm] = useState({ name: '', year: new Date().getFullYear(), standardRelief: 0, isActive: true, notes: '', slabs: [{ minIncome: 0, maxIncome: 1500000, rate: 6, label: 'First slab' }] })
  const [profileForm, setProfileForm] = useState({ ...EMPTY_PROFILE })
  const [profileModal, setProfileModal] = useState(null)
  const [viewProfile, setViewProfile] = useState(null)
  const [remitForm, setRemitForm] = useState({ paymentMethod: 'bank_transfer', bankAccount: '', remitDate: new Date().toISOString().split('T')[0] })
  const [viewRecord, setViewRecord] = useState(null)
  const [recordEdit, setRecordEdit] = useState(null)
  const [recordForm, setRecordForm] = useState({ ...EMPTY_RECORD_FORM })

  const { data: configData } = useQuery({ queryKey: ['tax-configs'], queryFn: () => api.get('/income-tax/configs').then(r => r.data) })
  const profileYear = new Date(fromDate).getFullYear()
  const { data: profileData } = useQuery({ queryKey: ['tax-profiles', profileYear], queryFn: () => api.get(`/income-tax/profiles?year=${profileYear}`).then(r => r.data) })
  const dateQs = `fromDate=${fromDate}&toDate=${toDate}`
  const { data: recordData } = useQuery({
    queryKey: ['tax-records', fromDate, toDate],
    queryFn: () => api.get(`/income-tax/records?${dateQs}`).then(r => r.data),
  })
  const { data: reportData } = useQuery({
    queryKey: ['tax-report', fromDate, toDate],
    queryFn: () => api.get(`/income-tax/reports?type=monthly&${dateQs}`).then(r => r.data),
    enabled: tab === 'reports',
  })
  const { data: empData } = useQuery({ queryKey: ['employees-tax'], queryFn: () => api.get(assignableEmployeesUrl()).then(r => r.data) })
  const { data: bankData } = useQuery({ queryKey: ['bank-accounts'], queryFn: () => api.get('/bank-accounts').then(r => r.data) })

  const configs = configData?.configs || []
  const profiles = profileData?.profiles || []
  const records = recordData?.records || []
  const employees = empData?.employees || []
  const banks = bankData?.accounts || []

  const createConfigMut = useMutation({
    mutationFn: () => api.post('/income-tax/configs', configForm),
    onSuccess: () => { toast.success('Tax config saved'); qc.invalidateQueries(['tax-configs']) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteConfigMut = useMutation({
    mutationFn: id => api.delete(`/income-tax/configs/${id}`),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['tax-configs']) },
  })
  const saveProfileMut = useMutation({
    mutationFn: () => {
      const { id, ...body } = profileForm
      if (id) return api.put(`/income-tax/profiles/${id}`, body)
      return api.post('/income-tax/profiles', body)
    },
    onSuccess: () => {
      toast.success('Tax profile saved')
      qc.invalidateQueries(['tax-profiles'])
      setProfileModal(null)
      setProfileForm({ ...EMPTY_PROFILE })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteProfileMut = useMutation({
    mutationFn: id => api.delete(`/income-tax/profiles/${id}`),
    onSuccess: () => {
      toast.success('Tax profile deleted')
      qc.invalidateQueries(['tax-profiles'])
      setViewProfile(null)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const generateMut = useMutation({
    mutationFn: () => api.post('/income-tax/generate', { fromDate, toDate }),
    onSuccess: (r) => {
      const extra = r.data.monthsProcessed ? ` across ${r.data.monthsProcessed} month(s)` : ''
      toast.success(`Generated ${r.data.count} records${extra}`)
      qc.invalidateQueries(['tax-records'])
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const pendingRemit = records.filter((r) => r.status !== 'remitted' && Number(r.taxAmount) > 0)
  const pendingRemitTotal = pendingRemit.reduce((s, r) => s + Number(r.taxAmount || 0), 0)
  const activeBanks = banks.filter((b) => b.isActive !== false)
  const selectedBank = useMemo(
    () => activeBanks.find((b) => b._id === remitForm.bankAccount),
    [activeBanks, remitForm.bankAccount],
  )
  const balanceAfterRemit = selectedBank
    ? Number(selectedBank.currentBalance || 0) - pendingRemitTotal
    : null

  const remitMut = useMutation({
    mutationFn: () => api.post('/income-tax/remit', {
      recordIds: pendingRemit.map((r) => r._id),
      paymentMethod: remitForm.paymentMethod,
      bankAccount: remitForm.bankAccount,
      date: remitForm.remitDate ? new Date(remitForm.remitDate).toISOString() : new Date().toISOString(),
    }),
    onSuccess: (res) => {
      const d = res.data
      const bankLabel = d.bankAccount?.bankName ? ` from ${d.bankAccount.bankName}` : ''
      toast.success(
        `Tax remitted — LKR ${Number(d.totalRemitted || 0).toLocaleString()}${bankLabel}. New balance: LKR ${Number(d.bankBalanceAfter || 0).toLocaleString()}`,
      )
      qc.invalidateQueries({ queryKey: ['tax-records'] })
      qc.invalidateQueries({ queryKey: ['bank-accounts'] })
      qc.invalidateQueries({ queryKey: ['bank-tx-history'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const handleRemit = () => {
    if (!pendingRemit.length) {
      toast.error('No pending tax records to remit for this period')
      return
    }
    if (!remitForm.bankAccount) {
      toast.error('Select the bank account to pay tax from')
      return
    }
    if (balanceAfterRemit != null && balanceAfterRemit < 0) {
      toast.error('Insufficient bank balance for this remittance')
      return
    }
    if (!window.confirm(
      `Pay LKR ${pendingRemitTotal.toLocaleString()} income tax from ${selectedBank?.bankName || 'selected account'}? This will update Bank Management.`,
    )) return
    remitMut.mutate()
  }

  const recordExportColumns = [
    { header: 'Employee', accessor: r => r.employee?.userId?.name || '—' },
    { header: 'Email', accessor: r => r.employee?.userId?.email || '—' },
    { header: 'Employee no.', accessor: r => r.employee?.employeeNo || '—' },
    { header: 'Period', accessor: r => formatRecordPeriod(r) },
    { header: 'Tax config', accessor: r => r.config?.name || '—' },
    { header: 'Branch', accessor: r => r.branch?.name || '—' },
    { header: 'Taxable (LKR)', accessor: r => Number(r.taxableIncome || 0) },
    { header: 'Exemptions (LKR)', accessor: r => Number(r.exemptionsApplied || 0) },
    { header: 'Tax (LKR)', accessor: r => Number(r.taxAmount || 0) },
    { header: 'Status', accessor: r => r.status || '—' },
    { header: 'Payment', accessor: r => (r.paymentMethod || '—').replace(/_/g, ' ') },
    { header: 'Bank', accessor: r => (r.bankAccount ? `${r.bankAccount.bankName} ${r.bankAccount.accountNumber}` : '—') },
    { header: 'Remitted at', accessor: r => (r.remittedAt ? new Date(r.remittedAt).toLocaleString() : '—') },
    { header: 'Notes', accessor: r => r.notes || '' },
  ]

  const reportColumns = recordExportColumns.slice(0, 5)

  const saveRecordMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`/income-tax/records/${id}`, body),
    onSuccess: () => {
      toast.success('Tax record updated')
      qc.invalidateQueries({ queryKey: ['tax-records'] })
      setRecordEdit(null)
      setViewRecord(null)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteRecordMut = useMutation({
    mutationFn: id => api.delete(`/income-tax/records/${id}`),
    onSuccess: () => {
      toast.success('Tax record deleted')
      qc.invalidateQueries({ queryKey: ['tax-records'] })
      setViewRecord(null)
      setRecordEdit(null)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const openRecordView = (r) => {
    setViewRecord(r)
    setRecordEdit(null)
  }

  const openRecordEdit = (r) => {
    setViewRecord(null)
    setRecordEdit(r)
    setRecordForm(recordToForm(r))
  }

  const handleDeleteRecord = (r) => {
    if (r.status === 'remitted') {
      toast.error('Cannot delete remitted records (bank payment already posted)')
      return
    }
    if (!window.confirm(`Delete tax record for ${r.employee?.userId?.name} (${formatRecordPeriod(r)})?`)) return
    deleteRecordMut.mutate(r._id)
  }

  const handleSaveRecord = () => {
    if (!recordEdit) return
    saveRecordMut.mutate({ id: recordEdit._id, body: recordForm })
  }

  return (
    <div className="erp-module space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Income Tax Management</h1>
          <p className="page-subtitle">Tax slabs, employee profiles, payroll deductions & remittance</p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="form-label text-xs">From</label>
            <input type="date" className="form-input py-2 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label text-xs">To</label>
            <input type="date" className="form-input py-2 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['configs', 'profiles', 'records', 'reports'].map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize ${tab === t ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-600'}`}>{t}</button>
        ))}
      </div>

      {tab === 'configs' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card card-body space-y-4">
            <div>
              <h3 className="font-bold text-primary">Create tax year config</h3>
              <p className="text-xs text-slate-500 mt-1">
                Defines income tax brackets for payroll. One active config per calendar year is used when generating tax records and payroll.
              </p>
            </div>
            <div>
              <label className="form-label">Config name *</label>
              <input className="form-input" placeholder="e.g. PAYE 2026 — Sri Lanka" value={configForm.name} onChange={e => setConfigForm(s => ({ ...s, name: e.target.value }))} />
              <p className="text-xs text-slate-400 mt-1">A label so you can tell configs apart (not shown on payslips).</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Tax year *</label>
                <input type="number" className="form-input" placeholder="2026" value={configForm.year} onChange={e => setConfigForm(s => ({ ...s, year: Number(e.target.value) }))} />
                <p className="text-xs text-slate-400 mt-1">Calendar year this config applies to.</p>
              </div>
              <div>
                <label className="form-label">Standard relief (LKR)</label>
                <input type="number" className="form-input" placeholder="0" value={configForm.standardRelief} onChange={e => setConfigForm(s => ({ ...s, standardRelief: Number(e.target.value) }))} />
                <p className="text-xs text-slate-400 mt-1">Annual amount deducted from taxable income for every employee (before slabs).</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Tax slabs (brackets)</p>
                <p className="text-xs text-slate-500 mt-0.5">Annual income bands and rate on each band. Leave To empty on the last slab for and above.</p>
              </div>
              <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-slate-500 px-1">
                <span>Slab name</span><span>From (LKR/yr)</span><span>To (LKR/yr)</span><span>Rate (%)</span><span />
              </div>
              {configForm.slabs.map((slab, i) => (
                <div key={i} className="p-2 rounded-lg bg-white border border-slate-100 space-y-2">
                  <p className="text-xs font-medium text-slate-500 sm:hidden">Slab {i + 1}</p>
                  <div className="grid sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                    <div>
                      <label className="form-label text-xs">Name</label>
                      <input className="form-input text-sm" placeholder="First 1.5M" value={slab.label || ''} onChange={e => setConfigForm(s => ({ ...s, slabs: s.slabs.map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))} />
                    </div>
                    <div>
                      <label className="form-label text-xs">From</label>
                      <input type="number" className="form-input text-sm" placeholder="0" value={slab.minIncome} onChange={e => setConfigForm(s => ({ ...s, slabs: s.slabs.map((x, j) => j === i ? { ...x, minIncome: Number(e.target.value) } : x) }))} />
                    </div>
                    <div>
                      <label className="form-label text-xs">To</label>
                      <input type="number" className="form-input text-sm" placeholder="No limit" value={slab.maxIncome ?? ''} onChange={e => setConfigForm(s => ({ ...s, slabs: s.slabs.map((x, j) => j === i ? { ...x, maxIncome: e.target.value === '' ? null : Number(e.target.value) } : x) }))} />
                    </div>
                    <div>
                      <label className="form-label text-xs">Rate %</label>
                      <input type="number" className="form-input text-sm" placeholder="6" value={slab.rate} onChange={e => setConfigForm(s => ({ ...s, slabs: s.slabs.map((x, j) => j === i ? { ...x, rate: Number(e.target.value) } : x) }))} />
                    </div>
                    {configForm.slabs.length > 1 && (
                      <button type="button" className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-1" onClick={() => setConfigForm(s => ({ ...s, slabs: s.slabs.filter((_, j) => j !== i) }))}><FiTrash2 size={16} /></button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" className="btn-ghost text-sm w-full" onClick={() => setConfigForm(s => ({ ...s, slabs: [...s.slabs, { minIncome: 0, maxIncome: null, rate: 0, label: '' }] }))}>+ Add tax slab</button>
              <p className="text-xs text-slate-400">Example: 0–1,500,000 at 6%, then 1,500,001+ at 12% (leave To empty on last slab).</p>
            </div>
            <div>
              <label className="form-label">Admin notes (optional)</label>
              <textarea className="form-input min-h-[60px] text-sm" placeholder="e.g. IRD circular reference" value={configForm.notes || ''} onChange={e => setConfigForm(s => ({ ...s, notes: e.target.value }))} />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={configForm.isActive} onChange={e => setConfigForm(s => ({ ...s, isActive: e.target.checked }))} />
              <span><span className="font-medium">Active for this tax year</span><span className="block text-xs text-slate-500">Used by payroll and tax record generation (one active per year).</span></span>
            </label>
            <button type="button" className="btn-primary" onClick={() => { if (!configForm.name?.trim()) { toast.error('Enter a config name'); return }; createConfigMut.mutate() }} disabled={createConfigMut.isPending}><FiPlus /> Save tax config</button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2">Year</th>
                  <th className="px-4 py-2">Relief (LKR)</th>
                  <th className="px-4 py-2">Slabs</th>
                  <th className="px-4 py-2">Active</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {configs.map(c => (
                  <tr key={c._id}>
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="px-4 py-2 text-center">{c.year}</td>
                    <td className="px-4 py-2 text-center text-slate-600">{(c.standardRelief || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-center">{c.slabs?.length || 0}</td>
                    <td className="px-4 py-2 text-center">{c.isActive ? 'Yes' : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" className="text-red-500 p-1 hover:bg-red-50 rounded" onClick={() => deleteConfigMut.mutate(c._id)} title="Delete"><FiTrash2 /></button>
                    </td>
                  </tr>
                ))}
                {!configs.length && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No tax configs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'profiles' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <p className="text-sm text-slate-600">Tax year {profileYear} — TIN, residency, filing status, and exemption rules per employee.</p>
            <button
              type="button"
              className="btn-primary gap-2"
              onClick={() => {
                setProfileForm({ ...EMPTY_PROFILE, year: profileYear })
                setProfileModal('create')
              }}
            >
              <FiPlus /> New tax profile
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Employee</th>
                  <th className="px-4 py-2">TIN</th>
                  <th className="px-4 py-2">Residency</th>
                  <th className="px-4 py-2">Filing</th>
                  <th className="px-4 py-2">Effective</th>
                  <th className="px-4 py-2">Exempt</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {profiles.map(p => (
                  <tr key={p._id}>
                    <td className="px-4 py-2 font-medium">{p.employee?.userId?.name || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{p.tin || '—'}</td>
                    <td className="px-4 py-2 capitalize">{p.taxResidency?.replace('_', ' ') || '—'}</td>
                    <td className="px-4 py-2 capitalize">{p.filingStatus?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {p.effectiveFrom ? new Date(p.effectiveFrom).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2">{p.isExempt ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="View" onClick={() => setViewProfile(p)}><FiEye /></button>
                        <button
                          type="button"
                          className="p-2 rounded-lg hover:bg-slate-100 text-secondary"
                          title="Edit"
                          onClick={() => {
                            setProfileForm(profileToForm(p))
                            setProfileModal('edit')
                          }}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                          title="Delete"
                          onClick={() => {
                            if (window.confirm('Delete this tax profile?')) deleteProfileMut.mutate(p._id)
                          }}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!profiles.length && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No profiles for {profileYear}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {(profileModal === 'create' || profileModal === 'edit') && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setProfileModal(null)}>
              <div className="card card-body w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-3" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-primary">{profileModal === 'edit' ? 'Edit' : 'New'} employee tax profile</h3>
                  <button type="button" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setProfileModal(null)}><FiX /></button>
                </div>
                <select
                  className="form-select"
                  value={profileForm.employeeId}
                  disabled={profileModal === 'edit'}
                  onChange={e => setProfileForm(s => ({ ...s, employeeId: e.target.value }))}
                >
                  <option value="">Select employee *</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.userId?.name}</option>
                  ))}
                </select>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Tax year *</label>
                    <input type="number" className="form-input" value={profileForm.year} onChange={e => setProfileForm(s => ({ ...s, year: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="form-label">TIN (Tax ID)</label>
                    <input className="form-input" placeholder="Government tax ID" value={profileForm.tin} onChange={e => setProfileForm(s => ({ ...s, tin: e.target.value }))} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Tax residency</label>
                    <select className="form-select" value={profileForm.taxResidency} onChange={e => setProfileForm(s => ({ ...s, taxResidency: e.target.value }))}>
                      <option value="resident">Resident</option>
                      <option value="non_resident">Non-resident</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Employment type</label>
                    <select className="form-select" value={profileForm.employmentType} onChange={e => setProfileForm(s => ({ ...s, employmentType: e.target.value }))}>
                      <option value="permanent">Permanent</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Filing status</label>
                    <select className="form-select" value={profileForm.filingStatus} onChange={e => setProfileForm(s => ({ ...s, filingStatus: e.target.value }))}>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="head_of_household">Head of household</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Tax calculation mode</label>
                    <select className="form-select" value={profileForm.calculationMode} onChange={e => setProfileForm(s => ({ ...s, calculationMode: e.target.value }))}>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Effective from</label>
                  <input type="date" className="form-input" value={profileForm.effectiveFrom} onChange={e => setProfileForm(s => ({ ...s, effectiveFrom: e.target.value }))} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={profileForm.isExempt}
                    onChange={e => setProfileForm(s => ({ ...s, isExempt: e.target.checked, exemptionReason: e.target.checked ? s.exemptionReason : '' }))}
                  />
                  Tax exempt
                </label>
                {profileForm.isExempt && (
                  <div>
                    <label className="form-label">Exemption reason *</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Below taxable threshold, Government exemption"
                      value={profileForm.exemptionReason}
                      onChange={e => setProfileForm(s => ({ ...s, exemptionReason: e.target.value }))}
                    />
                  </div>
                )}
                <div>
                  <label className="form-label">Notes / remarks</label>
                  <textarea className="form-input min-h-[80px]" value={profileForm.notes} onChange={e => setProfileForm(s => ({ ...s, notes: e.target.value }))} placeholder="Admin notes" />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" className="btn-ghost" onClick={() => setProfileModal(null)}>Cancel</button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={saveProfileMut.isPending || !profileForm.employeeId}
                    onClick={() => {
                      if (profileForm.isExempt && !profileForm.exemptionReason?.trim()) {
                        toast.error('Exemption reason is required')
                        return
                      }
                      saveProfileMut.mutate()
                    }}
                  >
                    Save profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewProfile && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setViewProfile(null)}>
              <div className="card card-body w-full max-w-md space-y-2 text-sm" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-primary">{viewProfile.employee?.userId?.name}</h3>
                  <button type="button" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setViewProfile(null)}><FiX /></button>
                </div>
                <p><span className="text-slate-500">Year:</span> {viewProfile.year}</p>
                <p><span className="text-slate-500">TIN:</span> {viewProfile.tin || '—'}</p>
                <p><span className="text-slate-500">Residency:</span> {viewProfile.taxResidency?.replace('_', ' ')}</p>
                <p><span className="text-slate-500">Employment:</span> {viewProfile.employmentType}</p>
                <p><span className="text-slate-500">Filing:</span> {viewProfile.filingStatus?.replace(/_/g, ' ')}</p>
                <p><span className="text-slate-500">Mode:</span> {viewProfile.calculationMode}</p>
                <p><span className="text-slate-500">Effective:</span> {viewProfile.effectiveFrom ? new Date(viewProfile.effectiveFrom).toLocaleDateString() : '—'}</p>
                <p><span className="text-slate-500">Exempt:</span> {viewProfile.isExempt ? `Yes — ${viewProfile.exemptionReason}` : 'No'}</p>
                {viewProfile.notes && <p className="pt-2 border-t"><span className="text-slate-500">Notes:</span> {viewProfile.notes}</p>}
                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    className="btn-ghost gap-1"
                    onClick={() => {
                      setProfileForm(profileToForm(viewProfile))
                      setProfileModal('edit')
                      setViewProfile(null)
                    }}
                  >
                    <FiEdit2 /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-red-600 gap-1"
                    onClick={() => {
                      if (window.confirm('Delete this tax profile?')) {
                        deleteProfileMut.mutate(viewProfile._id)
                      }
                    }}
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'records' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap justify-between gap-2 items-center">
              <p className="text-sm font-semibold text-slate-700">Remit tax to authorities</p>
              <Link to="/admin/bank-transactions" className="btn-ghost text-xs gap-1 py-1.5">
                <FiExternalLink size={14} /> Bank transaction history
              </Link>
            </div>
            <p className="text-xs text-slate-500">
              Pending: <strong>LKR {pendingRemitTotal.toLocaleString()}</strong> ({pendingRemit.length} record(s)).
              Tax is paid from the selected bank account; Bank Management balance and transaction history update automatically.
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <button type="button" className="btn-primary gap-2" onClick={() => generateMut.mutate()} disabled={generateMut.isPending}><FiPlay /> Generate records</button>
              <div>
                <label className="form-label text-xs">Payment type</label>
                <select
                  className="form-select py-2 text-sm"
                  value={remitForm.paymentMethod}
                  onChange={(e) => setRemitForm((s) => ({
                    ...s,
                    paymentMethod: e.target.value,
                    bankAccount: s.bankAccount,
                  }))}
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                  <label className="form-label text-xs">Pay from bank account *</label>
                  <select
                    className="form-select py-2 text-sm min-w-[220px]"
                    value={remitForm.bankAccount}
                    onChange={(e) => setRemitForm((s) => ({ ...s, bankAccount: e.target.value }))}
                  >
                    <option value="">Select account</option>
                    {activeBanks.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.bankName} — {b.accountNumber} (LKR {(b.currentBalance || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                  {selectedBank && (
                    <p className="text-xs mt-1 text-slate-500">
                      Balance: LKR {(selectedBank.currentBalance || 0).toLocaleString()}
                      {balanceAfterRemit != null && (
                        <> → after remit: <strong className={balanceAfterRemit < 0 ? 'text-red-600' : 'text-emerald-700'}>LKR {balanceAfterRemit.toLocaleString()}</strong></>
                      )}
                    </p>
                  )}
                </div>
              <div>
                <label className="form-label text-xs">Payment date</label>
                <input type="date" className="form-input py-2 text-sm" value={remitForm.remitDate} onChange={(e) => setRemitForm((s) => ({ ...s, remitDate: e.target.value }))} />
              </div>
              <button type="button" className="btn-primary" onClick={handleRemit} disabled={remitMut.isPending || !pendingRemit.length || !remitForm.bankAccount || (balanceAfterRemit != null && balanceAfterRemit < 0)}>
                {remitMut.isPending ? 'Processing…' : `Remit LKR ${pendingRemitTotal.toLocaleString()} & update bank`}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">Tax records ({records.length})</p>
            <ExportBar data={records} columns={recordExportColumns} title="Income Tax Records" filters={{ fromDate, toDate }} />
          </div>
          <div className="card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Employee</th>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2">Taxable</th>
                  <th className="px-4 py-2">Tax</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Paid from bank</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2 font-medium">{r.employee?.userId?.name}</td>
                    <td className="px-4 py-2 text-slate-600">{formatRecordPeriod(r)}</td>
                    <td className="px-4 py-2">LKR {(r.taxableIncome || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-purple-700 font-medium">LKR {(r.taxAmount || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 capitalize">{r.status}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {r.status === 'remitted' && r.bankAccount ? `${r.bankAccount.bankName} · ${r.bankAccount.accountNumber}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="View" onClick={() => openRecordView(r)}><FiEye /></button>
                        <button type="button" className="p-2 rounded-lg hover:bg-slate-100 text-secondary" title="Edit" onClick={() => openRecordEdit(r)}><FiEdit2 /></button>
                        <button type="button" className="p-2 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-40" title={r.status === 'remitted' ? 'Cannot delete remitted' : 'Delete'} disabled={r.status === 'remitted'} onClick={() => handleDeleteRecord(r)}><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!records.length && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No records for this period</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {viewRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setViewRecord(null)}>
              <div className="card card-body w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-primary">{viewRecord.employee?.userId?.name}</h3>
                    <p className="text-sm text-slate-500">{formatRecordPeriod(viewRecord)} · Income tax record</p>
                  </div>
                  <button type="button" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setViewRecord(null)}><FiX /></button>
                </div>
                <dl className="text-sm">
                  {recordDetailRows(viewRecord).map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[140px_1fr] gap-2 py-1.5 border-b border-slate-100 last:border-0">
                      <dt className="text-slate-500 font-medium">{label}</dt>
                      <dd className="text-slate-800 break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2 pt-4 mt-2 border-t">
                  <button type="button" className="btn-ghost gap-1" onClick={() => { openRecordEdit(viewRecord); setViewRecord(null) }}><FiEdit2 /> Edit</button>
                  {viewRecord.status !== 'remitted' && (
                    <button type="button" className="btn-ghost text-red-600 gap-1" onClick={() => handleDeleteRecord(viewRecord)}><FiTrash2 /> Delete</button>
                  )}
                  <button type="button" className="btn-primary ml-auto" onClick={() => setViewRecord(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {recordEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setRecordEdit(null)}>
              <div className="card card-body w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-primary">Edit tax record</h3>
                  <button type="button" className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setRecordEdit(null)}><FiX /></button>
                </div>
                <p className="text-sm text-slate-600">{recordEdit.employee?.userId?.name} · {formatRecordPeriod(recordEdit)}</p>
                {recordEdit.status === 'remitted' && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">Remitted — only notes can be edited (bank payment already posted).</p>
                )}
                {recordEdit.status !== 'remitted' && (
                  <>
                    <div>
                      <label className="form-label">Taxable income (LKR)</label>
                      <input type="number" className="form-input" value={recordForm.taxableIncome} onChange={e => setRecordForm(s => ({ ...s, taxableIncome: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="form-label">Exemptions applied (LKR)</label>
                      <input type="number" className="form-input" value={recordForm.exemptionsApplied} onChange={e => setRecordForm(s => ({ ...s, exemptionsApplied: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="form-label">Tax amount (LKR)</label>
                      <input type="number" className="form-input" value={recordForm.taxAmount} onChange={e => setRecordForm(s => ({ ...s, taxAmount: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <select className="form-select" value={recordForm.status} onChange={e => setRecordForm(s => ({ ...s, status: e.target.value }))}>
                        <option value="calculated">Calculated</option>
                        <option value="deducted">Deducted (payroll)</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="form-label">Notes</label>
                  <textarea className="form-input min-h-[72px]" value={recordForm.notes} onChange={e => setRecordForm(s => ({ ...s, notes: e.target.value }))} />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" className="btn-ghost" onClick={() => setRecordEdit(null)}>Cancel</button>
                  <button type="button" className="btn-primary" disabled={saveRecordMut.isPending} onClick={handleSaveRecord}>Save changes</button>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500">Payroll generation auto-deducts income tax when an active config exists for the year.</p>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-4">
          <ExportBar data={reportData?.records || records} columns={reportColumns} title="Income Tax Report" filters={{ fromDate, toDate }} />
          <div className="grid md:grid-cols-3 gap-4">
            <div className="kpi-card"><p className="text-xs text-slate-500">Total tax</p><p className="text-xl font-bold">LKR {(reportData?.summary?.totalTax || 0).toLocaleString()}</p></div>
            <div className="kpi-card"><p className="text-xs text-slate-500">Employees</p><p className="text-xl font-bold">{reportData?.summary?.count || 0}</p></div>
            <div className="kpi-card"><p className="text-xs text-slate-500">Remitted</p><p className="text-xl font-bold">{reportData?.summary?.remitted || 0}</p></div>
          </div>
        </div>
      )}
    </div>
  )
}
