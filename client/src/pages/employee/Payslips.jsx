import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { FiDollarSign, FiDownload, FiTrendingUp } from 'react-icons/fi'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const printPayslip = (p) => {
  const w = window.open('', '_blank')
  w.document.write(`<html><head><title>Payslip</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;padding:20px;color:#1a1a1a}
    .header{background:#0B1F3A;color:#fff;padding:20px;border-radius:8px;margin-bottom:20px}
    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:14px}
    .total{font-weight:bold;font-size:16px;color:#16a34a}
    .deduct{color:#dc2626}
    h2{margin:0;font-size:18px}p{margin:4px 0;opacity:.7;font-size:12px}
  </style></head><body>
  <div class="header"><h2>Raxwo Pvt Ltd — Payslip</h2><p>${MONTHS[p.month-1]} ${p.year}</p></div>
  <div class="row"><span>Employee</span><span>${p.employee?.userId?.name || 'N/A'}</span></div>
  <div class="row"><span>Employee No</span><span>${p.employee?.employeeNo || 'N/A'}</span></div>
  <div class="row"><span>Basic Salary</span><span>LKR ${p.basicSalary?.toLocaleString()}</span></div>
  <div class="row"><span>Allowances</span><span>LKR ${p.allowances?.toLocaleString()}</span></div>
  <div class="row"><span>Bonus</span><span>LKR ${p.bonus?.toLocaleString()}</span></div>
  <div class="row"><span>Overtime</span><span>LKR ${p.overtime?.toLocaleString()}</span></div>
  <div class="row"><span>Gross Salary</span><span>LKR ${p.grossSalary?.toLocaleString()}</span></div>
  <div class="row"><span>EPF Employee (8%)</span><span class="deduct">− LKR ${p.epfEmployee?.toLocaleString()}</span></div>
  <div class="row"><span>Other Deductions</span><span class="deduct">− LKR ${p.deductions?.toLocaleString()}</span></div>
  <div class="row total"><span>NET SALARY</span><span>LKR ${p.netSalary?.toLocaleString()}</span></div>
  <div class="row"><span>EPF Employer (12%)</span><span>LKR ${p.epfEmployer?.toLocaleString()}</span></div>
  <div class="row"><span>ETF Employer (3%)</span><span>LKR ${p.etfEmployer?.toLocaleString()}</span></div>
  </body></html>`)
  w.document.close(); w.print()
}

export default function EmployeePayslips() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-payrolls'],
    queryFn: () => api.get('/payroll/my').then(r => r.data),
  })
  const payrolls = data?.payrolls || []
  const totalEpf = payrolls.reduce((a, b) => a + (b.epfEmployee || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Payslips & EPF</h1>
          <p className="page-subtitle">{payrolls.length} payslips available</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label:'Total EPF Contributed', value:`LKR ${totalEpf.toLocaleString()}`, icon:FiTrendingUp, color:'kpi-blue' },
          { label:'Latest Net Pay', value: payrolls[0] ? `LKR ${payrolls[0].netSalary?.toLocaleString()}` : '—', icon:FiDollarSign, color:'kpi-green' },
          { label:'Payslips Issued', value:payrolls.length, icon:FiDownload, color:'kpi-navy' },
        ].map(s=>(
          <div key={s.label} className={`kpi-card ${s.color}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-xl font-bold text-primary font-heading">{s.value}</p>
              </div>
              <s.icon size={20} className="text-gray-300"/>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
      ) : payrolls.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiDollarSign size={40} className="mx-auto mb-2 opacity-30"/><p>No payslips yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payrolls.map(p => (
            <div key={p._id} className="card card-body card-hover">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-primary font-heading">{MONTHS[p.month-1]} {p.year}</h3>
                    <span className={`badge ${p.status==='paid'?'badge-green':p.status==='approved'?'badge-blue':'badge-yellow'}`}>{p.status}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><p className="text-gray-400 text-xs">Basic</p><p className="font-medium">LKR {p.basicSalary?.toLocaleString()}</p></div>
                    <div><p className="text-gray-400 text-xs">Gross</p><p className="font-medium">LKR {p.grossSalary?.toLocaleString()}</p></div>
                    <div><p className="text-gray-400 text-xs">EPF (8%)</p><p className="font-medium text-red-600">−LKR {p.epfEmployee?.toLocaleString()}</p></div>
                    <div><p className="text-gray-400 text-xs">Net Pay</p><p className="font-bold text-green-700">LKR {p.netSalary?.toLocaleString()}</p></div>
                  </div>
                </div>
                <button onClick={() => printPayslip(p)} className="btn-ghost btn-sm flex-shrink-0">
                  <FiDownload size={13}/> Print
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
