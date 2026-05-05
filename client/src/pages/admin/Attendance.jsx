import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import SectionHeader from '../../components/ui/SectionHeader'

export default function AdminAttendance() {
  const qc = useQueryClient()
  const [employeeId, setEmployeeId] = useState('')
  const [status, setStatus] = useState('present')

  const { data: employeesData } = useQuery({
    queryKey: ['attendance-employees'],
    queryFn: () => api.get('/employees?status=active').then((r) => r.data),
  })
  const { data: recordsData } = useQuery({
    queryKey: ['attendance-records'],
    queryFn: () => api.get('/attendance').then((r) => r.data),
  })

  const markMutation = useMutation({
    mutationFn: () => api.post('/attendance', { employeeId, status, date: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-records'] }),
  })

  const employees = employeesData?.employees || []
  const records = recordsData?.records || []
  const presentCount = records.filter((r) => r.status === 'present').length
  const absentCount = records.filter((r) => r.status === 'absent').length
  const leaveCount = records.filter((r) => r.status === 'leave').length

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Attendance System" subtitle="Mark attendance and review employee attendance logs." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Present</p><p className="text-2xl font-bold text-primary">{presentCount}</p></div>
        <div className="kpi-card kpi-orange"><p className="text-xs text-slate-500 uppercase">Absent</p><p className="text-2xl font-bold text-primary">{absentCount}</p></div>
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">On Leave</p><p className="text-2xl font-bold text-primary">{leaveCount}</p></div>
      </div>
      <div className="card p-5 grid md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="form-label">Employee</label>
          <select className="form-select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select employee</option>
            {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.userId?.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Status</label>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="leave">Leave</option>
            <option value="half_day">Half day</option>
          </select>
        </div>
        <button className="btn-primary" onClick={() => markMutation.mutate()} disabled={!employeeId}>Mark</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Employee</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {records.map((row) => (
              <tr key={row._id}>
                <td>{row.employee?.userId?.name}</td>
                <td>{new Date(row.date).toLocaleDateString()}</td>
                <td><span className="badge badge-blue capitalize">{row.status}</span></td>
              </tr>
            ))}
            {records.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-slate-400">No attendance records.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
