import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiDollarSign, FiPlay, FiCheck, FiPlus, FiSend, FiUser, FiX, FiInfo, FiAlertCircle } from 'react-icons/fi'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

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

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const branches = branchData?.branches || []

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', month, year, branchFilter],
    queryFn: () => api.get(`/payroll?month=${month}&year=${year}${branchFilter ? `&branch=${branchFilter}` : ''}`).then(r => r.data),
  })
  const { data: empData } = useQuery({
    queryKey: ['employees-all', branchFilter],
    queryFn: () => api.get(`/employees?status=active${branchFilter ? `&branch=${branchFilter}` : ''}`).then(r => r.data),
  })

  const payrolls = data?.payrolls || []
  const activeEmployees = empData?.employees || []
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
    mutationFn: () => api.post('/payroll/generate', { month, year, employeeId: selectedEmployee, allowances, commissions, bonus, deductions, loanDeduction, leaveDeduction }),
    onSuccess: () => { qc.invalidateQueries(['payroll']); toast.success('Payroll generated') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const addOtMut = useMutation({
    mutationFn: () => api.post('/payroll/overtime', { employeeId: otEmployeeId, month, year, amount: Number(otAmount), hours: Number(otHours), note: otNote }),
    onSuccess: () => { toast.success('OT added'); setOtAmount(0); setOtHours(0); setOtNote('') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const reviewMut = useMutation({
    mutationFn: id => api.put(`/payroll/${id}/review`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); toast.success('Marked as reviewed') },
  })
  const approveMut = useMutation({
    mutationFn: id => api.put(`/payroll/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); toast.success('Approved') },
  })
  const payMut = useMutation({
    mutationFn: id => api.put(`/payroll/${id}/pay`),
    onSuccess: () => { qc.invalidateQueries(['payroll']); toast.success('Marked as paid'); setPreviewPayroll(null) },
  })
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

  const totalNet = payrolls.reduce((a, b) => a + b.netSalary, 0)
  const totalEpf = payrolls.reduce((a, b) => a + b.epfEmployee + b.epfEmployer, 0)
  const totalEtf = payrolls.reduce((a, b) => a + b.etfEmployer, 0)
  const statusColor = { draft: 'badge-yellow', reviewed: 'badge-purple', approved: 'badge-blue', paid: 'badge-green' }

  // Preview salary calculation
  const previewCalc = useMemo(() => {
    if (!selectedEmp) return null
    const basic = selectedEmp.basicSalary || 0
    const gross = basic + Number(allowances) + Number(commissions) + Number(bonus)
    const epfEmp = Math.round(basic * 0.08)
    const epfEmpl = Math.round(basic * 0.12)
    const etf = Math.round(basic * 0.03)
    const net = gross - epfEmp - Number(deductions) - Number(loanDeduction) - Number(leaveDeduction)
    return { basic, gross, epfEmp, epfEmpl, etf, net }
  }, [selectedEmp, allowances, commissions, bonus, deductions, loanDeduction, leaveDeduction])

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

      {/* Period */}
      <div className="card card-body flex flex-wrap gap-4 items-center">
        <div>
          <label className="form-label text-xs">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="form-select">
            {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label text-xs">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="form-select">
            {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label text-xs">Branch</label>
          <select className="form-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-500">{payrolls.length} payslips · {MONTHS[month-1]} {year}</div>
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
          </div>
          <button className="btn-primary" disabled={!selectedEmp || generateOneMut.isPending} onClick={() => generateOneMut.mutate()}>
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
            ) : payrolls.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">
                <FiDollarSign size={36} className="mx-auto mb-2 opacity-30"/>
                No payroll for {MONTHS[month-1]} {year}. Click "Generate All" to start.
              </td></tr>
            ) : payrolls.map(p => (
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
                      <>
                        <button onClick={() => setPreviewPayroll(p)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Preview & Pay"><FiInfo size={14}/></button>
                        <button onClick={() => { if(window.confirm('Pay via PayHere?')) payHereMut.mutate(p._id) }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Pay via PayHere"><FiSend size={14}/></button>
                      </>
                    )}
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
                  <span className="font-semibold text-gray-700">Gross Salary</span>
                  <span className="font-bold">LKR {(previewPayroll.grossSalary||0).toLocaleString()}</span>
                </div>
                {[
                  { label: 'EPF (Employee 8%)', val: previewPayroll.epfEmployee },
                  { label: 'Deductions', val: previewPayroll.deductions },
                  { label: 'Loan Deduction', val: previewPayroll.loanDeduction },
                ].map(row => (row.val > 0 &&
                  <div key={row.label} className="flex justify-between">
                    <span className="text-gray-600">- {row.label}</span>
                    <span className="font-medium text-red-500">LKR {(row.val||0).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between bg-green-50 rounded-xl p-3 border border-green-100">
                  <span className="font-bold text-green-800">Net Pay</span>
                  <span className="font-bold text-green-700 text-lg">LKR {(previewPayroll.netSalary||0).toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-400 space-y-0.5 pt-1">
                  <p>EPF Employer (12%): LKR {(previewPayroll.epfEmployer||0).toLocaleString()}</p>
                  <p>ETF Employer (3%): LKR {(previewPayroll.etfEmployer||0).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
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
    </div>
  )
}
