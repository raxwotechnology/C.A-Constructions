import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { FiDollarSign, FiDownload, FiTrendingUp } from 'react-icons/fi'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const printPayslip = (p) => {
  const w = window.open('', '_blank')
  const MF = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const r = (label, val, cls='') => val > 0 ? `<div class="row ${cls}"><span>${label}</span><span>LKR ${Number(val||0).toLocaleString()}</span></div>` : ''
  w.document.write(`<!DOCTYPE html><html><head><title>Payslip ${MF[p.month-1]} ${p.year}</title>
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
    <div><h2>Raxwo Technology (Pvt) Ltd</h2><p>Official Payslip — ${MF[p.month-1]} ${p.year}</p></div>
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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div><p className="text-gray-400 text-xs">Basic</p><p className="font-medium">LKR {p.basicSalary?.toLocaleString()}</p></div>
                    <div><p className="text-gray-400 text-xs">OT Pay</p><p className="font-medium text-orange-600">{(p.otPay||p.overtime)>0?`LKR ${(p.otPay||p.overtime)?.toLocaleString()}`:'—'}</p></div>
                    <div><p className="text-gray-400 text-xs">Gross</p><p className="font-medium">LKR {p.grossSalary?.toLocaleString()}</p></div>
                    <div><p className="text-gray-400 text-xs">Deductions</p><p className="font-medium text-red-600">−LKR {((p.epfEmployee||0)+(p.advanceDeduction||0)+(p.loanDeduction||0)).toLocaleString()}</p></div>
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
