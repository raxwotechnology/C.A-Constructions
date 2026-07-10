import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import { assignableEmployeesUrl } from '../../lib/employeeApi'
import { lookupLoaders } from '../../lib/lookupApi'
import SearchableSelect from '../../components/ui/SearchableSelect'
import toast from 'react-hot-toast'
import { formatMoney } from '../../lib/currencies'
import { handlePayrollSyncResponse } from '../../lib/payrollSync'
import ExportBar from '../../components/ui/ExportBar'
import { useSiteBranding } from '../../hooks/useSiteBranding'
import { mediaUrl } from '../../lib/media'
import {
  downloadPayslipPdf,
  printPayslip,
  payslipSignatoryPayload,
  PAYSLIP_SIGNATORY_ROLES,
} from '../../lib/payslipDocument'
import { FiDollarSign, FiPlay, FiCheck, FiPlus, FiSend, FiX, FiAlertCircle, FiRefreshCw, FiFileText, FiEye, FiPrinter, FiUser, FiChevronDown } from 'react-icons/fi'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function isLedgerBankMethod(method) {
  const raw = String(method || '').trim();
  if (!raw) return false;
  const m = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (!m || m === 'cash' || m === 'cheque' || m === 'other' || m === 'manual' || m === 'salary_deduction') return false;
  if (m.includes('payhere')) return true;
  if (m === 'bank_transfer' || (m.includes('bank') && m.includes('transfer'))) return true;
  if (m.includes('card')) return true;
  if (m.includes('online')) return true;
  if (m.endsWith('_transfer') || m.includes('transfer')) return true;
  return false;
}

function requiresBankAccount(method) {
  const m = String(method || '').toLowerCase().replace(/[\s-]+/g, '_')
  return m === 'bank_transfer' || m === 'cheque'
}

function isChequeMethod(method) {
  return String(method || '').toLowerCase().replace(/[\s-]+/g, '_') === 'cheque'
}

const PAYROLL_PAY_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
]

