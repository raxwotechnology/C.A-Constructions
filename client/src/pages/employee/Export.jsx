import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  FiDownload, FiFileText, FiCode, FiDollarSign, FiCalendar,
  FiClock, FiFolder, FiTrendingUp, FiCheck, FiCpu
} from 'react-icons/fi'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const EXPORT_TYPES = [
  { value: 'salary', label: 'Salary Report', icon: FiDollarSign, desc: 'All payslips with breakdown', color: 'from-green-500 to-emerald-600' },
  { value: 'attendance', label: 'Attendance Report', icon: FiCalendar, desc: 'Daily attendance log', color: 'from-blue-500 to-blue-600' },
  { value: 'leaves', label: 'Leave Records', icon: FiClock, desc: 'Applied and approved leaves', color: 'from-amber-500 to-orange-500' },
  { value: 'epf', label: 'EPF / ETF', icon: FiTrendingUp, desc: 'Statutory contribution history', color: 'from-purple-500 to-purple-600' },
  { value: 'projects', label: 'Project History', icon: FiFolder, desc: 'Assigned projects overview', color: 'from-slate-500 to-slate-700' },
]

function printHTML(htmlContent, title) {
  const w = window.open('', '_blank')
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;max-width:720px;margin:24px auto;padding:20px;color:#111;font-size:13px}
    h1{font-size:20px;color:#0B1F3A;margin-bottom:4px}
    .sub{font-size:11px;color:#888;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th{background:#0B1F3A;color:#fff;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
    td{padding:7px 10px;border-bottom:1px solid #f0f0f0;font-size:12px}
    tr:nth-child(even) td{background:#f8f8f8}
    .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700}
    .green{background:#d1fae5;color:#065f46}.blue{background:#dbeafe;color:#1e40af}.gray{background:#f3f4f6;color:#374151}
    .foot{margin-top:20px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #0B1F3A}
  </style></head><body>
  <div class="hdr"><div><h1>Raxwo Technology (Pvt) Ltd</h1><p class="sub">${title} · Generated: ${new Date().toLocaleString()}</p></div></div>
  ${htmlContent}
  <div class="foot">This is a computer-generated document. No signature required.</div>
  </body></html>`)
  w.document.close()
  w.print()
}

function buildSalaryTable(payrolls) {
  if (!payrolls.length) return '<p style="color:#888">No payroll records found.</p>'
  const rows = payrolls.map(p => `<tr>
    <td>${MONTHS[(p.month||1)-1]} ${p.year}</td>
    <td>LKR ${(p.basicSalary||0).toLocaleString()}</td>
    <td>LKR ${(p.grossSalary||0).toLocaleString()}</td>
    <td class="badge green">LKR ${(p.netSalary||0).toLocaleString()}</td>
    <td>LKR ${(p.epfEmployee||0).toLocaleString()}</td>
    <td><span class="badge ${p.status==='paid'?'green':p.status==='approved'?'blue':'gray'}">${p.status}</span></td>
  </tr>`).join('')
  return `<table><thead><tr><th>Period</th><th>Basic</th><th>Gross</th><th>Net Pay</th><th>EPF 8%</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
}

function buildAttendanceTable(records) {
  if (!records.length) return '<p style="color:#888">No attendance records found.</p>'
  const rows = records.map(r => `<tr>
    <td>${new Date(r.date).toLocaleDateString('en-LK')}</td>
    <td>${r.checkIn || '—'}</td>
    <td>${r.checkOut || '—'}</td>
    <td>${r.hoursWorked ?? '—'} hrs</td>
    <td><span class="badge ${r.status==='present'?'green':r.status==='absent'?'badge-red':'gray'}">${r.status||'—'}</span></td>
  </tr>`).join('')
  return `<table><thead><tr><th>Date</th><th>Check-In</th><th>Check-Out</th><th>Hours</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
}

function buildLeaveTable(leaves) {
  if (!leaves.length) return '<p style="color:#888">No leave records found.</p>'
  const rows = leaves.map(l => `<tr>
    <td>${l.leaveType}</td>
    <td>${new Date(l.startDate).toLocaleDateString('en-LK')}</td>
    <td>${new Date(l.endDate).toLocaleDateString('en-LK')}</td>
    <td>${l.totalDays}</td>
    <td>${l.reason||'—'}</td>
    <td><span class="badge ${l.status==='approved'?'green':l.status==='rejected'?'badge-red':'gray'}">${l.status}</span></td>
  </tr>`).join('')
  return `<table><thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
}

function buildEpfTable(payrolls) {
  if (!payrolls.length) return '<p style="color:#888">No EPF records found.</p>'
  const rows = payrolls.map(p => `<tr>
    <td>${MONTHS[(p.month||1)-1]} ${p.year}</td>
    <td>LKR ${(p.basicSalary||0).toLocaleString()}</td>
    <td>LKR ${(p.epfEmployee||0).toLocaleString()}</td>
    <td>LKR ${(p.epfEmployer||0).toLocaleString()}</td>
    <td>LKR ${(p.etfEmployer||0).toLocaleString()}</td>
  </tr>`).join('')
  const totalEpfEmp = payrolls.reduce((s,p)=>s+(p.epfEmployee||0),0)
  const totalEpfEr  = payrolls.reduce((s,p)=>s+(p.epfEmployer||0),0)
  const totalEtf    = payrolls.reduce((s,p)=>s+(p.etfEmployer||0),0)
  return `<table><thead><tr><th>Period</th><th>Gross Salary</th><th>EPF Employee 8%</th><th>EPF Employer 12%</th><th>ETF 3%</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr style="font-weight:700;background:#f0fdf4"><td>Total</td><td></td><td>LKR ${totalEpfEmp.toLocaleString()}</td><td>LKR ${totalEpfEr.toLocaleString()}</td><td>LKR ${totalEtf.toLocaleString()}</td></tr></tfoot></table>`
}

function buildProjectTable(projects) {
  if (!projects.length) return '<p style="color:#888">No projects found.</p>'
  const rows = projects.map(p => `<tr>
    <td><strong>${p.title}</strong></td>
    <td>${p.status?.replace('_',' ')||'—'}</td>
    <td>${p.progress||0}%</td>
    <td>${p.deadline ? new Date(p.deadline).toLocaleDateString('en-LK') : '—'}</td>
  </tr>`).join('')
  return `<table><thead><tr><th>Project</th><th>Status</th><th>Progress</th><th>Deadline</th></tr></thead><tbody>${rows}</tbody></table>`
}

export default function DeveloperExport() {
  const [selected, setSelected] = useState('salary')
  const [loading, setLoading] = useState(false)
  const now = new Date()

  const { data: payrollData } = useQuery({ queryKey: ['my-payrolls'], queryFn: () => api.get('/payroll/my').then(r => r.data) })
  const { data: attendanceData } = useQuery({ queryKey: ['my-attendance-export'], queryFn: () => api.get('/attendance/my').then(r => r.data) })
  const { data: leaveData } = useQuery({ queryKey: ['my-leaves-export'], queryFn: () => api.get('/leaves/my').then(r => r.data) })
  const { data: projectData } = useQuery({ queryKey: ['my-projects-export'], queryFn: () => api.get('/projects/my').then(r => r.data) })

  const payrolls  = payrollData?.payrolls || []
  const attendance = attendanceData?.records || []
  const leaves    = leaveData?.leaves || []
  const projects  = projectData?.projects || []

  const selectedCfg = EXPORT_TYPES.find(t => t.value === selected)

  const counts = {
    salary: payrolls.length,
    attendance: attendance.length,
    leaves: leaves.length,
    epf: payrolls.length,
    projects: projects.length,
  }

  const printPDF = () => {
    setLoading(true)
    try {
      let html = ''
      const title = selectedCfg?.label || 'Report'
      if (selected === 'salary')     html = buildSalaryTable(payrolls)
      if (selected === 'attendance') html = buildAttendanceTable(attendance)
      if (selected === 'leaves')     html = buildLeaveTable(leaves)
      if (selected === 'epf')        html = buildEpfTable(payrolls)
      if (selected === 'projects')   html = buildProjectTable(projects)
      printHTML(html, title)
      toast.success(`${title} opened for printing`)
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  const downloadJSON = () => {
    setLoading(true)
    try {
      let obj = {}
      if (selected === 'salary')     obj = { payrolls }
      if (selected === 'attendance') obj = { attendance }
      if (selected === 'leaves')     obj = { leaves }
      if (selected === 'epf')        obj = { epf: payrolls.map(p => ({ month: p.month, year: p.year, epfEmployee: p.epfEmployee, epfEmployer: p.epfEmployer, etfEmployer: p.etfEmployer })) }
      if (selected === 'projects')   obj = { projects }

      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `raxwo_${selected}_${now.toISOString().slice(0,10)}.json`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(a.href)
      toast.success('JSON exported')
    } catch {
      toast.error('Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Export Center</h1>
          <p className="page-subtitle">Download your personal records as printable PDFs or JSON data exports.</p>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {EXPORT_TYPES.map((t, i) => {
          const Icon = t.icon
          const isActive = selected === t.value
          return (
            <motion.button key={t.value} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              onClick={() => setSelected(t.value)}
              className={`card p-4 text-left border-2 transition-all hover:shadow-md ${isActive ? 'border-secondary shadow-md scale-[1.02]' : 'border-transparent hover:border-secondary/30'}`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-3`}>
                <Icon size={18} className="text-white" />
              </div>
              <h3 className="font-bold text-primary text-sm">{t.label}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
              <p className="text-xs font-semibold text-secondary mt-2">{counts[t.value] || 0} records</p>
            </motion.button>
          )
        })}
      </div>

      {/* Export panel */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card card-body">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedCfg?.color} flex items-center justify-center`}>
            {selectedCfg && <selectedCfg.icon size={18} className="text-white" />}
          </div>
          <div>
            <h3 className="font-bold text-primary">{selectedCfg?.label}</h3>
            <p className="text-xs text-slate-400">{counts[selected] || 0} records available · {now.toLocaleDateString('en-LK', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl border p-4 mb-5">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Export Includes</h4>
          <ul className="space-y-1.5">
            {selected === 'salary' && ['Basic salary, OT pay, and allowances', 'Gross and net salary per period', 'Deductions breakdown', 'Payment status'].map(f => <li key={f} className="flex items-center gap-2 text-sm text-slate-600"><FiCheck size={12} className="text-emerald-500" />{f}</li>)}
            {selected === 'attendance' && ['Daily check-in / check-out times', 'Hours worked per day', 'Attendance status (present/absent/late)', 'Monthly summary'].map(f => <li key={f} className="flex items-center gap-2 text-sm text-slate-600"><FiCheck size={12} className="text-emerald-500" />{f}</li>)}
            {selected === 'leaves' && ['All leave applications with reasons', 'Approval status per request', 'Leave types and durations', 'Manager notes'].map(f => <li key={f} className="flex items-center gap-2 text-sm text-slate-600"><FiCheck size={12} className="text-emerald-500" />{f}</li>)}
            {selected === 'epf' && ['Employee EPF 8% contribution per period', 'Employer EPF 12% contribution', 'ETF 3% employer contribution', 'Cumulative totals'].map(f => <li key={f} className="flex items-center gap-2 text-sm text-slate-600"><FiCheck size={12} className="text-emerald-500" />{f}</li>)}
            {selected === 'projects' && ['All assigned projects with status', 'Progress percentages', 'Deadlines and priority', 'Task summaries'].map(f => <li key={f} className="flex items-center gap-2 text-sm text-slate-600"><FiCheck size={12} className="text-emerald-500" />{f}</li>)}
          </ul>
        </div>

        <div className="flex gap-3">
          <button type="button" disabled={loading} onClick={printPDF}
            className="btn-primary flex-1 justify-center gap-2">
            <FiFileText size={14} />
            {loading ? 'Generating...' : 'Print / Save PDF'}
          </button>
          <button type="button" disabled={loading} onClick={downloadJSON}
            className="btn-outline flex-1 justify-center gap-2">
            <FiCode size={14} />
            Export JSON
          </button>
        </div>
      </motion.div>
    </div>
  )
}
