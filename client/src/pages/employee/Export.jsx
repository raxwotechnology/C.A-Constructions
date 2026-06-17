import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { printHtmlContent } from '../../lib/documentPrint'
import {
  FiDownload, FiFileText, FiDollarSign, FiCalendar,
  FiClock, FiFolder, FiTrendingUp, FiCheck, FiPrinter
} from 'react-icons/fi'

const EXPORT_TYPES = [
  { value: 'salary', label: 'Salary Report', icon: FiDollarSign, desc: 'All payslips with breakdown', color: 'from-green-500 to-emerald-600' },
  { value: 'attendance', label: 'Attendance Report', icon: FiCalendar, desc: 'Daily attendance log', color: 'from-blue-500 to-blue-600' },
  { value: 'leaves', label: 'Leave Records', icon: FiClock, desc: 'Applied and approved leaves', color: 'from-amber-500 to-orange-500' },
  { value: 'epf', label: 'EPF / ETF', icon: FiTrendingUp, desc: 'Statutory contribution history', color: 'from-purple-500 to-purple-600' },
  { value: 'projects', label: 'Project History', icon: FiFolder, desc: 'Assigned projects overview', color: 'from-slate-500 to-slate-700' },
]

function apiErrorMessage(err, fallback = 'Request failed') {
  const status = err?.response?.status
  const msg = err?.response?.data?.message || err?.message || fallback
  if (status === 401) return 'Session expired — please log in again'
  if (status === 403) return 'You do not have permission for this export'
  if (status === 404) return msg.includes('Employee') ? `${msg} Try logging out and back in.` : msg
  if (!err?.response) return 'Cannot reach server — check your connection or API URL'
  if (status === 500) return msg || 'Server error — try again or contact admin'
  return msg
}

export default function DeveloperExport() {
  const [selected, setSelected] = useState('salary')
  const [loadingPrint, setLoadingPrint] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const now = new Date()

  useEffect(() => {
    api.get('/auth/me').catch(() => {})
  }, [])

  const { data: payrollData } = useQuery({ queryKey: ['my-payrolls'], queryFn: () => api.get('/payroll/my').then(r => r.data) })
  const { data: attendanceData } = useQuery({ queryKey: ['my-attendance-export'], queryFn: () => api.get('/attendance/my').then(r => r.data) })
  const { data: leaveData } = useQuery({ queryKey: ['my-leaves-export'], queryFn: () => api.get('/leaves/my').then(r => r.data) })
  const { data: projectData } = useQuery({ queryKey: ['my-projects-export'], queryFn: () => api.get('/projects/my').then(r => r.data) })

  const payrolls = payrollData?.payrolls || []
  const attendance = attendanceData?.records || []
  const leaves = leaveData?.leaves || []
  const projects = projectData?.projects || []

  const selectedCfg = EXPORT_TYPES.find(t => t.value === selected)

  const counts = {
    salary: payrolls.length,
    attendance: attendance.length,
    leaves: leaves.length,
    epf: payrolls.length,
    projects: projects.length,
  }

  const printReport = async () => {
    setLoadingPrint(true)
    try {
      const res = await api.get(`/exports/${selected}/html`, { responseType: 'text' })
      const title = selectedCfg?.label || 'Report'
      const ok = printHtmlContent({ title, bodyHtml: res.data })
      if (ok) toast.success(`${title} ready to print`)
      else toast.error('Print failed — try Download PDF instead')
    } catch (err) {
      console.error('[export] print failed:', err)
      toast.error(apiErrorMessage(err, 'Print failed'))
    } finally {
      setLoadingPrint(false)
    }
  }

  const downloadPdf = async () => {
    setLoadingPdf(true)
    try {
      const res = await api.get(`/exports/${selected}/pdf`, { responseType: 'blob' })
      if (res.data?.type === 'application/json') {
        const text = await res.data.text()
        const json = JSON.parse(text)
        throw new Error(json.message || 'PDF generation failed')
      }
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `raxwo_${selected}_${now.toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch (err) {
      console.error('[export] PDF failed:', err)
      let msg = apiErrorMessage(err, 'PDF download failed')
      if (err?.response?.data instanceof Blob && err.response.data.type?.includes('json')) {
        try {
          const text = await err.response.data.text()
          const json = JSON.parse(text)
          msg = json.message || msg
        } catch { /* use default msg */ }
      }
      toast.error(msg)
    } finally {
      setLoadingPdf(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Export Center</h1>
          <p className="page-subtitle">Download PDF reports or print from this page — no new browser tabs.</p>
        </div>
      </div>

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

        <div className="flex gap-3 flex-wrap">
          <button type="button" disabled={loadingPdf} onClick={downloadPdf}
            className="btn-primary flex-1 min-w-[140px] justify-center gap-2">
            <FiDownload size={14} />
            {loadingPdf ? 'Generating PDF…' : 'Download PDF'}
          </button>
          <button type="button" disabled={loadingPrint} onClick={printReport}
            className="btn-outline flex-1 min-w-[140px] justify-center gap-2">
            <FiPrinter size={14} />
            {loadingPrint ? 'Preparing…' : 'Print'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
