import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import SectionHeader from '../../components/ui/SectionHeader'

export default function AdminPerformance() {
  const qc = useQueryClient()
  const { register, handleSubmit, reset } = useForm()
  const { data: usersData } = useQuery({
    queryKey: ['performance-users'],
    queryFn: () => api.get('/auth/users').then((r) => r.data),
  })
  const { data: recordsData } = useQuery({
    queryKey: ['performance-records'],
    queryFn: () => api.get('/performance').then((r) => r.data),
  })
  const mutation = useMutation({
    mutationFn: (payload) => api.post('/performance', payload).then((r) => r.data),
    onSuccess: () => {
      reset()
      qc.invalidateQueries({ queryKey: ['performance-records'] })
    },
  })
  const developers = (usersData?.users || []).filter((u) => u.role === 'developer')
  const records = recordsData?.records || []
  const avgScore = records.length ? Math.round(records.reduce((s, r) => s + Number(r.score || 0), 0) / records.length) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Performance Tracking" subtitle="Track developer contribution, quality, and execution score." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">Developers Rated</p><p className="text-2xl font-bold text-primary">{new Set(records.map((r)=>r.developer?._id)).size}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Average Score</p><p className="text-2xl font-bold text-primary">{avgScore}</p></div>
        <div className="kpi-card kpi-purple"><p className="text-xs text-slate-500 uppercase">Records</p><p className="text-2xl font-bold text-primary">{records.length}</p></div>
      </div>
      <form className="card p-5 grid md:grid-cols-4 gap-3" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <select {...register('developer', { required: true })} className="form-select">
          <option value="">Developer</option>
          {developers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
        <input {...register('month', { required: true })} placeholder="Month (1-12)" className="form-input" />
        <input {...register('year', { required: true })} placeholder="Year" className="form-input" />
        <input {...register('tasksCompleted')} placeholder="Tasks Completed" className="form-input" />
        <input {...register('commits')} placeholder="Commits" className="form-input" />
        <input {...register('codeQuality')} placeholder="Code Quality" className="form-input" />
        <input {...register('collaboration')} placeholder="Collaboration" className="form-input" />
        <button className="btn-primary" type="submit">Save Score</button>
      </form>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Developer</th><th>Period</th><th>Tasks</th><th>Commits</th><th>Score</th></tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r._id}>
                <td>{r.developer?.name}</td>
                <td>{r.month}/{r.year}</td>
                <td>{r.tasksCompleted}</td>
                <td>{r.commits}</td>
                <td><span className="badge badge-green">{r.score}</span></td>
              </tr>
            ))}
            {records.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">No records.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
