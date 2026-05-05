import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiDollarSign, FiPlay, FiCheck, FiPlus, FiSend } from 'react-icons/fi'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function AdminPayroll() {
  const qc = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [allowances, setAllowances] = useState(0)
  const [commissions, setCommissions] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [deductions, setDeductions] = useState(0)
  const [loanDeduction, setLoanDeduction] = useState(0)
  const [otEmployeeId, setOtEmployeeId] = useState('')
  const [otAmount, setOtAmount] = useState(0)
  const [otHours, setOtHours] = useState(0)
  const [otNote, setOtNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', month, year],
    queryFn: () => api.get(`/payroll?month=${month}&year=${year}`).then(r => r.data),
  })

  const { data: empData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => api.get('/employees?status=active').then(r => r.data),
  })

  const generateAllMut = useMutation({
    mutationFn: () => api.post('/payroll/generate-all', { month, year }),
    onSuccess: (r) => {
      qc.invalidateQueries(['payroll'])
      toast.success(`Generated ${r.data.generated} payslips`)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const generateOneMut = useMutation({
    mutationFn: () => api.post('/payroll/generate', {
      month, year, employeeId: selectedEmployee, allowances, commissions, bonus, deductions, loanDeduction,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['payroll'])
      toast.success('Payroll generated for employee')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const addOtMut = useMutation({
    mutationFn: () => api.post('/payroll/overtime', {
      employeeId: otEmployeeId,
      month,
      year,
      amount: Number(otAmount || 0),
      hours: Number(otHours || 0),
      note: otNote,
    }),
    onSuccess: () => {
      toast.success('Overtime added')
      setOtAmount(0); setOtHours(0); setOtNote('')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const approveMut = useMutation({
    mutationFn: id => api.put(`/payroll/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries(['payroll']); toast.success('Approved') },
  })

  const payMut = useMutation({
    mutationFn: id => api.put(`/payroll/${id}/pay`),
    onSuccess: () => { qc.invalidateQueries(['payroll']); toast.success('Marked as paid') },
  })
  const payHereMut = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/payroll/${id}/payhere/init`)
      const pd = data.paymentData
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = pd.sandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout'
      Object.entries(pd).filter(([k]) => k !== 'sandbox').forEach(([k, v]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = k
        input.value = v
        form.appendChild(input)
      })
      document.body.appendChild(form)
      form.submit()
    },
    onError: e => toast.error(e.response?.data?.message || 'PayHere init failed'),
  })

  const payrolls = data?.payrolls || []
  const totalNet = payrolls.reduce((a, b) => a + b.netSalary, 0)
  const totalEpf = payrolls.reduce((a, b) => a + b.epfEmployee + b.epfEmployer, 0)
  const totalEtf = payrolls.reduce((a, b) => a + b.etfEmployer, 0)

  const statusColor = { draft:'badge-yellow', approved:'badge-blue', paid:'badge-green' }
  const activeEmployees = empData?.employees || []
  const selectedEmp = useMemo(() => activeEmployees.find((e) => e._id === selectedEmployee), [activeEmployees, selectedEmployee])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Manage monthly salary & EPF/ETF</p>
        </div>
        <button onClick={() => { if(window.confirm(`Generate payroll for ALL active employees for ${MONTHS[month-1]} ${year}?`)) generateAllMut.mutate() }}
          disabled={generateAllMut.isPending}
          className="btn-primary">
          {generateAllMut.isPending ? <span className="spinner"/> : <><FiPlay size={15}/> Generate All</>}
        </button>
      </div>

      {/* Period selector */}
      <div className="card card-body flex flex-wrap gap-4 items-center">
        <div>
          <label className="form-label text-xs">Month</label>
          <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="form-select">
            {MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label text-xs">Year</label>
          <select value={year} onChange={e=>setYear(Number(e.target.value))} className="form-select">
            {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-500">{payrolls.length} payslips generated</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card card-body space-y-3">
          <h3 className="font-bold text-primary font-heading">Generate Payroll (Selected Employee)</h3>
          <div>
            <label className="form-label">Employee</label>
            <select className="form-select" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
              <option value="">Select employee</option>
              {activeEmployees.map((e) => <option key={e._id} value={e._id}>{e.userId?.name} ({e.employeeNo})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Allowances</label><input type="number" className="form-input" value={allowances} onChange={(e) => setAllowances(Number(e.target.value || 0))} /></div>
            <div><label className="form-label">Commissions</label><input type="number" className="form-input" value={commissions} onChange={(e) => setCommissions(Number(e.target.value || 0))} /></div>
            <div><label className="form-label">Bonus</label><input type="number" className="form-input" value={bonus} onChange={(e) => setBonus(Number(e.target.value || 0))} /></div>
            <div><label className="form-label">Deductions</label><input type="number" className="form-input" value={deductions} onChange={(e) => setDeductions(Number(e.target.value || 0))} /></div>
            <div><label className="form-label">Loan deduction</label><input type="number" className="form-input" value={loanDeduction} onChange={(e) => setLoanDeduction(Number(e.target.value || 0))} /></div>
          </div>
          <button className="btn-primary" disabled={!selectedEmp || generateOneMut.isPending} onClick={() => generateOneMut.mutate()}>
            <FiPlay size={14} /> Generate Selected
          </button>
        </div>

        <div className="card card-body space-y-3">
          <h3 className="font-bold text-primary font-heading">Add OT (Separate Function)</h3>
          <div>
            <label className="form-label">Employee</label>
            <select className="form-select" value={otEmployeeId} onChange={(e) => setOtEmployeeId(e.target.value)}>
              <option value="">Select employee</option>
              {activeEmployees.map((e) => <option key={e._id} value={e._id}>{e.userId?.name} ({e.employeeNo})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">OT Amount</label><input type="number" className="form-input" value={otAmount} onChange={(e) => setOtAmount(Number(e.target.value || 0))} /></div>
            <div><label className="form-label">OT Hours</label><input type="number" className="form-input" value={otHours} onChange={(e) => setOtHours(Number(e.target.value || 0))} /></div>
          </div>
          <div><label className="form-label">Note</label><input className="form-input" value={otNote} onChange={(e) => setOtNote(e.target.value)} /></div>
          <button className="btn-outline" disabled={!otEmployeeId || addOtMut.isPending} onClick={() => addOtMut.mutate()}>
            <FiPlus size={14} /> Add OT Record
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label:'Total Net Payroll', value:`LKR ${totalNet.toLocaleString()}`, color:'kpi-green' },
          { label:'Total EPF (Both)', value:`LKR ${totalEpf.toLocaleString()}`, color:'kpi-blue' },
          { label:'Total ETF (Employer)', value:`LKR ${totalEtf.toLocaleString()}`, color:'kpi-navy' },
        ].map(s=>(
          <div key={s.label} className={`kpi-card ${s.color}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-primary font-heading">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th>Employee</th><th>Basic</th><th>Allowances</th><th>Commissions</th><th>Gross</th>
            <th>EPF (8%)</th><th>ETF (3%)</th><th>Net Pay</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="text-center py-12">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/>
              </td></tr>
            ) : payrolls.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">
                <FiDollarSign size={36} className="mx-auto mb-2 opacity-30"/>
                No payroll for {MONTHS[month-1]} {year}. Click "Generate All" to start.
              </td></tr>
            ) : payrolls.map(p=>(
              <tr key={p._id}>
                <td>
                  <div>
                    <p className="font-medium text-gray-800">{p.employee?.userId?.name}</p>
                    <p className="text-xs text-gray-400">{p.employee?.employeeNo}</p>
                  </div>
                </td>
                <td>LKR {p.basicSalary?.toLocaleString()}</td>
                <td>LKR {p.allowances?.toLocaleString()}</td>
                <td>LKR {(p.commissions || 0).toLocaleString()}</td>
                <td className="font-medium">LKR {p.grossSalary?.toLocaleString()}</td>
                <td className="text-red-600">LKR {p.epfEmployee?.toLocaleString()}</td>
                <td className="text-orange-600">LKR {p.etfEmployer?.toLocaleString()}</td>
                <td className="font-bold text-green-700">LKR {p.netSalary?.toLocaleString()}</td>
                <td><span className={`badge ${statusColor[p.status]}`}>{p.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    {p.status === 'draft' && (
                      <button onClick={()=>approveMut.mutate(p._id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Approve">
                        <FiCheck size={14}/>
                      </button>
                    )}
                    {p.status === 'approved' && (
                      <>
                        <button onClick={()=>payMut.mutate(p._id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Mark Paid">
                          <FiDollarSign size={14}/>
                        </button>
                        <button onClick={()=>payHereMut.mutate(p._id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Pay via PayHere">
                          <FiSend size={14}/>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
