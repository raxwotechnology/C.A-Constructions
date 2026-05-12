import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiDollarSign, FiPlay, FiCheck, FiPlus, FiSend, FiUser, FiX, FiInfo, FiAlertCircle } from 'react-icons/fi'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const printPayslip = (p) => {
  const w = window.open('', '_blank')
  const r = (label, val, cls='') => val > 0 ? `<div class="row ${cls}"><span>${label}</span><span>LKR ${Number(val||0).toLocaleString()}</span></div>` : ''
  w.document.write(`<!DOCTYPE html><html><head><title>Payslip ${MONTHS[p.month-1]} ${p.year}</title>
  <style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:680px;margin:32px auto;padding:20px;color:#111}
    .hdr{background:#0B1F3A;color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:20px;display:flex;justify-content:space-between}
    .hdr h2{margin:0;font-size:18px}.hdr p{margin:4px 0 0;opacity:.65;font-size:12px}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px}
    .info-row{display:flex;justify-content:space-between;font-size:12px;color:#555;padding:3px 0;border-bottom:1px solid #f0f0f0}
    .info-row span:last-child{font-weight:600;color:#111}
    .sec-title{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#666;font-weight:700;margin:12px 0 6px;padding-bottom:4px;border-bottom:2px solid #e5e7eb}
    .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
    .add{color:#16a34a}.ded{color:#dc2626}
    .net{background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-top:10px;display:flex;justify-content:space-between;font-weight:700;font-size:15px;color:#15803d}
    .foot{margin-top:20px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid #f0f0f0;padding-top:10px}
  </style></head><body>
  <div class="hdr">
    <div><h2>Raxwo Technology (Pvt) Ltd</h2><p>Official Payslip — ${MONTHS[p.month-1]} ${p.year}</p></div>
    <div style="text-align:right"><p style="opacity:.65;font-size:11px">Status</p><p style="font-size:13px;font-weight:700">${(p.status||'').toUpperCase()}</p></div>
  </div>
  <div class="info">
    <div class="info-row"><span>Employee</span><span>${p.employee?.userId?.name||'N/A'}</span></div>
    <div class="info-row"><span>Emp No</span><span>${p.employee?.employeeNo||'N/A'}</span></div>
    <div class="info-row"><span>Department</span><span>${p.employee?.department||'—'}</span></div>
    <div class="info-row"><span>Designation</span><span>${p.employee?.designation||'—'}</span></div>
  </div>
  <div class="sec-title">Earnings</div>
  ${r('Basic Salary', p.basicSalary)}
  ${r('Allowances', p.allowances, 'add')}
  ${r('Overtime Pay', p.otPay||p.overtime, 'add')}
  ${r('Bonus'+(p.bonusNote?' ('+p.bonusNote+')':''), p.bonus, 'add')}
  ${r('Commissions', p.commissions, 'add')}
  <div class="row" style="font-weight:600"><span>Gross Salary</span><span>LKR ${Number(p.grossSalary||0).toLocaleString()}</span></div>
  <div class="sec-title">Deductions</div>
  ${r('EPF Employee (8%)', p.epfEmployee, 'ded')}
  ${r('Advance Deduction', p.advanceDeduction||p.advancePayment, 'ded')}
  ${r('Loan Deduction', p.loanDeduction, 'ded')}
  ${r('Other Deductions', p.deductions, 'ded')}
  <div class="net"><span>Net Salary</span><span>LKR ${Number(p.netSalary||0).toLocaleString()}</span></div>
  <div class="sec-title">Statutory (Employer Contributions — Informational)</div>
  ${r('EPF Employer (12%)', p.epfEmployer)}
  ${r('ETF Employer (3%)', p.etfEmployer)}
  <div class="foot">Computer-generated payslip — no signature required &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</div>
  </body></html>`)
  w.document.close(); w.print()
}

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
  const [deductions, setDeductions] = useState(0)
  const [loanDeduction, setLoanDeduction] = useState(0)
  const [leaveDeduction, setLeaveDeduction] = useState(0)
  const [autoLoadedSummary, setAutoLoadedSummary] = useState(null)
  const [loadingEmpSummary, setLoadingEmpSummary] = useState(false)
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

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const branches = branchData?.branches || []

  const { data: bankData } = useQuery({ queryKey: ['bank-accounts'], queryFn: () => api.get('/bank-accounts').then(r => r.data) })
  const bankAccounts = bankData?.accounts || []

  const [payBank, setPayBank] = useState('')
  const [payMethod, setPayMethod] = useState('bank_transfer')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payroll', month, year, branchFilter],
    queryFn: () => api.get(`/payroll?month=${month}&year=${year}${branchFilter ? `&branch=${branchFilter}` : ''}`).then(r => r.data),
  })
  const { data: empData } = useQuery({
    queryKey: ['employees-all', branchFilter],
    queryFn: () => api.get(`/employees?status=active${branchFilter ? `&branch=${branchFilter}` : ''}`).then(r => r.data),
  })
  const { data: otData } = useQuery({
    queryKey: ['overtime', month, year, otEmployeeId],
    queryFn: () => api.get(`/payroll/overtime?month=${month}&year=${year}${otEmployeeId ? `&employeeId=${otEmployeeId}` : ''}`).then(r => r.data),
  })
  const { data: previewOtData } = useQuery({
    queryKey: ['overtime', month, year, selectedEmployee],
    queryFn: () => api.get(`/payroll/overtime?month=${month}&year=${year}&employeeId=${selectedEmployee}`).then(r => r.data),
    enabled: !!selectedEmployee
  })

  const payrolls = data?.payrolls || []
  const activeEmployees = empData?.employees || []
  const otRecords = otData?.records || []
  const selectedEmp = useMemo(() => activeEmployees.find(e => e._id === selectedEmployee), [activeEmployees, selectedEmployee])

  // Auto-load employee loan/advance summary when employee is selected
  const handleSelectEmployee = async (empId) => {
    setSelectedEmployee(empId)
    setAutoLoadedSummary(null)
    if (!empId) return
    setLoadingEmpSummary(true)
    try {
      const { data } = await api.get(`/loans/employee-summary/${empId}`)
      const s = data.summary
      setAutoLoadedSummary(s)
      // Auto-fill deductions based on active loans (salary-type only)
      const salaryLoans = s.activeLoans?.filter(l => l.deductionType !== 'separate') || []
      const autoLoanDeduct = salaryLoans.reduce((sum, l) => sum + (l.monthlyInstallment || 0), 0)
      setLoanDeduction(autoLoanDeduct)
      setAllowances(s.allowances || 0)
    } catch { /* ignore */ }
    setLoadingEmpSummary(false)
  }

  const generateAllMut = useMutation({
    mutationFn: () => api.post('/payroll/generate-all', { month, year, branch: branchFilter }),
    onSuccess: r => { qc.invalidateQueries(['payroll']); toast.success(`Generated ${r.data.generated} payslips`) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const generateOneMut = useMutation({
    mutationFn: () => api.post('/payroll/generate', { 
      month, year, employeeId: selectedEmployee, 
      allowances, commissions, bonus, deductions, 
      loanDeduction, leaveDeduction, paymentMethod 
    }),
    onSuccess: () => { qc.invalidateQueries(['payroll']); toast.success('Payroll generated'); setShowReplaceConfirm(false) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
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
    mutationFn: id => api.put(`/payroll/${id}/pay`, { paymentMethod: payMethod, bankAccount: payBank }),
    onSuccess: () => { 
      qc.invalidateQueries(['payroll'])
      refetch()
      toast.success('Marked as paid')
      setPreviewPayroll(null) 
    },
    onError: e => toast.error(e.response?.data?.message || 'Payment failed'),
  })
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
    const exists = payrolls.find(p => String(p.employee?._id) === String(selectedEmployee))
    if (exists) {
      if (exists.status === 'paid') {
        toast.error('Cannot regenerate a PAID payroll')
      } else {
        setShowReplaceConfirm(true)
      }
    } else {
      generateOneMut.mutate()
    }
  }

  // Preview salary calculation
  const previewCalc = useMemo(() => {
    if (!selectedEmp) return null
    const basic = selectedEmp.basicSalary || 0
    const otTotal = (previewOtData?.records || []).reduce((sum, r) => sum + Number(r.amount), 0)
    const gross = basic + Number(allowances) + Number(commissions) + Number(bonus) + otTotal
    const epfEnrolled = selectedEmp.epfEtfEnrolled || false
    const epfEmp = epfEnrolled ? Math.round(basic * 0.08) : 0
    const epfEmpl = epfEnrolled ? Math.round(basic * 0.12) : 0
    const etf = epfEnrolled ? Math.round(basic * 0.03) : 0
    const net = gross - epfEmp - Number(deductions) - Number(loanDeduction) - Number(leaveDeduction)
    return { basic, otTotal, gross, epfEmp, epfEmpl, etf, net, epfEnrolled }
  }, [selectedEmp, allowances, commissions, bonus, deductions, loanDeduction, leaveDeduction, previewOtData])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Manage monthly salary, EPF/ETF & project allocations</p>
        </div>
        <button onClick={() => { if(window.confirm(`Generate payroll for ALL active employees for ${MONTHS[month-1]} ${year}?`)) generateAllMut.mutate() }}
          disabled={generateAllMut.isPending} className="btn-primary">
          {generateAllMut.isPending ? <span className="spinner"/> : <><FiPlay size={15}/> Generate All</>}
        </button>
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
        <div className="flex gap-2 self-end">
          <button className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600" title="Export PDF"><FiInfo size={16} /></button>
          <button className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600" title="Export Excel"><FiDollarSign size={16} /></button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Generate Single */}
        <div className="card card-body space-y-3">
          <h3 className="font-bold text-primary font-heading">Generate for Employee</h3>
          <p className="text-xs text-gray-400">Project salary allocations are auto-included server-side. OT from attendance is also auto-fetched.</p>
          <div>
            <label className="form-label">Employee</label>
            <select className="form-select" value={selectedEmployee} onChange={e => handleSelectEmployee(e.target.value)}>
              <option value="">Select employee</option>
              {activeEmployees.map(e => <option key={e._id} value={e._id}>{e.userId?.name} ({e.employeeNo})</option>)}
            </select>
          </div>

          {/* Auto-loaded employee summary */}
          {loadingEmpSummary && <div className="text-center py-3 text-slate-400 text-sm animate-pulse">Loading employee data…</div>}
          {autoLoadedSummary && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1"><FiUser size={12} /> Auto-loaded: {autoLoadedSummary.name}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                <span>Basic Salary:</span><span className="font-semibold">LKR {autoLoadedSummary.basicSalary?.toLocaleString()}</span>
                <span>Advance Balance:</span><span className={autoLoadedSummary.totalAdvanceBalance > 0 ? 'text-orange-600 font-medium' : ''}>{autoLoadedSummary.totalAdvanceBalance > 0 ? `LKR ${autoLoadedSummary.totalAdvanceBalance?.toLocaleString()}` : 'None'}</span>
                <span>Active Loans:</span><span className={autoLoadedSummary.activeLoansCount > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>{autoLoadedSummary.activeLoansCount} loan(s)</span>
                <span>Monthly Deductions:</span><span className="font-semibold text-red-500">LKR {autoLoadedSummary.totalMonthlyLoanDeductions?.toLocaleString()}</span>
              </div>
              {autoLoadedSummary.totalMonthlyLoanDeductions > 0 && (
                <p className="mt-1 text-blue-600 flex items-center gap-1"><FiAlertCircle size={11} /> Loan deduction auto-filled below</p>
              )}
            </div>
          )}

          {/* Live preview when employee selected */}
          {selectedEmp && previewCalc && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs space-y-1.5">
              <p className="font-bold text-blue-800 mb-2">📋 Salary Preview — {selectedEmp.userId?.name}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-blue-700">
                <span>Department:</span><span className="font-medium">{selectedEmp.department}</span>
                <span>Designation:</span><span className="font-medium">{selectedEmp.designation}</span>
                <span>Basic Salary:</span><span className="font-medium">LKR {previewCalc.basic.toLocaleString()}</span>
                <span>Overtime (Auto):</span><span className={previewCalc.otTotal > 0 ? "font-bold text-orange-600" : "font-medium"}>LKR {previewCalc.otTotal.toLocaleString()}</span>
                <span>Allowances:</span><span className="font-medium">LKR {Number(allowances).toLocaleString()}</span>
                <span>Commissions:</span><span className="font-medium">LKR {Number(commissions).toLocaleString()}</span>
                <span>Bonus:</span><span className="font-medium">LKR {Number(bonus).toLocaleString()}</span>
                <span className="border-t border-blue-200 pt-1">Gross:</span><span className="font-bold border-t border-blue-200 pt-1">LKR {previewCalc.gross.toLocaleString()}</span>
                <span className="text-red-600">EPF (8% emp):</span><span className="text-red-600 font-medium">- LKR {previewCalc.epfEmp.toLocaleString()}</span>
                <span className="text-orange-600">Deductions:</span><span className="text-orange-600 font-medium">- LKR {(Number(deductions)+Number(loanDeduction)).toLocaleString()}</span>
                <span className="font-bold text-green-700 border-t border-blue-200 pt-1">Net Pay:</span>
                <span className="font-bold text-green-700 border-t border-blue-200 pt-1">LKR {previewCalc.net.toLocaleString()}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-blue-200 grid grid-cols-2 gap-x-4 text-blue-600">
                <span>EPF Employer (12%):</span><span className="font-medium">LKR {previewCalc.epfEmpl.toLocaleString()}</span>
                <span>ETF Employer (3%):</span><span className="font-medium">LKR {previewCalc.etf.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Allowances</label><input type="number" className="form-input" value={allowances} onChange={e => setAllowances(Number(e.target.value || 0))} /></div>
            <div><label className="form-label">Manual Commission</label><input type="number" className="form-input" value={commissions} onChange={e => setCommissions(Number(e.target.value || 0))} /></div>
            <div><label className="form-label">Bonus</label><input type="number" className="form-input" value={bonus} onChange={e => setBonus(Number(e.target.value || 0))} /></div>
            <div><label className="form-label">Advance Deduction</label><input type="number" className="form-input" value={deductions} onChange={e => setDeductions(Number(e.target.value || 0))} /></div>
            <div><label className="form-label">Loan Deduction <span className="text-xs text-blue-500">(auto-filled)</span></label><input type="number" className="form-input" value={loanDeduction} onChange={e => setLoanDeduction(Number(e.target.value || 0))} /></div>
            <div><label className="form-label">Leave Deduction</label><input type="number" className="form-input" value={leaveDeduction} onChange={e => setLeaveDeduction(Number(e.target.value || 0))} placeholder="0" /></div>
            <div className="col-span-2">
              <label className="form-label">Payment Method</label>
              <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="online_transfer">Online Transfer</option>
                <option value="card_payment">Card Payment</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>
          <button className="btn-primary" disabled={!selectedEmp || generateOneMut.isPending} onClick={handleGenerateClick}>
            <FiPlay size={14}/> {generateOneMut.isPending ? 'Generating…' : 'Generate Payslip'}
          </button>
        </div>

        {/* OT */}
        <div className="card card-body space-y-3">
          <h3 className="font-bold text-primary font-heading">Add Overtime</h3>
          <p className="text-xs text-gray-400">Add OT hours and amount for the selected employee and period.</p>
          <div>
            <label className="form-label">Employee</label>
            <select className="form-select" value={otEmployeeId} onChange={e => setOtEmployeeId(e.target.value)}>
              <option value="">Select employee</option>
              {activeEmployees.map(e => <option key={e._id} value={e._id}>{e.userId?.name} ({e.employeeNo})</option>)}
            </select>
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
          { label: 'Total Net Payroll', value: `LKR ${totalNet.toLocaleString()}`, color: 'kpi-green' },
          { label: 'Total EPF (Both)', value: `LKR ${totalEpf.toLocaleString()}`, color: 'kpi-blue' },
          { label: 'Total ETF (Employer)', value: `LKR ${totalEtf.toLocaleString()}`, color: 'kpi-orange' },
        ].map(s => (
          <div key={s.label} className={`kpi-card ${s.color}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-primary font-heading">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Payroll Table */}
      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th>Employee</th><th>Basic</th><th>OT</th><th>Commissions</th><th>Bonus</th>
            <th>Gross</th><th>EPF(emp)</th><th>Net Pay</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></td></tr>
            ) : filteredPayrolls.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">
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
                <td className="font-medium">LKR {(p.grossSalary||0).toLocaleString()}</td>
                <td className="text-red-500 text-xs">LKR {(p.epfEmployee||0).toLocaleString()}</td>
                <td className="font-bold text-green-700">LKR {(p.netSalary||0).toLocaleString()}</td>
                <td><span className={`badge ${statusColor[p.status]||'badge-gray'}`}>{p.status}</span></td>
                <td>
                  <div className="flex gap-1 items-center">
                    <button onClick={() => setPreviewPayroll(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="View Details">
                      <FiInfo size={14}/>
                    </button>
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
                    {p.status === 'approved' && (
                      <button onClick={() => setPreviewPayroll(p)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Pay Now">
                        <FiDollarSign size={14}/>
                      </button>
                    )}
                    {p.status === 'paid' && (
                      <button onClick={() => printPayslip(p)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="View Payslip">
                        <FiUser size={14}/>
                      </button>
                    )}
                    {p.status !== 'paid' && (
                      <button onClick={() => { setEditPayroll(p); setEditForm({ allowances: p.allowances, commissions: p.commissions, bonus: p.bonus, deductions: p.deductions, loanDeduction: p.loanDeduction, paymentMethod: p.paymentMethod || 'bank_transfer' }) }} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit">
                        <FiPlay size={13} className="rotate-90"/>
                      </button>
                    )}
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

      {/* Payment Preview Modal */}
      {previewPayroll && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-primary font-heading">Payment Preview</h3>
              <button onClick={() => setPreviewPayroll(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
            </div>
            <div className="p-5 space-y-3">
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
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="form-label text-xs">Payment Method</label>
                  <select className="form-select text-sm" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="card_payment">Card Payment</option>
                    <option value="online_transfer">Online Transfer</option>
                    <option value="payhere">PayHere</option>
                  </select>
                </div>
                {['bank_transfer', 'card_payment', 'online_transfer', 'payhere'].includes(payMethod) && (
                  <div>
                    <label className="form-label text-xs">Bank Account</label>
                    <select className="form-select text-sm" value={payBank} onChange={e => setPayBank(e.target.value)}>
                      <option value="">Select Account...</option>
                      {bankAccounts.map(b => <option key={b._id} value={b._id}>{b.bankName} ({b.accountNumber})</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setPreviewPayroll(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button onClick={() => payMut.mutate(previewPayroll._id)} disabled={payMut.isPending} className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-700 border-green-600">
                  {payMut.isPending ? <span className="spinner"/> : <><FiCheck size={14}/> Confirm & Pay</>}
                </button>
              </div>
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
              <div><label className="form-label text-xs font-bold uppercase tracking-tight">Allowances</label><input type="number" className="form-input text-sm" value={editForm.allowances} onChange={e => setEditForm(s => ({...s, allowances: Number(e.target.value)}))} /></div>
              <div><label className="form-label text-xs font-bold uppercase tracking-tight">Commissions</label><input type="number" className="form-input text-sm" value={editForm.commissions} onChange={e => setEditForm(s => ({...s, commissions: Number(e.target.value)}))} /></div>
              <div><label className="form-label text-xs font-bold uppercase tracking-tight">Bonus</label><input type="number" className="form-input text-sm" value={editForm.bonus} onChange={e => setEditForm(s => ({...s, bonus: Number(e.target.value)}))} /></div>
              <div><label className="form-label text-xs font-bold uppercase tracking-tight">Loan Deduction</label><input type="number" className="form-input text-sm" value={editForm.loanDeduction} onChange={e => setEditForm(s => ({...s, loanDeduction: Number(e.target.value)}))} /></div>
              <div className="col-span-2">
                <label className="form-label text-xs font-bold uppercase tracking-tight">Payment Method</label>
                <select className="form-select text-sm" value={editForm.paymentMethod} onChange={e => setEditForm(s => ({...s, paymentMethod: e.target.value}))}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="online_transfer">Online Transfer</option>
                  <option value="card_payment">Card Payment</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
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