export default function AdminPayroll() {
  const qc = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [branchFilter, setBranchFilter] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [allowances, setAllowances] = useState(0)
  const [commissions, setCommissions] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [otherDeductions, setOtherDeductions] = useState(0)
  const [advanceDeduction, setAdvanceDeduction] = useState(0)
  const [loanDeduction, setLoanDeduction] = useState(0)
  const [continueLoanDeduction, setContinueLoanDeduction] = useState(true)
  const [leaveDeduction, setLeaveDeduction] = useState(0)
  const [otEmployeeId, setOtEmployeeId] = useState('')
  const [otAmount, setOtAmount] = useState(0)
  const [otHours, setOtHours] = useState(0)
  const [otNote, setOtNote] = useState('')
  const [previewPayroll, setPreviewPayroll] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)
  const [editPayroll, setEditPayroll] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [deleteId, setDeleteId] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPreviewDetails, setShowPreviewDetails] = useState(false)

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const branches = branchData?.branches || []

  const { data: bankData } = useQuery({ queryKey: ['bank-accounts'], queryFn: () => api.get('/bank-accounts').then(r => r.data) })
  const bankAccounts = bankData?.accounts || []

  const [payBank, setPayBank] = useState('')
  const [payMethod, setPayMethod] = useState('bank_transfer')
  const [payChequeNumber, setPayChequeNumber] = useState('')
  const [payslipSignatoryRole, setPayslipSignatoryRole] = useState('hr')
  const [payslipCustomSignatureUrl, setPayslipCustomSignatureUrl] = useState('')
  const [payslipSignatureUploading, setPayslipSignatureUploading] = useState(false)

  const { settings: siteSettings } = useSiteBranding()

  const currentSignatoryOpts = useMemo(() => ({
    role: payslipSignatoryRole,
    customSignatureUrl: payslipCustomSignatureUrl,
  }), [payslipSignatoryRole, payslipCustomSignatureUrl])

  const uploadPayslipSignature = async (file) => {
    if (!file) return
    setPayslipSignatureUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/uploads/image', fd)
      setPayslipCustomSignatureUrl(data.imageUrl || '')
      toast.success('Signature uploaded — will appear on payslip')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Signature upload failed')
    } finally {
      setPayslipSignatureUploading(false)
    }
  }

  const buildSignatoryPayload = () => payslipSignatoryPayload(
    payslipSignatoryRole,
    payslipCustomSignatureUrl,
    siteSettings || {},
  )

  const signatoryOptsForPayroll = (p) => {
    if (previewPayroll && String(previewPayroll._id) === String(p._id)) {
      return currentSignatoryOpts
    }
    const saved = p?.payslipSignatory
    if (saved?.role) {
      return { role: saved.role, customSignatureUrl: saved.signatureUrl }
    }
    return currentSignatoryOpts
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payroll', month, year, branchFilter],
    queryFn: () => api.get(`/payroll?month=${month}&year=${year}${branchFilter ? `&branch=${branchFilter}` : ''}`).then(r => r.data),
  })
  const { data: empData } = useQuery({
    queryKey: ['employees-all', branchFilter],
    queryFn: () => api.get(assignableEmployeesUrl(branchFilter ? { branch: branchFilter } : {})).then(r => r.data),
  })
  const { data: otData } = useQuery({
    queryKey: ['overtime', month, year, otEmployeeId],
    queryFn: () => api.get(`/payroll/overtime?month=${month}&year=${year}${otEmployeeId ? `&employeeId=${otEmployeeId}` : ''}`).then(r => r.data),
  })
  const payrolls = data?.payrolls || []
  const activeEmployees = empData?.employees || []
  const otRecords = otData?.records || []

  const {
    data: livePayrollData,
    isLoading: livePayrollLoading,
    isError: livePayrollError,
    error: livePayrollErr,
    refetch: refetchLivePayroll,
  } = useQuery({
    queryKey: ['payroll-live-snapshot', selectedEmployee, month, year],
    queryFn: () => api.get(`/payroll/live-snapshot/${selectedEmployee}?month=${month}&year=${year}`).then(r => r.data),
    enabled: !!selectedEmployee,
    staleTime: 0,
  })

  const liveSnap = livePayrollData?.snapshot
  const liveEmp = livePayrollData?.employee
  const projectPayrollPreview = livePayrollData?.projectPreview
  const activeLoans = livePayrollData?.activeLoans || []
  const activeAdvances = livePayrollData?.activeAdvances || []

  const [empBankDetails, setEmpBankDetails] = useState({ bank: '', bankBranch: '', accountHolder: '', accountNumber: '' })

  useEffect(() => {
    if (liveEmp) {
      setEmpBankDetails({
        bank: liveEmp.bank || '',
        bankBranch: liveEmp.bankBranch || '',
        accountHolder: liveEmp.accountHolder || '',
        accountNumber: liveEmp.accountNumber || ''
      })
    } else {
      setEmpBankDetails({ bank: '', bankBranch: '', accountHolder: '', accountNumber: '' })
    }
  }, [liveEmp])

  const selectedEmp = useMemo(() => {
    if (liveEmp) {
      return {
        _id: liveEmp._id,
        userId: liveEmp.userId || { name: liveEmp.name },
        department: liveEmp.department,
        designation: liveEmp.designation,
        basicSalary: liveEmp.basicSalary,
        epfEtfEnrolled: liveEmp.epfEtfEnrolled,
        allowances: liveEmp.allowances,
        bank: liveEmp.bank,
        bankBranch: liveEmp.bankBranch,
        accountNumber: liveEmp.accountNumber,
        accountHolder: liveEmp.accountHolder,
      }
    }
    return activeEmployees.find(e => String(e._id) === String(selectedEmployee))
  }, [liveEmp, activeEmployees, selectedEmployee])

  // Sync form fields from server payroll engine when snapshot loads
  useEffect(() => {
    if (!liveSnap) return
    setLoanDeduction(Number(liveSnap.loanDeduction || 0))
    setAdvanceDeduction(Number(liveSnap.advanceDeduction || 0))
    setLeaveDeduction(Number(liveSnap.leaveDeduction || 0))
    setAllowances(Number(liveSnap.allowances ?? liveEmp?.allowances ?? 0))
    setBonus(Number(liveSnap.bonus || 0))
    const manualComm = Math.max(0, Number(liveSnap.commissions || 0) - Number(liveSnap.projectCommissions || 0))
    setCommissions(manualComm)
    setOtherDeductions(Number(liveSnap.deductions || 0))
  }, [liveSnap, liveEmp])

  const generateAllMut = useMutation({
    mutationFn: () => api.post('/payroll/generate-all', { month, year, branch: branchFilter }),
    onSuccess: r => { qc.invalidateQueries(['payroll']); toast.success(`Generated ${r.data.generated} payslips`) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const generateOneMut = useMutation({
    mutationFn: async () => {
      const payslipSignatory = buildSignatoryPayload()
      return api.post('/payroll/generate', {
        month, year, employeeId: selectedEmployee,
        allowances, commissions, bonus, deductions: otherDeductions,
        paymentMethod,
        continueLoanDeduction,
        bankAccount: payBank,
        payslipSignatory,
        empBankDetails,
      }).then(r => r.data)
    },
    onSuccess: (res) => {
      handlePayrollSyncResponse(qc, res.data, toast)
      qc.invalidateQueries({ queryKey: ['payroll'] })
      qc.invalidateQueries({ queryKey: ['payroll-live-snapshot'] })
      toast.success('Payroll generated')
      setShowReplaceConfirm(false)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const syncPayrollMut = useMutation({
    mutationFn: ({ employeeId, force }) => api.post('/payroll/sync', { employeeId, month, year, force }),
    onSuccess: (res) => {
      handlePayrollSyncResponse(qc, res.data, toast)
      qc.invalidateQueries({ queryKey: ['payroll'] })
      refetch()
    },
    onError: e => toast.error(e.response?.data?.message || 'Sync failed'),
  })
  const reopenMut = useMutation({
    mutationFn: id => api.put(`/payroll/${id}/reopen`),
    onSuccess: (res) => {
      handlePayrollSyncResponse(qc, res.data, toast)
      qc.invalidateQueries({ queryKey: ['payroll'] })
      refetch()
      toast.success('Payroll reopened and recalculated')
    },
    onError: e => toast.error(e.response?.data?.message || 'Reopen failed'),
  })
  const addOtMut = useMutation({
    mutationFn: () => api.post('/payroll/overtime', { employeeId: otEmployeeId, month, year, amount: Number(otAmount), hours: Number(otHours), note: otNote }),
    onSuccess: () => { 
      toast.success('OT added'); 
      setOtAmount(0); setOtHours(0); setOtNote('');
      qc.invalidateQueries(['overtime']);
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const reviewMut = useMutation({
    mutationFn: id => api.put(`/payroll/${id}/review`),
    onSuccess: () => { qc.invalidateQueries(['payroll']); toast.success('Marked as reviewed') },
    onError: e => toast.error(e.response?.data?.message || 'Review failed'),
  })
  const approveMut = useMutation({
    mutationFn: id => api.put(`/payroll/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries(['payroll']); toast.success('Approved') },
    onError: e => toast.error(e.response?.data?.message || 'Approval failed'),
  })
  const payMut = useMutation({
    mutationFn: id => api.put(`/payroll/${id}/pay`, {
      paymentMethod: payMethod,
      bankAccount: payBank,
      chequeNumber: payChequeNumber,
      payslipSignatory: buildSignatoryPayload(),
    }),
    onSuccess: () => {
      qc.invalidateQueries(['payroll'])
      qc.invalidateQueries({ queryKey: ['bank-accounts'] })
      qc.invalidateQueries({ queryKey: ['bank-tx-history-all'] })
      refetch()
      toast.success('Marked as paid')
      setPreviewPayroll(null)
    },
    onError: e => toast.error(e.response?.data?.message || 'Payment failed'),
  })

  useEffect(() => {
    if (!previewPayroll) return
    setPayMethod(previewPayroll.paymentMethod || 'bank_transfer')
    const bid = previewPayroll.bankAccount?._id || previewPayroll.bankAccount
    setPayBank(bid ? String(bid) : '')
    setPayChequeNumber(previewPayroll.chequeNumber || '')
    const saved = previewPayroll.payslipSignatory
    if (saved?.role) setPayslipSignatoryRole(saved.role)
    setPayslipCustomSignatureUrl(saved?.signatureUrl || '')
  }, [previewPayroll])

  const confirmPayrollPayment = () => {
    if (!previewPayroll) return
    if (requiresBankAccount(payMethod) && !payBank) {
      toast.error('Select which company bank account this payment is drawn from')
      return
    }
    if (isChequeMethod(payMethod) && !String(payChequeNumber || '').trim()) {
      toast.error('Cheque number is required')
      return
    }
    payMut.mutate(previewPayroll._id)
  }
  const updateMut = useMutation({
    mutationFn: ({ id, ...p }) => api.put(`/payroll/${id}`, p),
    onSuccess: () => { qc.invalidateQueries(['payroll']); toast.success('Payroll updated'); setEditPayroll(null) },
    onError: e => toast.error(e.response?.data?.message || 'Update failed'),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/payroll/${id}`),
    onSuccess: () => { toast.success('Deleted'); setDeleteId(null); setDeletePassword('') },
    onError: e => toast.error(e.response?.data?.message || 'Delete failed'),
    onSettled: () => qc.invalidateQueries(['payroll']),
  })

  const confirmDelete = async () => {
    if (!deletePassword) { toast.error('Password required'); return }
    setVerifying(true)
    try {
      await api.post('/auth/verify-password', { password: deletePassword })
      deleteMut.mutate(deleteId)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Invalid password')
    }
    setVerifying(false)
  }

  const payHereMut = useMutation({
    mutationFn: async id => {
      const { data } = await api.post(`/payroll/${id}/payhere/init`)
      const pd = data.paymentData
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = pd.sandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout'
      Object.entries(pd).filter(([k]) => k !== 'sandbox').forEach(([k, v]) => {
        const input = document.createElement('input'); input.type = 'hidden'; input.name = k; input.value = v; form.appendChild(input)
      })
      document.body.appendChild(form); form.submit()
    },
    onError: e => toast.error(e.response?.data?.message || 'PayHere init failed'),
  })

  const statusColor = { draft: 'badge-yellow', reviewed: 'badge-purple', approved: 'badge-blue', paid: 'badge-green' }

  const filteredPayrolls = useMemo(() => {
    const s = searchTerm.toLowerCase()
    return payrolls.filter(p => 
      (p.employee?.userId?.name || '').toLowerCase().includes(s) ||
      (p.employee?.employeeNo || '').toLowerCase().includes(s)
    )
  }, [payrolls, searchTerm])

  const totalNet = filteredPayrolls.reduce((a, b) => a + b.netSalary, 0)
  const totalEpf = filteredPayrolls.reduce((a, b) => a + b.epfEmployee + b.epfEmployer, 0)
  const totalEtf = filteredPayrolls.reduce((a, b) => a + b.etfEmployer, 0)

  const handleGenerateClick = () => {
    const exists = payrolls.find(p => String(p.employee?._id || p.employee) === String(selectedEmployee))
    if (exists) {
      setShowReplaceConfirm(true)
    } else {
      generateOneMut.mutate()
    }
  }

  const projectCommissionTotal = projectPayrollPreview?.totalProjectCommissions || 0

  const previewCalc = useMemo(() => {
    if (!liveSnap || !selectedEmp) return null
    
    const currentAllowances = Number(allowances || 0)
    const currentCommissions = Number(commissions || 0)
    const currentBonus = Number(bonus || 0)
    const currentAdvance = Number(advanceDeduction || 0)
    const currentLoan = Number(loanDeduction || 0)
    const currentOtherDeductions = Number(otherDeductions || 0)
    const currentLeave = Number(leaveDeduction || 0)

    const basic = liveSnap.basicSalary || 0
    const otTotal = liveSnap.overtime || liveSnap.otPay || 0
    const projectComm = Number(liveSnap.projectCommissions || projectCommissionTotal || 0)
    const incentives = Number(liveSnap.incentives || 0)
    
    const totalCommissions = currentCommissions + projectComm
    const gross = basic + otTotal + currentAllowances + totalCommissions + currentBonus + incentives

    const epfEmp = liveSnap.epfEmployee || 0
    const epfEmpl = liveSnap.epfEmployer || 0
    const etf = liveSnap.etfEmployer || 0
    
    const penalty = liveSnap.penaltyDeduction || 0
    const incomeTax = liveSnap.incomeTaxDeduction || livePayrollData?.incomeTax?.taxAmount || 0

    const totalDeductions = epfEmp + currentAdvance + currentLoan + currentLeave + penalty + currentOtherDeductions + incomeTax
    
    const net = gross - totalDeductions

    return {
      basic,
      otTotal,
      gross,
      epfEmp,
      epfEmpl,
      etf,
      net,
      epfEnrolled: Boolean(selectedEmp.epfEtfEnrolled),
      totalAdvance: activeAdvances.reduce((s, a) => s + Number(a.outstandingBalance || 0), 0),
      deductedAdvance: currentAdvance,
      projectCommissionTotal: projectComm,
      incomeTax,
      loanDeduction: currentLoan,
      leaveDeduction: currentLeave,
      penaltyDeduction: penalty,
      bonus: currentBonus,
      commissions: totalCommissions,
      allowances: currentAllowances,
      incentives,
      otherDeductions: currentOtherDeductions
    }
  }, [liveSnap, selectedEmp, activeAdvances, projectCommissionTotal, livePayrollData, allowances, commissions, bonus, advanceDeduction, loanDeduction, otherDeductions, leaveDeduction])

  const payrollExportColumns = [
    { header: 'Employee', accessor: r => r.employee?.userId?.name || '—' },
    { header: 'Emp No', accessor: r => r.employee?.employeeNo || '—' },
    { header: 'Basic', accessor: r => r.basicSalary || 0 },
    { header: 'Allowances', accessor: r => r.allowances || 0 },
    { header: 'OT', accessor: r => r.overtime || 0 },
    { header: 'Commissions', accessor: r => r.commissions || 0 },
    { header: 'Bonus', accessor: r => r.bonus || 0 },
    { header: 'Gross', accessor: r => r.grossSalary || 0 },
    { header: 'EPF(emp)', accessor: r => r.epfEmployee || 0 },
    { header: 'Loan Ded.', accessor: r => r.loanDeduction || 0 },
    { header: 'Net Pay', accessor: r => r.netSalary || 0 },
    { header: 'Status', accessor: r => r.status },
  ]

  const handlePrintSlip = async (p) => {
    try {
      await printPayslip(p, siteSettings || {}, signatoryOptsForPayroll(p))
    } catch {
      toast.error('Failed to prepare print')
    }
  }

  const handleDownloadSlip = async (p) => {
    try {
      await downloadPayslipPdf(p, siteSettings || {}, signatoryOptsForPayroll(p))
      toast.success('Payslip PDF downloaded')
    } catch {
      toast.error('PDF export failed')
    }
  }

  const PayslipSignatoryFields = ({ compact = false } = {}) => {
    const selectedSig = siteSettings?.signatures?.[payslipSignatoryRole]
    const previewUrl = payslipCustomSignatureUrl || selectedSig?.url

    return (
      <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
        <div className="space-y-1">
          <label className="form-label text-sm font-medium text-slate-700 block">Authorized signatory</label>
          <select className="form-select text-sm bg-white" value={payslipSignatoryRole} onChange={e => {
            setPayslipSignatoryRole(e.target.value)
            setPayslipCustomSignatureUrl('')
          }}>
            {PAYSLIP_SIGNATORY_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <p className="text-[11px] text-slate-500">Uses name & title from Admin Settings</p>
        </div>
        <div className="space-y-1">
          <label className="form-label text-sm font-medium text-slate-700 block">Signature override</label>
          <div className="flex gap-3 items-start">
            <div className="flex-1 space-y-1">
              <input type="file" accept="image/*" className="form-input text-sm py-1.5 bg-white" disabled={payslipSignatureUploading}
                onChange={e => uploadPayslipSignature(e.target.files?.[0])} />
              {payslipCustomSignatureUrl ? (
                <div className="text-[11px] font-medium text-emerald-600 flex items-center justify-between bg-emerald-50 px-2 py-1 rounded">
                  <span>✓ Custom override loaded</span>
                  <button type="button" className="text-red-500 hover:text-red-700 font-bold ml-2" onClick={() => setPayslipCustomSignatureUrl('')}>Clear</button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">Upload to override saved signature</p>
              )}
            </div>
            {previewUrl ? (
              <div className="shrink-0 w-16 h-12 bg-white border border-slate-200 rounded p-1 flex items-center justify-center shadow-sm">
                <img src={mediaUrl(previewUrl)} alt="Signature" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="shrink-0 w-16 h-12 bg-slate-50 border border-slate-200 border-dashed rounded p-1 flex items-center justify-center shadow-sm">
                <span className="text-[9px] text-slate-400 text-center leading-tight">No sig<br/>found</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Manage monthly salary, EPF/ETF & project allocations</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportBar 
            data={filteredPayrolls} 
            columns={payrollExportColumns} 
            title="Payroll Report"
            filters={{ Month: `${MONTHS[month-1]} ${year}`, Branch: branchFilter || 'All' }} 
          />
          <button onClick={() => { if(window.confirm(`Generate payroll for ALL active employees for ${MONTHS[month-1]} ${year}?`)) generateAllMut.mutate() }}
            disabled={generateAllMut.isPending} className="btn-primary">
            {generateAllMut.isPending ? <span className="spinner"/> : <><FiPlay size={15}/> Generate All</>}
          </button>
        </div>
      </div>

      {/* Period & Search */}
      <div className="card card-body flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <label className="form-label text-xs">Search Employee</label>
          <input type="text" className="form-input py-2 text-sm" placeholder="Name or Employee No..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div>
          <label className="form-label text-xs">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="form-select py-2 text-sm">
            {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label text-xs">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="form-select py-2 text-sm">
            {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label text-xs">Branch</label>
          <select className="form-select py-2 text-sm" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Generate Single */}
        <div className="card card-body space-y-3">
          <h3 className="font-bold text-primary font-heading">Generate for Employee</h3>
          <p className="text-xs text-gray-400">Project commissions from assigned projects are auto-included when you generate payroll. OT from attendance is also auto-fetched.</p>
          <div>
            <label className="form-label">Employee</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={selectedEmployee}
                  onChange={(v) => setSelectedEmployee(v)}
                  loadOptions={lookupLoaders.employees({ branch: branchFilter })}
                  placeholder="Search employee…"
                />
              </div>
              {selectedEmployee && (
                <button
                  type="button"
                  onClick={() => refetchLivePayroll()}
                  disabled={livePayrollLoading}
                  className="btn-ghost px-3 self-end"
                  title="Refresh live calculation"
                >
                  <FiRefreshCw size={16} className={livePayrollLoading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          </div>

          {/* Loader and Error Alerts */}
          {livePayrollLoading && selectedEmployee && (
            <div className="text-center py-4 text-slate-400 text-sm animate-pulse flex items-center justify-center gap-2">
              <span className="spinner w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" /> Calculating live payroll…
            </div>
          )}
          {livePayrollError && selectedEmployee && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              Could not load payroll: {livePayrollErr?.response?.data?.message || livePayrollErr?.message || 'Server error'}
              <button type="button" onClick={() => refetchLivePayroll()} className="ml-2 underline font-semibold">Retry</button>
            </div>
          )}

          {/* Collapsible live preview when employee selected */}
          {selectedEmp && previewCalc && !livePayrollLoading && (
            <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setShowPreviewDetails(!showPreviewDetails)}
                className="w-full flex items-center justify-between p-3 text-left bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FiFileText className="text-primary shrink-0" size={16} />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                    Live Preview: <span className="text-green-700 font-bold">{formatMoney(previewCalc.net)} Net</span>
                  </span>
                </div>
                <FiChevronDown
                  className={`text-slate-400 transition-transform shrink-0 ${showPreviewDetails ? 'rotate-180' : ''}`}
                  size={16}
                />
              </button>

              <AnimatePresence>
                {showPreviewDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-slate-100 bg-white"
                  >
                    <div className="p-3 space-y-3">
                      {/* Auto-loaded employee summary */}
                      {liveEmp && liveSnap && (
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] space-y-1">
                          <p className="font-bold text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1"><FiUser size={11} /> {liveEmp.name}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-600">
                            <span>Active Loans:</span><span className={activeLoans.length > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>{activeLoans.length} loan(s)</span>
                            <span>Loan Deduction (engine):</span><span className="font-semibold text-red-500">{formatMoney(liveSnap.loanDeduction || 0)}</span>
                            <span>Active Advances:</span><span>{activeAdvances.length}</span>
                            <span>Advance Deduction:</span><span className="font-semibold text-orange-600">{formatMoney(liveSnap.advanceDeduction || 0)}</span>
                          </div>
                          {activeLoans.map((loan) => (
                            <p key={loan._id} className="text-slate-500">
                              {loan.reason || 'Loan'}: {formatMoney(loan.monthlyInstallment || 0)}/mo · {loan.deductionType === 'salary' ? '✓ salary' : 'sep'} · {formatMoney(loan.outstandingBalance || 0)} left
                            </p>
                          ))}
                          {livePayrollData?.existingPayroll?.status === 'approved' && (
                            <p className="mt-1 text-amber-700 font-medium">Payroll approved — Reopen to apply changes.</p>
                          )}
                        </div>
                      )}

                      {/* Salary Preview */}
                      <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 text-[11px] space-y-1">
                        <p className="font-bold text-blue-800 mb-1 flex items-center gap-1">📋 Details — {selectedEmp.userId?.name}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-blue-700">
                          <span>Department:</span><span className="font-medium">{selectedEmp.department}</span>
                          <span>Designation:</span><span className="font-medium">{selectedEmp.designation}</span>
                          <span>Basic Salary:</span><span className="font-medium">{formatMoney(previewCalc.basic)}</span>
                          <span>Total Advance:</span><span className="font-medium">{formatMoney(previewCalc.totalAdvance)}</span>
                          <span>Deducted Advance:</span><span className="text-orange-600 font-medium">- {formatMoney(previewCalc.deductedAdvance)}</span>
                          <span>Overtime (Auto):</span><span className={previewCalc.otTotal > 0 ? "font-bold text-orange-600" : "font-medium"}>LKR {previewCalc.otTotal.toLocaleString()}</span>
                          <span>Allowances:</span><span className="font-medium">LKR {Number(previewCalc.allowances || 0).toLocaleString()}</span>
                          <span>Project commissions:</span><span className="font-medium text-purple-700">LKR {Number(previewCalc.projectCommissionTotal || 0).toLocaleString()}</span>
                          <span>Commissions (total):</span><span className="font-medium">LKR {Number(previewCalc.commissions || 0).toLocaleString()}</span>
                          <span>Bonus / targets:</span><span className="font-medium">LKR {Number(previewCalc.bonus || 0).toLocaleString()}</span>
                          <span className="border-t border-blue-200 pt-0.5">Gross:</span><span className="font-bold border-t border-blue-200 pt-0.5">LKR {previewCalc.gross.toLocaleString()}</span>
                          <span className="text-purple-600">Income tax:</span><span className="text-purple-600 font-medium">- LKR {Number(previewCalc.incomeTax || 0).toLocaleString()}</span>
                          <span className="text-red-600">EPF (employee):</span><span className="text-red-600 font-medium">- LKR {previewCalc.epfEmp.toLocaleString()}</span>
                          <span className="text-orange-600">Loan Deduction:</span><span className="text-orange-600 font-medium">- {formatMoney(previewCalc.loanDeduction)}</span>
                          <span className="text-orange-600">Leave / penalties:</span><span className="text-orange-600 font-medium">- {formatMoney((previewCalc.leaveDeduction || 0) + (previewCalc.penaltyDeduction || 0))}</span>
                          <span className="text-orange-600">Other Deductions:</span><span className="text-orange-600 font-medium">- {formatMoney(otherDeductions)}</span>
                          <span className="font-bold text-green-700 border-t border-blue-200 pt-0.5">Net Salary:</span>
                          <span className="font-bold text-green-700 border-t border-blue-200 pt-0.5">{formatMoney(previewCalc.net)}</span>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-blue-200 grid grid-cols-2 gap-x-4 text-blue-600">
                          <span>EPF Employer (12%):</span><span className="font-medium">LKR {previewCalc.epfEmpl.toLocaleString()}</span>
                          <span>ETF Employer (3%):</span><span className="font-medium">LKR {previewCalc.etf.toLocaleString()}</span>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-blue-200 grid grid-cols-2 gap-x-4 text-blue-800">
                          <span className="font-bold col-span-2 mb-0.5">Employee Bank Details</span>
                          <span>Bank Name:</span><span className="font-medium">{selectedEmp.bank || '—'}</span>
                          <span>Branch:</span><span className="font-medium">{selectedEmp.bankBranch || '—'}</span>
                          <span>Account Name:</span><span className="font-medium">{selectedEmp.accountHolder || '—'}</span>
                          <span>Account Number:</span><span className="font-medium">{selectedEmp.accountNumber || '—'}</span>
                        </div>
                      </div>

                      {/* Project commission breakdown */}
                      {projectPayrollPreview && (projectPayrollPreview.projectLines?.length > 0 || projectPayrollPreview.autoCommission > 0) && (
                        <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-100 text-[11px] space-y-1">
                          <p className="font-bold text-purple-800 mb-0.5">Project commission breakdown</p>
                          {(projectPayrollPreview.projectLines || []).map((line, i) => (
                            <div key={`${line.project}-${i}`} className="flex justify-between text-purple-700">
                              <span>{line.projectName} ({line.type === 'commission' ? 'commission' : 'allocation'})</span>
                              <span className="font-medium">LKR {Number(line.amount || 0).toLocaleString()}</span>
                            </div>
                          ))}
                          {projectPayrollPreview.autoCommission > 0 && (
                            <div className="flex justify-between text-purple-700">
                              <span>Completed projects (auto %)</span>
                              <span className="font-medium">LKR {Number(projectPayrollPreview.autoCommission).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-purple-200 pt-0.5 font-bold text-purple-900">
                            <span>Total from projects</span>
                            <span>LKR {Number(projectPayrollPreview.totalProjectCommissions || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Earnings & Deductions Sections */}
          <div className="space-y-4 mt-4">
            {/* Additions */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-4">
              <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <FiPlus className="text-emerald-600" /> Additional Earnings
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Allowances</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">Rs.</span>
                    <input type="number" className="form-input !pl-10 text-sm bg-white" style={{ paddingLeft: '38px' }} value={allowances} onChange={e => setAllowances(Number(e.target.value || 0))} />
                  </div>
                </div>
                <div>
                  <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Commissions</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">Rs.</span>
                    <input type="number" className="form-input !pl-10 text-sm bg-white" style={{ paddingLeft: '38px' }} value={commissions} onChange={e => setCommissions(Number(e.target.value || 0))} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Bonus / Incentives</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">Rs.</span>
                    <input type="number" className="form-input !pl-10 text-sm bg-white" style={{ paddingLeft: '38px' }} value={bonus} onChange={e => setBonus(Number(e.target.value || 0))} />
                  </div>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="p-4 bg-orange-50/60 border border-orange-100 rounded-xl space-y-4">
              <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                <FiAlertCircle className="text-orange-600" /> Deductions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Advance Deduction</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">Rs.</span>
                    <input type="number" className="form-input !pl-10 text-sm bg-white" style={{ paddingLeft: '38px' }} value={advanceDeduction} onChange={e => setAdvanceDeduction(Number(e.target.value || 0))} />
                  </div>
                </div>
                <div>
                  <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Loan Ded. <span className="text-xs text-blue-500 font-normal ml-1">(auto)</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">Rs.</span>
                    <input type="number" className="form-input !pl-10 text-sm bg-white" style={{ paddingLeft: '38px' }} value={loanDeduction} onChange={e => setLoanDeduction(Number(e.target.value || 0))} />
                  </div>
                </div>
                <div>
                  <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Leave Deduction</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">Rs.</span>
                    <input type="number" className="form-input !pl-10 text-sm bg-white" style={{ paddingLeft: '38px' }} value={leaveDeduction} onChange={e => setLeaveDeduction(Number(e.target.value || 0))} placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Other Deductions</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">Rs.</span>
                    <input type="number" className="form-input !pl-10 text-sm bg-white" style={{ paddingLeft: '38px' }} value={otherDeductions} onChange={e => setOtherDeductions(Number(e.target.value || 0))} />
                  </div>
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 pt-1 bg-white p-3 rounded-lg border border-orange-100/80 shadow-sm mt-1">
                  <input id="continue-loan-deduction" type="checkbox" className="rounded border-orange-300 text-orange-600 focus:ring-orange-500 w-4 h-4 shrink-0" checked={continueLoanDeduction} onChange={e => setContinueLoanDeduction(e.target.checked)} />
                  <label htmlFor="continue-loan-deduction" className="text-sm font-medium text-orange-900 cursor-pointer select-none leading-tight">Continue loan deduction to next month</label>
                </div>
              </div>
            </div>

            {/* Toggle Advanced Settings */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all bg-white hover:bg-slate-50"
              >
                {showAdvanced ? 'Hide Payment, Signatory & Bank Settings' : 'Show Payment, Signatory & Bank Settings'}
              </button>
            </div>

            {/* Advanced Settings Drawer */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-4 pt-1"
                >
                  {/* Payment & Settings */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FiDollarSign className="text-slate-500" /> Payment & Settings
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className={`${isLedgerBankMethod(paymentMethod) ? 'col-span-1' : 'sm:col-span-2'}`}>
                        <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Payment Method</label>
                        <select className="form-select text-sm bg-white" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="cash">Cash</option>
                          <option value="online_transfer">Online Transfer</option>
                          <option value="card_payment">Card Payment</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>
                      {isLedgerBankMethod(paymentMethod) && (
                        <div className="col-span-1">
                          <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Source Bank Account</label>
                          <select className="form-select text-sm bg-white" value={payBank} onChange={e => setPayBank(e.target.value)}>
                            <option value="">Select Account...</option>
                            {bankAccounts.map(b => <option key={b._id} value={b._id}>{b.bankName}{b.branchName ? ` - ${b.branchName}` : ''}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-5">
                      <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><FiFileText className="text-slate-400" /> Payslip Signatory</p>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                        <PayslipSignatoryFields />
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-5">
                      <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><FiUser className="text-slate-400" /> Employee Bank Details <span className="font-normal text-slate-400 ml-1">(Auto-fill)</span></p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <div>
                          <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Bank Name</label>
                          <input type="text" className="form-input text-sm bg-white" value={empBankDetails.bank} onChange={e => setEmpBankDetails({...empBankDetails, bank: e.target.value})} placeholder="e.g. BOC" />
                        </div>
                        <div>
                          <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Branch</label>
                          <input type="text" className="form-input text-sm bg-white" value={empBankDetails.bankBranch} onChange={e => setEmpBankDetails({...empBankDetails, bankBranch: e.target.value})} placeholder="Branch" />
                        </div>
                        <div>
                          <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Account Holder</label>
                          <input type="text" className="form-input text-sm bg-white" value={empBankDetails.accountHolder} onChange={e => setEmpBankDetails({...empBankDetails, accountHolder: e.target.value})} placeholder="Name on account" />
                        </div>
                        <div>
                          <label className="form-label text-sm font-medium text-slate-700 mb-1.5 block">Account Number</label>
                          <input type="text" className="form-input text-sm bg-white" value={empBankDetails.accountNumber} onChange={e => setEmpBankDetails({...empBankDetails, accountNumber: e.target.value})} placeholder="A/C Number" />
                        </div>
                        <div className="sm:col-span-2 text-[11px] text-blue-700 mt-1 bg-blue-50 px-3 py-2 rounded flex items-center gap-2 border border-blue-100">
                          <FiAlertCircle className="shrink-0" />
                          <span>Editing these details here will permanently save them to the employee's profile.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button className="btn-primary w-full py-3 mt-4 text-sm font-bold shadow-md hover:shadow-lg transition-all" disabled={!selectedEmp || generateOneMut.isPending} onClick={handleGenerateClick}>
            {generateOneMut.isPending ? <span className="spinner w-4 h-4 border-2 mr-2" /> : <FiPlay size={16} className="mr-2" />}
            {generateOneMut.isPending ? 'Generating Payslip…' : 'Generate Payslip'}
          </button>
        </div>

        {/* OT */}
        <div className="card card-body space-y-3">
          <h3 className="font-bold text-primary font-heading">Add Overtime</h3>
          <p className="text-xs text-gray-400">Add OT hours and amount for the selected employee and period.</p>
          <div>
            <label className="form-label">Employee</label>
            <SearchableSelect
              value={otEmployeeId}
              onChange={(v) => setOtEmployeeId(v)}
              loadOptions={lookupLoaders.employees({ branch: branchFilter })}
              placeholder="Search employee…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">OT Amount (LKR)</label><input type="number" className="form-input" value={otAmount} onChange={e => setOtAmount(Number(e.target.value||0))}/></div>
            <div><label className="form-label">OT Hours</label><input type="number" className="form-input" value={otHours} onChange={e => setOtHours(Number(e.target.value||0))}/></div>
          </div>
          <div><label className="form-label">Note</label><input className="form-input" value={otNote} onChange={e => setOtNote(e.target.value)} placeholder="e.g. Weekend project delivery"/></div>
          <button className="btn-outline" disabled={!otEmployeeId || addOtMut.isPending} onClick={() => addOtMut.mutate()}>
            <FiPlus size={14}/> Add OT Record
          </button>
          
          {/* List Overtime records for the selected month/employee */}
          <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Added Overtime Records</h4>
            {otRecords.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No OT records found.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {otRecords.map(ot => (
                  <div key={ot._id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-slate-700">{ot.employee?.userId?.name}</p>
                      <p className="text-xs text-slate-500">{ot.hours} hrs {ot.note ? `— ${ot.note}` : ''}</p>
                    </div>
                    <div className="font-bold text-orange-600">
                      LKR {ot.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Net Payroll', value: formatMoney(totalNet), color: 'kpi-green' },
          { label: 'Total EPF (Both)', value: formatMoney(totalEpf), color: 'kpi-blue' },
          { label: 'Total ETF (Employer)', value: formatMoney(totalEtf), color: 'kpi-orange' },
        ].map(s => (
          <div key={s.label} className={`kpi-card ${s.color}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-primary font-heading">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Payroll Table */}
      <div className="table-container hidden lg:block">
        <table className="table">
          <thead><tr>
            <th>Employee</th><th>Basic</th><th>OT</th><th>Commissions</th><th>Bonus</th>
            <th>Loan</th><th>Gross</th><th>EPF(emp)</th><th>Net Pay</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={11} className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></td></tr>
            ) : filteredPayrolls.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400">
                <FiDollarSign size={36} className="mx-auto mb-2 opacity-30"/>
                No matching payroll found for {MONTHS[month-1]} {year}.
              </td></tr>
            ) : filteredPayrolls.map(p => (
              <tr key={p._id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-xs font-bold flex-shrink-0">
                      {p.employee?.userId?.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{p.employee?.userId?.name}</p>
                      <p className="text-xs text-gray-400">{p.employee?.employeeNo}</p>
                    </div>
                  </div>
                </td>
                <td>LKR {(p.basicSalary||0).toLocaleString()}</td>
                <td className="text-orange-600">{p.overtime > 0 ? `LKR ${p.overtime.toLocaleString()}` : '—'}</td>
                <td className="text-purple-600">{p.commissions > 0 ? `LKR ${(p.commissions||0).toLocaleString()}` : '—'}</td>
                <td className="text-green-600">{p.bonus > 0 ? `LKR ${(p.bonus||0).toLocaleString()}` : '—'}</td>
                <td className="text-red-600 text-xs font-medium">
                  {(p.loanDeduction||0) > 0 ? `− LKR ${p.loanDeduction.toLocaleString()}` : '—'}
                  {(p.deductedLoans?.length > 0) && <span className="block text-[10px] text-blue-500">salary deduct</span>}
                </td>
                <td className="font-medium">LKR {(p.grossSalary||0).toLocaleString()}</td>
                <td className="text-red-500 text-xs">LKR {(p.epfEmployee||0).toLocaleString()}</td>
                <td className="font-bold text-green-700">LKR {(p.netSalary||0).toLocaleString()}</td>
                <td><span className={`badge ${statusColor[p.status]||'badge-gray'}`}>{p.status}</span></td>
                <td>
                  <div className="flex gap-1 items-center">
                    {p.status !== 'paid' ? (
                      <button
                        onClick={() => setPreviewPayroll(p)}
                        className="btn-primary btn-sm px-2 py-1 text-[10px] font-bold uppercase"
                        title="Review & pay"
                      >
                        Pay
                      </button>
                    ) : (
                      <button
                        onClick={() => setPreviewPayroll(p)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View payment record"
                      >
                        <FiEye size={14}/>
                      </button>
                    )}
                    {(p.status === 'draft' || p.status === 'reviewed') && (
                      <button
                        onClick={() => syncPayrollMut.mutate({ employeeId: p.employee?._id })}
                        disabled={syncPayrollMut.isPending}
                        className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg"
                        title="Recalculate from loans/advances/OT"
                      >
                        <FiRefreshCw size={14} className={syncPayrollMut.isPending ? 'animate-spin' : ''}/>
                      </button>
                    )}
                    {p.status === 'approved' && (
                      <button
                        onClick={() => reopenMut.mutate(p._id)}
                        disabled={reopenMut.isPending}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                        title="Reopen & recalculate (e.g. after new loan)"
                      >
                        <FiRefreshCw size={14}/>
                      </button>
                    )}
                    {p.status === 'draft' && (
                      <button onClick={() => reviewMut.mutate(p._id)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="Mark Reviewed">
                        <FiCheck size={14}/>
                      </button>
                    )}
                    {p.status === 'reviewed' && (
                      <button onClick={() => approveMut.mutate(p._id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Approve">
                        <FiCheck size={14}/>
                      </button>
                    )}
                    <button onClick={() => handlePrintSlip(p)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Print payslip">
                      <FiPrinter size={14}/>
                    </button>
                    <button onClick={() => handleDownloadSlip(p)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Download PDF Slip">
                      <FiFileText size={14}/>
                    </button>
                    <button onClick={() => { 
                      setEditPayroll(p); 
                      setEditForm({ 
                        status: p.status,
                        allowances: p.allowances, 
                        commissions: p.commissions, 
                        bonus: p.bonus, 
                        deductions: p.deductions, 
                        loanDeduction: p.loanDeduction, 
                        paymentMethod: p.paymentMethod || 'bank_transfer',
                        bankAccount: p.bankAccount?._id || p.bankAccount || ''
                      }) 
                    }} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit">
                      <FiPlay size={13} className="rotate-90"/>
                    </button>
                    <button onClick={() => setDeleteId(p._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                      <FiX size={14}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="block lg:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/>
          </div>
        ) : filteredPayrolls.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-slate-200">
            <FiDollarSign size={32} className="mx-auto mb-2 opacity-30"/>
            <p>No matching payroll found for {MONTHS[month-1]} {year}.</p>
          </div>
        ) : (
          filteredPayrolls.map(p => (
            <div key={p._id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-sm flex-shrink-0">
                  {p.employee?.userId?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-800 text-sm truncate">{p.employee?.userId?.name}</p>
                    <span className={`badge text-[10px] capitalize ${statusColor[p.status]||'badge-gray'}`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">{p.employee?.employeeNo}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-100 py-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Basic / Gross</span>
                  <p className="font-medium text-slate-700">LKR {p.basicSalary?.toLocaleString()} / LKR {p.grossSalary?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Net Pay</span>
                  <p className="font-bold text-green-700">LKR {p.netSalary?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">OT / Commission / Bonus</span>
                  <p className="font-medium text-slate-700">
                    LKR {p.overtime || 0} / LKR {p.commissions || 0} / LKR {p.bonus || 0}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Deductions (EPF / Loan)</span>
                  <p className="font-medium text-red-600">LKR {p.epfEmployee || 0} / LKR {p.loanDeduction || 0}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {p.status !== 'paid' ? (
                  <button
                    onClick={() => setPreviewPayroll(p)}
                    className="btn-primary py-1.5 px-3 text-xs font-bold uppercase flex items-center gap-1"
                    title="Review & pay"
                  >
                    <FiDollarSign size={12}/> Pay
                  </button>
                ) : (
                  <button
                    onClick={() => setPreviewPayroll(p)}
                    className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1"
                    title="View payment record"
                  >
                    <FiEye size={12}/> View details
                  </button>
                )}

                <div className="flex gap-1">
                  {(p.status === 'draft' || p.status === 'reviewed') && (
                    <button
                      onClick={() => syncPayrollMut.mutate({ employeeId: p.employee?._id })}
                      disabled={syncPayrollMut.isPending}
                      className="p-2 text-gray-500 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Recalculate"
                    >
                      <FiRefreshCw size={13} className={syncPayrollMut.isPending ? 'animate-spin' : ''}/>
                    </button>
                  )}
                  {p.status === 'approved' && (
                    <button
                      onClick={() => reopenMut.mutate(p._id)}
                      disabled={reopenMut.isPending}
                      className="p-2 text-gray-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Reopen"
                    >
                      <FiRefreshCw size={13}/>
                    </button>
                  )}
                  {p.status === 'draft' && (
                    <button onClick={() => reviewMut.mutate(p._id)} className="p-2 text-gray-500 hover:text-purple-600 hover:bg-slate-100 rounded-lg transition-colors" title="Mark Reviewed">
                      <FiCheck size={13}/>
                    </button>
                  )}
                  {p.status === 'reviewed' && (
                    <button onClick={() => approveMut.mutate(p._id)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors" title="Approve">
                      <FiCheck size={13}/>
                    </button>
                  )}
                  <button onClick={() => handlePrintSlip(p)} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors" title="Print payslip">
                    <FiPrinter size={13}/>
                  </button>
                  <button onClick={() => handleDownloadSlip(p)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors" title="Download PDF Slip">
                    <FiFileText size={13}/>
                  </button>
                  <button onClick={() => { 
                    setEditPayroll(p); 
                    setEditForm({ 
                      status: p.status,
                      allowances: p.allowances, 
                      commissions: p.commissions, 
                      bonus: p.bonus, 
                      deductions: p.deductions, 
                      loanDeduction: p.loanDeduction, 
                      paymentMethod: p.paymentMethod || 'bank_transfer',
                      bankAccount: p.bankAccount?._id || p.bankAccount || ''
                    }) 
                  }} className="p-2 text-gray-500 hover:text-blue-500 hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
                    <FiPlay size={12} className="rotate-90"/>
                  </button>
                  <button onClick={() => setDeleteId(p._id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                    <FiX size={13}/>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Preview Modal */}
      {previewPayroll && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
              <h3 className="font-bold text-primary font-heading">
                {previewPayroll.status === 'approved' ? 'Payment Preview' : previewPayroll.status === 'paid' ? 'Payment Record' : 'Payroll Details'}
              </h3>
              <button onClick={() => setPreviewPayroll(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              {/* Employee Header */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-lg">
                  {previewPayroll.employee?.userId?.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-primary">{previewPayroll.employee?.userId?.name}</p>
                  <p className="text-xs text-gray-500">{previewPayroll.employee?.designation} · {previewPayroll.employee?.department}</p>
                  <p className="text-xs text-gray-400">{previewPayroll.employee?.employeeNo}</p>
                </div>
              </div>
              {/* Breakdown */}
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wider">Pay Period: {MONTHS[previewPayroll.month-1]} {previewPayroll.year}</p>
                {[
                  { label: 'Basic Salary', val: previewPayroll.basicSalary, color: '' },
                  { label: 'Allowances', val: previewPayroll.allowances, color: 'text-green-600' },
                  { label: 'Overtime', val: previewPayroll.overtime, color: 'text-orange-600' },
                  { label: 'Commissions', val: previewPayroll.commissions, color: 'text-purple-600' },
                  { label: 'Bonus', val: previewPayroll.bonus, color: 'text-green-600' },
                ].map(row => (row.val > 0 &&
                  <div key={row.label} className="flex justify-between">
                    <span className="text-gray-600">+ {row.label}</span>
                    <span className={`font-medium ${row.color}`}>LKR {(row.val||0).toLocaleString()}</span>
                  </div>
                ))}
                {previewPayroll.projectAllocations?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-dashed border-purple-100 space-y-1">
                    <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">From projects</p>
                    {previewPayroll.projectAllocations.map((line, i) => (
                      <div key={i} className="flex justify-between text-xs text-purple-700">
                        <span>{line.projectName}</span>
                        <span>LKR {Number(line.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="font-semibold text-gray-700">Gross Salary (Original)</span>
                  <span className="font-bold">LKR {(previewPayroll.grossSalary||0).toLocaleString()}</span>
                </div>
                {[
                  { label: 'EPF (Employee 8%)', val: previewPayroll.epfEmployee },
                  { label: 'Loan Deduction', val: previewPayroll.loanDeduction },
                  { label: 'Leave Deduction', val: previewPayroll.leaveDeduction },
                  { label: 'Other Deductions', val: previewPayroll.deductions },
                ].map(row => (row.val > 0 &&
                  <div key={row.label} className="flex justify-between">
                    <span className="text-gray-600">- {row.label}</span>
                    <span className="font-medium text-red-500">LKR {(row.val||0).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between bg-emerald-50 rounded-xl p-3 border border-emerald-100 mt-2">
                  <div>
                    <p className="font-bold text-emerald-800">Net Pay (Remaining)</p>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Deduction Date: {previewPayroll.paidAt ? new Date(previewPayroll.paidAt).toLocaleDateString() : 'Upon Payment'}</p>
                  </div>
                  <span className="font-bold text-emerald-700 text-lg">LKR {(previewPayroll.netSalary||0).toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-400 space-y-0.5 pt-1">
                  <p>EPF Employer (12%): LKR {(previewPayroll.epfEmployer||0).toLocaleString()}</p>
                  <p>ETF Employer (3%): LKR {(previewPayroll.etfEmployer||0).toLocaleString()}</p>
                </div>

                {/* Loan Deduction History */}
                {previewPayroll.loanDeduction > 0 && previewPayroll.deductedLoans?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Loan Repayment Progress</p>
                    {previewPayroll.deductedLoans.map(loan => (
                      <div key={loan._id} className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">{loan.reason || 'Personal Loan'}</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {loan.totalAmount > 0 ? Math.round((loan.totalPaid / loan.totalAmount) * 100) : 0}% Repaid
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="flex justify-between p-1.5 bg-white rounded-lg border border-slate-50">
                            <span className="text-slate-400">Monthly:</span>
                            <span className="font-bold text-slate-700">LKR {loan.monthlyInstallment?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between p-1.5 bg-white rounded-lg border border-slate-50">
                            <span className="text-slate-400">Balance:</span>
                            <span className="font-bold text-red-600">LKR {loan.outstandingBalance?.toLocaleString()}</span>
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 text-center font-medium italic">Installment {loan.installmentsPaid} of {loan.totalInstallments}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {previewPayroll.status !== 'paid' && (
                <div className="grid grid-cols-1 gap-4 mt-4 pt-4 border-t border-gray-100 bg-slate-50/80 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Payslip signatory & seal</p>
                  <PayslipSignatoryFields compact />
                </div>
              )}
              {previewPayroll.status !== 'paid' && (
              <div className="grid grid-cols-1 gap-4 mt-4 pt-4 border-t border-gray-100 bg-slate-50/80 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment details</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label text-xs">Payment method</label>
                    <select className="form-select text-sm" value={payMethod} onChange={(e) => {
                      const v = e.target.value
                      setPayMethod(v)
                      if (!requiresBankAccount(v)) {
                        setPayBank('')
                        setPayChequeNumber('')
                      }
                    }}>
                      {PAYROLL_PAY_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  {requiresBankAccount(payMethod) && (
                    <div>
                      <label className="form-label text-xs">Company bank account *</label>
                      <select className="form-select text-sm" value={payBank} onChange={e => setPayBank(e.target.value)}>
                        <option value="">Select account…</option>
                        {bankAccounts.map(b => (
                          <option key={b._id} value={b._id}>
                            {b.bankName}{b.branchName ? ` · ${b.branchName}` : ''} ({b.accountNumber})
                          </option>
                        ))}
                      </select>
                      {payBank && (() => {
                        const sel = bankAccounts.find(b => String(b._id) === String(payBank))
                        return sel ? (
                          <p className="text-[10px] text-emerald-700 mt-1 font-medium">
                            Selected: {sel.bankName} · Balance LKR {Number(sel.currentBalance || 0).toLocaleString()}
                          </p>
                        ) : null
                      })()}
                    </div>
                  )}
                  {isChequeMethod(payMethod) && (
                    <div className="sm:col-span-2">
                      <label className="form-label text-xs">Cheque number *</label>
                      <input className="form-input text-sm" value={payChequeNumber} onChange={e => setPayChequeNumber(e.target.value)} placeholder="Enter cheque number" />
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 flex-wrap flex-shrink-0">
              <button onClick={() => handlePrintSlip(previewPayroll)} className="btn-outline btn-sm gap-1">
                  <FiPrinter size={13}/> Print
                </button>
                <button onClick={() => handleDownloadSlip(previewPayroll)} className="btn-outline btn-sm gap-1 text-red-600 border-red-200 hover:border-red-300">
                  <FiFileText size={13}/> Export PDF
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.post(`/payroll/${previewPayroll._id}/send`, { methods: ['email'] })
                      toast.success('Payslip sent via email')
                    } catch (e) { toast.error(e.response?.data?.message || 'Send failed') }
                  }}
                  className="btn-outline btn-sm gap-1 text-blue-600 border-blue-200 hover:border-blue-300"
                >
                  <FiSend size={13}/> Email
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.post(`/payroll/${previewPayroll._id}/send`, { methods: ['sms'] })
                      toast.success('Payslip notification sent via SMS')
                    } catch (e) { toast.error(e.response?.data?.message || 'Send failed') }
                  }}
                  className="btn-outline btn-sm gap-1 text-emerald-600 border-emerald-200 hover:border-emerald-300"
                >
                  <FiSend size={13}/> SMS
                </button>
                <div className="flex-1" />
                {previewPayroll.status === 'paid' && (
                  <button type="button" 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to rollback this payment? This will reverse bank withdrawals, EPF/ETF statuses, and loan repayments.")) {
                        const loadingToast = toast.loading('Rolling back payment...');
                        api.put(`/payroll/${previewPayroll._id}`, { status: 'reviewed' })
                          .then(() => {
                            toast.success('Payment rolled back successfully', { id: loadingToast });
                            qc.invalidateQueries(['payrolls-list']);
                            setPreviewPayroll(null);
                          })
                          .catch(e => toast.error(e.response?.data?.message || 'Rollback failed', { id: loadingToast }));
                      }
                    }} 
                    className="btn-outline btn-sm text-amber-600 border-amber-200 hover:bg-amber-50 justify-center">
                    <FiRefreshCw size={13} className="mr-1 inline-block"/> Rollback
                  </button>
                )}
                <button onClick={() => setPreviewPayroll(null)} className="btn-ghost justify-center">Close</button>
                {previewPayroll.status !== 'paid' && (
                <button type="button" onClick={confirmPayrollPayment} disabled={payMut.isPending} className="btn-primary justify-center bg-green-600 hover:bg-green-700 border-green-600">
                  {payMut.isPending ? <span className="spinner"/> : <><FiCheck size={14}/> Pay</>}
                </button>
                )}
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      {/* Delete Confirmation Modal */}
      {deleteId && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto"><FiAlertCircle size={24} /></div>
              <h3 className="font-bold text-lg text-slate-800">Confirm Action</h3>
              <p className="text-sm text-slate-500">Please enter your administrator password to delete this payroll record.</p>
            </div>
            <div>
              <input type="password" placeholder="Enter password" disabled={verifying} className="form-input" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmDelete()} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setDeleteId(null); setDeletePassword('') }} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={confirmDelete} disabled={verifying || !deletePassword} className="btn-primary flex-1 justify-center bg-red-600 hover:bg-red-700 border-red-600">
                {verifying || deleteMut.isPending ? <span className="spinner" /> : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}
      {/* Edit Modal */}
      {editPayroll && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-primary font-heading text-sm">Edit: {editPayroll.employee?.userId?.name}</h3>
              <button onClick={() => setEditPayroll(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 border-b border-slate-100 pb-3 mb-1">
                <label className="form-label text-xs font-bold uppercase tracking-tight">Status</label>
                <select className="form-select text-sm font-semibold" value={editForm.status || ''} onChange={e => setEditForm(s => ({...s, status: e.target.value}))}>
                  <option value="draft">Draft</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
                {editPayroll.status === 'paid' && editForm.status !== 'paid' && (
                  <p className="text-xs text-red-600 mt-2 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                    ⚠️ Saving this will rollback the transaction, bank ledger, and active loan deductions!
                  </p>
                )}
                {editPayroll.status === 'paid' && editForm.status === 'paid' && (
                  <p className="text-[10px] text-gray-500 mt-1">To edit financial amounts, you must first rollback the status from Paid.</p>
                )}
              </div>
              <div><label className="form-label text-xs font-bold uppercase tracking-tight">Allowances</label><input type="number" className="form-input text-sm" value={editForm.allowances} onChange={e => setEditForm(s => ({...s, allowances: Number(e.target.value)}))} disabled={editPayroll.status === 'paid'} /></div>
              <div><label className="form-label text-xs font-bold uppercase tracking-tight">Commissions</label><input type="number" className="form-input text-sm" value={editForm.commissions} onChange={e => setEditForm(s => ({...s, commissions: Number(e.target.value)}))} disabled={editPayroll.status === 'paid'} /></div>
              <div><label className="form-label text-xs font-bold uppercase tracking-tight">Bonus</label><input type="number" className="form-input text-sm" value={editForm.bonus} onChange={e => setEditForm(s => ({...s, bonus: Number(e.target.value)}))} disabled={editPayroll.status === 'paid'} /></div>
              <div><label className="form-label text-xs font-bold uppercase tracking-tight">Loan Deduction</label><input type="number" className="form-input text-sm" value={editForm.loanDeduction} onChange={e => setEditForm(s => ({...s, loanDeduction: Number(e.target.value)}))} disabled={editPayroll.status === 'paid'} /></div>
              <div className={`${requiresBankAccount(editForm.paymentMethod) ? 'col-span-1' : 'col-span-2'}`}>
                <label className="form-label text-xs font-bold uppercase tracking-tight">Payment Method</label>
                <select className="form-select text-sm" value={editForm.paymentMethod} onChange={e => setEditForm(s => ({...s, paymentMethod: e.target.value}))} disabled={editPayroll.status === 'paid'}>
                  {PAYROLL_PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {requiresBankAccount(editForm.paymentMethod) && (
                <div className="col-span-1">
                  <label className="form-label text-xs font-bold uppercase tracking-tight">Source Bank & Branch</label>
                  <select className="form-select text-sm" value={editForm.bankAccount || ''} onChange={e => setEditForm(s => ({...s, bankAccount: e.target.value}))} disabled={editPayroll.status === 'paid'}>
                    <option value="">Select Account...</option>
                    {bankAccounts.map(b => <option key={b._id} value={b._id}>{b.bankName}{b.branchName ? ` - ${b.branchName}` : ''}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditPayroll(null)} className="btn-ghost flex-1 justify-center text-sm">Cancel</button>
              <button onClick={() => updateMut.mutate({ id: editPayroll._id, ...editForm })} disabled={updateMut.isPending} className="btn-primary flex-1 justify-center text-sm">
                {updateMut.isPending ? <span className="spinner" /> : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}
      {/* Replacement Confirmation Modal */}
      {showReplaceConfirm && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto"><FiAlertCircle size={24} /></div>
              <h3 className="font-bold text-lg text-slate-800">Overwrite Payroll?</h3>
              <p className="text-sm text-slate-500">A payroll record for this employee already exists for this month. Do you want to update it with the new values?</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowReplaceConfirm(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={() => generateOneMut.mutate()} disabled={generateOneMut.isPending} className="btn-primary flex-1 justify-center bg-amber-600 hover:bg-amber-700 border-amber-600">
                {generateOneMut.isPending ? <span className="spinner" /> : 'Yes, Overwrite'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}
    </div>
  )
}
