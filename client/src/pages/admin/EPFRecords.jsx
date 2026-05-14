import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  FiDownload, FiTrendingUp, FiEdit2, FiTrash2,
  FiCheckCircle, FiClock, FiX, FiSave, FiRefreshCw, FiAlertCircle,
} from 'react-icons/fi'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function EPFRecords() {
  const qc  = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [editRow, setEditRow] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [verifying, setVerifying] = useState(false)

  /* ── query ──────────────────────────────────────────────────────────── */
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['epf-records', month, year],
    queryFn: () =>
      api.get(`/epf-records?month=${month}&year=${year}`).then(r => r.data),
  })

  const summary = data?.summary || []
  const totals  = data?.totals  || {}
  const rt = data?.statutoryRates ?? { epfEmployee: 8, epfEmployer: 12, etfEmployer: 3 }

  /* ── mutations ─────────────────────────────────────────────────────── */
  const editMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`/epf-records/${id}`, body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['epf-records'])
      toast.success('EPF record updated')
      setEditRow(null)
    },
    onError: e => toast.error(e.response?.data?.message || 'Update failed'),
  })

  const payMut = useMutation({
    mutationFn: id => api.put(`/epf-records/${id}/pay`).then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries(['epf-records'])
      toast.success(res.isPaid ? 'Marked as Paid ✅' : 'Reverted to Unpaid')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/epf-records/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['epf-records'])
      toast.success('Record deleted')
      setDeleteId(null); setDeletePassword('')
    },
    onError: e => toast.error(e.response?.data?.message || 'Delete failed'),
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

  /* ── CSV export ─────────────────────────────────────────────────────── */
  const exportCSV = () => {
    const rows = [
      ['Employee','EPF No','ETF No','Basic',`EPF Emp (${rt.epfEmployee}%)`,`EPF Emplr (${rt.epfEmployer}%)`,'Total EPF',`ETF (${rt.etfEmployer}%)`,'Status'],
      ...summary.map(r => [
        r.name, r.epfNo||'—', r.etfNo||'—',
        r.basicSalary, r.epfEmployee, r.epfEmployer, r.totalEPF, r.etfEmployer,
        r.isPaid ? 'Paid' : 'Unpaid',
      ]),
      ['TOTALS','','','',totals.epfEmployee,totals.epfEmployer,totals.totalEPF,totals.etfEmployer,''],
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `EPF_ETF_${MONTHS[month-1]}_${year}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  /* ── helpers ────────────────────────────────────────────────────────── */
  const openEdit = row => setEditRow({
    _id:         row._id,
    name:        row.name,
    basicSalary: row.basicSalary,
    epfEmployee: row.epfEmployee,
    epfEmployer: row.epfEmployer,
    etfEmployer: row.etfEmployer,
    notes:       row.notes || '',
  })

  const saveEdit = () => {
    editMut.mutate({
      id: editRow._id,
      body: {
        basicSalary: Number(editRow.basicSalary),
        epfEmployee: Number(editRow.epfEmployee),
        epfEmployer: Number(editRow.epfEmployer),
        etfEmployer: Number(editRow.etfEmployer),
        notes:       editRow.notes,
      },
    })
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">EPF / ETF Records</h1>
          <p className="page-subtitle">Sri Lanka statutory contributions · Enrolled employees always listed</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5">
            <FiRefreshCw size={14}/> Refresh
          </button>
          <button onClick={exportCSV} className="btn-primary flex items-center gap-1.5">
            <FiDownload size={15}/> Export CSV
          </button>
        </div>
      </div>

      {/* Rate info */}
      <div className="card card-body bg-blue-50 border border-blue-100">
        <div className="flex flex-wrap gap-6">
          {[
            { label:'Employee EPF', rate:`${rt.epfEmployee}%`,  desc:'Deducted from employee basic salary' },
            { label:'Employer EPF', rate:`${rt.epfEmployer}%`, desc:'Contributed by employer on basic salary' },
            { label:'Employer ETF', rate:`${rt.etfEmployer}%`,  desc:'Employee Trust Fund by employer' },
          ].map(r => (
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
      <div className="card card-body flex flex-wrap gap-4 items-end">
        <div>
          <label className="form-label text-xs">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="form-select">
            {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label text-xs">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="form-select">
            {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <p className="text-xs text-slate-400 pb-1">
          All enrolled employees appear automatically · Edit or delete any record any time
        </p>
      </div>

      {/* KPI totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:`EPF Employee (${rt.epfEmployee}%)`,  value:`LKR ${(totals.epfEmployee||0).toLocaleString()}`, color:'kpi-blue'   },
          { label:`EPF Employer (${rt.epfEmployer}%)`, value:`LKR ${(totals.epfEmployer||0).toLocaleString()}`, color:'kpi-navy'   },
          { label:'Total EPF',          value:`LKR ${(totals.totalEPF||0).toLocaleString()}`,    color:'kpi-green'  },
          { label:`ETF Employer (${rt.etfEmployer}%)`,  value:`LKR ${(totals.etfEmployer||0).toLocaleString()}`, color:'kpi-purple' },
        ].map(s => (
          <div key={s.label} className={`kpi-card ${s.color}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-xl font-bold text-primary font-heading">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>EPF No</th>
              <th>ETF No</th>
              <th>Basic Salary</th>
              <th>EPF Emp ({rt.epfEmployee}%)</th>
              <th>EPF Emplr ({rt.epfEmployer}%)</th>
              <th>Total EPF</th>
              <th>ETF ({rt.etfEmployer}%)</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="text-center py-12">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/>
              </td></tr>
            ) : summary.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">
                <FiTrendingUp size={36} className="mx-auto mb-2 opacity-30"/>
                <p>No EPF/ETF enrolled employees.</p>
                <p className="text-xs mt-1">Enroll employees from the <strong>Employees</strong> page.</p>
              </td></tr>
            ) : summary.map(row => (
              <tr key={row._id}>
                <td className="font-medium text-gray-800">{row.name}</td>
                <td className="text-gray-500">{row.epfNo || '—'}</td>
                <td className="text-gray-500">{row.etfNo || '—'}</td>
                <td>LKR {row.basicSalary?.toLocaleString()}</td>
                <td className="text-red-600 font-medium">LKR {row.epfEmployee?.toLocaleString()}</td>
                <td className="text-blue-600 font-medium">LKR {row.epfEmployer?.toLocaleString()}</td>
                <td className="font-bold">LKR {row.totalEPF?.toLocaleString()}</td>
                <td className="text-orange-600 font-medium">LKR {row.etfEmployer?.toLocaleString()}</td>
                <td>
                  {row.isPaid ? (
                    <button
                      onClick={() => payMut.mutate(row._id)}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-full transition"
                      title="Click to revert to unpaid"
                    >
                      <FiCheckCircle size={12}/> Paid
                    </button>
                  ) : (
                    <button
                      onClick={() => payMut.mutate(row._id)}
                      className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-full transition"
                      title="Click to mark as paid"
                    >
                      <FiClock size={12}/> Unpaid
                    </button>
                  )}
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(row)}
                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition"
                      title="Edit amounts"
                    >
                      <FiEdit2 size={14}/>
                    </button>
                    <button
                      onClick={() => setDeleteId(row._id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"
                      title="Delete record"
                    >
                      <FiTrash2 size={14}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {summary.length > 0 && (
              <tr className="bg-gray-50 font-bold">
                <td colSpan={4} className="text-right text-gray-600 font-semibold">TOTALS</td>
                <td className="text-red-600">LKR {(totals.epfEmployee||0).toLocaleString()}</td>
                <td className="text-blue-600">LKR {(totals.epfEmployer||0).toLocaleString()}</td>
                <td>LKR {(totals.totalEPF||0).toLocaleString()}</td>
                <td className="text-orange-600">LKR {(totals.etfEmployer||0).toLocaleString()}</td>
                <td colSpan={2}/>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Edit EPF/ETF — {editRow.name}</h2>
              <button onClick={() => setEditRow(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <FiX size={18}/>
              </button>
            </div>
            {[
              { key: 'basicSalary', label: 'Basic Salary (LKR)' },
              { key: 'epfEmployee', label: `EPF Employee ${rt.epfEmployee}% (LKR)` },
              { key: 'epfEmployer', label: `EPF Employer ${rt.epfEmployer}% (LKR)` },
              { key: 'etfEmployer', label: `ETF Employer ${rt.etfEmployer}% (LKR)` },
            ].map(f => (
              <div key={f.key}>
                <label className="form-label">{f.label}</label>
                <input
                  type="number"
                  className="form-input"
                  value={editRow[f.key]}
                  onChange={e => setEditRow(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="form-label">Notes (optional)</label>
              <input
                type="text"
                className="form-input"
                value={editRow.notes}
                onChange={e => setEditRow(p => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. Manual adjustment"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditRow(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={saveEdit}
                disabled={editMut.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <FiSave size={14}/>
                {editMut.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-scale-in">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto"><FiAlertCircle size={24} /></div>
              <h3 className="font-bold text-lg text-slate-800">Confirm Deletion</h3>
              <p className="text-sm text-slate-500">Please enter your administrator password to proceed.</p>
            </div>
            <div>
              <input type="password" placeholder="Enter password" disabled={verifying} className="form-input" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmDelete()} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setDeleteId(null); setDeletePassword('') }} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={confirmDelete} disabled={verifying || !deletePassword} className="btn-primary flex-1 justify-center bg-red-600 hover:bg-red-700 border-red-600">
                {verifying || deleteMut.isPending ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
