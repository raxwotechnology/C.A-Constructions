import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { useSiteBranding } from '../../hooks/useSiteBranding'
import { printPayslip as printPayslipDoc, downloadPayslipPdf } from '../../lib/payslipDocument'
import { FiDollarSign, FiDownload, FiTrendingUp } from 'react-icons/fi'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function EmployeePayslips() {
  const { settings: siteSettings } = useSiteBranding()
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
                <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => printPayslipDoc(p, siteSettings || {}, { role: p.payslipSignatory?.role, customSignatureUrl: p.payslipSignatory?.signatureUrl })} className="btn-ghost btn-sm">
                  <FiDownload size={13}/> Print
                </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
