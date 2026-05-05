import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { FiDownload, FiTrendingUp } from 'react-icons/fi'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function EPFRecords() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const { data, isLoading } = useQuery({
    queryKey: ['epf-summary', month, year],
    queryFn: () => api.get(`/payroll/epf-summary?month=${month}&year=${year}`).then(r => r.data),
  })

  const summary = data?.summary || []
  const totals = data?.totals || {}

  const exportCSV = () => {
    const rows = [
      ['Employee','EPF No','Basic Salary','EPF Employee (8%)','EPF Employer (12%)','Total EPF','ETF Employer (3%)'],
      ...summary.map(r => [r.name, r.epfNo||'N/A', r.basicSalary, r.epfEmployee, r.epfEmployer, r.totalEPF, r.etfEmployer]),
      ['TOTALS','','', totals.epfEmployee, totals.epfEmployer, totals.totalEPF, totals.etfEmployer],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `EPF_ETF_${MONTHS[month-1]}_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">EPF / ETF Records</h1>
          <p className="page-subtitle">Sri Lanka statutory contribution reports</p>
        </div>
        <button onClick={exportCSV} className="btn-primary"><FiDownload size={15}/> Export CSV</button>
      </div>

      {/* Info banner */}
      <div className="card card-body bg-blue-50 border border-blue-100">
        <div className="flex flex-wrap gap-6">
          {[
            { label:'Employee EPF', rate:'8%', desc:'Deducted from employee basic salary' },
            { label:'Employer EPF', rate:'12%', desc:'Contributed by employer on basic salary' },
            { label:'Employer ETF', rate:'3%', desc:'Employee Trust Fund by employer' },
          ].map(r=>(
            <div key={r.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center font-bold text-sm">{r.rate}</div>
              <div>
                <p className="font-semibold text-primary text-sm">{r.label}</p>
                <p className="text-xs text-gray-500">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
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
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'EPF Employee (8%)', value:`LKR ${(totals.epfEmployee||0).toLocaleString()}`, color:'kpi-blue' },
          { label:'EPF Employer (12%)', value:`LKR ${(totals.epfEmployer||0).toLocaleString()}`, color:'kpi-navy' },
          { label:'Total EPF', value:`LKR ${(totals.totalEPF||0).toLocaleString()}`, color:'kpi-green' },
          { label:'ETF Employer (3%)', value:`LKR ${(totals.etfEmployer||0).toLocaleString()}`, color:'kpi-purple' },
        ].map(s=>(
          <div key={s.label} className={`kpi-card ${s.color}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-xl font-bold text-primary font-heading">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th>Employee</th><th>EPF No</th><th>Basic Salary</th>
            <th>EPF Employee (8%)</th><th>EPF Employer (12%)</th><th>Total EPF</th><th>ETF Employer (3%)</th>
          </tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/>
              </td></tr>
            ) : summary.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                <FiTrendingUp size={36} className="mx-auto mb-2 opacity-30"/>
                No EPF data for {MONTHS[month-1]} {year}. Generate payroll first.
              </td></tr>
            ) : summary.map((r, i) => (
              <tr key={i}>
                <td className="font-medium text-gray-800">{r.name}</td>
                <td className="text-gray-500">{r.epfNo||'—'}</td>
                <td>LKR {r.basicSalary?.toLocaleString()}</td>
                <td className="text-red-600 font-medium">LKR {r.epfEmployee?.toLocaleString()}</td>
                <td className="text-blue-600 font-medium">LKR {r.epfEmployer?.toLocaleString()}</td>
                <td className="font-bold">LKR {r.totalEPF?.toLocaleString()}</td>
                <td className="text-orange-600 font-medium">LKR {r.etfEmployer?.toLocaleString()}</td>
              </tr>
            ))}
            {summary.length > 0 && (
              <tr className="bg-gray-50 font-bold">
                <td colSpan={3} className="text-right text-gray-600 font-semibold">TOTALS</td>
                <td className="text-red-600">LKR {(totals.epfEmployee||0).toLocaleString()}</td>
                <td className="text-blue-600">LKR {(totals.epfEmployer||0).toLocaleString()}</td>
                <td>LKR {(totals.totalEPF||0).toLocaleString()}</td>
                <td className="text-orange-600">LKR {(totals.etfEmployer||0).toLocaleString()}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
