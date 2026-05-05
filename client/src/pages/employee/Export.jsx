import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiDownload, FiFileText, FiCode } from 'react-icons/fi'

const CATEGORIES = [
  { value: 'salary', label: 'Salary reports' },
  { value: 'attendance', label: 'Attendance reports' },
  { value: 'leaves', label: 'Leaves' },
  { value: 'epf', label: 'EPF / ETF' },
  { value: 'projects', label: 'Project history' },
]

export default function DeveloperExport() {
  const [category, setCategory] = useState('salary')
  const [downloading, setDownloading] = useState(false)

  const title = useMemo(() => CATEGORIES.find((c) => c.value === category)?.label || 'Export', [category])

  const download = async (type) => {
    try {
      setDownloading(true)
      const url = `/exports/${category}/${type}`
      const res = await api.get(url, { responseType: 'blob' })

      const blob = new Blob([res.data], { type: res.headers['content-type'] || (type === 'pdf' ? 'application/pdf' : 'application/json') })
      const a = document.createElement('a')
      a.href = window.URL.createObjectURL(blob)
      a.download = `raxwo_${category}.${type}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(a.href)
      toast.success(`${title} exported as ${type.toUpperCase()}`)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Export failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Export Center</h1>
          <p className="page-subtitle">Download your records as a clean PDF or raw JSON.</p>
        </div>
      </div>

      <div className="card card-body">
        <div className="grid md:grid-cols-2 gap-5 items-start">
          <div>
            <label className="form-label">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-select">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-2">
              PDFs are formatted for sharing. JSON is for backups or integrations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              className="btn-primary justify-center"
              disabled={downloading}
              onClick={() => download('pdf')}
            >
              <FiFileText size={16}/> Export PDF <FiDownload size={14}/>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              className="btn-outline justify-center"
              disabled={downloading}
              onClick={() => download('json')}
            >
              <FiCode size={16}/> Export JSON <FiDownload size={14}/>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}

